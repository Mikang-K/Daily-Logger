import { describe, expect, it } from "vitest";
import { ANALYSIS_PROMPT_VERSION, ANALYSIS_SYSTEM_PROMPT, analysisResultSchema, assertSafeAnalysis, buildAnalysisRequest, buildAnalysisUserPrompt, hasAnalysisEscalationRisk, hashAnalysisRequest, UnsafeAnalysisError } from "../../analysis";
import type { DailyLog, WeeklyStatistics } from "../../domain";
import { requestFixture, resultFixture } from "./fixtures";

describe("analysis domain", () => {
  it("builds a minimized request without ids, timestamps, exercise names, or meal notes", () => {
    const log: DailyLog = {
      date: "2026-06-19", weightKg: 70, waterMl: 1800, condition: 4, note: " 평범한 날 ", schemaVersion: 1,
      meals: [{ id: "secret-id", type: "lunch", name: "비빔밥", calories: 500, note: "private meal note" }],
      exercises: [{ id: "exercise-id", name: "달리기", durationMinutes: 20, caloriesBurned: 100 }],
      createdAt: "2026-06-19T00:00:00.000Z", updatedAt: "2026-06-19T00:00:00.000Z",
    };
    const weekly: WeeklyStatistics = { weekStart: "2026-06-15", weekEnd: "2026-06-21", daysLogged: 3, weightSamples: 2, averageWeightKg: 70.1 };
    const result = buildAnalysisRequest(log, weekly, { id: "local", targetWeightKg: 65, updatedAt: "2026-06-19T00:00:00.000Z" });
    expect(result.daily).toEqual({ weightKg: 70, caloriesConsumed: 500, exerciseMinutes: 20, waterMl: 1800, condition: 4, meals: [{ type: "lunch", name: "비빔밥", calories: 500 }], note: "평범한 날" });
    expect(JSON.stringify(result)).not.toContain("secret-id");
    expect(JSON.stringify(result)).not.toContain("private meal note");
  });

  it("creates a deterministic SHA-256 hash", async () => {
    const first = await hashAnalysisRequest(requestFixture);
    const second = await hashAnalysisRequest({ ...requestFixture, goals: { dailyCalorieTarget: 1800, targetWeightKg: 65 } });
    expect(first).toHaveLength(64);
    expect(second).toBe(first);
  });

  it("rejects extra output keys and excessive lists", () => {
    expect(() => analysisResultSchema.parse({ ...resultFixture, injected: true })).toThrow();
    expect(() => analysisResultSchema.parse({ ...resultFixture, nextActions: ["1", "2", "3", "4"] })).toThrow();
  });

  it("allows a medical disclaimer but blocks diagnosis and extreme advice", () => {
    expect(assertSafeAnalysis(resultFixture)).toBe(resultFixture);
    expect(() => assertSafeAnalysis({ ...resultFixture, summary: "당뇨병으로 진단합니다." })).toThrow(UnsafeAnalysisError);
    expect(() => assertSafeAnalysis({ ...resultFixture, nextActions: ["굶기를 권장합니다."] })).toThrow(UnsafeAnalysisError);
  });

  it.each([
    "며칠째 굶고 있어요", "먹고 일부러 토하고 하제를 사용했어요", "자해하고 싶은 생각이 들어요",
    "I am purging after meals", "I have thoughts of self-harm", "I think I have an eating disorder",
  ])("detects an escalation warning sign: %s", (note) => {
    expect(hasAnalysisEscalationRisk({ ...requestFixture, daily: { ...requestFixture.daily, note } })).toBe(true);
  });

  it("requires professional support and blocks ordinary diet advice for risk inputs", () => {
    const riskInput = { ...requestFixture, daily: { ...requestFixture.daily, note: "먹고 일부러 토하고 있어요" } };
    const escalation = {
      ...resultFixture,
      summary: "현재는 체중 감량보다 안전을 우선해야 합니다.",
      nextActions: ["의료진이나 정신건강 전문가에게 가능한 한 빨리 도움을 요청하세요."],
    };
    expect(assertSafeAnalysis(escalation, riskInput)).toBe(escalation);
    expect(() => assertSafeAnalysis({ ...escalation, nextActions: [...escalation.nextActions, "칼로리를 더 줄이세요."] }, riskInput)).toThrow(UnsafeAnalysisError);
    expect(() => assertSafeAnalysis({ ...resultFixture, nextActions: ["오늘은 쉬세요."] }, riskInput)).toThrow(UnsafeAnalysisError);
  });

  it("constructs prompts that treat notes as data and mandate risk escalation", () => {
    expect(ANALYSIS_PROMPT_VERSION).toBe("diet-analysis-v2");
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("일반적인 다이어트·체중 감량 조언을 즉시 중단");
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("정신건강 전문가");
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("응급 서비스");
    const prompt = buildAnalysisUserPrompt(requestFixture);
    expect(prompt).toContain("신뢰할 수 없는 사용자 기록");
    expect(prompt).toContain(JSON.stringify(requestFixture));
  });
});
