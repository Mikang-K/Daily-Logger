export type AnalysisRuntimeSettings = {
  endpoint: string;
  modelId: string;
  timeoutSeconds: 120 | 300 | 600;
};

export type AnalysisModelView = {
  id: string;
  name: string;
  sizeBytes?: number;
  resourceFit?: 'comfortable' | 'tight' | 'insufficient' | 'unknown';
  resourceWarnings?: string[];
};

export type AnalysisProgressView = {
  phase: 'loading' | 'generating';
  tokensGenerated?: number;
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
  ) => Promise<{ models: AnalysisModelView[] }>;
  preloadModel: (
    settings: AnalysisRuntimeSettings,
    signal: AbortSignal,
    onProgress?: (progress: AnalysisProgressView) => void,
  ) => Promise<{ message?: string }>;
  analyze: (
    input: { date: string },
    settings: AnalysisRuntimeSettings,
    signal: AbortSignal,
    onProgress?: (progress: AnalysisProgressView) => void,
  ) => Promise<AnalysisResultView>;
};

export const unavailableAnalysisController: AnalysisController = {
  async checkConnection() {
    throw new Error('로컬 AI 연결 모듈을 불러오지 못했습니다.');
  },
  async analyze() {
    throw new Error('로컬 AI 연결 모듈을 불러오지 못했습니다.');
  },
  async preloadModel() {
    throw new Error('로컬 AI 모델 로딩 기능을 사용할 수 없습니다.');
  },
};
