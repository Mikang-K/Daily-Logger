import {
  confirmedFoodCalorieSchema,
  createFoodCalorieProfileId,
  normalizeFoodCalorieText,
  type ConfirmedFoodCalorie,
  type FoodCalorieIdentityInput,
} from "../domain";
import { dietLogDatabase } from "./database";

export type ConfirmedFoodCalorieInput = Omit<
  ConfirmedFoodCalorie,
  "id" | "normalizedName" | "createdAt" | "updatedAt"
>;

interface ConfirmedFoodOrderPort {
  reverse(): { toArray(): Promise<ConfirmedFoodCalorie[]> };
}

interface ConfirmedFoodTablePort {
  get(id: string): Promise<ConfirmedFoodCalorie | undefined>;
  put(food: ConfirmedFoodCalorie): PromiseLike<unknown>;
  delete(id: string): PromiseLike<unknown>;
  orderBy(index: string): ConfirmedFoodOrderPort;
}

export interface ConfirmedFoodDatabasePort {
  confirmedFoods: ConfirmedFoodTablePort;
}

export class ConfirmedFoodCalorieRepository {
  constructor(
    private readonly database: ConfirmedFoodDatabasePort = dietLogDatabase as ConfirmedFoodDatabasePort,
  ) {}

  get(input: FoodCalorieIdentityInput): Promise<ConfirmedFoodCalorie | undefined> {
    return this.database.confirmedFoods.get(createFoodCalorieProfileId(input));
  }

  listAll(): Promise<ConfirmedFoodCalorie[]> {
    return this.database.confirmedFoods.orderBy("updatedAt").reverse().toArray();
  }

  async save(input: ConfirmedFoodCalorieInput): Promise<ConfirmedFoodCalorie> {
    const id = createFoodCalorieProfileId({
      name: input.displayName,
      servingDescription: input.servingDescription,
      preparationNote: input.preparationNote,
    });
    const existing = await this.database.confirmedFoods.get(id);
    const now = new Date().toISOString();
    const saved = confirmedFoodCalorieSchema.parse({
      ...input,
      id,
      normalizedName: normalizeFoodCalorieText(input.displayName),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await this.database.confirmedFoods.put(saved);
    return saved;
  }

  async remove(input: FoodCalorieIdentityInput): Promise<void> {
    await this.database.confirmedFoods.delete(createFoodCalorieProfileId(input));
  }
}
