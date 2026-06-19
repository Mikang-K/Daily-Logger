import {
  ANALYSIS_PROMPT_VERSION,
  buildAnalysisRequest,
  hashAnalysisRequest,
  type AnalysisRequest,
} from '../analysis';
import { summarizeDailyLog, type DailyLog, type WeeklyStatistics } from '../domain';
import { createLocalHttpLlmClient } from '../llm';
import {
  createAnalysisId,
  DexieAnalysisRepository,
  DexieDailyLogRepository,
  SettingsRepository,
} from '../storage';
import type { AnalysisController } from '../features/analysis/analysis-controller';
import { estimateRuntimeResources } from '../runtime';

const logs = new DexieDailyLogRepository();
const settings = new SettingsRepository();
const analyses = new DexieAnalysisRepository();

const dateDaysBefore = (date: string, days: number): string => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
};

const summarizeRecentSevenDays = (items: DailyLog[], date: string): WeeklyStatistics => {
  const summaries = items.map(summarizeDailyLog);
  const weights = summaries.flatMap(item => item.weightKg === undefined ? [] : [item.weightKg]);
  const average = (values: number[]) => values.length === 0
    ? undefined
    : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10;
  return {
    weekStart: dateDaysBefore(date, 6),
    weekEnd: date,
    daysLogged: summaries.length,
    weightSamples: weights.length,
    averageWeightKg: average(weights),
    averageCaloriesPerLoggedDay: average(summaries.map(item => item.caloriesConsumed)),
    averageExerciseMinutesPerLoggedDay: average(summaries.map(item => item.exerciseMinutes)),
  };
};

const buildInput = async (date: string): Promise<AnalysisRequest> => {
  const log = await logs.getByDate(date);
  if (!log) throw new Error('저장된 기록을 찾을 수 없습니다. 먼저 기록을 저장해 주세요.');
  const [recent, userSettings] = await Promise.all([
    logs.listRange(dateDaysBefore(date, 6), date),
    settings.get(),
  ]);
  return buildAnalysisRequest(log, summarizeRecentSevenDays(recent, date), userSettings ?? null);
};

export const localAnalysisController: AnalysisController = {
  async checkConnection(runtime, signal) {
    const client = createLocalHttpLlmClient({ endpoint: runtime.endpoint, modelId: runtime.modelId || '__connection_check__', timeoutMs: runtime.timeoutSeconds * 1000 });
    const status = await client.healthCheck(signal);
    if (status.state !== 'ready') throw new Error(status.message || '로컬 AI에 연결할 수 없습니다.');
    const available = await client.listModels(signal);
    return { models: available.map(model => {
      const diagnostic = estimateRuntimeResources({ model: { modelId: model.id, modelBytes: model.sizeBytes, quantizationLevel: model.quantizationLevel } });
      return { id: model.id, name: model.name, sizeBytes: model.sizeBytes, resourceFit: diagnostic.fit, resourceWarnings: diagnostic.warnings };
    }) };
  },

  async preloadModel(runtime, signal, onProgress) {
    const client = createLocalHttpLlmClient({ endpoint: runtime.endpoint, modelId: runtime.modelId, timeoutMs: runtime.timeoutSeconds * 1000 });
    const result = await client.warmup(signal, onProgress);
    if (!result.loaded) throw new Error('모델 로딩 완료를 확인하지 못했습니다.');
    return { message: result.loadDurationMs === undefined ? '모델 로딩이 완료되었습니다.' : `모델 로딩이 완료되었습니다. (${(result.loadDurationMs / 1000).toFixed(1)}초)` };
  },

  async analyze({ date }, runtime, signal, onProgress) {
    const input = await buildInput(date);
    const inputHash = await hashAnalysisRequest(input);
    const cached = await analyses.getCurrent({
      date,
      inputHash,
      modelId: runtime.modelId,
      promptVersion: ANALYSIS_PROMPT_VERSION,
    });
    if (cached) return cached.result;

    const client = createLocalHttpLlmClient({ endpoint: runtime.endpoint, modelId: runtime.modelId, timeoutMs: runtime.timeoutSeconds * 1000 });
    const result = await client.analyze(input, signal, onProgress);
    await analyses.save({
      id: createAnalysisId(date, inputHash, runtime.modelId, ANALYSIS_PROMPT_VERSION),
      date,
      inputHash,
      modelId: runtime.modelId,
      runtime: 'ollama',
      promptVersion: ANALYSIS_PROMPT_VERSION,
      result,
      createdAt: new Date().toISOString(),
    });
    return result;
  },
};
