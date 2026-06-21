# Test Report

- Workflow ID: `wf_20260621_app_screen_split`
- Stage: `test`
- Producing agent: `tester` (orchestrator verification)
- Source task ID: `task_app_split_000`
- Timestamp: `2026-06-21T12:23:00+09:00`

## Summary

`App.tsx` 화면별 분리 후 일일 기록, 기록 탐색, 설정, 통계, 로컬 AI와 저장소 흐름의 회귀 여부를 검증했다.

## Results

- `npm.cmd test -- --run`: 13개 파일, 89개 테스트 통과
- `npm.cmd run build`: TypeScript·Vite 빌드 통과, 139개 모듈 변환
- `npm.cmd run lint`: ESLint 오류·경고 없음

## Verified invariants

- 탭 순서와 `aria-current` 내비게이션 의미
- 기록 초안, 날짜 변경, 저장, 삭제와 기록 열기
- `AnalysisPanel` 배치, 날짜 키와 입력 fingerprint
- 음식 칼로리 추정 컨트롤러 연결
- 설정 저장, 백업·복원과 전체 삭제
- 기존 클래스 이름과 반응형 CSS 훅

## Inputs used

- UI Designer와 UX Architect의 화면 경계 명세
- Frontend Developer의 분리 결과
- 전체 자동 테스트와 정적 검증

## Open assumptions

- 실제 브라우저 시각 회귀와 IndexedDB E2E는 별도 범위다.
