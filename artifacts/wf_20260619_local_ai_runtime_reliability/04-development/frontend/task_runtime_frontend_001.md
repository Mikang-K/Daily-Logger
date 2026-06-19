# Frontend runtime reliability implementation

- Workflow ID: `wf_20260619_local_ai_runtime_reliability`
- Stage: `implementation`
- Producing agent: `frontend-developer`
- Source task ID: `task_runtime_frontend_001`
- Timestamp: `2026-06-19T16:51:00+09:00`
- Summary: Added validated runtime timeouts, explicit model preload, distinct connection/loading/generation states, progress announcements, and model resource warnings.
- Inputs used: existing analysis panel/controller, `LocalLlmClient.warmup` and progress contracts, runtime resource estimator.
- Open assumptions: GPU VRAM totals are unavailable from the browser unless a later local-runtime probe supplies them; the UI explicitly reports that limitation.

## Changes

- Runtime timeout choices are limited to 120, 300, or 600 seconds. Persisted values are validated and unsupported values fall back to 300 seconds.
- Connection checking only discovers models. Model preload requires a separate user action and supports cancellation.
- `checking`, `connected`, `loading`, `ready`, `generating`, `completed`, `error`, and `stale` are distinct UI states.
- Local client progress events are exposed through polite live-region text, including generated token counts when available.
- Model file size and resource-estimator warnings are displayed before preload. Unknown VRAM is not presented as a precise estimate.
- Analysis retry, cancellation, stale detection, and text-only rendering remain intact.

## Verification

- `npm.cmd test -- --run src/test/frontend/analysis-panel.test.tsx src/test/frontend/App.test.tsx`: 15 tests passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.
