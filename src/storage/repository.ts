import type { DailyLog, UserSettings } from "../domain";
import { dailyLogSchema, localDateSchema, userSettingsSchema } from "../domain";
import { dietLogDatabase, type DietLogDatabase } from "./database";

export interface DailyLogRepository {
  getByDate(date: string): Promise<DailyLog | undefined>;
  listAll(): Promise<DailyLog[]>;
  listRange(startDate: string, endDate: string): Promise<DailyLog[]>;
  save(log: DailyLog): Promise<DailyLog>;
  remove(date: string): Promise<void>;
}

export class DexieDailyLogRepository implements DailyLogRepository {
  constructor(private readonly database: DietLogDatabase = dietLogDatabase) {}

  async getByDate(date: string): Promise<DailyLog | undefined> {
    localDateSchema.parse(date);
    return this.database.dailyLogs.get(date);
  }

  async listAll(): Promise<DailyLog[]> {
    return this.database.dailyLogs.orderBy("date").toArray();
  }

  async listRange(startDate: string, endDate: string): Promise<DailyLog[]> {
    localDateSchema.parse(startDate);
    localDateSchema.parse(endDate);
    if (startDate > endDate) throw new Error("시작일은 종료일보다 늦을 수 없습니다.");
    return this.database.dailyLogs.where("date").between(startDate, endDate, true, true).sortBy("date");
  }

  async save(log: DailyLog): Promise<DailyLog> {
    const parsed = dailyLogSchema.parse(log);
    const existing = await this.database.dailyLogs.get(parsed.date);
    const now = new Date().toISOString();
    const saved = dailyLogSchema.parse({
      ...parsed,
      createdAt: existing?.createdAt ?? parsed.createdAt ?? now,
      updatedAt: now,
    });
    await this.database.dailyLogs.put(saved);
    return saved;
  }

  async remove(date: string): Promise<void> {
    localDateSchema.parse(date);
    await this.database.transaction("rw", this.database.dailyLogs, this.database.analyses, async () => {
      await this.database.dailyLogs.delete(date);
      await this.database.analyses.where("date").equals(date).delete();
    });
  }
}

export class SettingsRepository {
  constructor(private readonly database: DietLogDatabase = dietLogDatabase) {}

  get(): Promise<UserSettings | undefined> {
    return this.database.settings.get("local");
  }

  async save(settings: UserSettings): Promise<UserSettings> {
    const saved = userSettingsSchema.parse({ ...settings, id: "local", updatedAt: new Date().toISOString() });
    await this.database.settings.put(saved);
    return saved;
  }
}
