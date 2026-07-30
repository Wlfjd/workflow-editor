import { NODE_HEIGHT, NODE_KIND_CONFIG, NODE_WIDTH } from '../constants'
import type { PortSide, ValidationResult, WorkflowEdge, WorkflowNode, XY } from '../types'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function createId(prefix: string): string {
  const unique =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${unique}`
}

/** 포트 중심의 월드 좌표. 입력 포트는 노드 왼쪽, 출력 포트는 오른쪽 가운데에 위치한다. */
export function portPosition(node: WorkflowNode, side: PortSide): XY {
  return {
    x: side === 'output' ? node.position.x + NODE_WIDTH : node.position.x,
    y: node.position.y + NODE_HEIGHT / 2,
  }
}

/**
 * 엣지가 실제로 그려지는 앵커 좌표.
 * 포트 원 밑에 화살표가 가려지지 않도록 포트 중심에서 살짝 안쪽으로 띄운다.
 */
export function edgeAnchor(node: WorkflowNode, side: PortSide): XY {
  const port = portPosition(node, side)
  return { x: side === 'output' ? port.x + 7 : port.x - 10, y: port.y }
}

/** 출력(오른쪽) → 입력(왼쪽) 방향으로 흐르는 3차 베지어 곡선 경로 */
export function edgePathD(from: XY, to: XY): string {
  const bend = Math.max(Math.abs(to.x - from.x) / 2, 60)
  return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`
}

/**
 * source → target 엣지를 추가했을 때 사이클이 생기는지 검사.
 * target에서 출발해 기존 엣지를 따라 source에 도달할 수 있으면 사이클이다.
 */
export function createsCycle(edges: WorkflowEdge[], source: string, target: string): boolean {
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    const next = adjacency.get(edge.source)
    if (next) next.push(edge.target)
    else adjacency.set(edge.source, [edge.target])
  }

  const stack = [target]
  const visited = new Set<string>()
  while (stack.length > 0) {
    const current = stack.pop() as string
    if (current === source) return true
    if (visited.has(current)) continue
    visited.add(current)
    for (const next of adjacency.get(current) ?? []) stack.push(next)
  }
  return false
}

/** 출력 포트(source) → 입력 포트(target) 연결 가능 여부를 검사한다 */
export function validateConnection(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  source: string,
  target: string,
): ValidationResult {
  const sourceNode = nodes.find((n) => n.id === source)
  const targetNode = nodes.find((n) => n.id === target)
  if (!sourceNode || !targetNode) return { ok: false, reason: '존재하지 않는 노드입니다' }
  if (source === target) return { ok: false, reason: '자기 자신과는 연결할 수 없습니다' }
  if (
    !NODE_KIND_CONFIG[sourceNode.kind].hasOutput ||
    !NODE_KIND_CONFIG[targetNode.kind].hasInput
  ) {
    return { ok: false, reason: '연결할 수 없는 포트입니다' }
  }
  if (edges.some((e) => e.source === source && e.target === target)) {
    return { ok: false, reason: '이미 연결된 노드입니다' }
  }
  if (createsCycle(edges, source, target)) {
    return { ok: false, reason: '사이클이 생기는 연결은 만들 수 없습니다' }
  }
  return { ok: true }
}
