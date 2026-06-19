# Local analysis persistence implementation

- Workflow ID: `wf_20260619_local_llm_analysis`
- Stage: `implementation`
- Producing agent: `backend-architect`
- Source task ID: `task_llm_backend_001`
- Timestamp: `2026-06-19T00:00:00+09:00`
- Summary: Added the Dexie v2 analysis cache, migration, current/stale queries, and lifecycle cleanup.
- Inputs used: `01-product/FEATURE_SPEC.md`, `02-architecture/TECH_DESIGN.md`, `03-planning/TASK_BREAKDOWN.md`, `src/analysis/index.ts`
- Open assumptions: UI confirms destructive clear and replace-import actions.

## Storage behavior

- Version 2 retains the complete v1 schemas and adds `analyses` indexed by ID, date, date/input hash, and creation time.
- Current results match the date/input hash and optional model/prompt identity; all other results for the date are stale.
- Deleting a daily log, clearing all data, or replacing from a backup removes related analysis cache entries transactionally.
- Default JSON export remains schema version 1 and intentionally omits generated analyses.

## Verification limitation

Network restrictions prevented installing an IndexedDB test implementation. Repository behavior is therefore tested through an injected in-memory table port, and the dependency-free migration test verifies the complete Dexie v2 schema declaration. Actual v1-to-v2 data preservation was not executed in Vitest and still requires a browser integration test or an IndexedDB-capable test runtime.
