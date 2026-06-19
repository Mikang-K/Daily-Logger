# 주간 평균 통계 기술 설계

- Workflow ID: `wf_20260619_weekly_average_stats`
- Stage: `technical_design`
- Producing agent: `default` (architect 역할 수행)
- Source task ID: `task_weekly_architecture_001`
- Timestamp: `2026-06-19T00:00:00+09:00`
- Summary: 달력 주 경계 계산, 주간 집계 모델, UI 연결과 테스트 전략을 정의한다.
- Inputs used: `01-product/FEATURE_SPEC.md`, 현재 도메인 모델·통계 함수·통계 화면
- Open assumptions: 별도 날짜 라이브러리 없이 순수 TypeScript 유틸리티로 구현

## 1. 현재 구조에서 확인된 문제

현재 `InsightsScreen`은 `logs.slice(-range)`를 사용한다. 이는 최근 7일이 아니라 최근 7개의 기록을 의미하며, 기록 공백과 미래 날짜를 고려하지 않는다. 화면 안에서 직접 평균을 계산하면 도메인 테스트도 어렵다.

개선 방향:

- 날짜 범위 계산을 `src/domain`의 순수 함수로 이동
- 화면은 계산된 `WeeklyStatistics`만 렌더링
- 문자열 날짜를 로컬 달력 날짜로 안전하게 처리
- 일별 원본 기록과 주간 파생값을 별도로 저장하지 않음

## 2. 제안 데이터 모델

```ts
interface WeeklyStatistics {
  weekStart: string; // Monday, YYYY-MM-DD
  weekEnd: string;   // Sunday, YYYY-MM-DD
  daysLogged: number;
  weightSamples: number;
  averageWeightKg?: number;
  averageCaloriesPerLoggedDay?: number;
  averageExerciseMinutesPerLoggedDay?: number;
}

interface WeeklyComparison {
  current: WeeklyStatistics;
  previous?: WeeklyStatistics;
  weightDeltaKg?: number;
  calorieDelta?: number;
  exerciseMinutesDelta?: number;
}
```

빈 주의 평균은 `0`이 아니라 `undefined`로 표현한다. `daysLogged`와 `weightSamples`는 UI가 신뢰도 안내를 결정할 수 있도록 유지한다.

## 3. 순수 함수 계약

`src/domain/weekly-statistics.ts` 추가를 제안한다.

```ts
getWeekBounds(referenceDate: string): { startDate: string; endDate: string }
calculateWeeklyStatistics(logs: readonly DailyLog[], weekStart: string, today: string): WeeklyStatistics
calculateWeeklyComparison(logs: readonly DailyLog[], referenceDate: string, today: string): WeeklyComparison
calculateWeeklySeries(logs: readonly DailyLog[], referenceDate: string, weeks: number, today: string): WeeklyStatistics[]
```

규칙:

- 날짜 파싱 시 `new Date('YYYY-MM-DD')`를 직접 사용하지 않고 연·월·일을 분리한다.
- 달력 연산은 로컬 시간 또는 UTC 정오 기준으로 일관되게 수행해 DST 경계를 피한다.
- `today`를 인자로 받아 테스트가 시스템 시각에 의존하지 않게 한다.
- 로그는 날짜 범위로 필터한 뒤 날짜순으로 처리한다.
- 동일 날짜 중복은 저장 계층에서 방지되지만 계산 함수도 입력을 변경하지 않는다.

## 4. 계산 세부 규칙

- 이번 주 범위는 `max(weekStart, ...)`부터 `min(weekEnd, today)`까지만 사용한다.
- `daysLogged`는 범위 내 `DailyLog` 개수다.
- `weightSamples`는 `weightKg !== undefined`인 로그 개수다.
- 평균 체중은 체중 표본 합계 ÷ `weightSamples`다.
- 열량 및 운동 평균은 합계 ÷ `daysLogged`다.
- `daysLogged === 0`이면 열량과 운동 평균도 `undefined`다.
- 반올림은 최종 반환 단계에서만 수행한다.
- 최근 8주 시리즈는 오래된 주부터 현재 주까지 반환한다.

## 5. 화면 통합

현재 한 줄로 밀집된 `InsightsScreen`을 별도 파일로 분리하는 것을 권장한다.

```text
src/features/insights/
  InsightsScreen.tsx
  WeeklySummaryCards.tsx
  WeeklyWeightChart.tsx
```

구현 순서:

- 앱의 `logs`를 기존 UI `Log`가 아니라 도메인 `DailyLog` 또는 명시적 변환 결과로 전달
- 화면 렌더링 시 현재 로컬 날짜를 기준으로 주간 비교와 8주 시리즈 계산
- 평균 카드에는 값, 단위, 전주 대비, 표본 수를 함께 표시
- 차트는 데이터가 있는 주만 값으로 표시하되 빈 주의 시간축 위치는 유지
- SVG 또는 CSS 차트를 쓸 경우 최소·최대 값이 같을 때 0으로 나누지 않게 처리

## 6. 테스트 전략

### 도메인 테스트

- 월요일과 일요일이 동일 주로 계산됨
- 일요일 다음 날 월요일이 새 주로 계산됨
- 월·연도 경계 및 윤년
- 입력 정렬 순서에 무관한 결과
- 체중 결측치 분모 제외
- 기록 없는 날 분모 제외
- 미래 날짜 제외
- 빈 주 `undefined` 처리
- 소수점 반올림
- 최근 8주 시간순 정렬

### 컴포넌트 테스트

- 이번 주 평균 3종과 표본 수 렌더링
- 전주 대비 증가·감소·동일 표시
- 지난주 데이터가 없을 때 대체 문구
- 체중 표본 1회의 낮은 신뢰도 안내
- 기록이 없을 때 빈 상태

### 회귀 검증

- 기존 일일 기록 저장·조회·삭제 테스트 유지
- `npm.cmd run build`, `npm.cmd test`, `npm.cmd run lint` 통과
- 실제 브라우저 360px 및 데스크톱 화면 확인

## 7. 위험과 대응

- 주 경계 오류: 날짜 연산을 한 모듈로 집중하고 경계 테스트를 우선 작성한다.
- 평균 의미 오해: 카드에 `기록한 날 기준`과 표본 수를 항상 표시한다.
- 현재 주와 완료된 주 비교의 불균형: 값과 함께 `이번 주 3/7일`을 표시하며 자동 보정은 하지 않는다.
- 차트 과장: 축 범위와 단위를 표시하고 값이 없는 주를 선으로 임의 연결하지 않는다.

