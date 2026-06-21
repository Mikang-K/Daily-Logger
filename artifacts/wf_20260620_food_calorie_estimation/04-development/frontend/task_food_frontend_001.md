# Frontend implementation notes

- Workflow ID: `wf_20260620_food_calorie_estimation`
- Stage: `implementation`
- Producing agent: `frontend-developer`
- Source task ID: `task_food_frontend_001`
- Timestamp: `2026-06-20T17:35:00+09:00`
- Summary: Added an explicit, user-confirmed local-AI calorie estimation flow to each meal editor.

## Inputs used

- Existing React meal editor and local AI runtime settings.
- AI contract: `LocalLlmClient.estimateFoodCalories`.
- Backend meal metadata contract for `calorieSource` and `calorieEstimate`.

## Implementation

- Added serving and preparation/product context inputs per meal.
- Added estimate, loading, token progress, cancellation, error, retry, review, apply, and direct-entry states.
- Applied the representative calorie value only after explicit confirmation.
- Persisted estimate range, confidence, assumptions, model ID, and timestamp with the meal.
- Marked applied values as `AI 추정`; manual edits clear estimate provenance.
- Reused the local AI endpoint, model, and timeout settings already stored by the analysis panel.

## Verification

- `npm.cmd run build`: passed (133 modules).
- `npm.cmd run lint`: passed.
- Focused frontend tests: 4 passed.
- Full suite: 88 passed, 1 failed due to the concurrently changed database version expectation in `analysis-migration.test.ts` (`2` expected, runtime now `3`). This is outside frontend write scope.

## Open assumptions

- The main local AI settings panel remains the single place where endpoint/model/timeout are configured.
- Food dictionary reuse and cache presentation are handled by backend/storage layers rather than this component.
- An estimate becomes stale when food name, serving, or context changes; an AI-applied numeric value is then cleared.
