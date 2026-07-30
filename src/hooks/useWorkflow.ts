import { useCallback, useEffect, useReducer, useRef } from 'react'
import { HISTORY_LIMIT, NODE_KIND_CONFIG, STORAGE_KEY } from '../constants'
import type {
  GraphState,
  NodeKind,
  ValidationResult,
  WorkflowEdge,
  WorkflowNode,
  XY,
} from '../types'
import { createId, validateConnection as validateConnectionGraph } from '../utils/graph'

const DEFAULT_GRAPH: GraphState = {
  nodes: [
    { id: 'seed-input', kind: 'input', label: '데이터 입력', position: { x: 80, y: 120 } },
    { id: 'seed-process', kind: 'process', label: '전처리', position: { x: 420, y: 260 } },
    { id: 'seed-output', kind: 'output', label: '결과 저장', position: { x: 760, y: 120 } },
  ],
  edges: [
    { id: 'seed-edge-1', source: 'seed-input', target: 'seed-process' },
    { id: 'seed-edge-2', source: 'seed-process', target: 'seed-output' },
  ],
}

interface HistoryState {
  past: GraphState[]
  present: GraphState
  future: GraphState[]
  /** 드래그 시작 시점의 스냅숏 — 드래그가 끝날 때 한 번만 히스토리에 기록한다 */
  moveSnapshot: GraphState | null
}

type Action =
  | { type: 'ADD_NODE'; node: WorkflowNode }
  | { type: 'BEGIN_MOVE' }
  | { type: 'MOVE_NODE'; id: string; position: XY }
  | { type: 'END_MOVE' }
  | { type: 'RENAME_NODE'; id: string; label: string }
  | { type: 'DELETE_NODE'; id: string }
  | { type: 'ADD_EDGE'; edge: WorkflowEdge }
  | { type: 'DELETE_EDGE'; id: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' }

function pushHistory(state: HistoryState, next: GraphState): HistoryState {
  return {
    past: [...state.past.slice(-(HISTORY_LIMIT - 1)), state.present],
    present: next,
    future: [],
    moveSnapshot: null,
  }
}

function reducer(state: HistoryState, action: Action): HistoryState {
  const { present } = state

  switch (action.type) {
    case 'ADD_NODE':
      return pushHistory(state, { ...present, nodes: [...present.nodes, action.node] })

    case 'BEGIN_MOVE':
      return { ...state, moveSnapshot: present }

    case 'MOVE_NODE':
      return {
        ...state,
        present: {
          ...present,
          nodes: present.nodes.map((node) =>
            node.id === action.id ? { ...node, position: action.position } : node,
          ),
        },
      }

    case 'END_MOVE': {
      const { moveSnapshot } = state
      if (!moveSnapshot || moveSnapshot === present) return { ...state, moveSnapshot: null }
      return {
        past: [...state.past.slice(-(HISTORY_LIMIT - 1)), moveSnapshot],
        present,
        future: [],
        moveSnapshot: null,
      }
    }

    case 'RENAME_NODE': {
      const node = present.nodes.find((n) => n.id === action.id)
      if (!node || node.label === action.label) return state
      return pushHistory(state, {
        ...present,
        nodes: present.nodes.map((n) => (n.id === action.id ? { ...n, label: action.label } : n)),
      })
    }

    case 'DELETE_NODE':
      return pushHistory(state, {
        nodes: present.nodes.filter((n) => n.id !== action.id),
        edges: present.edges.filter((e) => e.source !== action.id && e.target !== action.id),
      })

    case 'ADD_EDGE':
      return pushHistory(state, { ...present, edges: [...present.edges, action.edge] })

    case 'DELETE_EDGE':
      return pushHistory(state, {
        ...present,
        edges: present.edges.filter((e) => e.id !== action.id),
      })

    case 'UNDO': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [present, ...state.future],
        moveSnapshot: null,
      }
    }

    case 'REDO': {
      if (state.future.length === 0) return state
      const [next, ...rest] = state.future
      return {
        past: [...state.past, present],
        present: next,
        future: rest,
        moveSnapshot: null,
      }
    }

    case 'RESET':
      return pushHistory(state, DEFAULT_GRAPH)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNode(value: unknown): value is WorkflowNode {
  if (!isRecord(value)) return false
  const position = value.position
  return (
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    typeof value.kind === 'string' &&
    value.kind in NODE_KIND_CONFIG &&
    isRecord(position) &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.y)
  )
}

function isEdge(value: unknown): value is WorkflowEdge {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.source === 'string' &&
    typeof value.target === 'string'
  )
}

/** localStorage에 저장된 그래프를 검증하고, 손상되었으면 기본 예제로 대체한다. */
function loadInitialGraph(): GraphState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_GRAPH
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return DEFAULT_GRAPH
    }
    const nodes = parsed.nodes.filter(isNode)
    const nodeIds = new Set(nodes.map((n) => n.id))
    const edges = parsed.edges
      .filter(isEdge)
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    return { nodes, edges }
  } catch {
    return DEFAULT_GRAPH
  }
}

function createInitialState(): HistoryState {
  return { past: [], present: loadInitialGraph(), future: [], moveSnapshot: null }
}

export function useWorkflow() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  const presentRef = useRef(state.present)
  useEffect(() => {
    presentRef.current = state.present
  })

  // 변경 사항을 디바운스해 localStorage에 자동 저장
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.present))
      } catch {
        // 저장 실패(용량 초과 등)는 편집을 막지 않는다
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [state.present])

  // 탭을 닫기 직전에는 디바운스를 기다리지 않고 즉시 저장
  useEffect(() => {
    const flush = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presentRef.current))
      } catch {
        // ignore
      }
    }
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [])

  const addNode = useCallback((kind: NodeKind, position: XY): string => {
    const count = presentRef.current.nodes.filter((n) => n.kind === kind).length
    const node: WorkflowNode = {
      id: createId('node'),
      kind,
      label: `${NODE_KIND_CONFIG[kind].title} ${count + 1}`,
      position,
    }
    dispatch({ type: 'ADD_NODE', node })
    return node.id
  }, [])

  const beginMove = useCallback(() => dispatch({ type: 'BEGIN_MOVE' }), [])
  const moveNode = useCallback(
    (id: string, position: XY) => dispatch({ type: 'MOVE_NODE', id, position }),
    [],
  )
  const endMove = useCallback(() => dispatch({ type: 'END_MOVE' }), [])
  const renameNode = useCallback(
    (id: string, label: string) => dispatch({ type: 'RENAME_NODE', id, label }),
    [],
  )
  const deleteNode = useCallback((id: string) => dispatch({ type: 'DELETE_NODE', id }), [])
  const deleteEdge = useCallback((id: string) => dispatch({ type: 'DELETE_EDGE', id }), [])
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [])
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  const validateConnection = useCallback(
    (source: string, target: string): ValidationResult =>
      validateConnectionGraph(state.present.nodes, state.present.edges, source, target),
    [state.present],
  )

  const connect = useCallback(
    (source: string, target: string): ValidationResult => {
      const result = validateConnection(source, target)
      if (result.ok) {
        dispatch({ type: 'ADD_EDGE', edge: { id: createId('edge'), source, target } })
      }
      return result
    },
    [validateConnection],
  )

  return {
    nodes: state.present.nodes,
    edges: state.present.edges,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
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
  }
}
