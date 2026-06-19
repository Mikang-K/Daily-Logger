import type { AnalysisRequest, AnalysisResult } from "./types";

const prohibited = [
  /(?:진단|처방)(?!\s*(?:이|은)?\s*아닙니다).{0,12}(?:합니다|이다|입니다|받아야)/i,
  /(?:약|알약|인슐린).{0,15}(?:복용|투여)(?:하세요|해야)/i,
  /(?:굶|단식).{0,12}(?:권장|추천|해야)/i,
  /(?:토하|구토).{0,12}(?:권장|추천|해야)/i,
  /(?:diagnos(?:e|is)|prescri(?:be|ption))/i,
  /(?:starv|fasting|vomit).{0,24}(?:recommend|should|must)/i,
];

const escalationRisk = /(?:굶|절식|단식|먹지\s*않|토하|구토|하제|폭식|섭식장애|자해|자살|죽고\s*싶|starv|purging?|vomit|laxative|binge|eating\s*disorder|self[- ]?harm|suicid)/i;
const professionalHelp = /(?:의료진|의사|정신건강|전문가|전문\s*상담|응급|위기\s*지원|119|professional|clinician|doctor|mental\s*health|emergency|crisis)/i;
const ordinaryDietAdvice = /(?:열량|칼로리|섭취량).{0,15}(?:줄이세요|줄여|감소시키|제한하세요)|(?:운동|활동).{0,15}(?:늘리세요|추가하세요)|(?:체중|살).{0,15}(?:감량하세요|빼세요|줄이세요)|(?:reduce|cut|restrict).{0,15}(?:calorie|intake)|(?:increase|add).{0,15}exercise/i;

export class UnsafeAnalysisError extends Error {
  readonly code = "unsafe_output";
  constructor() { super("안전 정책에 맞지 않는 분석 결과를 차단했습니다."); this.name = "UnsafeAnalysisError"; }
}

export const hasAnalysisEscalationRisk = (input: AnalysisRequest): boolean => {
  const text = [input.daily.note, ...input.daily.meals.map((meal) => meal.name)].filter(Boolean).join("\n");
  return escalationRisk.test(text);
};

export const assertSafeAnalysis = (result: AnalysisResult, input?: AnalysisRequest): AnalysisResult => {
  const text = [result.summary, ...result.positivePatterns, ...result.attentionPoints, ...result.nextActions, ...result.dataLimitations, result.safetyNotice].join("\n");
  if (prohibited.some((pattern) => pattern.test(text))) throw new UnsafeAnalysisError();
  if (input && hasAnalysisEscalationRisk(input)) {
    if (!professionalHelp.test(text) || ordinaryDietAdvice.test(text)) throw new UnsafeAnalysisError();
  }
  return result;
};
