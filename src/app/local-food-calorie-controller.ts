import { createLocalHttpLlmClient } from '../llm';
import type { FoodCalorieEstimatorController } from '../features/calorie-estimation/calorie-estimation-controller';
import { ConfirmedFoodCalorieRepository } from '../storage';

const confirmedFoods = new ConfirmedFoodCalorieRepository();

export const localFoodCalorieController: FoodCalorieEstimatorController = {
  async estimate(input, runtime, signal, onProgress) {
    const confirmed = await confirmedFoods.get({
      name: input.foodName,
      servingDescription: input.servingDescription,
      preparationNote: input.context,
    });
    if (confirmed) {
      return {
        foodName: confirmed.displayName,
        servingDescription: confirmed.servingDescription,
        calorieMin: confirmed.calorieEstimate?.min ?? confirmed.calories,
        calorieMax: confirmed.calorieEstimate?.max ?? confirmed.calories,
        estimatedCalories: confirmed.calories,
        confidence: confirmed.calorieEstimate?.confidence ?? 'high',
        assumptions: confirmed.calorieEstimate?.assumptions ?? ['이전에 확인한 개인 음식 값'],
        modelId: confirmed.calorieEstimate?.modelId ?? 'personal-food-dictionary',
      };
    }
    const client = createLocalHttpLlmClient({
      endpoint: runtime.endpoint,
      modelId: runtime.modelId,
      timeoutMs: runtime.timeoutSeconds * 1000,
    });
    const result = await client.estimateFoodCalories({
      schemaVersion: 1,
      foodName: input.foodName,
      servingDescription: input.servingDescription,
      note: input.context,
    }, signal, onProgress);
    return { ...result, modelId: runtime.modelId };
  },
  async remember(input, estimate) {
    const now = new Date().toISOString();
    await confirmedFoods.save({
      displayName: input.foodName,
      servingDescription: estimate.servingDescription || input.servingDescription || '입력 정보 기준',
      preparationNote: input.context,
      calories: estimate.estimatedCalories,
      calorieSource: 'ai_estimated',
      calorieEstimate: {
        min: estimate.calorieMin,
        max: estimate.calorieMax,
        representative: estimate.estimatedCalories,
        confidence: estimate.confidence,
        assumptions: estimate.assumptions,
        modelId: estimate.modelId,
        estimatedAt: now,
      },
    });
  },
};
