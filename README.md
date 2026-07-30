# JIWON's Workflow Editor

노드와 엣지를 드래그로 연결해 파이프라인을 만드는 웹 에디터입니다.  
React + TypeScript + SVG로 직접 구현했습니다 (외부 그래프 라이브러리 미사용).

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run test
npm run lint
```

## 사용 방법

| 동작 | 방법 |
| --- | --- |
| 노드 추가 | 툴바 버튼, 또는 캔버스 빈 곳 더블클릭 |
| 노드 이동 | 노드 드래그 |
| 노드/엣지 삭제 | 선택 후 `Delete` 또는 툴바 `삭제` |
| 엣지 연결 | 출력 포트(●) → 입력 포트(●) 드래그 |
| 화면 이동·줌 | 빈 곳 드래그, 마우스 휠, 툴바 줌 버튼 |
| 실행 취소 | `⌘Z` / `⇧⌘Z` (Windows: `Ctrl+Z` / `Ctrl+Y`) |

그 외 undo/redo, 이름 변경(제목 더블클릭), 연결 검증(DAG), localStorage 자동 저장 등은 [docs/FEATURES.md](docs/FEATURES.md)를 참고하세요.

## 문서

| 문서 | 내용 |
| --- | --- |
| [FEATURES.md](docs/FEATURES.md) | 필수·추가 기능 및 추가 이유 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 좌표계, 상태, 렌더링, 연결 드래그 등 구현 상세 |
| [AI_USAGE.md](docs/AI_USAGE.md) | AI 도구 활용 내역 |

## AI 도구 사용

과제 안내에 따라 **Cursor (Agent) + Claude**를 설계·구현·문서화에 활용했습니다.  
세부 내역은 [docs/AI_USAGE.md](docs/AI_USAGE.md)를 참고하세요.
