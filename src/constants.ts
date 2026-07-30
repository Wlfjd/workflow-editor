import type { NodeKind } from './types'

export const NODE_WIDTH = 220
export const NODE_HEIGHT = 88
export const GRID_SIZE = 24
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 2.5
export const HISTORY_LIMIT = 50
export const STORAGE_KEY = 'workflow-editor:graph:v2'

export interface NodeKindConfig {
  title: string
  description: string
  accent: string
  hasInput: boolean
  hasOutput: boolean
}

export const NODE_KIND_CONFIG: Record<NodeKind, NodeKindConfig> = {
  input: {
    title: '입력',
    description: '데이터를 불러오는 시작 노드',
    accent: '#34d399',
    hasInput: false,
    hasOutput: true,
  },
  process: {
    title: '처리',
    description: '데이터를 가공·변환하는 노드',
    accent: '#60a5fa',
    hasInput: true,
    hasOutput: true,
  },
  output: {
    title: '출력',
    description: '결과를 내보내는 종료 노드',
    accent: '#f472b6',
    hasInput: true,
    hasOutput: false,
  },
}

export const NODE_KIND_ORDER: readonly NodeKind[] = ['input', 'process', 'output']
