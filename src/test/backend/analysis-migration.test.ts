import { describe, expect, it } from "vitest";

import { DietLogDatabase } from "../../storage";

describe("database v3 schema declaration", () => {
  it("preserves existing tables and adds the confirmed food dictionary", () => {
    const database = new DietLogDatabase("schema-inspection-only");

    expect(database.verno).toBe(3);
    expect(database.tables.map((table) => table.name).sort()).toEqual([
      "analyses",
      "confirmedFoods",
      "dailyLogs",
      "settings",
    ]);
    const analyses = database.table("analyses").schema;
    expect(analyses.primKey.name).toBe("id");
    expect(analyses.indexes.map((index) => index.name)).toEqual([
      "date",
      "[date+inputHash]",
      "createdAt",
    ]);
    const confirmedFoods = database.table("confirmedFoods").schema;
    expect(confirmedFoods.primKey.name).toBe("id");
    expect(confirmedFoods.indexes.map((index) => index.name)).toEqual([
      "normalizedName",
      "updatedAt",
    ]);

    database.close();
  });
});
