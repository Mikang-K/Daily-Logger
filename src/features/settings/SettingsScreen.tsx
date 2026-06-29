import { useEffect, useState } from 'react';
import { backupService, settingsRepository } from '../../app/app-services';
import { numberOrUndefined, today } from '../../app/app-model';
import { FormField } from '../../app/FormField';

export function SettingsScreen({ onDataChanged }: { onDataChanged: () => Promise<void> }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    settingsRepository.get().then(settings => {
      const inputs = document.querySelectorAll<HTMLInputElement>('.page input[type="number"]');
      if (inputs[0]) inputs[0].value = settings?.targetWeightKg?.toString() ?? '';
      if (inputs[1]) inputs[1].value = settings?.dailyCalorieTarget?.toString() ?? '';
    }).catch(() => undefined);
  }, []);

  const saveSettings = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const inputs = event.currentTarget.closest('section')?.querySelectorAll<HTMLInputElement>('input[type="number"]');
    await settingsRepository.save({
      id: 'local',
      targetWeightKg: numberOrUndefined(inputs?.[0]?.value ?? ''),
      dailyCalorieTarget: numberOrUndefined(inputs?.[1]?.value ?? ''),
      updatedAt: new Date().toISOString(),
    });
    setDone(true);
    await onDataChanged();
  };

  const exportData = async () => {
    const json = await backupService.exportJson();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily-logger-${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
      await backupService.importJson(await file.text(), 'merge');
      setDone(true);
      await onDataChanged();
    } catch {
      setDone(false);
      window.alert('파일을 확인할 수 없어요. 기존 데이터는 변경되지 않았습니다.');
    }
  };

  const clearData = async () => {
    if (window.confirm('모든 기록과 설정을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) {
      await backupService.clearAll();
      setDone(true);
      await onDataChanged();
    }
  };

  return (
    <div className="page">
      <p className="eyebrow">내 방식에 맞게</p>
      <h1>설정</h1>
      <section className="card form-card">
        <h2>나의 목표</h2>
        <div className="two-col">
          <FormField label="목표 체중" suffix="kg"><input type="number" min="20" max="500" placeholder="예: 58" /></FormField>
          <FormField label="하루 섭취 목표" suffix="kcal"><input type="number" min="0" max="10000" placeholder="예: 1800" /></FormField>
        </div>
        <button className="secondary-button" onClick={saveSettings}>목표 저장</button>
        {done && <p role="status" className="inline-status">작업을 완료했어요.</p>}
      </section>
      <section className="card form-card">
        <h2>내 데이터</h2>
        <p className="muted">기록은 이 브라우저에만 저장됩니다. 기기를 바꾸거나 브라우저 데이터를 지우기 전에 백업하세요.</p>
        <div className="button-row">
          <button className="secondary-button" onClick={exportData}>JSON 내보내기</button>
          <label className="secondary-button file-button">가져오기<input aria-label="JSON 가져오기" type="file" accept="application/json,.json" onChange={event => importData(event.target.files?.[0])} /></label>
        </div>
      </section>
      <section className="card danger">
        <h2>모든 기록 삭제</h2>
        <p>삭제한 데이터는 복구할 수 없습니다.</p>
        <button type="button" onClick={clearData}>전체 삭제</button>
      </section>
    </div>
  );
}
