import { Icon } from '../../components/Icons';
import type { FoodCalorieEstimateView, FoodCalorieEstimatorController } from './calorie-estimation-controller';
import { FoodCalorieEstimator } from './FoodCalorieEstimator';
import type { EditableMeal } from './types';

export type { EditableMeal } from './types';

export function MealEntryEditor({
  meal,
  index,
  controller,
  onChange,
  onRemove,
}: {
  meal: EditableMeal;
  index: number;
  controller: FoodCalorieEstimatorController;
  onChange: (patch: Partial<EditableMeal>) => void;
  onRemove: () => void;
}) {
  const applyEstimate = (estimate: FoodCalorieEstimateView) => onChange({
    calories: estimate.estimatedCalories,
    servingDescription: estimate.servingDescription || meal.servingDescription,
    calorieSource: 'ai_estimated',
    calorieEstimate: {
      min: estimate.calorieMin,
      max: estimate.calorieMax,
      representative: estimate.estimatedCalories,
      confidence: estimate.confidence,
      assumptions: estimate.assumptions,
      modelId: estimate.modelId,
      estimatedAt: new Date().toISOString(),
    },
  });

  const invalidateEstimate = (patch: Partial<EditableMeal>) => onChange({
    ...patch,
    calories: meal.calorieSource === 'ai_estimated' ? 0 : meal.calories,
    calorieSource: meal.calorieSource === 'manual' || (meal.calorieSource === undefined && meal.calories > 0) ? 'manual' : 'unknown',
    calorieEstimate: undefined,
  });

  return <div className="meal-editor">
    <div className="entry-row">
      <select aria-label={`식사 ${index + 1} 구분`} value={meal.type} onChange={event => onChange({ type: event.target.value })}><option value="breakfast">아침</option><option value="lunch">점심</option><option value="dinner">저녁</option><option value="snack">간식</option></select>
      <input aria-label={`식사 ${index + 1} 이름`} placeholder="음식명" value={meal.name} onChange={event => invalidateEstimate({ name: event.target.value })} />
      <div className="calorie-input-wrap">
        <input aria-label={`식사 ${index + 1} 칼로리`} className="small" type="number" min="0" max="10000" placeholder="kcal" value={meal.calories || ''} onChange={event => onChange({ calories: Number(event.target.value), calorieSource: event.target.value ? 'manual' : 'unknown', calorieEstimate: undefined })} />
        {meal.calorieSource === 'ai_estimated' && <span className="estimated-badge">AI 추정</span>}
      </div>
      <button type="button" className="icon-button" aria-label={`${index + 1}번째 식사 삭제`} onClick={onRemove}><Icon name="trash" /></button>
    </div>
    <div className="meal-estimate-context">
      <label><span>양·인분</span><input aria-label={`식사 ${index + 1} 양`} placeholder="예: 1인분, 200g" value={meal.servingDescription ?? ''} onChange={event => invalidateEstimate({ servingDescription: event.target.value })} /></label>
      <label><span>조리법·제품 정보</span><input aria-label={`식사 ${index + 1} 추가 정보`} placeholder="예: 돼지고기 포함, 밥 제외" value={meal.note ?? ''} onChange={event => invalidateEstimate({ note: event.target.value })} /></label>
    </div>
    <FoodCalorieEstimator key={`${meal.name}\u0000${meal.servingDescription ?? ''}\u0000${meal.note ?? ''}`} controller={controller} foodName={meal.name} servingDescription={meal.servingDescription} context={meal.note} onApply={applyEstimate} />
  </div>;
}
