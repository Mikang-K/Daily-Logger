import { useEffect, useRef, useState } from 'react';
import type {
  AnalysisController,
  AnalysisResultView,
  AnalysisRuntimeSettings,
} from './analysis-controller';

type AnalysisState =
  | 'idle'
  | 'checking'
  | 'ready'
  | 'generating'
  | 'completed'
  | 'unavailable'
  | 'error'
  | 'stale';

const stateLabels: Record<AnalysisState, string> = {
  idle: '연결 확인 전',
  checking: '연결 확인 중',
  ready: '분석 준비됨',
  generating: '분석 생성 중',
  completed: '분석 완료',
  unavailable: '로컬 AI를 사용할 수 없음',
  error: '분석 오류',
  stale: '기록 변경 후 다시 분석 필요',
};

const defaultSettings: AnalysisRuntimeSettings = {
  endpoint: 'http://127.0.0.1:11434',
  modelId: '',
};

const loadRuntimeSettings = (): AnalysisRuntimeSettings => {
  try {
    const saved = localStorage.getItem('daily-log:llm-runtime');
    if (!saved) return defaultSettings;
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return defaultSettings;
    const candidate = parsed as Record<string, unknown>;
    return {
      endpoint: typeof candidate.endpoint === 'string' ? candidate.endpoint : defaultSettings.endpoint,
      modelId: typeof candidate.modelId === 'string' ? candidate.modelId : defaultSettings.modelId,
    };
  } catch {
    return defaultSettings;
  }
};

function ResultList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return <section><h3>{title}</h3><ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul></section>;
}

export function AnalysisPanel({
  controller,
  date,
  inputFingerprint,
  hasSavedRecord,
}: {
  controller: AnalysisController;
  date: string;
  inputFingerprint: string;
  hasSavedRecord: boolean;
}) {
  const [settings, setSettings] = useState<AnalysisRuntimeSettings>(loadRuntimeSettings);
  const [state, setState] = useState<AnalysisState>('idle');
  const [models, setModels] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResultView>();
  const [message, setMessage] = useState('');
  const completedFingerprint = useRef('');
  const request = useRef<AbortController | undefined>(undefined);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (result && completedFingerprint.current !== inputFingerprint) setState('stale');
  }, [inputFingerprint, result]);

  const updateSettings = (patch: Partial<AnalysisRuntimeSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    setModels([]);
    setResult(undefined);
    completedFingerprint.current = '';
    setState('idle');
    setMessage('');
    localStorage.setItem('daily-log:llm-runtime', JSON.stringify(next));
  };

  const check = async () => {
    request.current?.abort();
    const current = new AbortController();
    request.current = current;
    setState('checking');
    setMessage('');
    try {
      const response = await controller.checkConnection(settings, current.signal);
      setModels(response.models);
      const modelId = response.models.includes(settings.modelId)
        ? settings.modelId
        : (response.models[0] ?? '');
      if (!modelId) throw new Error('사용 가능한 로컬 모델이 없습니다.');
      if (modelId !== settings.modelId) {
        const next = { ...settings, modelId };
        setSettings(next);
        localStorage.setItem('daily-log:llm-runtime', JSON.stringify(next));
      }
      setState('ready');
    } catch (error) {
      if (current.signal.aborted) return;
      setState('unavailable');
      setMessage(error instanceof Error ? error.message : '로컬 AI에 연결할 수 없습니다.');
    }
  };

  const analyze = async () => {
    request.current?.abort();
    const current = new AbortController();
    request.current = current;
    setState('generating');
    setMessage('');
    try {
      const response = await controller.analyze({ date }, settings, current.signal);
      setResult(response);
      completedFingerprint.current = inputFingerprint;
      setState('completed');
    } catch (error) {
      if (current.signal.aborted) {
        setState('ready');
        setMessage('분석을 취소했습니다.');
        return;
      }
      setState('error');
      setMessage(error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.');
    }
  };

  const cancel = () => request.current?.abort();
  const canAnalyze = hasSavedRecord && Boolean(settings.modelId)
    && ['ready', 'completed', 'stale', 'error'].includes(state);

  return <section className="card analysis-panel" aria-labelledby="analysis-title">
    <div className="analysis-heading">
      <div><p className="eyebrow">내 기기에서만 처리</p><h2 id="analysis-title">로컬 AI 기록 분석</h2></div>
      <span className={`analysis-status status-${state}`} role="status" aria-live="polite">{stateLabels[state]}</span>
    </div>
    <p className="muted">분석은 자동으로 실행되지 않습니다. 로컬 AI가 준비된 것을 확인한 뒤 직접 시작하세요.</p>

    <details className="runtime-settings">
      <summary>로컬 AI 연결 설정</summary>
      <div className="runtime-fields">
        <label className="field"><span>로컬 주소와 포트</span><input aria-label="로컬 AI 주소" type="url" value={settings.endpoint} onChange={event => updateSettings({ endpoint: event.target.value })} placeholder="http://127.0.0.1:11434" /></label>
        <label className="field"><span>모델</span><select aria-label="로컬 AI 모델" value={settings.modelId} onChange={event => updateSettings({ modelId: event.target.value })}><option value="">연결 후 선택</option>{models.map(model => <option key={model} value={model}>{model}</option>)}</select></label>
      </div>
      <p className="privacy-note">인증 키나 비밀번호는 입력하거나 저장하지 않습니다. 루프백 주소로만 연결할 수 있습니다.</p>
      <button className="secondary-button" type="button" onClick={() => void check()} disabled={state === 'checking' || state === 'generating'}>{state === 'checking' ? '확인 중…' : '연결 확인'}</button>
    </details>

    <div className="analysis-disclosure" aria-label="분석에 전달되는 데이터">
      <strong>분석 시 전달되는 항목</strong>
      <p>선택 날짜의 체중, 식사와 열량, 운동 시간, 물, 컨디션, 메모 · 최근 7일 평균과 기록 일수 · 설정한 목표</p>
      <small>이전 AI 분석 결과는 입력에 포함하지 않습니다.</small>
    </div>

    {!hasSavedRecord && <p className="sample-notice">먼저 이 날짜의 기록을 저장해야 분석할 수 있습니다.</p>}
    {message && <p className={state === 'error' || state === 'unavailable' ? 'form-error' : 'inline-status'} role={state === 'error' || state === 'unavailable' ? 'alert' : 'status'}>{message}</p>}
    <div className="analysis-actions">
      {state === 'generating'
        ? <button className="secondary-button cancel-button" type="button" onClick={cancel}>분석 취소</button>
        : <button className="save-button" type="button" disabled={!canAnalyze} onClick={() => void analyze()}>{state === 'error' ? '다시 시도' : state === 'stale' ? '변경 내용 다시 분석' : '로컬 AI로 분석'}</button>}
    </div>

    {result && <article className={`analysis-result ${state === 'stale' ? 'is-stale' : ''}`} aria-labelledby="analysis-result-title">
      <h2 id="analysis-result-title">{date} 분석 결과</h2>
      {state === 'stale' && <p className="sample-notice">이 결과 이후 기록이 변경되었습니다.</p>}
      <p>{result.summary}</p>
      <ResultList title="잘 이어가고 있는 점" items={result.positivePatterns} />
      <ResultList title="살펴볼 점" items={result.attentionPoints} />
      <ResultList title="다음 행동" items={result.nextActions} />
      <ResultList title="데이터 한계" items={result.dataLimitations} />
      <p className="safety-notice">{result.safetyNotice}</p>
    </article>}
  </section>;
}
