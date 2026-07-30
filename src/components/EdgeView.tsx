import { memo } from 'react'

interface EdgeViewProps {
  d: string
  selected: boolean
  onSelect: () => void
}

/**
 * 엣지 한 개. 가는 실제 선(edge-line)과, 클릭을 쉽게 받기 위한
 * 투명한 두꺼운 히트 영역(edge-hit)을 겹쳐 그린다.
 */
export const EdgeView = memo(function EdgeView({ d, selected, onSelect }: EdgeViewProps) {
  return (
    <g
      className={`edge${selected ? ' edge-selected' : ''}`}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.stopPropagation()
        onSelect()
      }}
    >
      <path className="edge-hit" d={d} />
      <path
        className="edge-line"
        d={d}
        markerEnd={selected ? 'url(#arrow-selected)' : 'url(#arrow)'}
      />
    </g>
  )
})
