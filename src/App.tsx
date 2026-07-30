import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from './components/Canvas'
import { NodeAddDialog } from './components/NodeAddDialog'
import { StatusBar } from './components/StatusBar'
import { Toolbar } from './components/Toolbar'
import { MAX_ZOOM, MIN_ZOOM, NODE_HEIGHT, NODE_KIND_CONFIG, NODE_WIDTH } from './constants'
import { useWorkflow } from './hooks/useWorkflow'
import type { NodeKind, Selection, Viewport, XY } from './types'
import { clamp } from './utils/graph'

const FIT_PADDING = 80

interface PendingNodeAdd {
  kind: NodeKind
  position: XY
}

function defaultNodeLabel(kind: NodeKind, nodes: { kind: NodeKind }[]): string {
  const count = nodes.filter((n) => n.kind === kind).length
  return `${NODE_KIND_CONFIG[kind].title} ${count + 1}`
}

function App() {
  const {
    nodes,
    edges,
    canUndo,
    canRedo,
    addNode,
    beginMove,
    moveNode,
    endMove,
    renameNode,
    deleteNode,
    deleteEdge,
    connect,
    validateConnection,
    undo,
    redo,
    reset,
  } = useWorkflow()

  const [selection, setSelection] = useState<Selection>(null)
  const [pendingAdd, setPendingAdd] = useState<PendingNodeAdd | null>(null)
  const [viewport, setViewport] = useState<Viewport>({ pan: { x: 0, y: 0 }, zoom: 1 })
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text })
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }, [])

  // 삭제/실행취소 등으로 선택 대상이 사라졌으면 선택이 없는 것으로 취급한다 (파생 값)
  const effectiveSelection = useMemo<Selection>(() => {
    if (!selection) return null
    const exists =
      selection.type === 'node'
        ? nodes.some((n) => n.id === selection.id)
        : edges.some((e) => e.id === selection.id)
    return exists ? selection : null
  }, [selection, nodes, edges])

  const openAddDialog = useCallback((kind: NodeKind, position: XY) => {
    setPendingAdd({ kind, position })
  }, [])

  const handleAddNodeAt = useCallback(
    (position: XY, kind: NodeKind = 'process') => {
      openAddDialog(kind, position)
    },
    [openAddDialog],
  )

  // 툴바로 추가할 때는 현재 보이는 화면의 중앙 근처에 놓는다
  const handleAddNodeFromToolbar = useCallback(
    (kind: NodeKind) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      const cx = rect ? rect.width / 2 : 400
      const cy = rect ? rect.height / 2 : 300
      const jitter = () => (Math.random() - 0.5) * 60
      openAddDialog(kind, {
        x: (cx - viewport.pan.x) / viewport.zoom - NODE_WIDTH / 2 + jitter(),
        y: (cy - viewport.pan.y) / viewport.zoom - NODE_HEIGHT / 2 + jitter(),
      })
    },
    [openAddDialog, viewport],
  )

  const handleConfirmAddNode = useCallback(
    (draft: { kind: NodeKind; label: string; description: string }) => {
      if (!pendingAdd) return
      const id = addNode(pendingAdd.kind, pendingAdd.position, draft.label, draft.description)
      setPendingAdd(null)
      setSelection({ type: 'node', id })
    },
    [addNode, pendingAdd],
  )

  const handleConnect = useCallback(
    (source: string, target: string) => {
      const result = connect(source, target)
      if (!result.ok && result.reason) showToast(result.reason)
    },
    [connect, showToast],
  )

  const deleteSelection = useCallback(() => {
    if (!effectiveSelection) return
    if (effectiveSelection.type === 'node') deleteNode(effectiveSelection.id)
    else deleteEdge(effectiveSelection.id)
    setSelection(null)
  }, [effectiveSelection, deleteNode, deleteEdge])

  const zoomBy = useCallback((factor: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const cx = rect ? rect.width / 2 : 0
    const cy = rect ? rect.height / 2 : 0
    setViewport((v) => {
      const zoom = clamp(v.zoom * factor, MIN_ZOOM, MAX_ZOOM)
      const ratio = zoom / v.zoom
      return { zoom, pan: { x: cx - (cx - v.pan.x) * ratio, y: cy - (cy - v.pan.y) * ratio } }
    })
  }, [])

  const fitView = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || nodes.length === 0) {
      setViewport({ pan: { x: 0, y: 0 }, zoom: 1 })
      return
    }
    const minX = Math.min(...nodes.map((n) => n.position.x))
    const minY = Math.min(...nodes.map((n) => n.position.y))
    const maxX = Math.max(...nodes.map((n) => n.position.x + NODE_WIDTH))
    const maxY = Math.max(...nodes.map((n) => n.position.y + NODE_HEIGHT))
    // 작은 화면에서는 고정 여백이 과도하므로 화면 크기에 비례해 줄인다
    const padX = Math.min(FIT_PADDING, rect.width * 0.12)
    const padY = Math.min(FIT_PADDING, rect.height * 0.12)
    const zoom = clamp(
      Math.min(
        (rect.width - padX * 2) / (maxX - minX),
        (rect.height - padY * 2) / (maxY - minY),
        1.25,
      ),
      MIN_ZOOM,
      MAX_ZOOM,
    )
    setViewport({
      zoom,
      pan: {
        x: (rect.width - (maxX - minX) * zoom) / 2 - minX * zoom,
        y: (rect.height - (maxY - minY) * zoom) / 2 - minY * zoom,
      },
    })
  }, [nodes])

  // 저장된 그래프가 화면에 들어오도록 최초 한 번 맞춘다.
  // 첫 렌더 직후에는 레이아웃이 아직 안정되지 않았을 수 있어,
  // 캔버스가 실제 크기를 가진 시점에 ResizeObserver로 실행한다.
  const didInitialFit = useRef(false)
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      if (didInitialFit.current) return
      const rect = el.getBoundingClientRect()
      if (rect.width < 100 || rect.height < 100) return
      didInitialFit.current = true
      fitView()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fitView])

  // 전역 단축키: 입력 중일 때는 무시한다
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      const mod = event.metaKey || event.ctrlKey
      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteSelection()
      } else if (event.key === 'Escape') {
        if (pendingAdd) setPendingAdd(null)
        else setSelection(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, deleteSelection, pendingAdd])

  const handleReset = useCallback(() => {
    if (window.confirm('캔버스의 모든 노드와 엣지를 삭제할까요? (⌘Z로 되돌릴 수 있습니다)')) {
      reset()
      setSelection(null)
    }
  }, [reset])

  return (
    <div className="app">
      <Toolbar
        selection={effectiveSelection}
        canUndo={canUndo}
        canRedo={canRedo}
        zoom={viewport.zoom}
        onAddNode={handleAddNodeFromToolbar}
        onDeleteSelection={deleteSelection}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onFitView={fitView}
        onReset={handleReset}
      />
      <Canvas
        nodes={nodes}
        edges={edges}
        selection={effectiveSelection}
        viewport={viewport}
        canvasRef={canvasRef}
        onViewportChange={setViewport}
        onSelectionChange={setSelection}
        onBeginMove={beginMove}
        onMoveNode={moveNode}
        onEndMove={endMove}
        onRenameNode={renameNode}
        onDeleteNode={deleteNode}
        onConnect={handleConnect}
        validateConnection={validateConnection}
        onAddNodeAt={handleAddNodeAt}
      />
      <StatusBar nodeCount={nodes.length} edgeCount={edges.length} zoom={viewport.zoom} />
      {toast && (
        <div key={toast.id} className="toast" role="status">
          {toast.text}
        </div>
      )}
      {pendingAdd && (
        <NodeAddDialog
          kind={pendingAdd.kind}
          defaultLabel={defaultNodeLabel(pendingAdd.kind, nodes)}
          defaultDescription={NODE_KIND_CONFIG[pendingAdd.kind].description}
          onConfirm={handleConfirmAddNode}
          onCancel={() => setPendingAdd(null)}
        />
      )}
    </div>
  )
}

export default App
