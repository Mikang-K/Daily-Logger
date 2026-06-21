# UX screen-boundary design

- Workflow ID: `wf_20260621_app_screen_split`
- Stage: `technical_design`
- Producing agent: `ux-architect`
- Source task ID: `task_app_split_ux_001`
- Timestamp: `2026-06-21T12:19:01+09:00`
- Summary: Defines behavior-preserving ownership boundaries for splitting `App.tsx` into a shell and four screen modules.
- Inputs used: `src/app/App.tsx`, `src/features/insights/InsightsScreen.tsx`, storage repositories/services, domain models, and frontend tests.
- Open assumptions: The current labels and visual design remain unchanged; routing continues to be in-memory tab navigation; dependency injection and URL routing are outside this refactor.

## Current UX structure

`App.tsx` currently combines five responsibilities: application shell/navigation, persisted-log orchestration, domain/view-model mapping, the Today screen, the History screen, and the Settings screen. Insights is already isolated. The split should change module ownership only; user-visible flow, persistence timing, confirmations, validation feedback, and analysis behavior must remain stable.

## Target ownership

| Module | Owns | Receives / emits |
| --- | --- | --- |
| `App` / app shell | active tab, canonical `logs`, selected-date `draft`, repository orchestration, top bar and bottom navigation | Passes screen props; handles navigation and persisted data changes |
| Today screen | temporary save-success and save-error feedback; rendering and editing the provided draft | Receives `log`, `hasSavedRecord`; emits full draft changes, date selection, save request |
| History screen | list and empty-state presentation only | Receives `logs`; emits open-record and remove-record intents |
| Insights screen | derived chart/statistics presentation | Receives persisted `DailyLog[]` and current date; emits nothing |
| Settings screen | editable target values, operation status, selected import file interaction | Receives settings/backup operations or an application-level data-changed callback |
| Shared form field | label/suffix/input layout only | Receives presentational props; owns no state |
| Log mapper/model module | `Log`/`Meal`/`Exercise` view types plus stored/view conversion and blank-log creation | Pure functions only |

## Shell-owned state and data flow

The shell remains the single source of truth for `tab`, persisted `logs`, and the currently selected `draft`. It should retain these workflows:

1. Initial load reads all records and updates `logs`.
2. Date selection reads the selected date and replaces `draft` with the stored record or a blank record for that date.
3. Save converts `draft`, persists it, replaces the canonical draft with the saved result, and upserts/sorts the corresponding list entry.
4. Delete confirms, removes persisted data, updates `logs`, and clears the draft only when it targets the selected date.
5. Import, settings save, or clear triggers the existing refresh behavior.
6. Opening a history item replaces `draft` and moves the user to Today in the same interaction.

Screens must not instantiate a second daily-log repository or keep a second copy of canonical log data. Callback identities need not be stable for correctness, but their input/output contract must remain explicit and typed.

Recommended contracts:

```ts
type TodayScreenProps = {
  log: EditableLog;
  hasSavedRecord: boolean;
  onLogChange: (next: EditableLog) => void;
  onDateChange: (date: string) => Promise<void>;
  onSave: () => Promise<void>;
};

type HistoryScreenProps = {
  logs: readonly EditableLog[];
  onOpen: (log: EditableLog) => void;
  onRemove: (date: string) => Promise<void>;
};
```

## Screen-owned state

- Today owns only transient `saved` and `error` feedback. Every edit clears both before forwarding the next draft.
- Meal-calorie estimation remains owned by `MealEntryEditor` and its existing controller. Splitting the screen must not remount an editor during unrelated edits or replace meal IDs.
- Settings should own controlled `targetWeightKg` and `dailyCalorieTarget` fields plus completion/error feedback. The current document-wide query is an implementation coupling and should not cross the new screen boundary. Converting it to controlled state is acceptable only if load/save behavior and visible values are unchanged.
- History owns no canonical state. Confirmation and deletion remain coordinated by the shell so data changes stay atomic from the user's perspective.
- Insights keeps its current memoized derived values and receives only persisted logs, not an unsaved draft.

## Navigation invariants

- Default tab is Today.
- Exactly one bottom-navigation item has `aria-current="page"`.
- Selecting a bottom-navigation item displays only that screen without losing the current Today draft.
- Opening a history record selects that record as the draft and navigates to Today.
- The brand action navigates to Today and preserves the current draft.
- Changing the Today date stays on Today and loads that date.
- Settings and Insights do not mutate the selected draft.
- Screen extraction must not introduce nested landmarks: one app-level `main`, one primary navigation, and screen content beneath them.

## Async and error risks

1. Rapid date changes can resolve out of order and show the wrong record. Do not worsen this during extraction; a later behavior change should add request sequencing or cancellation with dedicated tests.
2. `refreshData` reads `draft.date` from its render closure. Screen callbacks must call the latest shell callback rather than capture an older draft inside a screen effect.
3. Save and delete can overlap with navigation. Keep the mutation in the shell and update canonical state only after persistence succeeds.
4. Initial `listAll` rejection currently falls back to an empty history. Preserve that result; broader error UI is separate scope.
5. Settings initialization is asynchronous. Avoid setting local state after unmount, and do not overwrite user edits if loading resolves after they begin typing.
6. Import failures must retain existing data and preserve the current alert behavior. Clear and delete must retain their confirmation gates.
7. Today save failures must keep the draft intact and expose the existing accessible `role="alert"` message.
8. `AnalysisPanel` is keyed by date. Preserve this key so date changes reset its date-specific local state, while ordinary draft edits use `inputFingerprint` to mark analysis stale.
9. Repository/service instances should remain application singletons or be passed from the composition root. Recreating them on screen renders can complicate tests and lifecycle reasoning.

## Suggested file boundaries

```text
src/app/App.tsx                         # composition, state, persistence, shell
src/app/log-view-model.ts               # editable types, blank/mapping helpers
src/components/Field.tsx                # shared presentational field
src/features/today/TodayScreen.tsx
src/features/history/HistoryScreen.tsx
src/features/settings/SettingsScreen.tsx
src/features/insights/InsightsScreen.tsx # existing
```

The app-specific local LLM controllers stay in `src/app` as composition-root dependencies; the Today screen consumes the already established controller behavior through existing components.

## Behavior-preserving acceptance checklist

- [ ] `App.tsx` contains shell/data orchestration and no screen markup beyond top bar, `main`, and bottom navigation.
- [ ] Today, History, Settings, and Insights each have an explicit typed public props contract.
- [ ] The Today draft survives navigation to another tab and back.
- [ ] Date selection loads a saved record or a blank record for that exact date.
- [ ] Saving upserts and date-sorts history and retains the saved draft.
- [ ] Opening history navigates to Today with the selected record.
- [ ] Delete and clear confirmation gates remain present, and deleting the selected record clears its draft.
- [ ] Import/export/settings operations retain their current visible success/failure behavior.
- [ ] Meal add/edit/remove, calorie summaries, estimation source labels, and analysis stale/reset semantics remain unchanged.
- [ ] Existing accessible names, alert/status roles, `aria-current`, and keyboard-operable buttons remain unchanged.
- [ ] Existing App and Insights tests pass; focused screen tests cover each extracted screen's contract.
- [ ] Build and lint pass with no circular dependencies between `app`, `features`, `storage`, and `domain`.

## Deferred improvements

URL-based routing, explicit loading screens, optimistic persistence, race cancellation, dependency injection, and replacement of alerts/confirms with dialogs are useful follow-ups but are behavior changes. They should not be bundled into this extraction.
