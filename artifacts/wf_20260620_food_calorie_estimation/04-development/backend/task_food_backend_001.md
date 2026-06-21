# Backend implementation notes

- Workflow ID: `wf_20260620_food_calorie_estimation`
- Stage: `implementation`
- Producing agent: `backend-architect`
- Source task ID: `task_food_backend_001`
- Timestamp: `2026-06-20T17:33:32+09:00`
- Summary: Added backward-compatible calorie provenance, validated AI estimate metadata, honest unknown-calorie statistics, and a persistent confirmed-food dictionary.

## Inputs used

- Existing `MealEntry`, daily/weekly statistics, Dexie database, backup service, and repository patterns.
- Approved plan for food-name calorie estimation and user confirmation.

## Implementation

- Legacy meals without `calorieSource` parse as `manual`.
- `unknown` meals retain a numeric compatibility value but are excluded from calorie totals.
- Daily, range, and weekly results expose estimated and unknown meal counts.
- AI estimates validate range ordering, representative value, confidence, assumptions, model ID, and timestamp.
- Dexie version 3 adds `confirmedFoods` without modifying or deleting existing rows.
- Confirmed profiles use a normalized name/serving/preparation identity and support get/list/save/remove.
- JSON backup optionally carries confirmed food profiles; older backups remain valid.

## Verification

- `npm.cmd test -- src/test/backend/food-calorie.test.ts`: 5 passed.
- Combined backend-focused run with domain and weekly statistics: 15 passed.
- Full build/lint was attempted while agents were editing in parallel; the remaining errors were isolated to the concurrently modified frontend `FoodCalorieEstimator.tsx`, and were reported to the orchestrator.

## Open assumptions and risks

- `MealEntry.calories` remains required for compatibility. A meal is considered uncalculated only when `calorieSource === "unknown"`; callers must not infer this state from a zero value.
- Confirmed-food matching is exact after Unicode, case, and whitespace normalization. Fuzzy matching is intentionally outside this storage layer.
- Existing direct reads from IndexedDB do not materialize the schema default. Statistics deliberately interpret a missing source as counted legacy/manual data.
