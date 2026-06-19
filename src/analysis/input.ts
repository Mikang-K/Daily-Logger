import type { DailyLog, UserSettings } from "../domain";
import { summarizeDailyLog } from "../domain";
import { analysisRequestSchema } from "./schema";
import type { AnalysisRequest, RecentSevenDaySummary } from "./types";

export const buildAnalysisRequest = (log: DailyLog, recent: RecentSevenDaySummary, settings: UserSettings | null): AnalysisRequest => {
  const summary = summarizeDailyLog(log);
  return analysisRequestSchema.parse({
    schemaVersion: 1, date: log.date,
    daily: {
      weightKg: log.weightKg, caloriesConsumed: summary.caloriesConsumed,
      exerciseMinutes: summary.exerciseMinutes, waterMl: log.waterMl, condition: log.condition,
      meals: log.meals.map(({ type, name, calories }) => ({ type, name, calories })),
      note: log.note?.trim() || undefined,
    },
    recentSevenDays: {
      daysLogged: Math.min(recent.daysLogged, 7), weightSamples: Math.min(recent.weightSamples, 7),
      averageWeightKg: recent.averageWeightKg,
      averageCaloriesPerLoggedDay: recent.averageCaloriesPerLoggedDay,
      averageExerciseMinutesPerLoggedDay: recent.averageExerciseMinutesPerLoggedDay,
    },
    goals: { targetWeightKg: settings?.targetWeightKg, dailyCalorieTarget: settings?.dailyCalorieTarget },
  });
};
