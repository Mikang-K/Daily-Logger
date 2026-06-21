import { useEffect, useState } from 'react';
import { Icon } from '../components/Icons';
import type { DailyLog } from '../domain';
import { InsightsScreen } from '../features/insights/InsightsScreen';
import { AnalysisPanel } from '../features/analysis/AnalysisPanel';
import { MealEntryEditor, type EditableMeal } from '../features/calorie-estimation/MealEntryEditor';
import { BackupService, DexieDailyLogRepository, SettingsRepository } from '../storage';
import { localAnalysisController } from './local-analysis-controller';
import { localFoodCalorieController } from './local-food-calorie-controller';

type Tab = 'today' | 'history' | 'insights' | 'settings';
type Meal = EditableMeal;
type Exercise = { id: string; name: string; minutes: number };
type Log = { date: string; weight?: number; water?: number; condition?: number; note: string; meals: Meal[]; exercises: Exercise[] };

const today = new Date().toLocaleDateString('sv-SE');
const tabs: { id: Tab; label: string }[] = [
  { id: 'today', label: '오늘' }, { id: 'history', label: '기록' }, { id: 'insights', label: '통계' }, { id: 'settings', label: '설정' },
];
const blankLog = (date = today): Log => ({ date, note: '', meals: [], exercises: [] });
const numberOrUndefined = (value: string) => value === '' ? undefined : Number(value);
const repository = new DexieDailyLogRepository();
const backupService = new BackupService();
const settingsRepository = new SettingsRepository();
const fromStored = (log: DailyLog): Log => ({ date: log.date, weight: log.weightKg, water: log.waterMl, condition: log.condition, note: log.note ?? '', meals: log.meals, exercises: log.exercises.map(x => ({ id: x.id, name: x.name, minutes: x.durationMinutes })) });
const toStored = (log: Log): DailyLog => { const now = new Date().toISOString(); return { date: log.date, weightKg: log.weight, waterMl: log.water, condition: log.condition as DailyLog['condition'], note: log.note || undefined, meals: log.meals.map(m => ({ ...m, type: m.type as DailyLog['meals'][number]['type'] })), exercises: log.exercises.map(x => ({ id: x.id, name: x.name, durationMinutes: x.minutes })), createdAt: now, updatedAt: now, schemaVersion: 1 }; };

function Field({ label, suffix, children }: { label: string; suffix?: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span><div className="input-wrap">{children}{suffix && <span className="suffix">{suffix}</span>}</div></label>;
}

function TodayScreen({ log, setLog, saveLog, changeDate, hasSavedRecord }: { log: Log; setLog: (log: Log) => void; saveLog: () => Promise<void>; changeDate: (date: string) => Promise<void>; hasSavedRecord: boolean }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const calories = log.meals.filter(meal => meal.calorieSource !== 'unknown').reduce((sum, meal) => sum + meal.calories, 0);
  const estimatedMeals = log.meals.filter(meal => meal.calorieSource === 'ai_estimated').length;
  const unknownMeals = log.meals.filter(meal => meal.calorieSource === 'unknown').length;
  const update = (patch: Partial<Log>) => { setSaved(false); setError(''); setLog({ ...log, ...patch }); };
  const addMeal = () => update({ meals: [...log.meals, { id: crypto.randomUUID(), type: 'breakfast', name: '', calories: 0, calorieSource: 'unknown' }] });
  const addExercise = () => update({ exercises: [...log.exercises, { id: crypto.randomUUID(), name: '', minutes: 0 }] });

  return <div className="screen-stack">
    <section className="hero">
      <p className="eyebrow">나를 돌보는 작은 기록</p>
      <h1>오늘도 가볍게,<br />하루를 남겨요.</h1>
      <label className="date-control">기록 날짜<input aria-label="기록 날짜" type="date" value={log.date} onChange={e => { setSaved(false); setError(''); void changeDate(e.target.value); }} /></label>
    </section>

    <section className="summary card" aria-label="오늘 요약">
      <div><strong>{estimatedMeals > 0 ? '약 ' : ''}{calories.toLocaleString()}</strong><span>섭취 kcal{unknownMeals > 0 ? ` · 미산정 ${unknownMeals}` : ''}</span></div><i /><div><strong>{log.water ?? 0}</strong><span>물 ml</span></div><i /><div><strong>{log.exercises.reduce((s, e) => s + e.minutes, 0)}</strong><span>운동 분</span></div>
    </section>

    <section className="card form-card"><div className="section-title"><div><span className="step">01</span><h2>몸 상태</h2></div><span className="optional">선택</span></div>
      <div className="two-col"><Field label="체중" suffix="kg"><input aria-label="체중" type="number" min="20" max="500" step="0.1" placeholder="예: 63.2" value={log.weight ?? ''} onChange={e => update({ weight: numberOrUndefined(e.target.value) })} /></Field><Field label="마신 물" suffix="ml"><input aria-label="마신 물" type="number" min="0" step="100" placeholder="예: 1200" value={log.water ?? ''} onChange={e => update({ water: numberOrUndefined(e.target.value) })} /></Field></div>
      <fieldset className="condition"><legend>오늘의 컨디션</legend><div>{['매우 나쁨', '나쁨', '보통', '좋음', '아주 좋음'].map((label, i) => <button type="button" aria-label={label} aria-pressed={log.condition === i + 1} onClick={() => update({ condition: i + 1 })} key={label}><span>{['😣','🙁','🙂','😊','😄'][i]}</span>{i + 1}</button>)}</div></fieldset>
    </section>

    <section className="card form-card"><div className="section-title"><div><span className="step">02</span><h2>식사</h2></div><strong className="accent">{estimatedMeals > 0 ? '약 ' : ''}{calories.toLocaleString()} kcal{unknownMeals > 0 ? ` + 미산정 ${unknownMeals}` : ''}</strong></div>
      {log.meals.length === 0 ? <div className="empty"><span>🥗</span><p>아직 기록한 식사가 없어요.</p></div> : log.meals.map((meal, index) => <MealEntryEditor
        key={meal.id}
        meal={meal}
        index={index}
        controller={localFoodCalorieController}
        onChange={patch => update({ meals: log.meals.map(item => item.id === meal.id ? { ...item, ...patch } : item) })}
        onRemove={() => update({ meals: log.meals.filter(item => item.id !== meal.id) })}
      />)}
      <button type="button" className="add-button" onClick={addMeal}><Icon name="plus" /> 식사 추가</button>
    </section>

    <section className="card form-card"><div className="section-title"><div><span className="step">03</span><h2>운동</h2></div><span className="optional">선택</span></div>
      {log.exercises.length === 0 ? <div className="empty compact"><p>오늘 움직인 시간을 남겨보세요.</p></div> : log.exercises.map((exercise, index) => <div className="entry-row exercise" key={exercise.id}><input aria-label={`운동 ${index + 1} 이름`} placeholder="운동명" value={exercise.name} onChange={e => update({ exercises: log.exercises.map(x => x.id === exercise.id ? { ...x, name: e.target.value } : x) })} /><input aria-label={`운동 ${index + 1} 시간`} className="small" type="number" min="0" max="1440" placeholder="분" value={exercise.minutes || ''} onChange={e => update({ exercises: log.exercises.map(x => x.id === exercise.id ? { ...x, minutes: Number(e.target.value) } : x) })} /><button type="button" className="icon-button" aria-label={`${index + 1}번째 운동 삭제`} onClick={() => update({ exercises: log.exercises.filter(x => x.id !== exercise.id) })}><Icon name="trash" /></button></div>)}
      <button type="button" className="add-button" onClick={addExercise}><Icon name="plus" /> 운동 추가</button>
    </section>

    <section className="card form-card"><div className="section-title"><div><span className="step">04</span><h2>한 줄 기록</h2></div><span className="optional">선택</span></div><Field label="오늘은 어땠나요?"><textarea rows={4} maxLength={500} placeholder="식사와 운동, 기분을 자유롭게 적어보세요." value={log.note} onChange={e => update({ note: e.target.value })} /></Field></section>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="save-button" type="button" onClick={async () => { try { await saveLog(); setError(''); setSaved(true); } catch { setSaved(false); setError('입력 내용을 확인해 주세요. 음식명과 운동명은 비워둘 수 없고, 숫자는 안내된 범위 안이어야 합니다.'); } }}>오늘 기록 저장</button>{saved && <p className="save-message" role="status">기록을 저장했어요.</p>}
    <AnalysisPanel key={log.date} controller={localAnalysisController} date={log.date} inputFingerprint={JSON.stringify(log)} hasSavedRecord={hasSavedRecord || saved} />
  </div>;
}

function HistoryScreen({ logs, open, remove }: { logs: Log[]; open: (log: Log) => void; remove: (date: string) => Promise<void> }) {
  return <div className="page"><p className="eyebrow">차곡차곡 쌓인 하루</p><h1>지난 기록</h1>{logs.length === 0 ? <div className="card page-empty"><span>📖</span><h2>아직 기록이 없어요</h2><p>오늘의 식사부터 가볍게 남겨보세요.</p></div> : <div className="history-list">{logs.map(log => { const counted = log.meals.filter(meal => meal.calorieSource !== 'unknown'); const estimated = counted.some(meal => meal.calorieSource === 'ai_estimated'); const unknown = log.meals.length - counted.length; return <div className="card history-row" key={log.date}><button className="history-item" onClick={() => open(log)}><time>{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${log.date}T12:00:00`))}</time><span>{estimated ? '약 ' : ''}{counted.reduce((sum, meal) => sum + meal.calories, 0).toLocaleString()} kcal{unknown > 0 ? ` + 미산정 ${unknown}` : ''} · {log.weight ? `${log.weight} kg` : '체중 미기록'}</span><b>›</b></button><button type="button" className="history-delete" aria-label={`${log.date} 기록 삭제`} onClick={() => void remove(log.date)}><Icon name="trash" /></button></div>; })}</div>}</div>;
}

function SettingsScreen({ onDataChanged }: { onDataChanged: () => Promise<void> }) {
  const [done, setDone] = useState(false);
  useEffect(() => { settingsRepository.get().then(settings => { const inputs = document.querySelectorAll<HTMLInputElement>('.page input[type="number"]'); if (inputs[0]) inputs[0].value = settings?.targetWeightKg?.toString() ?? ''; if (inputs[1]) inputs[1].value = settings?.dailyCalorieTarget?.toString() ?? ''; }).catch(() => undefined); }, []);
  const saveSettings = async (event: React.MouseEvent<HTMLButtonElement>) => { const inputs = event.currentTarget.closest('section')?.querySelectorAll<HTMLInputElement>('input[type="number"]'); await settingsRepository.save({ id: 'local', targetWeightKg: numberOrUndefined(inputs?.[0]?.value ?? ''), dailyCalorieTarget: numberOrUndefined(inputs?.[1]?.value ?? ''), updatedAt: new Date().toISOString() }); setDone(true); await onDataChanged(); };
  const exportData = async () => { const json = await backupService.exportJson(); const url = URL.createObjectURL(new Blob([json], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `daily-diet-log-${today}.json`; link.click(); URL.revokeObjectURL(url); };
  const importData = async (file?: File) => { if (!file) return; try { await backupService.importJson(await file.text(), 'merge'); setDone(true); await onDataChanged(); } catch { setDone(false); window.alert('파일을 확인할 수 없어요. 기존 데이터는 변경되지 않았습니다.'); } };
  const clearData = async () => { if (window.confirm('모든 기록과 설정을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) { await backupService.clearAll(); setDone(true); await onDataChanged(); } };
  return <div className="page"><p className="eyebrow">내 방식에 맞게</p><h1>설정</h1><section className="card form-card"><h2>나의 목표</h2><div className="two-col"><Field label="목표 체중" suffix="kg"><input type="number" min="20" max="500" placeholder="예: 58" /></Field><Field label="하루 섭취 목표" suffix="kcal"><input type="number" min="0" max="10000" placeholder="예: 1800" /></Field></div><button className="secondary-button" onClick={saveSettings}>목표 저장</button>{done && <p role="status" className="inline-status">작업을 완료했어요.</p>}</section><section className="card form-card"><h2>내 데이터</h2><p className="muted">기록은 이 브라우저에만 저장됩니다. 기기를 바꾸거나 브라우저 데이터를 지우기 전에 백업하세요.</p><div className="button-row"><button className="secondary-button" onClick={exportData}>JSON 내보내기</button><label className="secondary-button file-button">가져오기<input aria-label="JSON 가져오기" type="file" accept="application/json,.json" onChange={e => importData(e.target.files?.[0])} /></label></div></section><section className="card danger"><h2>모든 기록 삭제</h2><p>삭제한 데이터는 복구할 수 없습니다.</p><button type="button" onClick={clearData}>전체 삭제</button></section></div>;
}

export function App() {
  const [tab, setTab] = useState<Tab>('today'); const [logs, setLogs] = useState<Log[]>([]); const [draft, setDraft] = useState(blankLog());
  const refreshData = async () => { const items = await repository.listAll(); setLogs(items.map(fromStored)); const current = await repository.getByDate(draft.date); setDraft(current ? fromStored(current) : blankLog(draft.date)); };
  useEffect(() => { repository.listAll().then(items => setLogs(items.map(fromStored))).catch(() => setLogs([])); }, []);
  const setLog = (log: Log) => setDraft(log);
  const changeDate = async (date: string) => { const stored = await repository.getByDate(date); setDraft(stored ? fromStored(stored) : blankLog(date)); };
  const removeLog = async (date: string) => { if (!window.confirm(`${date} 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return; await repository.remove(date); setLogs(existing => existing.filter(log => log.date !== date)); if (draft.date === date) setDraft(blankLog(date)); };
  const saveLog = async () => { const saved = fromStored(await repository.save(toStored(draft))); setDraft(saved); setLogs(existing => [...existing.filter(x => x.date !== saved.date), saved].sort((a,b) => a.date.localeCompare(b.date))); };
  const content = ({ today: <TodayScreen log={draft} setLog={setLog} saveLog={saveLog} changeDate={changeDate} hasSavedRecord={logs.some(log => log.date === draft.date)} />, history: <HistoryScreen logs={logs} open={log => { setDraft(log); setTab('today'); }} remove={removeLog} />, insights: <InsightsScreen logs={logs.map(toStored)} today={today} />, settings: <SettingsScreen onDataChanged={refreshData} /> })[tab];
  return <div className="app-shell"><header className="topbar"><a className="brand" href="#today" onClick={() => setTab('today')}><span>하루</span>결</a><span className="privacy">기록은 내 기기에만 저장돼요</span></header><main>{content}</main><nav className="bottom-nav" aria-label="주요 메뉴">{tabs.map(item => <button key={item.id} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}><Icon name={item.id} /><span>{item.label}</span></button>)}</nav></div>;
}
