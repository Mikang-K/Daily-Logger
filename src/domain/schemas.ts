import { z } from "zod";

import { MEAL_TYPES } from "./models";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const isCalendarDate = (value: string): boolean => {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

export const localDateSchema = z
  .string()
  .refine(isCalendarDate, "날짜는 유효한 YYYY-MM-DD 형식이어야 합니다.");

export const timestampSchema = z.string().datetime({ offset: true });

export const mealEntrySchema = z.object({
  id: z.string().trim().min(1).max(100),
  type: z.enum(MEAL_TYPES),
  name: z.string().trim().min(1, "음식명을 입력해 주세요.").max(100),
  calories: z.number().int().min(0).max(10_000),
  note: z.string().trim().max(500).optional(),
});

export const exerciseEntrySchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1, "운동명을 입력해 주세요.").max(100),
  durationMinutes: z.number().int().min(0).max(1_440),
  caloriesBurned: z.number().int().min(0).max(10_000).optional(),
});

export const dailyLogSchema = z.object({
  date: localDateSchema,
  weightKg: z.number().min(20).max(500).optional(),
  meals: z.array(mealEntrySchema).default([]),
  exercises: z.array(exerciseEntrySchema).default([]),
  waterMl: z.number().int().min(0).max(20_000).optional(),
  condition: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  note: z.string().trim().max(2_000).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  schemaVersion: z.literal(1),
});

export const userSettingsSchema = z.object({
  id: z.literal("local"),
  targetWeightKg: z.number().min(20).max(500).optional(),
  dailyCalorieTarget: z.number().int().min(0).max(10_000).optional(),
  updatedAt: timestampSchema,
});

export const dietLogBackupSchema = z
  .object({
    format: z.literal("daily-diet-log"),
    schemaVersion: z.literal(1),
    exportedAt: timestampSchema,
    dailyLogs: z.array(dailyLogSchema).max(36_600),
    settings: userSettingsSchema.nullable(),
  })
  .superRefine((backup, context) => {
    const dates = new Set<string>();
    backup.dailyLogs.forEach((log, index) => {
      if (dates.has(log.date)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dailyLogs", index, "date"],
          message: `중복된 날짜입니다: ${log.date}`,
        });
      }
      dates.add(log.date);
    });
  });

export type DailyLogInput = z.input<typeof dailyLogSchema>;
