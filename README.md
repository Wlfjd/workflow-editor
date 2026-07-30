# JIWON's Workflow Editor

노드(Node)와 엣지(Edge)를 드래그로 연결해 파이프라인을 구성하는 웹 워크플로우 에디터입니다.  
**React + TypeScript + SVG**로 직접 구현했으며, React Flow 등 외부 그래프 라이브러리는 사용하지 않았습니다.

- **저장소**: https://github.com/Wlfjd/workflow-editor

## 실행 방법

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 타입 체크 + 프로덕션 빌드
npm run test     # 단위 테스트
npm run lint     # ESLint
```

## 구현 기능

### 필수 요구 사항

| 기능 | 사용 방법 |
| --- | --- |
| 노드 추가 | 툴바 `입력/처리/출력 추가` → **제목·설명** 입력 후 추가 |
| 노드 이동 | 노드 드래그 (줌 배율 보정) |
| 노드 삭제 | 선택 후 `Delete` / `Backspace`, 우상단 `×`, 툴바 `삭제` |
| 엣지 연결 | **출력 포트(●)** → **입력 포트(●)** 드래그 (방향성·화살표 표시) |
| 엣지 삭제 | 엣지 선택 후 삭제 |

### 추가 구현

- **빈 캔버스 시작** — 최초 실행 시 노드 없음
- **노드 추가 다이얼로그** — 추가 시 제목·설명 편집
- **연결 검증** — 자기 연결·중복·사이클(DAG) 방지, 토스트 안내
- **연결 드래그 피드백** — 미리보기 곡선, 포트 하이라이트
- **팬 & 줌** — 빈 곳 드래그, 휠 줌(25~250%), 화면 맞춤
- **Undo / Redo** — `⌘Z` / `⇧⌘Z` (Windows: `Ctrl+Z` / `Ctrl+Y`)
- **localStorage 자동 저장** — 새로고침 후 복원
- **노드 타입 3종** — 입력 / 처리 / 출력 (포트 구성 상이)

상세 목록과 추가 이유 → [docs/FEATURES.md](docs/FEATURES.md)

## 프로젝트 구조

```
src/
├── components/     Canvas, NodeView, EdgeView, Toolbar, NodeAddDialog …
├── hooks/          useWorkflow (리듀서, undo/redo, localStorage)
├── utils/          graph.ts (좌표, 베지어, 사이클 검사)
├── App.tsx
└── index.css
docs/               FEATURES, ARCHITECTURE, AI_USAGE
```

## 문서

| 문서 | 내용 |
| --- | --- |
| [FEATURES.md](docs/FEATURES.md) | 필수·추가 기능 및 추가 이유 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 좌표계, 상태, 렌더링, 연결 드래그 |
| [AI_USAGE.md](docs/AI_USAGE.md) | AI 도구 활용 내역 |

## AI 도구 사용

과제 안내에 따라 **Cursor (Agent) + Claude**를 설계·구현·디자인·문서화에 활용했습니다.

| 단계 | 활용 내용 |
| --- | --- |
| 설계 | 좌표계, undo/redo, 연결 검증(DAG) |
| 구현 | 컴포넌트·훅·유틸 |
| 디자인 | 다크 테마 UI, 포트/엣지 스타일, 툴바·다이얼로그, 로고 배치 |
| 검증 | `tsc` / ESLint / Vitest / 브라우저 테스트 |
| 문서화 | README, FEATURES, ARCHITECTURE, AI_USAGE |

로고(`public/sss.png`)는 직접 제작·선택했습니다.  
세부 내역 → [docs/AI_USAGE.md](docs/AI_USAGE.md)
