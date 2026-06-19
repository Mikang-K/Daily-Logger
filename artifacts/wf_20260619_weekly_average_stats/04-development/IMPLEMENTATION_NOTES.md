# 주간 평균 통계 구현 기록

- Workflow ID: `wf_20260619_weekly_average_stats`
- Stage: `implementation`
- Producing agent: `default` (developer 역할 수행)
- Source task ID: `task_weekly_implementation_001`
- Timestamp: `2026-06-19T09:32:50+09:00`
- Summary: 월요일 기준 주간 평균, 전주 비교, 최근 8주 체중 추이와 데이터 충족도 UI를 구현했다.
- Inputs used: 기능 요구사항, 기술 설계, 작업 분해, 기존 도메인·통계 화면
- Open assumptions: 시스템 로컬 날짜를 오늘 기준으로 사용하며 주 시작 요일은 월요일로 고정

## 변경 내용

- `WeeklyStatistics`, `WeeklyComparison` 도메인 모델 추가
- 달력 날짜 덧셈 및 월요일~일요일 경계 계산 추가
- 주간 평균 체중, 섭취 열량, 운동 시간 계산 추가
- 이번 주와 지난주 증감량 계산 추가
- 오래된 주부터 정렬된 최근 8주 시리즈 계산 추가
- 미래 날짜, 체중 결측치, 빈 주 처리
- 통계 화면을 별도 기능 컴포넌트로 분리
- 평균 카드, 표본 수, 낮은 표본 안내와 8주 차트 구현
- 도메인·컴포넌트 테스트 8개 추가

## 변경 파일

- `src/domain/models.ts`
- `src/domain/weekly-statistics.ts`
- `src/domain/index.ts`
- `src/features/insights/InsightsScreen.tsx`
- `src/app/App.tsx`
- `src/styles/global.css`
- `src/test/backend/weekly-statistics.test.ts`
- `src/test/frontend/InsightsScreen.test.tsx`

