import type { MealType } from "../domain";

export interface AnalysisRequest {
  schemaVersion: 1;
  date: string;
  daily: {
    weightKg?: number;
    caloriesConsumed: number;
    exerciseMinutes: number;
    waterMl?: number;
    condition?: number;
    meals: Array<{ type: MealType; name: string; calories: number }>;
    note?: string;
  };
  recentSevenDays: {
    daysLogged: number;
    weightSamples: number;
    averageWeightKg?: number;
    averageCaloriesPerLoggedDay?: number;
    averageExerciseMinutesPerLoggedDay?: number;
  };
  goals: { targetWeightKg?: number; dailyCalorieTarget?: number };
}

export interface RecentSevenDaySummary {
  daysLogged: number;
  weightSamples: number;
  averageWeightKg?: number;
  averageCaloriesPerLoggedDay?: number;
  averageExerciseMinutesPerLoggedDay?: number;
}

export interface AnalysisResult {
  schemaVersion: 1;
  summary: string;
  positivePatterns: string[];
  attentionPoints: string[];
  nextActions: string[];
  dataLimitations: string[];
  safetyNotice: string;
}

export interface StoredAnalysis {
  id: string;
  date: string;
  inputHash: string;
  modelId: string;
  runtime: string;
  promptVersion: string;
  result: AnalysisResult;
  createdAt: string;
}

export interface LocalModel { id: string; name: string; sizeBytes?: number }

export type LlmRuntimeState = "ready" | "unavailable";
export interface LlmRuntimeStatus {
  state: LlmRuntimeState;
  runtime: string;
  endpoint: string;
  message?: string;
}

export interface LocalLlmClient {
  healthCheck(signal?: AbortSignal): Promise<LlmRuntimeStatus>;
  listModels(signal?: AbortSignal): Promise<LocalModel[]>;
  analyze(input: AnalysisRequest, signal?: AbortSignal): Promise<AnalysisResult>;
}
