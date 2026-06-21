import { describe, expect, it } from "vitest";

import {
  createFoodCalorieProfileId,
  dailyLogSchema,
  summarizeDailyLog,
  type ConfirmedFoodCalorie,
  type DailyLog,
} from "../../domain";
import {
  ConfirmedFoodCalorieRepository,
  type ConfirmedFoodDatabasePort,
} from "../../storage";

const timestamp = "2026-06-20T00:00:00.000Z";

const estimate = {
  min: 450,
  max: 650,
  representative: 550,
  confidence: "medium" as const,
  assumptions: ["밥 제외"],
  modelId: "local-model",
  estimatedAt: timestamp,
};

const baseLog = (): DailyLog => ({
  date: "2026-06-20",
  meals: [],
  exercises: [],
  createdAt: timestamp,
  updatedAt: timestamp,
  schemaVersion: 1,
});

describe("food calorie domain", () => {
  it("defaults legacy meals to a manual calorie source", () => {
    const parsed = dailyLogSchema.parse({
      ...baseLog(),
      meals: [{ id: "legacy", type: "lunch", name: "김치찌개", calories: 500 }],
    });
    expect(parsed.meals[0].calorieSource).toBe("manual");
  });

  it("validates AI estimate ranges and required provenance", () => {
    const meal = { id: "ai", type: "lunch", name: "김치찌개", calories: 550, calorieSource: "ai_estimated" };
    expect(() => dailyLogSchema.parse({ ...baseLog(), meals: [meal] })).toThrow();
    expect(() => dailyLogSchema.parse({
      ...baseLog(),
      meals: [{ ...meal, calorieEstimate: { ...estimate, representative: 700 } }],
    })).toThrow();
    expect(dailyLogSchema.parse({ ...baseLog(), meals: [{ ...meal, calorieEstimate: estimate }] }).meals[0].calories).toBe(550);
  });

  it("excludes unknown calories and reports estimated and unknown counts", () => {
    const summary = summarizeDailyLog({
      ...baseLog(),
      meals: [
        { id: "manual", type: "breakfast", name: "사과", calories: 100 },
        { id: "ai", type: "lunch", name: "김치찌개", calories: 550, calorieSource: "ai_estimated", calorieEstimate: estimate },
        { id: "unknown", type: "snack", name: "모둠 간식", calories: 9_999, calorieSource: "unknown" },
      ],
    });
    expect(summary.caloriesConsumed).toBe(650);
    expect(summary.estimatedMealCount).toBe(1);
    expect(summary.unknownCalorieMealCount).toBe(1);
  });

  it("normalizes equivalent food profile identities", () => {
    expect(createFoodCalorieProfileId({ name: "  김치찌개  ", servingDescription: "1  인분" }))
      .toBe(createFoodCalorieProfileId({ name: "김치찌개", servingDescription: "1 인분" }));
  });
});

class MemoryFoodTable {
  records = new Map<string, ConfirmedFoodCalorie>();
  get = async (id: string) => this.records.get(id);
  put = async (food: ConfirmedFoodCalorie) => { this.records.set(food.id, structuredClone(food)); };
  delete = async (id: string) => { this.records.delete(id); };
  orderBy = () => ({
    reverse: () => ({
      toArray: async () => [...this.records.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    }),
  });
}

describe("confirmed food calorie repository", () => {
  it("persists, reuses, lists, and removes user-confirmed values", async () => {
    const table = new MemoryFoodTable();
    const repository = new ConfirmedFoodCalorieRepository({ confirmedFoods: table } as ConfirmedFoodDatabasePort);
    const saved = await repository.save({
      displayName: "김치찌개",
      servingDescription: "1인분",
      calories: 550,
      calorieSource: "ai_estimated",
      calorieEstimate: estimate,
    });

    expect((await repository.get({ name: " 김치찌개 ", servingDescription: "1인분" }))?.id).toBe(saved.id);
    expect(await repository.listAll()).toHaveLength(1);
    await repository.remove({ name: "김치찌개", servingDescription: "1인분" });
    expect(await repository.listAll()).toHaveLength(0);
  });
});
