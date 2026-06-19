import type { DailyLog, WeeklyComparison, WeeklyStatistics } from "./models";
import { localDateSchema } from "./schemas";
import { summarizeDailyLog } from "./statistics";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const parseCalendarDate = (value: string): Date => {
  localDateSchema.parse(value);
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
};

const formatCalendarDate = (date: Date): string =>
  [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("-");

export const addCalendarDays = (date: string, days: number): string => {
  const parsed = parseCalendarDate(date);
  parsed.setTime(parsed.getTime() + days * DAY_IN_MS);
  return formatCalendarDate(parsed);
};

export const getWeekBounds = (referenceDate: string): { startDate: string; endDate: string } => {
  const parsed = parseCalendarDate(referenceDate);
  const daysSinceMonday = (parsed.getUTCDay() + 6) % 7;
  const startDate = addCalendarDays(referenceDate, -daysSinceMonday);
  return { startDate, endDate: addCalendarDays(startDate, 6) };
};

const roundToOneDecimal = (value: number): number => Math.round(value * 10) / 10;

export const calculateWeeklyStatistics = (
  logs: readonly DailyLog[],
  weekStart: string,
  today: string,
): WeeklyStatistics => {
  const { startDate, endDate } = getWeekBounds(weekStart);
  localDateSchema.parse(today);
  const effectiveEndDate = endDate < today ? endDate : today;
  const daily = effectiveEndDate < startDate
    ? []
    : logs
        .filter((log) => log.date >= startDate && log.date <= effectiveEndDate)
        .sort((left, right) => left.date.localeCompare(right.date))
        .map(summarizeDailyLog);
  const weights = daily.flatMap((day) => day.weightKg === undefined ? [] : [day.weightKg]);
  const totalCalories = daily.reduce((sum, day) => sum + day.caloriesConsumed, 0);
  const totalExerciseMinutes = daily.reduce((sum, day) => sum + day.exerciseMinutes, 0);

  return {
    weekStart: startDate,
    weekEnd: endDate,
    daysLogged: daily.length,
    weightSamples: weights.length,
    averageWeightKg: weights.length === 0 ? undefined : roundToOneDecimal(weights.reduce((sum, weight) => sum + weight, 0) / weights.length),
    averageCaloriesPerLoggedDay: daily.length === 0 ? undefined : Math.round(totalCalories / daily.length),
    averageExerciseMinutesPerLoggedDay: daily.length === 0 ? undefined : Math.round(totalExerciseMinutes / daily.length),
  };
};

const delta = (current?: number, previous?: number, decimals = 0): number | undefined => {
  if (current === undefined || previous === undefined) return undefined;
  const factor = 10 ** decimals;
  return Math.round((current - previous) * factor) / factor;
};

export const calculateWeeklyComparison = (
  logs: readonly DailyLog[],
  referenceDate: string,
  today: string,
): WeeklyComparison => {
  const { startDate } = getWeekBounds(referenceDate);
  const previousStart = addCalendarDays(startDate, -7);
  const current = calculateWeeklyStatistics(logs, startDate, today);
  const previous = calculateWeeklyStatistics(logs, previousStart, today);

  return {
    current,
    previous,
    weightDeltaKg: delta(current.averageWeightKg, previous.averageWeightKg, 1),
    calorieDelta: delta(current.averageCaloriesPerLoggedDay, previous.averageCaloriesPerLoggedDay),
    exerciseMinutesDelta: delta(current.averageExerciseMinutesPerLoggedDay, previous.averageExerciseMinutesPerLoggedDay),
  };
};

export const calculateWeeklySeries = (
  logs: readonly DailyLog[],
  referenceDate: string,
  weeks: number,
  today: string,
): WeeklyStatistics[] => {
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) {
    throw new Error("주간 통계 범위는 1주 이상 52주 이하여야 합니다.");
  }
  const { startDate } = getWeekBounds(referenceDate);
  return Array.from({ length: weeks }, (_, index) => {
    const offset = (index - weeks + 1) * 7;
    return calculateWeeklyStatistics(logs, addCalendarDays(startDate, offset), today);
  });
};
