export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export interface MealEntry {
  id: string;
  type: MealType;
  name: string;
  calories: number;
  note?: string;
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
}

export interface DailySummary {
  date: string;
  caloriesConsumed: number;
  caloriesBurned: number;
  netCalories: number;
  exerciseMinutes: number;
  weightKg?: number;
}

export interface RangeStatistics {
  startDate: string;
  endDate: string;
  daysLogged: number;
  totalCalories: number;
  averageCaloriesPerLoggedDay: number;
  weightChangeKg?: number;
  daily: DailySummary[];
}

export interface WeeklyStatistics {
  weekStart: string;
  weekEnd: string;
  daysLogged: number;
  weightSamples: number;
  averageWeightKg?: number;
  averageCaloriesPerLoggedDay?: number;
  averageExerciseMinutesPerLoggedDay?: number;
}

export interface WeeklyComparison {
  current: WeeklyStatistics;
  previous: WeeklyStatistics;
  weightDeltaKg?: number;
  calorieDelta?: number;
  exerciseMinutesDelta?: number;
}
