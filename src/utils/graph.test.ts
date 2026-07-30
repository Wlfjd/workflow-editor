import { describe, expect, it } from 'vitest'
import type { WorkflowEdge, WorkflowNode } from '../types'
import { createsCycle, edgePathD, validateConnection } from './graph'

const nodes: WorkflowNode[] = [
  { id: 'a', kind: 'input', label: 'A', position: { x: 0, y: 0 } },
  { id: 'b', kind: 'process', label: 'B', position: { x: 200, y: 0 } },
  { id: 'c', kind: 'process', label: 'C', position: { x: 400, y: 0 } },
  { id: 'd', kind: 'output', label: 'D', position: { x: 600, y: 0 } },
]

const edges: WorkflowEdge[] = [
  { id: 'e1', source: 'a', target: 'b' },
  { id: 'e2', source: 'b', target: 'c' },
]

describe('createsCycle', () => {
  it('사이클이 생기지 않는 연결은 false', () => {
    expect(createsCycle(edges, 'a', 'c')).toBe(false)
  })

  it('역방향 연결( c → a )은 사이클', () => {
    expect(createsCycle(edges, 'c', 'a')).toBe(true)
  })

  it('자기 루프( b → b )는 기존 엣지 없이도 사이클', () => {
    expect(createsCycle(edges, 'b', 'b')).toBe(true)
  })
})

describe('validateConnection', () => {
  it('유효한 연결을 허용한다', () => {
    expect(validateConnection(nodes, edges, 'c', 'd')).toEqual({ ok: true })
  })

  it('존재하지 않는 노드를 거부한다', () => {
    const result = validateConnection(nodes, edges, 'a', 'missing')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('존재하지 않는 노드입니다')
  })

  it('자기 자신 연결을 거부한다', () => {
    const result = validateConnection(nodes, edges, 'b', 'b')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('자기 자신과는 연결할 수 없습니다')
  })

  it('포트 방향이 맞지 않으면 거부한다', () => {
    const result = validateConnection(nodes, edges, 'd', 'a')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('연결할 수 없는 포트입니다')
  })

  it('중복 연결을 거부한다', () => {
    const result = validateConnection(nodes, edges, 'a', 'b')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('이미 연결된 노드입니다')
  })

  it('사이클 연결을 거부한다', () => {
    const result = validateConnection(nodes, edges, 'c', 'b')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('사이클이 생기는 연결은 만들 수 없습니다')
  })
})

describe('edgePathD', () => {
  it('베지어 곡선 경로 문자열을 반환한다', () => {
    const d = edgePathD({ x: 0, y: 50 }, { x: 200, y: 50 })
    expect(d).toMatch(/^M 0 50 C/)
    expect(d).toContain('200 50')
  })
})
