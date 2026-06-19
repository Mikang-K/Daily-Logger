# Backend architecture implementation notes

- Workflow ID: `wf_20260619_daily_diet_log`
- Stage: `implementation`
- Producing agent: `backend-architect`
- Source task ID: `task_backend_001`
- Timestamp: `2026-06-19T00:00:00+09:00`
- Summary: Added framework-independent domain validation/statistics and a repository-based Dexie persistence layer with atomic JSON backup import.
- Inputs used: `01-product/PRD.md`, `02-architecture/TECH_DESIGN.md`
- Open assumptions: The frontend package configuration will provide `zod`, `dexie`, and `vitest`; destructive clear/replace actions are gated by UI confirmation.

## Public boundaries

- `src/domain`: Models, Zod schemas, statistics, and bounded JSON parsing/serialization.
- `src/storage`: Dexie database, repository interfaces, settings persistence, and transactional backup operations.

## Safety properties

- Calendar dates and documented numeric bounds are validated before persistence.
- Backup input is limited to 10 MB and validated in full before a transaction begins.
- Replace imports clear and restore data in one Dexie transaction.
- Duplicate dates in an imported file are rejected.

## Required dependencies

Runtime: `dexie`, `zod`. Development/test: `vitest`.
