interface StatusBarProps {
  nodeCount: number
  edgeCount: number
  zoom: number
}

export function StatusBar({ nodeCount, edgeCount, zoom }: StatusBarProps) {
  return (
    <footer className="statusbar">
      <span className="statusbar-counts">
        노드 {nodeCount} · 엣지 {edgeCount} · {Math.round(zoom * 100)}%
      </span>
      <span className="statusbar-hints">
        포트 드래그: 연결 · 빈 곳 드래그: 화면 이동 · 휠: 확대/축소 · 빈 곳 더블클릭: 노드 추가 ·
        제목 더블클릭: 이름 변경 · Delete: 삭제 · ⌘Z: 실행 취소
      </span>
      <span className="statusbar-save">변경 사항 자동 저장</span>
    </footer>
  )
}
