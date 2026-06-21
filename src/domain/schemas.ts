import { z } from "zod";

import { CALORIE_SOURCES, ESTIMATE_CONFIDENCE_LEVELS, MEAL_TYPES } from "./models";

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

export const calorieEstimateSchema = z
  .object({
    min: z.number().int().min(0).max(10_000),
    max: z.number().int().min(0).max(10_000),
    representative: z.number().int().min(0).max(10_000),
    confidence: z.enum(ESTIMATE_CONFIDENCE_LEVELS),
    assumptions: z.array(z.string().trim().min(1).max(200)).max(10),
    modelId: z.string().trim().min(1).max(200),
    estimatedAt: timestampSchema,
  })
  .superRefine((estimate, context) => {
    if (estimate.min > estimate.max) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["min"], message: "최솟값은 최댓값보다 클 수 없습니다." });
    }
    if (estimate.representative < estimate.min || estimate.representative > estimate.max) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["representative"], message: "대표값은 추정 범위 안에 있어야 합니다." });
    }
  });

export const mealEntrySchema = z.object({
  id: z.string().trim().min(1).max(100),
  type: z.enum(MEAL_TYPES),
  name: z.string().trim().min(1, "음식명을 입력해 주세요.").max(100),
  calories: z.number().int().min(0).max(10_000),
  calorieSource: z.enum(CALORIE_SOURCES).default("manual"),
  servingDescription: z.string().trim().min(1).max(100).optional(),
  calorieEstimate: calorieEstimateSchema.optional(),
  note: z.string().trim().max(500).optional(),
}).superRefine((meal, context) => {
  if (meal.calorieSource === "ai_estimated" && !meal.calorieEstimate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["calorieEstimate"], message: "AI 추정 열량에는 추정 근거가 필요합니다." });
  }
  if (meal.calorieSource === "ai_estimated" && meal.calorieEstimate?.representative !== meal.calories) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["calories"], message: "적용 열량은 AI 추정 대표값과 일치해야 합니다." });
  }
  if (meal.calorieSource === "unknown" && meal.calorieEstimate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["calorieEstimate"], message: "미산정 음식에는 추정값을 저장할 수 없습니다." });
  }
});

export const confirmedFoodCalorieSchema = z.object({
  id: z.string().trim().min(1).max(500),
  normalizedName: z.string().trim().min(1).max(100),
  displayName: z.string().trim().min(1).max(100),
  servingDescription: z.string().trim().max(100),
  preparationNote: z.string().trim().max(300).optional(),
  calories: z.number().int().min(0).max(10_000),
  calorieSource: z.enum(["manual", "ai_estimated"]),
  calorieEstimate: calorieEstimateSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).superRefine((food, context) => {
  if (food.calorieSource === "ai_estimated" && !food.calorieEstimate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["calorieEstimate"], message: "AI 추정 음식에는 추정 근거가 필요합니다." });
  }
  if (food.calorieSource === "ai_estimated" && food.calorieEstimate?.representative !== food.calories) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["calories"], message: "확정 열량은 AI 추정 대표값과 일치해야 합니다." });
  }
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
    confirmedFoods: z.array(confirmedFoodCalorieSchema).max(10_000).optional(),
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
