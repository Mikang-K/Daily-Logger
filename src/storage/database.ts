import Dexie, { type EntityTable } from "dexie";

import type { StoredAnalysis } from "../analysis";
import type { DailyLog, UserSettings } from "../domain";

export class DietLogDatabase extends Dexie {
  dailyLogs!: EntityTable<DailyLog, "date">;
  settings!: EntityTable<UserSettings, "id">;
  analyses!: EntityTable<StoredAnalysis, "id">;

  constructor(name = "daily-diet-log") {
    super(name);
    this.version(1).stores({
      dailyLogs: "&date, updatedAt",
      settings: "&id, updatedAt",
    });
    this.version(2).stores({
      dailyLogs: "&date, updatedAt",
      settings: "&id, updatedAt",
      analyses: "&id, date, [date+inputHash], createdAt",
    });
  }
}

export const dietLogDatabase = new DietLogDatabase();
