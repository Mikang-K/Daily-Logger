import { z } from "zod";
import { MEAL_TYPES } from "../domain";

const shortText = z.string().trim().min(1).max(500);
const list = z.array(shortText).max(3);

export const analysisRequestSchema = z.object({
  schemaVersion: z.literal(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daily: z.object({
    weightKg: z.number().min(20).max(500).optional(),
    caloriesConsumed: z.number().int().min(0).max(100_000),
    exerciseMinutes: z.number().int().min(0).max(1_440),
    waterMl: z.number().int().min(0).max(20_000).optional(),
    condition: z.number().int().min(1).max(5).optional(),
    meals: z.array(z.object({
      type: z.enum(MEAL_TYPES), name: z.string().trim().min(1).max(100), calories: z.number().int().min(0).max(10_000),
    })).max(100),
    note: z.string().trim().max(2_000).optional(),
  }),
  recentSevenDays: z.object({
    daysLogged: z.number().int().min(0).max(7), weightSamples: z.number().int().min(0).max(7),
    averageWeightKg: z.number().min(20).max(500).optional(),
    averageCaloriesPerLoggedDay: z.number().min(0).max(100_000).optional(),
    averageExerciseMinutesPerLoggedDay: z.number().min(0).max(1_440).optional(),
  }),
  goals: z.object({ targetWeightKg: z.number().min(20).max(500).optional(), dailyCalorieTarget: z.number().int().min(0).max(10_000).optional() }),
}).strict();

export const analysisResultSchema = z.object({
  schemaVersion: z.literal(1), summary: z.string().trim().min(1).max(1_000),
  positivePatterns: list, attentionPoints: list, nextActions: list,
  dataLimitations: z.array(shortText).max(5), safetyNotice: z.string().trim().min(1).max(500),
}).strict();
