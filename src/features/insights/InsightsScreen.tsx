import { useMemo } from 'react';
import type { DailyLog, WeeklyStatistics } from '../../domain';
import { calculateWeeklyComparison, calculateWeeklySeries } from '../../domain';

interface InsightsScreenProps {
  logs: readonly DailyLog[];
  today: string;
}

const dateLabel = (date: string) => new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
const weekLabel = (week: WeeklyStatistics) => `${dateLabel(week.weekStart)}–${dateLabel(week.weekEnd)}`;

const comparisonLabel = (delta: number | undefined, unit: string) => {
  if (delta === undefined) return '비교할 지난주 기록이 없어요';
  if (delta === 0) return '지난주와 같아요';
  return `지난주보다 ${Math.abs(delta).toLocaleString()}${unit} ${delta > 0 ? '높음' : '낮음'}`;
};

function MetricCard({ label, value, unit, comparison, sample }: { label: string; value?: number; unit: string; comparison: string; sample: string }) {
  return <article className="card weekly-metric">
    <span>{label}</span>
    <strong>{value === undefined ? '—' : value.toLocaleString()}<small>{value === undefined ? '' : ` ${unit}`}</small></strong>
    <p>{comparison}</p>
    <em>{sample}</em>
  </article>;
}

export function InsightsScreen({ logs, today }: InsightsScreenProps) {
  const comparison = useMemo(() => calculateWeeklyComparison(logs, today, today), [logs, today]);
  const series = useMemo(() => calculateWeeklySeries(logs, today, 8, today), [logs, today]);
  const weightedWeeks = series.filter((week) => week.averageWeightKg !== undefined);
  const weights = weightedWeeks.map((week) => week.averageWeightKg!);
  const minWeight = weights.length === 0 ? 0 : Math.min(...weights);
  const maxWeight = weights.length === 0 ? 0 : Math.max(...weights);
  const barHeight = (value?: number) => {
    if (value === undefined) return 0;
    if (minWeight === maxWeight) return 60;
    return 28 + ((value - minWeight) / (maxWeight - minWeight)) * 72;
  };
  const { current } = comparison;

  return <div className="page insights-page">
    <p className="eyebrow">하루보다 선명한 한 주의 흐름</p>
    <h1>주간 평균</h1>
    <p className="week-period">이번 주 · {weekLabel(current)}</p>

    <section className="weekly-grid" aria-label="이번 주 평균 요약">
      <MetricCard label="평균 체중" value={current.averageWeightKg} unit="kg" comparison={comparisonLabel(comparison.weightDeltaKg, 'kg')} sample={`체중 ${current.weightSamples}회`} />
      <MetricCard label="평균 섭취 열량" value={current.averageCaloriesPerLoggedDay} unit="kcal" comparison={comparisonLabel(comparison.calorieDelta, 'kcal')} sample={`기록 ${current.daysLogged}/7일`} />
      <MetricCard label="평균 운동 시간" value={current.averageExerciseMinutesPerLoggedDay} unit="분" comparison={comparisonLabel(comparison.exerciseMinutesDelta, '분')} sample={`기록 ${current.daysLogged}/7일`} />
    </section>

    {current.weightSamples === 1 && <p className="sample-notice" role="note">체중 기록이 1회뿐이라 평균의 변화 해석에 주의가 필요해요.</p>}

    <section className="card weekly-chart" aria-labelledby="weekly-weight-title">
      <div className="section-title"><div><h2 id="weekly-weight-title">최근 8주 평균 체중</h2></div><span>kg</span></div>
      {weightedWeeks.length === 0 ? <div className="page-empty small-empty"><p>체중을 기록하면<br />주간 평균의 흐름을 볼 수 있어요.</p></div> : <div className="weekly-bars" role="list" aria-label="최근 8주 평균 체중">
        {series.map((week) => <div key={week.weekStart} role="listitem" className={week.averageWeightKg === undefined ? 'missing' : ''}>
          <span className="bar-value">{week.averageWeightKg === undefined ? '—' : week.averageWeightKg}</span>
          <i style={{ height: `${barHeight(week.averageWeightKg)}%` }} aria-hidden="true" />
          <small>{week.weekStart.slice(5).replace('-', '.')}</small>
        </div>)}
      </div>}
      <p className="chart-caption">각 주 월요일 기준 · 값이 없는 주는 평균에서 제외</p>
    </section>
  </div>;
}
