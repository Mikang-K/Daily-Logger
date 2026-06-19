import { describe, expect, it } from "vitest";

import type { AnalysisResult, StoredAnalysis } from "../../analysis";
import {
  DexieAnalysisRepository,
  createAnalysisId,
  type AnalysisDatabasePort,
} from "../../storage";

const result: AnalysisResult = {
  schemaVersion: 1,
  summary: "기록 요약",
  positivePatterns: [],
  attentionPoints: [],
  nextActions: [],
  dataLimitations: [],
  safetyNotice: "의료 조언이 아닙니다.",
};

const analysis = (date: string, inputHash: string, createdAt = "2026-06-19T00:00:00.000Z"): StoredAnalysis => ({
  id: createAnalysisId(date, inputHash, "local-model", "v1"),
  date,
  inputHash,
  modelId: "local-model",
  runtime: "ollama",
  promptVersion: "v1",
  result,
  createdAt,
});

class MemoryAnalysisTable {
  private readonly records = new Map<string, StoredAnalysis>();

  async get(id: string): Promise<StoredAnalysis | undefined> {
    return this.records.get(id);
  }

  async put(value: StoredAnalysis): Promise<string> {
    this.records.set(value.id, structuredClone(value));
    return value.id;
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  async clear(): Promise<void> {
    this.records.clear();
  }

  where(index: string) {
    return {
      equals: (value: string | [string, string]) => {
        const selected = () => [...this.records.values()].filter((item) => {
          if (index === "date") return item.date === value;
          if (index === "[date+inputHash]" && Array.isArray(value)) {
            return item.date === value[0] && item.inputHash === value[1];
          }
          return false;
        });
        return {
          toArray: async () => selected().map((item) => structuredClone(item)),
          delete: async () => {
            const matches = selected();
            matches.forEach((item) => this.records.delete(item.id));
            return matches.length;
          },
        };
      },
    };
  }
}

const createRepository = () => {
  const database: AnalysisDatabasePort = { analyses: new MemoryAnalysisTable() };
  return new DexieAnalysisRepository(database);
};

describe("analysis repository", () => {
  it("supports save, get, list, and remove CRUD operations", async () => {
    const repository = createRepository();
    const stored = analysis("2026-06-19", "hash");
    await repository.save(stored);

    expect(await repository.get(stored.id)).toEqual(stored);
    expect(await repository.listByDate(stored.date)).toEqual([stored]);
    await repository.remove(stored.id);
    expect(await repository.get(stored.id)).toBeUndefined();
  });

  it("finds current input and orders other results as stale", async () => {
    const repository = createRepository();
    const old = analysis("2026-06-19", "old-hash", "2026-06-18T00:00:00.000Z");
    const current = analysis("2026-06-19", "current-hash", "2026-06-19T00:00:00.000Z");
    await repository.save(old);
    await repository.save(current);

    const state = await repository.getCurrentAndStale({
      date: "2026-06-19",
      inputHash: "current-hash",
      modelId: "local-model",
      promptVersion: "v1",
    });

    expect(state.current).toEqual(current);
    expect(state.stale).toEqual([old]);
    expect(await repository.getCurrent({ date: "2026-06-19", inputHash: "missing" })).toBeUndefined();
  });

  it("removes only analyses belonging to the requested date and can clear all", async () => {
    const repository = createRepository();
    const first = analysis("2026-06-18", "hash-a");
    const second = analysis("2026-06-19", "hash-b");
    await repository.save(first);
    await repository.save(second);

    expect(await repository.removeByDate("2026-06-18")).toBe(1);
    expect(await repository.get(first.id)).toBeUndefined();
    expect(await repository.get(second.id)).toEqual(second);
    await repository.clear();
    expect(await repository.get(second.id)).toBeUndefined();
  });
});
