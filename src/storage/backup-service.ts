import type { DietLogBackup } from "../domain";
import { dietLogBackupSchema, parseBackupJson, serializeBackup } from "../domain";
import { dietLogDatabase, type DietLogDatabase } from "./database";

export type ImportMode = "merge" | "replace";

export class BackupService {
  constructor(private readonly database: DietLogDatabase = dietLogDatabase) {}

  async exportJson(): Promise<string> {
    const backup: DietLogBackup = {
      format: "daily-diet-log",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      dailyLogs: await this.database.dailyLogs.orderBy("date").toArray(),
      settings: (await this.database.settings.get("local")) ?? null,
      confirmedFoods: await this.database.confirmedFoods.toArray(),
    };
    return serializeBackup(backup);
  }

  async importJson(json: string, mode: ImportMode): Promise<{ importedLogs: number }> {
    const backup = dietLogBackupSchema.parse(parseBackupJson(json));

    await this.database.transaction("rw", this.database.dailyLogs, this.database.settings, this.database.analyses, this.database.confirmedFoods, async () => {
      if (mode === "replace") {
        await this.database.dailyLogs.clear();
        await this.database.settings.clear();
        await this.database.analyses.clear();
        await this.database.confirmedFoods.clear();
      }
      await this.database.dailyLogs.bulkPut(backup.dailyLogs);
      if (backup.settings) await this.database.settings.put(backup.settings);
      if (backup.confirmedFoods?.length) await this.database.confirmedFoods.bulkPut(backup.confirmedFoods);
    });

    return { importedLogs: backup.dailyLogs.length };
  }

  async clearAll(): Promise<void> {
    await this.database.transaction("rw", this.database.dailyLogs, this.database.settings, this.database.analyses, this.database.confirmedFoods, async () => {
      await this.database.dailyLogs.clear();
      await this.database.settings.clear();
      await this.database.analyses.clear();
      await this.database.confirmedFoods.clear();
    });
  }
}
