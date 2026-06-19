export type AnalysisRuntimeSettings = {
  endpoint: string;
  modelId: string;
};

export type AnalysisResultView = {
  summary: string;
  positivePatterns: string[];
  attentionPoints: string[];
  nextActions: string[];
  dataLimitations: string[];
  safetyNotice: string;
};

export type AnalysisController = {
  checkConnection: (
    settings: AnalysisRuntimeSettings,
    signal: AbortSignal,
  ) => Promise<{ models: string[] }>;
  analyze: (
    input: { date: string },
    settings: AnalysisRuntimeSettings,
    signal: AbortSignal,
  ) => Promise<AnalysisResultView>;
};

export const unavailableAnalysisController: AnalysisController = {
  async checkConnection() {
    throw new Error('로컬 AI 연결 모듈을 불러오지 못했습니다.');
  },
  async analyze() {
    throw new Error('로컬 AI 연결 모듈을 불러오지 못했습니다.');
  },
};
