export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export const CALORIE_SOURCES = ["manual", "ai_estimated", "unknown"] as const;
export type CalorieSource = (typeof CALORIE_SOURCES)[number];
export const ESTIMATE_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type EstimateConfidence = (typeof ESTIMATE_CONFIDENCE_LEVELS)[number];

export interface CalorieEstimate {
  min: number;
  max: number;
  representative: number;
  confidence: EstimateConfidence;
  assumptions: string[];
  modelId: string;
  estimatedAt: string;
}

export interface MealEntry {
  id: string;
  type: MealType;
  name: string;
  calories: number;
  /** Missing on legacy records and therefore interpreted as `manual`. */
  calorieSource?: CalorieSource;
  servingDescription?: string;
  calorieEstimate?: CalorieEstimate;
  note?: string;
}

export interface ConfirmedFoodCalorie {
  id: string;
  normalizedName: string;
  displayName: string;
  servingDescription: string;
  preparationNote?: string;
  calories: number;
  calorieSource: Exclude<CalorieSource, "unknown">;
  calorieEstimate?: CalorieEstimate;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseEntry {
  id: string;
  name: string;
  durationMinutes: number;
  caloriesBurned?: number;
}

export interface DailyLog {
  date: string;
  weightKg?: number;
  meals: MealEntry[];
  exercises: ExerciseEntry[];
  waterMl?: number;
  condition?: 1 | 2 | 3 | 4 | 5;
  note?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
}

export interface UserSettings {
  id: "local";
  targetWeightKg?: number;
  dailyCalorieTarget?: number;
  updatedAt: string;
}

export interface DietLogBackup {
  format: "daily-diet-log";
  schemaVersion: 1;
  exportedAt: string;
  dailyLogs: DailyLog[];
  settings: UserSettings | null;
  confirmedFoods?: ConfirmedFoodCalorie[];
}

export interface DailySummary {
  date: string;
  caloriesConsumed: number;
  caloriesBurned: number;
  netCalories: number;
  exerciseMinutes: number;
  weightKg?: number;
  estimatedMealCount: number;
  unknownCalorieMealCount: number;
}

export interface RangeStatistics {
  startDate: string;
  endDate: string;
  daysLogged: number;
  totalCalories: number;
  averageCaloriesPerLoggedDay: number;
  weightChangeKg?: number;
  daily: DailySummary[];
  estimatedMealCount: number;
  unknownCalorieMealCount: number;
}

export interface WeeklyStatistics {
  weekStart: string;
  weekEnd: string;
  daysLogged: number;
  weightSamples: number;
  averageWeightKg?: number;
  averageCaloriesPerLoggedDay?: number;
  averageExerciseMinutesPerLoggedDay?: number;
  estimatedMealCount?: number;
  unknownCalorieMealCount?: number;
}

export interface WeeklyComparison {
  current: WeeklyStatistics;
  previous: WeeklyStatistics;
  weightDeltaKg?: number;
  calorieDelta?: number;
  exerciseMinutesDelta?: number;
}
