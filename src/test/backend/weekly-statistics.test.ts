import { describe, expect, it } from "vitest";

import {
  calculateWeeklyComparison,
  calculateWeeklySeries,
  calculateWeeklyStatistics,
  getWeekBounds,
} from "../../domain";
import type { DailyLog } from "../../domain";

const log = (
  date: string,
  { weightKg, calories = 0, exerciseMinutes = 0 }: { weightKg?: number; calories?: number; exerciseMinutes?: number } = {},
): DailyLog => ({
  date,
  weightKg,
  meals: calories === 0 ? [] : [{ id: `${date}-meal`, type: "lunch", name: "식사", calories }],
  exercises: exerciseMinutes === 0 ? [] : [{ id: `${date}-exercise`, name: "걷기", durationMinutes: exerciseMinutes }],
  createdAt: "2026-06-19T00:00:00.000Z",
  updatedAt: "2026-06-19T00:00:00.000Z",
  schemaVersion: 1,
});

describe("getWeekBounds", () => {
  it("uses Monday through Sunday and starts a new week on Monday", () => {
    expect(getWeekBounds("2026-06-21")).toEqual({ startDate: "2026-06-15", endDate: "2026-06-21" });
    expect(getWeekBounds("2026-06-22")).toEqual({ startDate: "2026-06-22", endDate: "2026-06-28" });
  });

  it("handles year and leap-year boundaries", () => {
    expect(getWeekBounds("2026-01-01")).toEqual({ startDate: "2025-12-29", endDate: "2026-01-04" });
    expect(getWeekBounds("2024-02-29")).toEqual({ startDate: "2024-02-26", endDate: "2024-03-03" });
  });
});

describe("calculateWeeklyStatistics", () => {
  it("uses only recorded days and excludes missing weights and future logs", () => {
    const result = calculateWeeklyStatistics(
      [
        log("2026-06-20", { weightKg: 60, calories: 9_999, exerciseMinutes: 999 }),
        log("2026-06-18", { calories: 1_800, exerciseMinutes: 20 }),
        log("2026-06-15", { weightKg: 70, calories: 1_600, exerciseMinutes: 40 }),
        log("2026-06-17", { weightKg: 69.4, calories: 2_000 }),
      ],
      "2026-06-15",
      "2026-06-19",
    );

    expect(result).toMatchObject({
      daysLogged: 3,
      weightSamples: 2,
      averageWeightKg: 69.7,
      averageCaloriesPerLoggedDay: 1_800,
      averageExerciseMinutesPerLoggedDay: 20,
    });
  });

  it("returns undefined averages for an empty week", () => {
    const result = calculateWeeklyStatistics([], "2026-06-15", "2026-06-19");
    expect(result.daysLogged).toBe(0);
    expect(result.averageWeightKg).toBeUndefined();
    expect(result.averageCaloriesPerLoggedDay).toBeUndefined();
    expect(result.averageExerciseMinutesPerLoggedDay).toBeUndefined();
  });
});

describe("weekly comparison and series", () => {
  it("calculates current-versus-previous deltas", () => {
    const result = calculateWeeklyComparison(
      [
        log("2026-06-08", { weightKg: 71, calories: 2_000, exerciseMinutes: 20 }),
        log("2026-06-15", { weightKg: 70, calories: 1_800, exerciseMinutes: 30 }),
      ],
      "2026-06-19",
      "2026-06-19",
    );
    expect(result.weightDeltaKg).toBe(-1);
    expect(result.calorieDelta).toBe(-200);
    expect(result.exerciseMinutesDelta).toBe(10);
  });

  it("returns the requested weeks in chronological order", () => {
    const series = calculateWeeklySeries([], "2026-06-19", 8, "2026-06-19");
    expect(series).toHaveLength(8);
    expect(series[0].weekStart).toBe("2026-04-27");
    expect(series[7].weekStart).toBe("2026-06-15");
  });
});
