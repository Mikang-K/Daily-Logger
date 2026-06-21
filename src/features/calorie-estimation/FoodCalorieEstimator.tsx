import { useEffect, useRef, useState } from 'react';
import {
  loadFoodEstimatorRuntime,
  type FoodCalorieEstimateView,
  type FoodCalorieEstimatorController,
} from './calorie-estimation-controller';

const confidenceLabel = { low: '낮음', medium: '보통', high: '높음' } as const;

export function FoodCalorieEstimator({
  controller,
  foodName,
  servingDescription,
  context,
  onApply,
}: {
  controller: FoodCalorieEstimatorController;
  foodName: string;
  servingDescription?: string;
  context?: string;
  onApply: (estimate: FoodCalorieEstimateView) => void;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'review' | 'error'>('idle');
  const [result, setResult] = useState<FoodCalorieEstimateView>();
  const [message, setMessage] = useState('');
  const request = useRef<AbortController | undefined>(undefined);

  useEffect(() => () => request.current?.abort(), []);

  const estimate = async () => {
    const runtime = loadFoodEstimatorRuntime();
    if (!foodName.trim()) {
      setState('error');
      setMessage('먼저 음식 이름을 입력해 주세요.');
      return;
    }
    if (!runtime.modelId) {
      setState('error');
      setMessage('아래 로컬 AI 연결 설정에서 모델을 먼저 선택해 주세요. 직접 칼로리를 입력할 수도 있습니다.');
      return;
    }
    request.current?.abort();
    const current = new AbortController();
    request.current = current;
    setState('loading');
    setMessage('추정 요청을 준비하고 있습니다.');
    try {
      const response = await controller.estimate(
        { foodName: foodName.trim(), servingDescription: servingDescription?.trim() || undefined, context: context?.trim() || undefined },
        runtime,
        current.signal,
        progress => setMessage(progress.phase === 'loading'
          ? '로컬 모델을 준비하고 있습니다.'
          : progress.tokensGenerated === undefined
            ? '칼로리 범위를 추정하고 있습니다.'
            : `칼로리 추정 중 · ${progress.tokensGenerated.toLocaleString()} 토큰`),
      );
      setResult(response);
      setState('review');
      setMessage('추정 결과를 확인한 뒤 적용해 주세요.');
    } catch (error) {
      if (current.signal.aborted) {
        setState('idle');
        setMessage('추정을 취소했습니다. 입력 내용은 유지됩니다.');
        return;
      }
      setState('error');
      setMessage(error instanceof Error ? error.message : '칼로리를 추정하지 못했습니다. 직접 입력하거나 다시 시도해 주세요.');
    }
  };

  const cancel = () => request.current?.abort();

  return <div className="food-estimator">
    {state === 'loading'
      ? <button type="button" className="estimate-button cancel-button" onClick={cancel}>추정 취소</button>
      : <button type="button" className="estimate-button" onClick={() => void estimate()} disabled={!foodName.trim()}>AI 칼로리 추정</button>}
    {message && <p className={state === 'error' ? 'food-estimate-error' : 'food-estimate-status'} role={state === 'error' ? 'alert' : 'status'} aria-live="polite">{message}</p>}
    {result && state === 'review' && <section className="food-estimate-card" aria-label={`${foodName} 칼로리 추정 결과`}>
      <div><strong>약 {result.estimatedCalories.toLocaleString()} kcal</strong><span>{result.calorieMin.toLocaleString()}~{result.calorieMax.toLocaleString()} kcal</span></div>
      <dl><div><dt>기준량</dt><dd>{result.servingDescription || servingDescription || '입력 정보 기준'}</dd></div><div><dt>신뢰도</dt><dd>{confidenceLabel[result.confidence]}</dd></div></dl>
      {result.assumptions.length > 0 && <div className="estimate-assumptions"><strong>추정 가정</strong><ul>{result.assumptions.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>}
      <p>로컬 AI 추정값이며 실제 조리법과 양에 따라 달라질 수 있습니다.</p>
      <div className="estimate-review-actions"><button type="button" className="secondary-button" onClick={() => {
        onApply(result);
        void controller.remember?.(
          { foodName: foodName.trim(), servingDescription: servingDescription?.trim() || undefined, context: context?.trim() || undefined },
          result,
        ).catch(() => undefined);
        setState('idle');
        setResult(undefined);
        setMessage('추정값을 적용했습니다. 다음 동일 음식 입력에도 재사용됩니다.');
      }}>이 값 적용</button><button type="button" className="text-button" onClick={() => { setResult(undefined); setState('idle'); setMessage('직접 칼로리를 입력해 주세요.'); }}>직접 입력</button></div>
    </section>}
  </div>;
}
