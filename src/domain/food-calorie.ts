export interface FoodCalorieIdentityInput {
  name: string;
  servingDescription?: string;
  preparationNote?: string;
}

export const normalizeFoodCalorieText = (value: string): string =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");

export const createFoodCalorieProfileId = (input: FoodCalorieIdentityInput): string =>
  JSON.stringify([
    normalizeFoodCalorieText(input.name),
    normalizeFoodCalorieText(input.servingDescription ?? ""),
    normalizeFoodCalorieText(input.preparationNote ?? ""),
  ]);
