import { useEffect, useState } from 'react';
import { Icon } from '../components/Icons';
import { TodayScreen } from '../features/daily-log/TodayScreen';
import { HistoryScreen } from '../features/history/HistoryScreen';
import { InsightsScreen } from '../features/insights/InsightsScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { blankLog, appTabs, fromStored, toStored, today, type AppLog, type AppTab } from './app-model';
import { dailyLogRepository } from './app-services';

export function App() {
  const [tab, setTab] = useState<AppTab>('today');
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [draft, setDraft] = useState(blankLog());

  const refreshData = async () => {
    const items = await dailyLogRepository.listAll();
    setLogs(items.map(fromStored));
    const current = await dailyLogRepository.getByDate(draft.date);
    setDraft(current ? fromStored(current) : blankLog(draft.date));
  };

  useEffect(() => {
    dailyLogRepository.listAll()
      .then(items => setLogs(items.map(fromStored)))
      .catch(() => setLogs([]));
  }, []);

  const changeDate = async (date: string) => {
    const stored = await dailyLogRepository.getByDate(date);
    setDraft(stored ? fromStored(stored) : blankLog(date));
  };

  const removeLog = async (date: string) => {
    if (!window.confirm(`${date} 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    await dailyLogRepository.remove(date);
    setLogs(existing => existing.filter(log => log.date !== date));
    if (draft.date === date) setDraft(blankLog(date));
  };

  const saveLog = async () => {
    const saved = fromStored(await dailyLogRepository.save(toStored(draft)));
    setDraft(saved);
    setLogs(existing => [...existing.filter(log => log.date !== saved.date), saved].sort((left, right) => left.date.localeCompare(right.date)));
  };

  const content = ({
    today: (
      <TodayScreen
        log={draft}
        setLog={setDraft}
        saveLog={saveLog}
        changeDate={changeDate}
        hasSavedRecord={logs.some(log => log.date === draft.date)}
      />
    ),
    history: (
      <HistoryScreen
        logs={logs}
        open={log => {
          setDraft(log);
          setTab('today');
        }}
        remove={removeLog}
      />
    ),
    insights: <InsightsScreen logs={logs.map(toStored)} today={today} />,
    settings: <SettingsScreen onDataChanged={refreshData} />,
  })[tab];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#today" onClick={() => setTab('today')}><span>하루</span>결</a>
        <span className="privacy">기록은 이 기기에만 저장돼요</span>
      </header>
      <main>{content}</main>
      <nav className="bottom-nav" aria-label="주요 메뉴">
        {appTabs.map(item => (
          <button key={item.id} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}>
            <Icon name={item.id} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
