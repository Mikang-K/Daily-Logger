# PR: 주간 평균 통계 추가

- Workflow ID: `wf_20260619_weekly_average_stats`
- Stage: `release`
- Producing agent: `default` (release 역할 수행)
- Source task ID: `task_weekly_release_001`
- Timestamp: `2026-06-19T09:32:50+09:00`
- Summary: 일일 기록을 월요일 기준으로 집계해 주간 평균과 최근 8주 추이를 제공한다.
- Inputs used: 구현 기록, 테스트 보고서, 리뷰 보고서
- Open assumptions: 주 시작 요일 사용자 설정은 후속 범위

## 주요 변경

- 이번 주 평균 체중, 섭취 열량과 운동 시간
- 지난주 대비 증감량
- 기록 일수와 체중 표본 수
- 체중 표본 1회 안내
- 최근 8주 평균 체중 차트
- 월·연도·윤년 경계를 포함한 주간 통계 테스트

## 검증

- 빌드 통과
- 4개 테스트 파일, 16개 테스트 통과
- ESLint 오류·경고 없음
- 로컬 개발 서버 HTTP 200 확인

