# Task Breakdown

- Workflow ID: `wf_20260621_app_screen_split`
- Stage: `task_planning`
- Producing agent: `planner`
- Source task ID: `task_app_split_000`
- Timestamp: `2026-06-21T00:00:00+09:00`

## Summary

`src/app/App.tsx`의 화면 구현과 공용 변환 로직을 분리하고, `App.tsx`에는 최상위 상태·내비게이션·화면 조합만 유지한다.

## Tasks

1. UX Architect: 화면 소유 상태, 비동기 흐름과 콜백 경계 정의
2. UI Designer: 컴포넌트·스타일·반응형·접근성 불변 조건 정의
3. Frontend Developer: Today, History, Settings와 공용 타입·매퍼 분리
4. Orchestrator: 설계 기준 통합 리뷰와 전체 회귀 검증

## Completion criteria

- `App.tsx`가 앱 셸과 최상위 조정 역할만 담당한다.
- 화면별 구현이 독립 파일로 이동한다.
- 사용자 문구, UI 구조, 저장·삭제·백업·AI 흐름이 유지된다.
- CSS 시각 동작과 접근성 이름이 유지된다.
- 전체 테스트, 빌드와 린트가 통과한다.

## Inputs used

- 현재 `App.tsx`, 화면 컴포넌트, 저장소와 프론트엔드 테스트

## Open assumptions

- 이번 작업은 기능 추가나 디자인 변경이 아닌 동작 보존 리팩터링이다.
