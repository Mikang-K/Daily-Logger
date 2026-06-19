# Frontend implementation notes

- Workflow ID: `wf_20260619_local_llm_analysis`
- Stage: `implementation`
- Producing agent: `frontend-developer`
- Source task ID: `task_llm_frontend_001`
- Timestamp: `2026-06-19T13:09:00+09:00`
- Summary: Added the accessible local-AI settings, explicit disclosure, manual analysis state machine, safe result rendering, cache-backed application integration, and component tests.
- Inputs used: feature specification, technical design, task breakdown, existing daily-log UI, public `src/analysis`, `src/llm`, and `src/storage` APIs.
- Open assumptions: Ollama-compatible local HTTP runtime is used; the default endpoint is `http://127.0.0.1:11434`; installation and model download remain user-managed.

## Implementation

- `AnalysisPanel` exposes connection checking, model selection, analyze, cancel, retry, completed, unavailable, error, and stale states.
- Health data categories are disclosed before the manual action. Runtime settings contain no credentials and persist only endpoint/model metadata in local storage.
- Model output is rendered exclusively through React text nodes. No HTML interpretation API is used.
- `local-analysis-controller.ts` is the single UI integration boundary. It builds the selected-day/recent-seven-day request, invokes the loopback-only client, and reads/writes the input-hash cache.
- The panel appears after the selected daily record form and remains disabled until that date has a saved record and a runtime model is ready.
- Selecting another date remounts the panel so a result can never be relabeled or reused across dates.
- Changing the endpoint or model clears the previous result and completed-input marker.
- Persisted runtime settings are treated as untrusted JSON; only string endpoint/model fields are accepted and malformed values fall back to safe defaults.

## Verification

- `npm.cmd test -- --run src/test/frontend/analysis-panel.test.tsx src/test/frontend/App.test.tsx`: 13 tests passed.
- `npm.cmd run lint`: passed without warnings.
- `npm.cmd run build`: passed.
