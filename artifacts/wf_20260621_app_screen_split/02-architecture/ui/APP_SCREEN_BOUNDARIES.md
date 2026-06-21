# App screen split: UI boundary specification

- Workflow ID: `wf_20260621_app_screen_split`
- Stage: `technical_design`
- Producing agent: `ui-designer`
- Source task ID: `task_app_split_ui_001`
- Timestamp: `2026-06-21T12:17:53+09:00`
- Summary: Defines behavior-preserving visual/component boundaries for decomposing `src/app/App.tsx` without redesigning the interface.
- Inputs used: `src/app/App.tsx`, `src/styles/global.css`, `src/test/frontend/App.test.tsx`, current feature/component file inventory.
- Open assumptions: Screen files remain mounted only while their tab is active; existing Korean copy, CSS classes, navigation model, persistence behavior, and confirmation dialogs remain unchanged.

## Boundary map

`App` remains the composition root and owns only application-wide navigation and persisted-log coordination:

```text
App
├─ AppHeader
├─ active screen
│  ├─ TodayScreen
│  │  ├─ TodayHero
│  │  ├─ DailySummary
│  │  ├─ BodyConditionSection
│  │  ├─ MealsSection -> MealEntryEditor
│  │  ├─ ExercisesSection
│  │  ├─ DailyNoteSection
│  │  └─ AnalysisPanel
│  ├─ HistoryScreen
│  │  └─ HistoryRow
│  ├─ InsightsScreen (existing feature)
│  └─ SettingsScreen
│     ├─ GoalSettingsSection
│     ├─ DataBackupSection
│     └─ DangerZone
└─ BottomNavigation
```

The required first split is at screen level. Smaller section components are optional and should be introduced only when they remove meaningful state/event complexity from a screen; they must not create one-line wrapper components.

## File ownership

| File | Responsibility | State allowed |
| --- | --- | --- |
| `src/app/App.tsx` | Compose shell, choose active screen, coordinate repository-backed logs | active tab, all logs, current draft |
| `src/app/app-model.ts` or equivalent | Shared `Tab`, `Log`, `Meal`, `Exercise` types and pure storage adapters/helpers | none |
| `src/app/components/AppHeader.tsx` | Brand link and local-privacy statement | none |
| `src/app/components/BottomNavigation.tsx` | Four-tab navigation | none; controlled by props |
| `src/app/screens/TodayScreen.tsx` | Editing one daily log, save feedback, AI analysis placement | saved/error feedback only |
| `src/app/screens/HistoryScreen.tsx` | Empty history and dated history list | none |
| `src/app/screens/SettingsScreen.tsx` | Goal settings, backup import/export, destructive reset | settings completion feedback and input values |

`InsightsScreen` remains in `src/features/insights`; it is already separated and represents a domain feature rather than shell-owned UI.

## Props and event boundaries

Keep each screen controlled by `App` for cross-screen data. Recommended interfaces:

```ts
type TodayScreenProps = {
  log: Log;
  hasSavedRecord: boolean;
  onLogChange: (log: Log) => void;
  onSave: () => Promise<void>;
  onDateChange: (date: string) => Promise<void>;
};

type HistoryScreenProps = {
  logs: Log[];
  onOpen: (log: Log) => void;
  onRemove: (date: string) => Promise<void>;
};

type SettingsScreenProps = {
  onDataChanged: () => Promise<void>;
};
```

Repository, backup, settings, and AI controller instances must stay module singletons or be explicitly injected. A split must not create new instances on render. Storage conversion helpers belong in the shared app model, not in visual screen modules.

## Visual invariants

- Preserve the DOM landmarks: one `.app-shell`, one header, one `main`, and one primary navigation.
- Preserve screen roots: Today uses `.screen-stack`; History and Settings use `.page`.
- Preserve card order and Today section numbering `01` through `04`.
- Keep `AnalysisPanel` after the save action and feedback so analysis remains contingent on a saved record.
- Keep the four bottom-navigation items and their current order.
- Keep existing CSS class names. Screen extraction needs no CSS selectors or import changes because all styling is global and selectors are not file-coupled.
- Do not introduce new fixed containers, nested scroll regions, layout widths, colors, typography, animation, or responsive breakpoints.
- Preserve desktop side navigation behavior at `min-width: 850px` and mobile adaptations at `520px`/`620px`.

## Responsive invariants

- The usable viewport must remain valid from the declared `320px` body minimum upward.
- At `max-width: 520px`, retain hidden privacy text, compact headers/cards, icon-only condition labels, stacked runtime fields, and narrow meal-estimation margins.
- History rows must continue to collapse their detail line beneath the date on mobile.
- Weekly metrics must continue to stack at `max-width: 620px`.
- Inputs must retain `min-width: 0` behavior inside grid rows to avoid horizontal overflow.
- The fixed navigation must retain safe-area padding and must not cover the final Today/Settings action.

## Accessibility invariants

- Preserve semantic `header`, `main`, `nav`, `section`, `fieldset`, `legend`, `label`, `time`, and heading elements.
- Preserve `aria-current="page"` on exactly one navigation button.
- Preserve `aria-pressed` on condition choices and analysis state controls.
- Every date, meal, exercise, file, and destructive action control must retain its accessible name.
- Save failures remain `role="alert"`; successful saves and settings changes remain `role="status"`.
- Removal controls remain separate buttons from row-opening controls; no nested interactive controls.
- Keyboard focus order must follow visible order and focus outlines must remain unmodified.
- File input hiding must continue to leave its label keyboard-operable.
- Do not use lifecycle DOM queries for settings fields after extraction if controlled inputs can preserve behavior; if retained for strict behavior preservation, query only within the screen root rather than global `.page`.

## Behavior invariants and regression checks

- Switching tabs must not overwrite the current draft.
- Opening history must load the selected log and move to Today.
- Date changes must retrieve the matching saved log or create a blank draft for that date.
- Saving must update both current draft and sorted history.
- Deleting the active date must reset only that date's draft.
- Import, clear-all, and goal save must refresh app-level data once.
- Empty meal validation must still announce the error.
- Calorie totals must exclude `unknown` meals and mark AI-estimated totals.
- Existing `App.test.tsx` queries must continue to pass without changing labels merely to satisfy extraction.

## UI review checklist for the concurrent implementation

1. `App.tsx` contains no screen markup beyond choosing a screen and shell composition.
2. Screen modules use stable, named props and do not import the repository directly unless that ownership is explicitly retained from the original.
3. Extracted shell components do not alter landmarks or navigation semantics.
4. No CSS changes are required solely because modules moved.
5. Tests cover navigation, date loading, save validation, and at least one settings/history interaction after extraction.
6. Build and frontend tests pass with no circular imports.

## Post-implementation UI review

Reviewed files:

- `src/app/App.tsx`
- `src/app/app-model.ts`
- `src/app/app-services.ts`
- `src/app/FormField.tsx`
- `src/features/daily-log/TodayScreen.tsx`
- `src/features/history/HistoryScreen.tsx`
- `src/features/settings/SettingsScreen.tsx`

Result: **approved for behavior-preserving screen separation**.

- `App.tsx` now contains only app-level data coordination, active-screen composition, and shell/header/navigation markup.
- Today, History, and Settings are separated along user-visible screen boundaries; the pre-existing Insights feature remains correctly isolated.
- Shared log types, conversions, dates, and tabs are pure exports in `app-model.ts`; storage service instances remain stable module singletons in `app-services.ts`.
- `FormField` preserves the label/input relationship and all existing class hooks.
- DOM order, landmarks, screen root classes, Today card order, section numbering, save feedback, and `AnalysisPanel` placement are unchanged.
- Navigation retains its four-item order and `aria-current="page"`; condition controls retain `aria-pressed`; error/success feedback retains alert/status semantics.
- History open and delete remain sibling controls, avoiding nested interactive elements.
- Existing CSS selectors remain compatible. No CSS change was necessary, so mobile, desktop side-navigation, safe-area, and reduced-motion behavior are structurally preserved.
- The frontend implementer reports that the build, 21 frontend tests, and lint all pass.

Non-blocking residual risks:

- `SettingsScreen` retains the pre-existing global `.page input[type="number"]` query. This preserves behavior but couples the screen to DOM structure; converting those two fields to controlled state should be a separate behavior-tested cleanup.
- Async date reads can still resolve out of order after very rapid date changes. This is pre-existing application behavior and outside the visual split scope.
- The existing source copy appears mojibaked in terminal output. The refactor preserved it byte-for-content rather than broadening scope into localization/content correction.
