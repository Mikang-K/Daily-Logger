import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FoodCalorieEstimator } from '../../features/calorie-estimation/FoodCalorieEstimator';
import { MealEntryEditor } from '../../features/calorie-estimation/MealEntryEditor';
import type { FoodCalorieEstimatorController } from '../../features/calorie-estimation/calorie-estimation-controller';

const runtime = { endpoint: 'http://127.0.0.1:11434', modelId: 'qwen-test', timeoutSeconds: 300 };
const estimate = {
  foodName: '김치찌개',
  servingDescription: '1인분',
  calorieMin: 450,
  calorieMax: 650,
  estimatedCalories: 550,
  confidence: 'medium' as const,
  assumptions: ['돼지고기 포함', '밥 제외'],
  modelId: 'qwen-test',
};

beforeEach(() => localStorage.setItem('daily-log:llm-runtime', JSON.stringify(runtime)));

describe('FoodCalorieEstimator', () => {
  it('shows a review card and applies only after confirmation', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const controller: FoodCalorieEstimatorController = { estimate: vi.fn().mockResolvedValue(estimate) };
    render(<FoodCalorieEstimator controller={controller} foodName="김치찌개" servingDescription="1인분" context="밥 제외" onApply={onApply} />);

    await user.click(screen.getByRole('button', { name: 'AI 칼로리 추정' }));
    expect(await screen.findByLabelText('김치찌개 칼로리 추정 결과')).toHaveTextContent('450~650 kcal');
    expect(screen.getByText('돼지고기 포함')).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '이 값 적용' }));
    expect(onApply).toHaveBeenCalledWith(estimate);
  });

  it('preserves the entered food context when estimation fails', async () => {
    const user = userEvent.setup();
    const controller: FoodCalorieEstimatorController = { estimate: vi.fn().mockRejectedValue(new Error('모델 응답 시간 초과')) };
    render(<MealEntryEditor meal={{ id: '1', type: 'lunch', name: '수제 카레', calories: 0, servingDescription: '큰 그릇', note: '치즈 추가' }} index={0} controller={controller} onChange={vi.fn()} onRemove={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'AI 칼로리 추정' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('모델 응답 시간 초과');
    expect(screen.getByLabelText('식사 1 이름')).toHaveValue('수제 카레');
    expect(screen.getByLabelText('식사 1 양')).toHaveValue('큰 그릇');
    expect(screen.getByLabelText('식사 1 추가 정보')).toHaveValue('치즈 추가');
  });

  it('cancels an in-flight request', async () => {
    const user = userEvent.setup();
    const controller: FoodCalorieEstimatorController = {
      estimate: vi.fn((_input, _runtime, signal) => new Promise<never>((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))),
    };
    render(<FoodCalorieEstimator controller={controller} foodName="비빔밥" onApply={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'AI 칼로리 추정' }));
    await user.click(screen.getByRole('button', { name: '추정 취소' }));
    expect(await screen.findByText('추정을 취소했습니다. 입력 내용은 유지됩니다.')).toBeInTheDocument();
  });

  it('offers direct entry when no local model is selected', async () => {
    localStorage.setItem('daily-log:llm-runtime', JSON.stringify({ ...runtime, modelId: '' }));
    const user = userEvent.setup();
    render(<FoodCalorieEstimator controller={{ estimate: vi.fn() }} foodName="떡볶이" onApply={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'AI 칼로리 추정' }));
    expect(screen.getByRole('alert')).toHaveTextContent('직접 칼로리를 입력할 수도 있습니다');
  });
});
