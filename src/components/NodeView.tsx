import { memo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { NODE_HEIGHT, NODE_KIND_CONFIG, NODE_WIDTH } from '../constants'
import type { ConnectionDraft, PortSide, WorkflowNode, XY } from '../types'
import { capturePointer } from '../utils/dom'

interface NodeViewProps {
  node: WorkflowNode
  zoom: number
  selected: boolean
  draft: ConnectionDraft | null
  onSelect: () => void
  onBeginMove: () => void
  onMove: (position: XY) => void
  onEndMove: () => void
  onRename: (label: string) => void
  onDelete: () => void
  onStartConnection: (
    nodeId: string,
    side: PortSide,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
}

interface DragState {
  pointerId: number
  startClient: XY
  startPosition: XY
  moved: boolean
}

export const NodeView = memo(function NodeView({
  node,
  zoom,
  selected,
  draft,
  onSelect,
  onBeginMove,
  onMove,
  onEndMove,
  onRename,
  onDelete,
  onStartConnection,
}: NodeViewProps) {
  const config = NODE_KIND_CONFIG[node.kind]
  const dragRef = useRef<DragState | null>(null)
  const [editing, setEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState(node.label)

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || editing) return
    // 포트·삭제 버튼에서 시작된 이벤트는 노드 드래그로 처리하지 않는다
    if ((event.target as HTMLElement).closest('[data-port], .node-delete')) return
    event.stopPropagation()
    onSelect()
    capturePointer(event.currentTarget, event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startPosition: node.position,
      moved: false,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const screenDx = event.clientX - drag.startClient.x
    const screenDy = event.clientY - drag.startClient.y
    // 3px 이하의 흔들림은 클릭으로 간주해 이동/히스토리를 만들지 않는다
    if (!drag.moved && Math.hypot(screenDx, screenDy) < 3) return
    if (!drag.moved) {
      drag.moved = true
      onBeginMove()
    }
    onMove({
      x: drag.startPosition.x + screenDx / zoom,
      y: drag.startPosition.y + screenDy / zoom,
    })
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (drag.moved) onEndMove()
  }

  const startEditing = () => {
    setDraftLabel(node.label)
    setEditing(true)
  }

  const commitLabel = () => {
    const next = draftLabel.trim()
    onRename(next === '' ? node.label : next)
    setEditing(false)
  }

  const portClassName = (side: PortSide): string => {
    const classes = ['port', side === 'input' ? 'port-input' : 'port-output']
    if (draft) {
      if (draft.fixedNodeId === node.id && draft.fixedSide === side) {
        classes.push('port-origin')
      } else if (draft.fixedNodeId !== node.id && draft.fixedSide !== side) {
        // 연결 드래그 중, 반대편 포트들만 연결 후보로 강조한다
        classes.push('port-candidate')
        if (draft.hoverNodeId === node.id) {
          classes.push(draft.hoverValid ? 'port-hover-valid' : 'port-hover-invalid')
        }
      }
    }
    return classes.join(' ')
  }

  return (
    <div
      className={`node${selected ? ' node-selected' : ''}`}
      style={
        {
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          transform: `translate(${node.position.x}px, ${node.position.y}px)`,
          '--accent': config.accent,
        } as CSSProperties
      }
      data-node-id={node.id}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div className="node-header">
        <span className="node-kind-dot" aria-hidden="true" />
        {editing ? (
          <input
            className="node-title-input"
            value={draftLabel}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setDraftLabel(event.target.value)}
            onBlur={commitLabel}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitLabel()
              if (event.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span className="node-title" onDoubleClick={startEditing} title="더블클릭하여 이름 변경">
            {node.label}
          </span>
        )}
        <span className="node-kind-tag">{config.title}</span>
      </div>
      <div className="node-body">{config.description}</div>

      {selected && (
        <button
          type="button"
          className="node-delete"
          title="노드 삭제 (Delete)"
          aria-label={`${node.label} 삭제`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onDelete}
        >
          ×
        </button>
      )}

      {config.hasInput && (
        <button
          type="button"
          className={portClassName('input')}
          data-port="true"
          data-node-id={node.id}
          data-side="input"
          title="입력 포트"
          aria-label={`${node.label} 입력 포트`}
          onPointerDown={(event) => onStartConnection(node.id, 'input', event)}
        />
      )}
      {config.hasOutput && (
        <button
          type="button"
          className={portClassName('output')}
          data-port="true"
          data-node-id={node.id}
          data-side="output"
          title="출력 포트 — 드래그하여 연결"
          aria-label={`${node.label} 출력 포트`}
          onPointerDown={(event) => onStartConnection(node.id, 'output', event)}
        />
      )}
    </div>
  )
})
