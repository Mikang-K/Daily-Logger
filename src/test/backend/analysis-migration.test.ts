import { describe, expect, it } from "vitest";

import { DietLogDatabase } from "../../storage";

describe("database v2 schema declaration", () => {
  it("declares the existing v1 tables and the indexed analyses table", () => {
    const database = new DietLogDatabase("schema-inspection-only");

    expect(database.verno).toBe(2);
    expect(database.tables.map((table) => table.name).sort()).toEqual([
      "analyses",
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

    database.close();
  });
});
