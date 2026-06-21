import { Icon } from '../../components/Icons';
import type { AppLog } from '../../app/app-model';

export function HistoryScreen({ logs, open, remove }: {
  logs: AppLog[];
  open: (log: AppLog) => void;
  remove: (date: string) => Promise<void>;
}) {
  return (
    <div className="page">
      <p className="eyebrow">차곡차곡 쌓인 하루</p>
      <h1>지난 기록</h1>
      {logs.length === 0 ? (
        <div className="card page-empty">
          <span>📖</span>
          <h2>아직 기록이 없어요</h2>
          <p>오늘의 식사부터 가볍게 남겨보세요.</p>
        </div>
      ) : (
        <div className="history-list">
          {logs.map(log => {
            const counted = log.meals.filter(meal => meal.calorieSource !== 'unknown');
            const estimated = counted.some(meal => meal.calorieSource === 'ai_estimated');
            const unknown = log.meals.length - counted.length;
            return (
              <div className="card history-row" key={log.date}>
                <button className="history-item" onClick={() => open(log)}>
                  <time>{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${log.date}T12:00:00`))}</time>
                  <span>{estimated ? '약 ' : ''}{counted.reduce((sum, meal) => sum + meal.calories, 0).toLocaleString()} kcal{unknown > 0 ? ` + 미산정 ${unknown}` : ''} · {log.weight ? `${log.weight} kg` : '체중 미기록'}</span>
                  <b>›</b>
                </button>
                <button type="button" className="history-delete" aria-label={`${log.date} 기록 삭제`} onClick={() => void remove(log.date)}><Icon name="trash" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
