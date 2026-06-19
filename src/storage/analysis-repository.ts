import type { StoredAnalysis } from "../analysis";
import { localDateSchema, timestampSchema } from "../domain";
import { dietLogDatabase } from "./database";

export interface CurrentAnalysisKey {
  date: string;
  inputHash: string;
  modelId?: string;
  promptVersion?: string;
}

export interface DateAnalyses {
  current: StoredAnalysis | undefined;
  stale: StoredAnalysis[];
}

export interface AnalysisRepository {
  get(id: string): Promise<StoredAnalysis | undefined>;
  listByDate(date: string): Promise<StoredAnalysis[]>;
  getCurrent(key: CurrentAnalysisKey): Promise<StoredAnalysis | undefined>;
  getCurrentAndStale(key: CurrentAnalysisKey): Promise<DateAnalyses>;
  save(analysis: StoredAnalysis): Promise<StoredAnalysis>;
  remove(id: string): Promise<void>;
  removeByDate(date: string): Promise<number>;
  clear(): Promise<void>;
}

interface AnalysisQuery {
  toArray(): Promise<StoredAnalysis[]>;
  delete(): Promise<number>;
}

interface AnalysisTablePort {
  get(id: string): Promise<StoredAnalysis | undefined>;
  put(analysis: StoredAnalysis): PromiseLike<unknown>;
  delete(id: string): PromiseLike<unknown>;
  clear(): PromiseLike<unknown>;
  where(index: string): {
    equals(value: string | [string, string]): AnalysisQuery;
  };
}

export interface AnalysisDatabasePort {
  analyses: AnalysisTablePort;
}

const requiredText = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

const matchesCurrentKey = (analysis: StoredAnalysis, key: CurrentAnalysisKey): boolean =>
  analysis.inputHash === key.inputHash &&
  (key.modelId === undefined || analysis.modelId === key.modelId) &&
  (key.promptVersion === undefined || analysis.promptVersion === key.promptVersion);

export const createAnalysisId = (
  date: string,
  inputHash: string,
  modelId: string,
  promptVersion: string,
): string => [date, inputHash, modelId, promptVersion].map(encodeURIComponent).join("::");

export class DexieAnalysisRepository implements AnalysisRepository {
  constructor(
    private readonly database: AnalysisDatabasePort = dietLogDatabase as AnalysisDatabasePort,
  ) {}

  get(id: string): Promise<StoredAnalysis | undefined> {
    return this.database.analyses.get(requiredText(id, "id"));
  }

  async listByDate(date: string): Promise<StoredAnalysis[]> {
    localDateSchema.parse(date);
    const analyses = await this.database.analyses.where("date").equals(date).toArray();
    return analyses.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getCurrent(key: CurrentAnalysisKey): Promise<StoredAnalysis | undefined> {
    localDateSchema.parse(key.date);
    requiredText(key.inputHash, "inputHash");
    const candidates = await this.database.analyses
      .where("[date+inputHash]")
      .equals([key.date, key.inputHash])
      .toArray();
    return candidates
      .filter((analysis) => matchesCurrentKey(analysis, key))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  }

  async getCurrentAndStale(key: CurrentAnalysisKey): Promise<DateAnalyses> {
    const analyses = await this.listByDate(key.date);
    const current = analyses.find((analysis) => matchesCurrentKey(analysis, key));
    return { current, stale: analyses.filter((analysis) => analysis.id !== current?.id) };
  }

  async save(analysis: StoredAnalysis): Promise<StoredAnalysis> {
    const saved: StoredAnalysis = {
      ...analysis,
      id: requiredText(analysis.id, "id"),
      date: localDateSchema.parse(analysis.date),
      inputHash: requiredText(analysis.inputHash, "inputHash"),
      modelId: requiredText(analysis.modelId, "modelId"),
      runtime: requiredText(analysis.runtime, "runtime"),
      promptVersion: requiredText(analysis.promptVersion, "promptVersion"),
      createdAt: timestampSchema.parse(analysis.createdAt),
    };
    await this.database.analyses.put(saved);
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.database.analyses.delete(requiredText(id, "id"));
  }

  async removeByDate(date: string): Promise<number> {
    localDateSchema.parse(date);
    return this.database.analyses.where("date").equals(date).delete();
  }

  async clear(): Promise<void> {
    await this.database.analyses.clear();
  }
}
