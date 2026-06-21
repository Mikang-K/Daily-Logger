import type { DailyLog, DailySummary, RangeStatistics } from "./models";

export const summarizeDailyLog = (log: DailyLog): DailySummary => {
  const countedMeals = log.meals.filter((meal) => meal.calorieSource !== "unknown");
  const caloriesConsumed = countedMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const caloriesBurned = log.exercises.reduce(
    (sum, exercise) => sum + (exercise.caloriesBurned ?? 0),
    0,
  );

  return {
    date: log.date,
    caloriesConsumed,
    caloriesBurned,
    netCalories: caloriesConsumed - caloriesBurned,
    exerciseMinutes: log.exercises.reduce((sum, exercise) => sum + exercise.durationMinutes, 0),
    weightKg: log.weightKg,
    estimatedMealCount: log.meals.filter((meal) => meal.calorieSource === "ai_estimated").length,
    unknownCalorieMealCount: log.meals.filter((meal) => meal.calorieSource === "unknown").length,
  };
};

export const calculateRangeStatistics = (
  logs: readonly DailyLog[],
  startDate: string,
  endDate: string,
): RangeStatistics => {
  const daily = logs
    .filter((log) => log.date >= startDate && log.date <= endDate)
    .sort((left, right) => left.date.localeCompare(right.date))
    .map(summarizeDailyLog);
  const totalCalories = daily.reduce((sum, day) => sum + day.caloriesConsumed, 0);
  const estimatedMealCount = daily.reduce((sum, day) => sum + day.estimatedMealCount, 0);
  const unknownCalorieMealCount = daily.reduce((sum, day) => sum + day.unknownCalorieMealCount, 0);
  const weightedDays = daily.filter((day) => day.weightKg !== undefined);
  const weightChangeKg =
    weightedDays.length >= 2
      ? Number(
          (weightedDays[weightedDays.length - 1].weightKg! - weightedDays[0].weightKg!).toFixed(2),
        )
      : undefined;

  return {
    startDate,
    endDate,
    daysLogged: daily.length,
    totalCalories,
    averageCaloriesPerLoggedDay: daily.length === 0 ? 0 : Math.round(totalCalories / daily.length),
    weightChangeKg,
    daily,
    estimatedMealCount,
    unknownCalorieMealCount,
  };
};
