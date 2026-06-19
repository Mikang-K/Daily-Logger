import { describe, expect, it } from "vitest";

import { calculateRangeStatistics, dailyLogSchema, parseBackupJson } from "../../domain";
import type { DailyLog } from "../../domain";

const log = (date: string, weightKg?: number): DailyLog => ({
  date,
  weightKg,
  meals: [{ id: `${date}-meal`, type: "lunch", name: "샐러드", calories: 400 }],
  exercises: [{ id: `${date}-exercise`, name: "걷기", durationMinutes: 30, caloriesBurned: 100 }],
  createdAt: "2026-06-19T00:00:00.000Z",
  updatedAt: "2026-06-19T00:00:00.000Z",
  schemaVersion: 1,
});

describe("dailyLogSchema", () => {
  it("accepts a valid daily log", () => {
    expect(dailyLogSchema.parse(log("2026-06-19", 70)).date).toBe("2026-06-19");
  });

  it("rejects impossible dates and out-of-range values", () => {
    expect(() => dailyLogSchema.parse({ ...log("2026-02-30"), weightKg: 10 })).toThrow();
  });
});

describe("calculateRangeStatistics", () => {
  it("sorts dates, calculates calorie totals, and ignores missing weights", () => {
    const result = calculateRangeStatistics(
      [log("2026-06-19", 69.5), log("2026-06-17", 70), log("2026-06-18")],
      "2026-06-17",
      "2026-06-19",
    );
    expect(result.daily.map((day) => day.date)).toEqual(["2026-06-17", "2026-06-18", "2026-06-19"]);
    expect(result.totalCalories).toBe(1_200);
    expect(result.weightChangeKg).toBe(-0.5);
    expect(result.daily[0].netCalories).toBe(300);
  });
});

describe("parseBackupJson", () => {
  it("rejects duplicate log dates before storage is changed", () => {
    const backup = {
      format: "daily-diet-log",
      schemaVersion: 1,
      exportedAt: "2026-06-19T00:00:00.000Z",
      dailyLogs: [log("2026-06-19"), log("2026-06-19")],
      settings: null,
    };
    expect(() => parseBackupJson(JSON.stringify(backup))).toThrow(/중복된 날짜/);
  });
});
