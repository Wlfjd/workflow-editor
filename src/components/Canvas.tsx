import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
  SetStateAction,
} from 'react'
import { GRID_SIZE, MAX_ZOOM, MIN_ZOOM, NODE_HEIGHT, NODE_WIDTH } from '../constants'
import type {
  ConnectionDraft,
  PortSide,
  Selection,
  ValidationResult,
  Viewport,
  WorkflowEdge,
  WorkflowNode,
  XY,
} from '../types'
import { capturePointer } from '../utils/dom'
import { clamp, edgeAnchor, edgePathD } from '../utils/graph'
import { EdgeView } from './EdgeView'
import { NodeView } from './NodeView'

interface CanvasProps {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selection: Selection
  viewport: Viewport
  canvasRef: RefObject<HTMLDivElement | null>
  onViewportChange: Dispatch<SetStateAction<Viewport>>
  onSelectionChange: (selection: Selection) => void
  onBeginMove: () => void
  onMoveNode: (id: string, position: XY) => void
  onEndMove: () => void
  onRenameNode: (id: string, label: string) => void
  onDeleteNode: (id: string) => void
  onConnect: (source: string, target: string) => void
  validateConnection: (source: string, target: string) => ValidationResult
  onAddNodeAt: (position: XY) => void
}

interface PanState {
  pointerId: number
  startClient: XY
  startPan: XY
}

/** 드래그 시작 포트가 출력이면 그대로, 입력이면 방향을 뒤집어 (source, target)을 만든다 */
function resolveDirection(draft: ConnectionDraft, otherNodeId: string): [string, string] {
  return draft.fixedSide === 'output'
    ? [draft.fixedNodeId, otherNodeId]
    : [otherNodeId, draft.fixedNodeId]
}

export function Canvas({
  nodes,
  edges,
  selection,
  viewport,
  canvasRef,
  onViewportChange,
  onSelectionChange,
  onBeginMove,
  onMoveNode,
  onEndMove,
  onRenameNode,
  onDeleteNode,
  onConnect,
  validateConnection,
  onAddNodeAt,
}: CanvasProps) {
  const [draft, setDraft] = useState<ConnectionDraft | null>(null)
  const [panning, setPanning] = useState(false)
  const panRef = useRef<PanState | null>(null)

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])

  const screenToWorld = useCallback(
    (clientX: number, clientY: number): XY => {
      const rect = canvasRef.current?.getBoundingClientRect()
      const left = rect?.left ?? 0
      const top = rect?.top ?? 0
      return {
        x: (clientX - left - viewport.pan.x) / viewport.zoom,
        y: (clientY - top - viewport.pan.y) / viewport.zoom,
      }
    },
    [canvasRef, viewport],
  )

  // React는 wheel 이벤트를 passive로 등록하므로, preventDefault를 위해 네이티브 리스너를 사용한다
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = event.clientX - rect.left
      const cy = event.clientY - rect.top
      onViewportChange((v) => {
        const zoom = clamp(v.zoom * Math.exp(-event.deltaY * 0.0015), MIN_ZOOM, MAX_ZOOM)
        const ratio = zoom / v.zoom
        // 커서 아래의 월드 좌표가 줌 전후로 고정되도록 pan을 보정한다
        return {
          zoom,
          pan: { x: cx - (cx - v.pan.x) * ratio, y: cy - (cy - v.pan.y) * ratio },
        }
      })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [canvasRef, onViewportChange])

  // 연결 드래그 중 Escape로 취소
  const connecting = draft !== null
  useEffect(() => {
    if (!connecting) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDraft(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [connecting])

  const handleStartConnection = useCallback(
    (nodeId: string, side: PortSide, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      event.stopPropagation()
      event.preventDefault()
      // 이후의 move/up 이벤트를 캔버스가 받도록 포인터를 캡처한다
      capturePointer(canvasRef.current, event.pointerId)
      setDraft({
        fixedNodeId: nodeId,
        fixedSide: side,
        cursor: screenToWorld(event.clientX, event.clientY),
        hoverNodeId: null,
        hoverValid: false,
      })
    },
    [canvasRef, screenToWorld],
  )

  /**
   * 커서 아래의 연결 가능한 반대편 포트를 찾는다.
   * 하이라이트(move)와 연결 확정(up) 양쪽에서 같은 로직을 사용해,
   * 드롭 판정이 렌더 커밋 타이밍에 의존하지 않도록 한다.
   */
  const findHoverTarget = useCallback(
    (clientX: number, clientY: number, current: ConnectionDraft) => {
      const portEl = document
        .elementsFromPoint(clientX, clientY)
        .find(
          (el): el is HTMLElement => el instanceof HTMLElement && el.dataset.port === 'true',
        )
      if (
        !portEl?.dataset.nodeId ||
        !portEl.dataset.side ||
        portEl.dataset.side === current.fixedSide ||
        portEl.dataset.nodeId === current.fixedNodeId
      ) {
        return null
      }
      const [source, target] = resolveDirection(current, portEl.dataset.nodeId)
      return { nodeId: portEl.dataset.nodeId, valid: validateConnection(source, target).ok }
    },
    [validateConnection],
  )

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.button !== 0) return
    onSelectionChange(null)
    capturePointer(event.currentTarget, event.pointerId)
    panRef.current = {
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startPan: viewport.pan,
    }
    setPanning(true)
  }

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draft) {
      // 커서 아래에 있는 반대편 포트를 찾아 연결 후보로 표시한다
      const hover = findHoverTarget(event.clientX, event.clientY, draft)
      setDraft({
        ...draft,
        cursor: screenToWorld(event.clientX, event.clientY),
        hoverNodeId: hover?.nodeId ?? null,
        hoverValid: hover?.valid ?? false,
      })
      return
    }

    const pan = panRef.current
    if (pan && pan.pointerId === event.pointerId) {
      const dx = event.clientX - pan.startClient.x
      const dy = event.clientY - pan.startClient.y
      onViewportChange((v) => ({
        ...v,
        pan: { x: pan.startPan.x + dx, y: pan.startPan.y + dy },
      }))
    }
  }

  const handleCanvasPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draft) {
      // 놓는 순간의 실제 커서 위치로 드롭 대상을 다시 판정한다
      const hover = findHoverTarget(event.clientX, event.clientY, draft)
      if (hover) {
        const [source, target] = resolveDirection(draft, hover.nodeId)
        onConnect(source, target)
      }
      setDraft(null)
    }
    if (panRef.current?.pointerId === event.pointerId) {
      panRef.current = null
      setPanning(false)
    }
  }

  const handleCanvasPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    setDraft(null)
    if (panRef.current?.pointerId === event.pointerId) {
      panRef.current = null
      setPanning(false)
    }
  }

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    const world = screenToWorld(event.clientX, event.clientY)
    onAddNodeAt({ x: world.x - NODE_WIDTH / 2, y: world.y - NODE_HEIGHT / 2 })
  }

  // 연결 미리보기 경로: 고정된 포트에서 커서까지, 방향(출력→입력)을 유지해 그린다
  let previewD: string | null = null
  if (draft) {
    const fixedNode = nodeMap.get(draft.fixedNodeId)
    if (fixedNode) {
      const anchor = edgeAnchor(fixedNode, draft.fixedSide)
      previewD =
        draft.fixedSide === 'output'
          ? edgePathD(anchor, draft.cursor)
          : edgePathD(draft.cursor, anchor)
    }
  }
  const previewInvalid = draft?.hoverNodeId != null && !draft.hoverValid

  return (
    <div
      ref={canvasRef}
      className={`canvas${panning ? ' canvas-panning' : ''}${connecting ? ' canvas-connecting' : ''}`}
      style={{
        backgroundSize: `${GRID_SIZE * viewport.zoom}px ${GRID_SIZE * viewport.zoom}px`,
        backgroundPosition: `${viewport.pan.x}px ${viewport.pan.y}px`,
      }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerCancel}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className="canvas-world"
        style={{
          transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
        }}
      >
        <svg className="edge-layer" aria-hidden="true">
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 Z" />
            </marker>
            <marker
              id="arrow-selected"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 Z" />
            </marker>
            <marker
              id="arrow-preview"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 Z" />
            </marker>
            <marker
              id="arrow-preview-invalid"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 Z" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const source = nodeMap.get(edge.source)
            const target = nodeMap.get(edge.target)
            if (!source || !target) return null
            return (
              <EdgeView
                key={edge.id}
                d={edgePathD(edgeAnchor(source, 'output'), edgeAnchor(target, 'input'))}
                selected={selection?.type === 'edge' && selection.id === edge.id}
                onSelect={() => onSelectionChange({ type: 'edge', id: edge.id })}
              />
            )
          })}

          {previewD && (
            <path
              className={`edge-preview${previewInvalid ? ' edge-preview-invalid' : ''}`}
              d={previewD}
              markerEnd={previewInvalid ? 'url(#arrow-preview-invalid)' : 'url(#arrow-preview)'}
            />
          )}
        </svg>

        {nodes.map((node) => (
          <NodeView
            key={node.id}
            node={node}
            zoom={viewport.zoom}
            selected={selection?.type === 'node' && selection.id === node.id}
            draft={draft}
            onSelect={() => onSelectionChange({ type: 'node', id: node.id })}
            onBeginMove={onBeginMove}
            onMove={(position) => onMoveNode(node.id, position)}
            onEndMove={onEndMove}
            onRename={(label) => onRenameNode(node.id, label)}
            onDelete={() => onDeleteNode(node.id)}
            onStartConnection={handleStartConnection}
          />
        ))}
      </div>

      {nodes.length === 0 && (
        <div className="canvas-empty">
          <p className="canvas-empty-title">캔버스가 비어 있습니다</p>
          <p>상단의 버튼으로 노드를 추가하거나, 빈 곳을 더블클릭해 보세요.</p>
        </div>
      )}
    </div>
  )
}
