# Local AI runtime resource diagnostics

- Workflow ID: `wf_20260619_local_ai_runtime_reliability`
- Stage: `implementation`
- Producing agent: `backend-architect`
- Source task ID: `task_runtime_backend_001`
- Timestamp: `2026-06-19T16:49:00+09:00`
- Summary: Ollama 메타데이터를 정규화해 입력받는 의존성 없는 GPU 자원 적합도 진단 도메인을 구현했다.
- Inputs used: `src/llm/local-http-client.ts`, 기존 로컬 LLM 설계 및 테스트, 23.9 GiB 모델/12 GiB VRAM 관측 조건
- Open assumptions: AI 어댑터가 `/api/tags`, `/api/show`, `/api/ps` 결과를 공개 타입으로 정규화하며, GPU 총 VRAM은 별도 플랫폼 탐지에서 제공될 수 있다.

## Public API

`src/runtime/index.ts` exports:

- `RuntimeResourceEstimator.diagnose(snapshot)`
- `estimateRuntimeResources(snapshot)`
- `ModelResourceMetadata`, `GpuResourceMetadata`, `RuntimeResourceSnapshot`
- `ResourceDiagnostic`, `ResourceFit`, `EstimationBasis`, `ByteRange`

## Decision rules

- 알려진 모델 바이트와 GPU 총 VRAM 비율이 75% 이하이면 `comfortable`, 75% 초과 100% 이하면 `tight`, 100% 초과이면 `insufficient`다.
- 모델 크기가 없고 파라미터 수와 알려진 양자화 단계만 있으면 단일 값이 아니라 바이트 범위를 반환한다.
- 모델 크기 또는 GPU VRAM이 없으면 `unknown`이며 RAM 요구량을 추측하지 않는다.
- 파일 크기, GPU 적재량, 범위 추정 모두 실제 런타임 RAM·VRAM과 다를 수 있음을 중립적인 한국어 경고로 표시한다.
- `insufficient`는 전체 GPU 적재가 어렵다는 의미이며 CPU/RAM 오프로딩으로 실행 가능할 수 있음을 명시한다.

## Verification

- `npm.cmd test -- --run src/test/backend/runtime-resource-estimator.test.ts`: 성공, 1 file / 8 tests
- `npm.cmd run lint`: 성공, 경고 및 오류 없음
- `npm.cmd run build`: 실패, 이 작업 범위 밖의 `src/test/frontend/analysis-panel.test.tsx`에서 새 필수 `AnalysisController.preloadModel` mock 누락(TS2322)

## Test coverage

- 23.9 GiB 모델과 12 GiB VRAM: `insufficient`, 비율 1.99
- 8B급 Q4 4.7 GiB 모델과 12 GiB VRAM: `comfortable`
- 75%와 100% 경계
- 파라미터/양자화 기반 범위 추정
- 메타데이터 부재 시 `unknown`
