# PR Description

- Workflow ID: `wf_20260621_app_screen_split`
- Stage: `release`
- Producing agent: `release`
- Source task ID: `task_app_split_000`
- Timestamp: `2026-06-21T12:23:00+09:00`

## Summary

단일 `App.tsx`에 있던 오늘 기록, 지난 기록과 설정 화면을 기능별 모듈로 분리하고 앱 셸은 상태·내비게이션·저장소 조정에 집중하도록 리팩터링한다.

## Changes

- `TodayScreen`, `HistoryScreen`, `SettingsScreen` 추출
- 공용 앱 모델·저장 변환과 서비스 인스턴스 분리
- 공통 `FormField` 추출
- 음식 편집 타입을 독립 계약 파일로 이동
- 기존 UI 문구, 클래스, ARIA와 비동기 동작 유지

## Verification

- 테스트 89개 통과
- 프로덕션 빌드 통과, 139개 모듈
- ESLint 통과

## Inputs used

- Frontend Developer 구현
- UI Designer와 UX Architect 경계 검토

## Open assumptions

- 기능 변경과 시각 재설계는 포함하지 않는다.
