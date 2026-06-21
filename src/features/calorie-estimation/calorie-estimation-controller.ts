export type CalorieEstimateConfidence = 'low' | 'medium' | 'high';

export type FoodCalorieEstimateInput = {
  foodName: string;
  servingDescription?: string;
  context?: string;
};

export type FoodCalorieEstimateView = {
  foodName: string;
  servingDescription?: string;
  calorieMin: number;
  calorieMax: number;
  estimatedCalories: number;
  confidence: CalorieEstimateConfidence;
  assumptions: string[];
  modelId: string;
};

export type FoodCalorieEstimateProgress = {
  phase: 'loading' | 'generating';
  tokensGenerated?: number;
};

export type FoodCalorieEstimatorRuntime = {
  endpoint: string;
  modelId: string;
  timeoutSeconds: 120 | 300 | 600;
};

export interface FoodCalorieEstimatorController {
  estimate(
    input: FoodCalorieEstimateInput,
    runtime: FoodCalorieEstimatorRuntime,
    signal: AbortSignal,
    onProgress?: (progress: FoodCalorieEstimateProgress) => void,
  ): Promise<FoodCalorieEstimateView>;
  remember?(input: FoodCalorieEstimateInput, estimate: FoodCalorieEstimateView): Promise<void>;
}

export const loadFoodEstimatorRuntime = (): FoodCalorieEstimatorRuntime => {
  const fallback: FoodCalorieEstimatorRuntime = {
    endpoint: 'http://127.0.0.1:11434',
    modelId: '',
    timeoutSeconds: 300,
  };
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('daily-log:llm-runtime') ?? 'null');
    if (!parsed || typeof parsed !== 'object') return fallback;
    const value = parsed as Record<string, unknown>;
    const timeoutSeconds = value.timeoutSeconds === 120 || value.timeoutSeconds === 300 || value.timeoutSeconds === 600
      ? value.timeoutSeconds
      : fallback.timeoutSeconds;
    return {
      endpoint: typeof value.endpoint === 'string' ? value.endpoint : fallback.endpoint,
      modelId: typeof value.modelId === 'string' ? value.modelId : fallback.modelId,
      timeoutSeconds,
    };
  } catch {
    return fallback;
  }
};
