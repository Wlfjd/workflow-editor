import { NODE_KIND_CONFIG, NODE_KIND_ORDER } from '../constants'
import type { NodeKind, Selection } from '../types'

interface ToolbarProps {
  selection: Selection
  canUndo: boolean
  canRedo: boolean
  zoom: number
  onAddNode: (kind: NodeKind) => void
  onDeleteSelection: () => void
  onUndo: () => void
  onRedo: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onReset: () => void
}

export function Toolbar({
  selection,
  canUndo,
  canRedo,
  zoom,
  onAddNode,
  onDeleteSelection,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onReset,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <img src="/sss.png" alt="" className="toolbar-logo" aria-hidden="true" />
        <span className="toolbar-title">JIWON's Workflow</span>
      </div>

      <div className="toolbar-group" role="group" aria-label="노드 추가">
        {NODE_KIND_ORDER.map((kind) => (
          <button
            key={kind}
            type="button"
            className="btn"
            title={`${NODE_KIND_CONFIG[kind].title} 노드 추가`}
            onClick={() => onAddNode(kind)}
          >
            <span className="btn-dot" style={{ background: NODE_KIND_CONFIG[kind].accent }} />
            {NODE_KIND_CONFIG[kind].title} 추가
          </button>
        ))}
      </div>

      <div className="toolbar-group" role="group" aria-label="편집">
        <button
          type="button"
          className="btn btn-icon"
          title="실행 취소 (⌘Z)"
          disabled={!canUndo}
          onClick={onUndo}
        >
          ↩
        </button>
        <button
          type="button"
          className="btn btn-icon"
          title="다시 실행 (⇧⌘Z)"
          disabled={!canRedo}
          onClick={onRedo}
        >
          ↪
        </button>
        <button
          type="button"
          className="btn btn-danger"
          title="선택한 노드/엣지 삭제 (Delete)"
          disabled={!selection}
          onClick={onDeleteSelection}
        >
          삭제
        </button>
      </div>

      <div className="toolbar-group" role="group" aria-label="보기">
        <button type="button" className="btn btn-icon" title="축소" onClick={onZoomOut}>
          −
        </button>
        <span className="toolbar-zoom">{Math.round(zoom * 100)}%</span>
        <button type="button" className="btn btn-icon" title="확대" onClick={onZoomIn}>
          ＋
        </button>
        <button type="button" className="btn" title="모든 노드가 보이도록 맞춤" onClick={onFitView}>
          화면 맞춤
        </button>
        <button
          type="button"
          className="btn"
          title="기본 예제 그래프로 초기화"
          onClick={onReset}
        >
          초기화
        </button>
      </div>
    </header>
  )
}
