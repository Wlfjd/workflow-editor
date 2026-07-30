# AI 도구 활용 내역 (AI Usage Disclosure)

과제 안내에 따라, 본 프로젝트 개발 과정에서 **AI 도구를 사용한 사실과 구체적인 활용 내역**을 투명하게 공개합니다.

> **요약**: 코어 기능(노드·엣지·캔버스)의 설계·초기 구현·문서화·일부 리팩터링에 AI 코딩 에이전트를 활용했습니다.  
> 생성된 코드는 **타입 체크·린트·빌드·(일부) 단위 테스트·브라우저 수동/자동 검증**을 거친 뒤 반영했으며, 제출 전 **전체 코드를 직접 읽고 동작을 확인**했습니다.

관련 문서: [FEATURES.md](./FEATURES.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 1. 사용 도구

| 도구 | 역할 | 사용 환경 |
| --- | --- | --- |
| **Cursor** (Composer / Agent) | 코드 생성·수정, 리팩터링, 문서 작성, 터미널 명령 실행 | Cursor IDE |
| **Claude** (Anthropic, Cursor 내장 모델) | 위 에이전트의 기반 LLM | Cursor Agent 세션 |

- **사용하지 않은 것**: React Flow, `@xyflow/react` 등 그래프 전용 라이브러리는 **검토만 하고 채택하지 않음** (터미널에 일시 설치 기록은 있으나 코드에 미사용, `package.json` 의존성에서 제거).
- **프로덕션 런타임 의존성**: `react`, `react-dom`만 유지.

---

## 2. 활용 원칙 (Human-in-the-loop)

AI 출력을 그대로 제출하지 않고, 아래 원칙으로 **검증·선별·수정**했습니다.

| # | 원칙 | 구체적 적용 |
| --- | --- | --- |
| 1 | **과제 목적 우선** | “빠른 완성”보다 드래그·좌표계·상태 관리 **직접 구현**을 AI와 함께 선택. React Flow 대신 React + SVG |
| 2 | **검증 후 반영** | `npm run build` (`tsc -b`), `npm run lint`, `npm run test` 통과를 반영 기준으로 사용 |
| 3 | **동작 확인** | 브라우저에서 시나리오별 수동 테스트 + (초기 개발 시) 브라우저 자동화 시나리오 실행 |
| 4 | **버그 → 설계 개선** | 테스트/사용 중 발견한 문제를 AI와 논의해 **근본 원인** 수준으로 수정 (아래 §5 참고) |
| 5 | **설명 가능성** | ARCHITECTURE·FEATURES·면접 대비 노트 등으로 **왜 이렇게 구현했는지** 스스로 설명 가능하도록 정리 |

---

## 3. 단계별 활용 내역

### 3.1 설계 단계

| 주제 | AI 활용 내용 | 결과물 / 결정 |
| --- | --- | --- |
| 요구사항 분석 | 필수(노드·엣지) vs 추가 기능 범위 구분 | [FEATURES.md](./FEATURES.md) §1·§2 구조 |
| 좌표계 | 월드 좌표 vs 화면 좌표, `transform` 단일 컨테이너, 줌-투-커서 pan 보정식 | [ARCHITECTURE.md](./ARCHITECTURE.md) §2 |
| 상태 구조 | `useReducer` + `past/present/future`, selection/viewport 분리 | [ARCHITECTURE.md](./ARCHITECTURE.md) §1 |
| Undo 전략 | `MOVE_NODE` 프레임 기록 vs `BEGIN_MOVE`/`END_MOVE` 1회 기록 | `useWorkflow.ts` |
| 연결 검증 | 중복·자기연결·포트 방향·**사이클(DAG)** 규칙, DFS 복잡도 | `utils/graph.ts` |
| 렌더링 | SVG 베지어 + HTML 노드 동일 transform, 엣지 히트 영역 분리 | `Canvas.tsx`, `EdgeView.tsx` |

**Human 결정**: 외부 그래프 라이브러리 미사용, 히스토리 50단계 제한, 노드 타입 3종(입력/처리/출력) 채택.

---

### 3.2 구현 단계

AI 에이전트가 **초안 작성·리팩터링**에 참여한 주요 파일입니다.

| 영역 | 파일 | AI 기여 내용 |
| --- | --- | --- |
| 그래프 상태 | `hooks/useWorkflow.ts` | 리듀서, undo/redo, localStorage 저장·로드, 연결 dispatch |
| 캔버스 | `components/Canvas.tsx` | 팬/줌(wheel native listener), 연결 draft, `elementsFromPoint` 드롭 판정 |
| 노드 UI | `components/NodeView.tsx` | 드래그(zoom 보정), 포트, 이름 편집, 연결 후보 하이라이트 |
| 엣지 UI | `components/EdgeView.tsx` | 베지어 path, 선택, 14px hit path |
| 순수 로직 | `utils/graph.ts` | `edgePathD`, `edgeAnchor`, `createsCycle`, `validateConnection` |
| 앱 조합 | `App.tsx` | selection, viewport, 단축키, toast, fit view |
| 스타일 | `index.css` | 다크 테마, 포트 애니메이션, 엣지/노드 스타일 |
| 설정 | `constants.ts`, `types.ts` | 노드 크기, 타입별 포트 설정, 도메인 타입 |

**Human 역할**: UX 디테일(색상·카피·로고), 최종 diff 리뷰, 불필요한 추상화 제거.

---

### 3.3 검증 단계

| 검증 종류 | 명령 / 방법 | AI 활용 |
| --- | --- | --- |
| 타입·빌드 | `npm run build` | 실패 시 AI가 타입 오류 수정 (예: `vitest.config.ts` 분리) |
| 린트 | `npm run lint` | `react-hooks` 규칙 위반 시 `effectiveSelection` 등 패턴으로 수정 |
| 단위 테스트 | `npm run test` | `graph.test.ts` 10케이스 — AI가 초안 작성, 케이스 보정(사이클 vs 포트 방향) |
| 브라우저 E2E | 자동화 스크립트 (초기 개발) | 아래 시나리오 실행·회귀 확인 |
| 수동 QA | `npm run dev` 로컬 확인 | 로고 크기 등 UI 미세 조정 |

**브라우저 자동화로 확인한 시나리오 (초기 개발)**

1. 출력 포트 → 입력 포트 드래그로 엣지 생성
2. 중복 연결 시도 → 토스트 + 연결 미생성
3. 사이클 연결 시도 → 빨간 하이라이트 + 토스트
4. 줌 150% 상태에서 노드 드래그 → 이동량 오차 1px 미만
5. 노드 삭제 → 연결 엣지 함께 제거
6. Delete → Undo → Redo 히스토리 일관성
7. 노드 이름 변경 후 blur/Enter 커밋
8. 새로고침 → localStorage 그래프 복원
9. 휠 줌 → 페이지 스크롤 없이 캔버스만 확대/축소

---

### 3.4 문서화 단계

| 문서 | AI 활용 내용 |
| --- | --- |
| [README.md](../README.md) | 실행 방법, 기능 표, 기술적 의사결정, AI 요약 초안 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 좌표계·연결 시퀀스·히스토리·검증 규칙 상세 |
| [FEATURES.md](./FEATURES.md) | 필수 vs 추가 기능, **추가 이유** 표 |
| [AI_USAGE.md](./AI_USAGE.md) | 본 문서 (활용 내역 상세) |
| `workflow-editor-interview-prep.md` (프로젝트 **외부**) | 면접 예상 Q&A — AI와 초안 작성, 제출물 미포함 |

---

## 4. 세션별 작업 로그 (구체적 프롬프트 → 결과)

개발 중 Cursor Agent와 주고받은 **대표적인 작업 단위**입니다.

| 순서 | 사용자 요청 (요지) | AI 수행 내용 | 변경 파일 / 결과 |
| --- | --- | --- | --- |
| 1 | 엣지(Edge) 연결 구현 + 필요 시 추가 기능 | 기존 구현 확인 후 `validateConnection`을 `graph.ts`로 추출, Vitest 10테스트 추가 | `graph.ts`, `useWorkflow.ts`, `graph.test.ts`, `vitest.config.ts`, `package.json` |
| 2 | `public/logo.png`를 로고로 사용 | 툴바 ⚡ → `<img>`, favicon 변경, tagline 정리 | `Toolbar.tsx`, `index.css`, `index.html` |
| 3 | 로고 더 크게, 옆 안내 문구 삭제 | tagline 제거, height 52px | `Toolbar.tsx`, `index.css` |
| 4 | 로고 더 크게 | height 72px | `index.css` |
| 5 | 기능 문서 생성 (필수 vs 추가 + 이유) | `docs/FEATURES.md` 작성, README 링크 | `FEATURES.md`, `README.md` |
| 6 | AI 활용 내역 구체적 문서화 | 본 `AI_USAGE.md` 작성 | `AI_USAGE.md` |

**로고 파일 변경**: 사용자가 `logo.png` → `sss.png` 등 에셋을 직접 교체. AI는 경로·CSS 크기만 반영.

---

## 5. AI 협업으로 수정한 대표 이슈

검증·사용 중 발견되어 AI와 함께 **설계/코드 수준**으로 고친 항목입니다.

| 이슈 | 원인 | AI 제안 / 적용 해결 |
| --- | --- | --- |
| 초기 fit view 위치 어긋남 | 첫 렌더 시 캔버스 `getBoundingClientRect` 미안정 | `ResizeObserver`로 크기 확정 후 1회 `fitView` (`App.tsx`) |
| 빠른 연결 드래그 시 드롭 실패 | `pointermove` hover 상태와 `pointerup` 커밋 타이밍 불일치 | `pointerup` 시 `elementsFromPoint` **재판정** (`Canvas.tsx`) |
| wheel 줌 시 페이지 스크롤 | React wheel passive → `preventDefault` 불가 | 캔버스에 `{ passive: false }` 네이티브 리스너 (`Canvas.tsx`) |
| selection stale | 삭제/undo 후 선택 id 잔존 | `effectiveSelection` 파생값 (`App.tsx`), effect setState 안티패턴 회피 |
| undo가 1px 단위로 쪼개짐 | `MOVE_NODE` 매 프레임 히스토리 push | `BEGIN_MOVE`/`END_MOVE` 스냅숏 1회 기록 (`useWorkflow.ts`) |
| Vitest + Vite TS 오류 | `vite.config.ts`에 `test` 키 타입 불일치 | `vitest.config.ts` 분리 |
| 사이클 테스트 실패 | 입력 노드에 input 포트 없어 포트 검증이 먼저 실패 | 테스트 그래프를 process 노드 기준으로 수정 (`graph.test.ts`) |

---

## 6. AI에 맡기지 않은 것 (직접 판단·작업)

| 항목 | 이유 |
| --- | --- |
| React Flow / xyflow 채택 여부 | 과제 평가 목적(기본기)에 맞지 않다고 **직접** 판단 |
| 브랜드 에셋 (`sss.png` 등) | 사용자가 직접 준비·교체 |
| 최종 제출 여부·커밋 메시지 | 개발자 판단 |
| 면접 대비 노트 위치 | 제출 zip에 포함되지 않도록 프로젝트 **외부**에 보관 |

---

## 7. AI 기여 vs Human 기여 (대략적 구분)

| 구분 | AI 기여 | Human 기여 |
| --- | --- | --- |
| **아키텍처** | 대안 제시, 문서화, 보일러플레이트 | 라이브러리 미사용 결정, 범위 설정 |
| **코드** | 컴포넌트·훅·유틸 초안, 리팩터링, 테스트 초안 | diff 리뷰, UX·로고, 불필요 코드 제거 |
| **디버깅** | 원인 분석·패치 제안 | 브라우저에서 재현·확인 |
| **문서** | README/ARCHITECTURE/FEATURES/AI_USAGE 초안 | 사실 관계 확인, 제출 범위 조정 |

> AI는 **생산성 도구**로 사용했으며, 최종 코드 품질·동작·설명 책임은 개발자(지원)에게 있습니다.

---

## 8. 검증 체크리스트 (제출 전)

- [x] `npm run build` 성공
- [x] `npm run lint` 성공
- [x] `npm run test` — 10 tests passed
- [x] 필수 기능: 노드 추가·이동·삭제
- [x] 필수 기능: 엣지 연결(출력→입력)·삭제
- [x] 추가 기능: undo/redo, localStorage, 연결 검증, 팬/줌
- [x] 문서: README, FEATURES, ARCHITECTURE, AI_USAGE
- [x] AI 사용 사실 README·본 문서에 공개

---

## 9. 향후 AI 없이 진행할 작업 (참고)

ARCHITECTURE §9 및 interview-prep에 적어 둔, **아직 미구현** 항목입니다. 필요 시 AI 없이 또는 제한적으로 활용할 수 있습니다.

- `utils/graph.ts` 좌표·경로 함수 테스트 확대
- 멀티 선택, 미니맵, 스냅 투 그리드
- 위상 정렬 기반 실행 시뮬레이션

