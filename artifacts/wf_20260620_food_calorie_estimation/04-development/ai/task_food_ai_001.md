# AI implementation notes

- Workflow ID: `wf_20260620_food_calorie_estimation`
- Stage: `implementation`
- Producing agent: `ai-engineer`
- Source task ID: `task_food_ai_001`
- Timestamp: `2026-06-20T17:34:00+09:00`
- Summary: Added a strict, streaming Ollama-compatible food calorie estimation contract and implementation.

## Inputs used

- Existing `LocalLlmClient`, Ollama streaming transport, timeout, cancellation, and keep-alive behavior.
- Product requirement for a calorie range, representative value, confidence, assumptions, and a single repair attempt.

## Changes

- Added strict request/result TypeScript contracts and Zod schemas.
- Enforced integer calorie values from 0 through 10,000 and `min <= representative <= max`.
- Added a Korean system prompt that treats all food fields as untrusted data and ignores embedded instructions.
- Added `estimateFoodCalories` to `LocalLlmClient` using the existing streaming transport, progress events, timeout, cancellation, and keep-alive.
- Limited malformed-output repair to one retry and retained no raw output outside the in-memory request flow.
- Added focused contract, prompt, retry, transport, and no-logging tests.

## Verification

- `npm.cmd test -- src/test/ai/food-calorie-estimation.test.ts src/test/ai/local-http-client.test.ts`: 29 tests passed.
- `npm.cmd run lint`: AI changes pass; repository lint was blocked by a concurrent frontend `react-hooks/set-state-in-effect` error.
- `npm.cmd run build`: AI changes produced no diagnostics; repository build was blocked by concurrent frontend/storage TypeScript errors.

## Open assumptions

- One food estimate represents one stated serving, not an entire meal unless the food name says so.
- The UI performs explicit user confirmation before any estimate is persisted.
- Product-specific nutrition labels remain preferable to model estimates.
