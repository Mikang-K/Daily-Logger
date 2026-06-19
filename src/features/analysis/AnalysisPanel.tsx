import { useEffect, useRef, useState } from 'react';
import type {
  AnalysisController,
  AnalysisModelView,
  AnalysisResultView,
  AnalysisRuntimeSettings,
} from './analysis-controller';

type AnalysisState =
  | 'idle'
  | 'checking'
  | 'connected'
  | 'loading'
  | 'ready'
  | 'generating'
  | 'completed'
  | 'unavailable'
  | 'error'
  | 'stale';

const stateLabels: Record<AnalysisState, string> = {
  idle: '연결 확인 전',
  checking: '연결 확인 중',
  connected: '모델 로딩 필요',
  loading: '모델 로딩 중',
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
  timeoutSeconds: 300,
};

const validTimeout = (value: unknown): value is AnalysisRuntimeSettings['timeoutSeconds'] =>
  value === 120 || value === 300 || value === 600;

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
      timeoutSeconds: validTimeout(candidate.timeoutSeconds) ? candidate.timeoutSeconds : defaultSettings.timeoutSeconds,
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
  const [models, setModels] = useState<AnalysisModelView[]>([]);
  const [result, setResult] = useState<AnalysisResultView>();
  const [message, setMessage] = useState('');
  const [errorAction, setErrorAction] = useState<'preload' | 'analyze'>('analyze');
  const [progressText, setProgressText] = useState('');
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
    setProgressText('');
    localStorage.setItem('daily-log:llm-runtime', JSON.stringify(next));
  };

  const selectModel = (modelId: string) => {
    const next = { ...settings, modelId };
    setSettings(next);
    setResult(undefined);
    completedFingerprint.current = '';
    setState(modelId ? 'connected' : 'idle');
    setMessage('');
    setProgressText('');
    localStorage.setItem('daily-log:llm-runtime', JSON.stringify(next));
  };

  const check = async () => {
    request.current?.abort();
    const current = new AbortController();
    request.current = current;
    setState('checking');
    setMessage('');
    setProgressText('로컬 서버 응답과 설치된 모델 목록을 확인하고 있습니다.');
    try {
      const response = await controller.checkConnection(settings, current.signal);
      setModels(response.models);
      const modelId = response.models.some(model => model.id === settings.modelId)
        ? settings.modelId
        : (response.models[0]?.id ?? '');
      if (!modelId) throw new Error('사용 가능한 로컬 모델이 없습니다.');
      if (modelId !== settings.modelId) {
        const next = { ...settings, modelId };
        setSettings(next);
        localStorage.setItem('daily-log:llm-runtime', JSON.stringify(next));
      }
      setState('connected');
      setProgressText('연결되었습니다. 분석 전에 선택 모델을 메모리에 불러오세요.');
    } catch (error) {
      if (current.signal.aborted) return;
      setState('unavailable');
      setProgressText('');
      setMessage(error instanceof Error ? error.message : '로컬 AI에 연결할 수 없습니다.');
    }
  };

  const preload = async () => {
    request.current?.abort();
    const current = new AbortController();
    request.current = current;
    setState('loading');
    setMessage('선택한 모델을 메모리에 불러오고 있습니다. 처음에는 몇 분 걸릴 수 있습니다.');
    try {
      const response = await controller.preloadModel(settings, current.signal, progress => {
        setProgressText(progress.phase === 'loading' ? '모델 파일을 메모리에 불러오는 중입니다.' : '모델 준비 상태를 확인하고 있습니다.');
      });
      setState('ready');
      setProgressText('모델이 준비되었습니다.');
      setMessage(response.message || '모델 로딩이 완료되었습니다. 분석을 시작할 수 있습니다.');
    } catch (error) {
      if (current.signal.aborted) {
        setState('connected');
        setProgressText('');
        setMessage('모델 로딩을 취소했습니다.');
        return;
      }
      setState('error');
      setProgressText('');
      setErrorAction('preload');
      setMessage(error instanceof Error ? error.message : '모델을 불러오지 못했습니다.');
    }
  };

  const analyze = async () => {
    request.current?.abort();
    const current = new AbortController();
    request.current = current;
    setState('generating');
    setMessage('');
    setProgressText('요청을 준비하고 있습니다.');
    try {
      const response = await controller.analyze({ date }, settings, current.signal, progress => {
        setProgressText(progress.phase === 'loading'
          ? '모델을 준비하고 있습니다.'
          : progress.tokensGenerated === undefined
            ? '분석 결과를 생성하고 있습니다.'
            : `분석 결과 생성 중 · ${progress.tokensGenerated.toLocaleString()} 토큰`);
      });
      setResult(response);
      completedFingerprint.current = inputFingerprint;
      setState('completed');
      setProgressText('분석 결과 생성이 완료되었습니다.');
    } catch (error) {
      if (current.signal.aborted) {
        setState('ready');
        setProgressText('');
        setMessage('분석을 취소했습니다.');
        return;
      }
      setState('error');
      setProgressText('');
      setErrorAction('analyze');
      setMessage(error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.');
    }
  };

  const cancel = () => request.current?.abort();
  const canAnalyze = hasSavedRecord && Boolean(settings.modelId)
    && (['ready', 'completed', 'stale'].includes(state) || (state === 'error' && errorAction === 'analyze'));
  const selectedModel = models.find(model => model.id === settings.modelId);
  const modelSize = selectedModel?.sizeBytes === undefined ? undefined : selectedModel.sizeBytes / 1024 ** 3;

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
        <label className="field"><span>응답 제한 시간</span><select aria-label="응답 제한 시간" value={settings.timeoutSeconds} onChange={event => updateSettings({ timeoutSeconds: Number(event.target.value) as AnalysisRuntimeSettings['timeoutSeconds'] })}><option value={120}>2분</option><option value={300}>5분</option><option value={600}>10분</option></select></label>
        <label className="field"><span>모델</span><select aria-label="로컬 AI 모델" value={settings.modelId} onChange={event => selectModel(event.target.value)}><option value="">연결 후 선택</option>{models.map(model => <option key={model.id} value={model.id}>{model.name}{model.sizeBytes === undefined ? '' : ` · ${(model.sizeBytes / 1024 ** 3).toFixed(1)} GB`}</option>)}</select></label>
      </div>
      {selectedModel && <div className="resource-warning"><strong>선택 모델: {selectedModel.name}{modelSize === undefined ? '' : ` (${modelSize.toFixed(1)} GB)`}</strong>{selectedModel.resourceWarnings?.map((warning, index) => <p key={index}>{warning}</p>)}<p>모델 파일 크기보다 더 많은 시스템 메모리 또는 VRAM이 필요할 수 있습니다. 로딩 중 다른 작업이 느려질 수 있습니다.</p></div>}
      <p className="privacy-note">인증 키나 비밀번호는 입력하거나 저장하지 않습니다. 루프백 주소로만 연결할 수 있습니다.</p>
      <div className="runtime-actions"><button className="secondary-button" type="button" onClick={() => void check()} disabled={state === 'checking' || state === 'loading' || state === 'generating'}>{state === 'checking' ? '확인 중…' : '연결 확인'}</button>{(state === 'connected' || (state === 'error' && errorAction === 'preload')) && settings.modelId && <button className="secondary-button" type="button" onClick={() => void preload()}>선택 모델 불러오기</button>}</div>
    </details>

    <div className="analysis-disclosure" aria-label="분석에 전달되는 데이터">
      <strong>분석 시 전달되는 항목</strong>
      <p>선택 날짜의 체중, 식사와 열량, 운동 시간, 물, 컨디션, 메모 · 최근 7일 평균과 기록 일수 · 설정한 목표</p>
      <small>이전 AI 분석 결과는 입력에 포함하지 않습니다.</small>
    </div>

    {!hasSavedRecord && <p className="sample-notice">먼저 이 날짜의 기록을 저장해야 분석할 수 있습니다.</p>}
    {progressText && <p className="analysis-progress" role="status" aria-live="polite">{progressText}</p>}
    {message && <p className={state === 'error' || state === 'unavailable' ? 'form-error' : 'inline-status'} role={state === 'error' || state === 'unavailable' ? 'alert' : 'status'}>{message}</p>}
    <div className="analysis-actions">
      {state === 'generating' || state === 'loading'
        ? <button className="secondary-button cancel-button" type="button" onClick={cancel}>{state === 'loading' ? '모델 로딩 취소' : '분석 취소'}</button>
        : <button className="save-button" type="button" disabled={!canAnalyze} onClick={() => void analyze()}>{state === 'error' && errorAction === 'analyze' ? '다시 시도' : state === 'stale' ? '변경 내용 다시 분석' : '로컬 AI로 분석'}</button>}
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
