/** 캔버스 월드 좌표 (줌/팬 적용 전 논리 좌표) */
export interface XY {
  x: number
  y: number
}

export type NodeKind = 'input' | 'process' | 'output'

export type PortSide = 'input' | 'output'

export interface WorkflowNode {
  id: string
  kind: NodeKind
  label: string
  position: XY
}

/** source(출력 포트) → target(입력 포트) 방향성 연결 */
export interface WorkflowEdge {
  id: string
  source: string
  target: string
}

export interface GraphState {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export type Selection =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | null

/** 화면 좌표 = 월드 좌표 * zoom + pan */
export interface Viewport {
  pan: XY
  zoom: number
}

/** 포트에서 드래그를 시작해 아직 연결이 완성되지 않은 상태 */
export interface ConnectionDraft {
  fixedNodeId: string
  fixedSide: PortSide
  cursor: XY
  hoverNodeId: string | null
  hoverValid: boolean
}

export interface ValidationResult {
  ok: boolean
  reason?: string
}
