import { useState } from 'react';
import { FormField } from '../../app/FormField';
import type { AppLog } from '../../app/app-model';
import { numberOrUndefined } from '../../app/app-model';
import { localAnalysisController } from '../../app/local-analysis-controller';
import { localFoodCalorieController } from '../../app/local-food-calorie-controller';
import { Icon } from '../../components/Icons';
import { AnalysisPanel } from '../analysis/AnalysisPanel';
import { MealEntryEditor } from '../calorie-estimation/MealEntryEditor';

export function TodayScreen({ log, setLog, saveLog, changeDate, hasSavedRecord }: {
  log: AppLog;
  setLog: (log: AppLog) => void;
  saveLog: () => Promise<void>;
  changeDate: (date: string) => Promise<void>;
  hasSavedRecord: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const calories = log.meals.filter(meal => meal.calorieSource !== 'unknown').reduce((sum, meal) => sum + meal.calories, 0);
  const estimatedMeals = log.meals.filter(meal => meal.calorieSource === 'ai_estimated').length;
  const unknownMeals = log.meals.filter(meal => meal.calorieSource === 'unknown').length;
  const update = (patch: Partial<AppLog>) => {
    setSaved(false);
    setError('');
    setLog({ ...log, ...patch });
  };
  const addMeal = () => update({
    meals: [...log.meals, { id: crypto.randomUUID(), type: 'breakfast', name: '', calories: 0, calorieSource: 'unknown' }],
  });
  const addExercise = () => update({
    exercises: [...log.exercises, { id: crypto.randomUUID(), name: '', minutes: 0 }],
  });

  return (
    <div className="screen-stack">
      <section className="hero">
        <p className="eyebrow">나를 돌보는 작은 기록</p>
        <h1>오늘도 가볍게,<br />하루를 남겨요.</h1>
        <label className="date-control">기록 날짜<input aria-label="기록 날짜" type="date" value={log.date} onChange={event => { setSaved(false); setError(''); void changeDate(event.target.value); }} /></label>
      </section>

      <section className="summary card" aria-label="오늘 요약">
        <div><strong>{estimatedMeals > 0 ? '약 ' : ''}{calories.toLocaleString()}</strong><span>섭취 kcal{unknownMeals > 0 ? ` · 미산정 ${unknownMeals}` : ''}</span></div>
        <i />
        <div><strong>{log.water ?? 0}</strong><span>물 ml</span></div>
        <i />
        <div><strong>{log.exercises.reduce((sum, exercise) => sum + exercise.minutes, 0)}</strong><span>운동 분</span></div>
      </section>

      <section className="card form-card">
        <div className="section-title"><div><span className="step">01</span><h2>몸 상태</h2></div><span className="optional">선택</span></div>
        <div className="two-col">
          <FormField label="체중" suffix="kg"><input aria-label="체중" type="number" min="20" max="500" step="0.1" placeholder="예: 63.2" value={log.weight ?? ''} onChange={event => update({ weight: numberOrUndefined(event.target.value) })} /></FormField>
          <FormField label="마신 물" suffix="ml"><input aria-label="마신 물" type="number" min="0" step="100" placeholder="예: 1200" value={log.water ?? ''} onChange={event => update({ water: numberOrUndefined(event.target.value) })} /></FormField>
        </div>
        <fieldset className="condition">
          <legend>오늘의 컨디션</legend>
          <div>{['매우 나쁨', '나쁨', '보통', '좋음', '아주 좋음'].map((label, index) => <button type="button" aria-label={label} aria-pressed={log.condition === index + 1} onClick={() => update({ condition: index + 1 })} key={label}><span>{['😣', '🙁', '🙂', '😊', '😄'][index]}</span>{index + 1}</button>)}</div>
        </fieldset>
      </section>

      <section className="card form-card">
        <div className="section-title"><div><span className="step">02</span><h2>식사</h2></div><strong className="accent">{estimatedMeals > 0 ? '약 ' : ''}{calories.toLocaleString()} kcal{unknownMeals > 0 ? ` + 미산정 ${unknownMeals}` : ''}</strong></div>
        {log.meals.length === 0 ? (
          <div className="empty"><span>🥗</span><p>아직 기록한 식사가 없어요.</p></div>
        ) : log.meals.map((meal, index) => (
          <MealEntryEditor
            key={meal.id}
            meal={meal}
            index={index}
            controller={localFoodCalorieController}
            onChange={patch => update({ meals: log.meals.map(item => item.id === meal.id ? { ...item, ...patch } : item) })}
            onRemove={() => update({ meals: log.meals.filter(item => item.id !== meal.id) })}
          />
        ))}
        <button type="button" className="add-button" onClick={addMeal}><Icon name="plus" /> 식사 추가</button>
      </section>

      <section className="card form-card">
        <div className="section-title"><div><span className="step">03</span><h2>운동</h2></div><span className="optional">선택</span></div>
        {log.exercises.length === 0 ? (
          <div className="empty compact"><p>오늘 움직인 시간을 남겨보세요.</p></div>
        ) : log.exercises.map((exercise, index) => (
          <div className="entry-row exercise" key={exercise.id}>
            <input aria-label={`운동 ${index + 1} 이름`} placeholder="운동명" value={exercise.name} onChange={event => update({ exercises: log.exercises.map(item => item.id === exercise.id ? { ...item, name: event.target.value } : item) })} />
            <input aria-label={`운동 ${index + 1} 시간`} className="small" type="number" min="0" max="1440" placeholder="분" value={exercise.minutes || ''} onChange={event => update({ exercises: log.exercises.map(item => item.id === exercise.id ? { ...item, minutes: Number(event.target.value) } : item) })} />
            <button type="button" className="icon-button" aria-label={`${index + 1}번째 운동 삭제`} onClick={() => update({ exercises: log.exercises.filter(item => item.id !== exercise.id) })}><Icon name="trash" /></button>
          </div>
        ))}
        <button type="button" className="add-button" onClick={addExercise}><Icon name="plus" /> 운동 추가</button>
      </section>

      <section className="card form-card">
        <div className="section-title"><div><span className="step">04</span><h2>한 줄 기록</h2></div><span className="optional">선택</span></div>
        <FormField label="오늘은 어땠나요?"><textarea rows={4} maxLength={500} placeholder="식사와 운동, 기분을 자유롭게 적어보세요." value={log.note} onChange={event => update({ note: event.target.value })} /></FormField>
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="save-button" type="button" onClick={async () => {
        try {
          await saveLog();
          setError('');
          setSaved(true);
        } catch {
          setSaved(false);
          setError('입력 내용을 확인해 주세요. 음식명과 운동명은 비워둘 수 없고, 숫자는 안내된 범위 안이어야 합니다.');
        }
      }}>오늘 기록 저장</button>
      {saved && <p className="save-message" role="status">기록을 저장했어요.</p>}
      <AnalysisPanel key={log.date} controller={localAnalysisController} date={log.date} inputFingerprint={JSON.stringify(log)} hasSavedRecord={hasSavedRecord || saved} />
    </div>
  );
}
