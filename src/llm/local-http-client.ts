import {
  ANALYSIS_SYSTEM_PROMPT,
  analysisResultSchema,
  assertSafeAnalysis,
  buildAnalysisUserPrompt,
  buildRepairPrompt,
  buildFoodCalorieRepairPrompt,
  buildFoodCalorieUserPrompt,
  FOOD_CALORIE_SYSTEM_PROMPT,
  foodCalorieEstimateRequestSchema,
  foodCalorieEstimateResultSchema,
  type AnalysisRequest,
  type AnalysisResult,
  type FoodCalorieEstimateRequest,
  type FoodCalorieEstimateResult,
  type LlmProgressEvent,
  type LlmRuntimeStatus,
  type LlmWarmupResult,
  type LocalLlmClient,
  type LocalModel,
} from "../analysis";
import { endpointUrl, parseLoopbackEndpoint } from "./endpoint";
import { LlmClientError } from "./errors";

export const MIN_LLM_TIMEOUT_MS = 60_000;
export const MAX_LLM_TIMEOUT_MS = 900_000;
export const DEFAULT_LLM_TIMEOUT_MS = 300_000;
export const DEFAULT_OLLAMA_KEEP_ALIVE = "10m";

export interface LocalHttpLlmClientOptions {
  endpoint: string;
  modelId: string;
  timeoutMs?: number;
  keepAlive?: string | number;
  fetch?: typeof fetch;
}

const parseJsonObject = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(trimmed); } catch { throw new LlmClientError("invalid_response", "모델이 유효한 JSON을 반환하지 않았습니다."); }
};

const normalizeError = (error: unknown, timedOut: boolean): never => {
  if (error instanceof LlmClientError) throw error;
  if (timedOut) throw new LlmClientError("timeout", "로컬 모델 응답 시간이 초과되었습니다.");
  if (error instanceof DOMException && error.name === "AbortError") throw new LlmClientError("cancelled", "분석이 취소되었습니다.");
  throw new LlmClientError("connection_failed", "로컬 LLM 서버에 연결할 수 없습니다.");
};

const validateTimeout = (value: number): number => {
  if (!Number.isFinite(value) || value < MIN_LLM_TIMEOUT_MS || value > MAX_LLM_TIMEOUT_MS) {
    throw new LlmClientError("invalid_configuration", "응답 제한 시간은 60초 이상 900초 이하이어야 합니다.");
  }
  return Math.round(value);
};

const httpError = (status: number): LlmClientError => {
  const message = status >= 500
    ? `로컬 LLM 서버가 요청을 처리하지 못했습니다. 모델 크기와 시스템 RAM·VRAM을 확인해 주세요. (HTTP ${status})`
    : `로컬 LLM 요청이 실패했습니다. (HTTP ${status})`;
  return new LlmClientError("http_error", message, status);
};

interface RequestContext {
  signal: AbortSignal;
  didTimeOut: () => boolean;
  dispose: () => void;
}

const createRequestContext = (callerSignal: AbortSignal | undefined, timeoutMs: number): RequestContext => {
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort();
  callerSignal?.addEventListener("abort", onAbort, { once: true });
  if (callerSignal?.aborted) controller.abort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  return {
    signal: controller.signal,
    didTimeOut: () => timedOut,
    dispose: () => { clearTimeout(timer); callerSignal?.removeEventListener("abort", onAbort); },
  };
};

export const createLocalHttpLlmClient = (options: LocalHttpLlmClientOptions): LocalLlmClient => {
  const base = parseLoopbackEndpoint(options.endpoint);
  const fetcher = options.fetch ?? fetch;
  const timeoutMs = validateTimeout(options.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS);
  const keepAlive = options.keepAlive ?? DEFAULT_OLLAMA_KEEP_ALIVE;
  if (!options.modelId.trim()) throw new LlmClientError("invalid_configuration", "분석 모델을 선택해 주세요.");

  const requestJson = async (path: string, init: RequestInit, signal?: AbortSignal): Promise<unknown> => {
    const context = createRequestContext(signal, timeoutMs);
    try {
      const response = await fetcher(endpointUrl(base, path), { ...init, signal: context.signal });
      if (!response.ok) throw httpError(response.status);
      try { return await response.json(); } catch { throw new LlmClientError("invalid_response", "로컬 LLM 응답을 읽을 수 없습니다."); }
    } catch (error) {
      return normalizeError(error, context.didTimeOut());
    } finally {
      context.dispose();
    }
  };

  const generate = async (
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    signal?: AbortSignal,
    onProgress?: (event: LlmProgressEvent) => void,
  ): Promise<string> => {
    onProgress?.({ phase: "loading" });
    const context = createRequestContext(signal, timeoutMs);
    try {
      const response = await fetcher(endpointUrl(base, "/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: options.modelId, stream: true, format: "json", keep_alive: keepAlive, messages, options: { temperature: 0.2 } }),
        signal: context.signal,
      });
      if (!response.ok) throw httpError(response.status);

      // Retain compatibility with simple JSON proxies and test adapters.
      if (!response.body || response.headers.get("Content-Type")?.includes("application/json")) {
        const payload = await response.json() as { message?: { content?: unknown }; eval_count?: unknown };
        if (typeof payload.message?.content !== "string") throw new LlmClientError("invalid_response", "모델 응답 본문이 없습니다.");
        onProgress?.({ phase: "generating", tokensGenerated: typeof payload.eval_count === "number" ? payload.eval_count : undefined });
        return payload.message.content;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";
      let tokensGenerated = 0;
      const consumeLine = (line: string) => {
        if (!line.trim()) return;
        let chunk: { message?: { content?: unknown }; eval_count?: unknown };
        try { chunk = JSON.parse(line); } catch { throw new LlmClientError("invalid_response", "모델 스트림 형식이 올바르지 않습니다."); }
        if (typeof chunk.message?.content === "string") content += chunk.message.content;
        tokensGenerated = typeof chunk.eval_count === "number" ? chunk.eval_count : tokensGenerated + (chunk.message?.content ? 1 : 0);
        onProgress?.({ phase: "generating", tokensGenerated });
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        lines.forEach(consumeLine);
      }
      buffer += decoder.decode();
      consumeLine(buffer);
      if (!content) throw new LlmClientError("invalid_response", "모델 응답 본문이 없습니다.");
      return content;
    } catch (error) {
      return normalizeError(error, context.didTimeOut());
    } finally {
      context.dispose();
    }
  };

  return {
    async healthCheck(signal): Promise<LlmRuntimeStatus> {
      try {
        await requestJson("/api/tags", { method: "GET" }, signal);
        return { state: "ready", runtime: "ollama", endpoint: base.origin };
      } catch (error) {
        if (error instanceof LlmClientError && error.code === "cancelled") throw error;
        return { state: "unavailable", runtime: "ollama", endpoint: base.origin, message: error instanceof Error ? error.message : "연결할 수 없습니다." };
      }
    },
    async listModels(signal): Promise<LocalModel[]> {
      const payload = await requestJson("/api/tags", { method: "GET" }, signal) as {
        models?: Array<{ name?: unknown; model?: unknown; size?: unknown; modified_at?: unknown; digest?: unknown; details?: Record<string, unknown> }>;
      };
      if (!Array.isArray(payload.models)) throw new LlmClientError("invalid_response", "모델 목록 형식이 올바르지 않습니다.");
      return payload.models.flatMap((model) => {
        const id = typeof model.model === "string" ? model.model : typeof model.name === "string" ? model.name : undefined;
        if (!id) return [];
        return [{
          id,
          name: typeof model.name === "string" ? model.name : id,
          sizeBytes: typeof model.size === "number" ? model.size : undefined,
          parameterSize: typeof model.details?.parameter_size === "string" ? model.details.parameter_size : undefined,
          quantizationLevel: typeof model.details?.quantization_level === "string" ? model.details.quantization_level : undefined,
          family: typeof model.details?.family === "string" ? model.details.family : undefined,
          format: typeof model.details?.format === "string" ? model.details.format : undefined,
          modifiedAt: typeof model.modified_at === "string" ? model.modified_at : undefined,
          digest: typeof model.digest === "string" ? model.digest : undefined,
        }];
      });
    },
    async warmup(signal, onProgress): Promise<LlmWarmupResult> {
      onProgress?.({ phase: "loading" });
      const payload = await requestJson("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: options.modelId, prompt: "", stream: false, keep_alive: keepAlive }),
      }, signal) as { done?: unknown; load_duration?: unknown };
      return {
        modelId: options.modelId,
        loaded: payload.done === true,
        loadDurationMs: typeof payload.load_duration === "number" ? Math.round(payload.load_duration / 1_000_000) : undefined,
      };
    },
    async analyze(input: AnalysisRequest, signal?: AbortSignal, onProgress?: (event: LlmProgressEvent) => void): Promise<AnalysisResult> {
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT }, { role: "user", content: buildAnalysisUserPrompt(input) },
      ];
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const raw = await generate(messages, signal, onProgress);
        try { return assertSafeAnalysis(analysisResultSchema.parse(parseJsonObject(raw)), input); }
        catch (error) {
          lastError = error;
          if (attempt === 0) messages.push({ role: "assistant", content: raw.slice(0, 12_000) }, { role: "user", content: buildRepairPrompt() });
        }
      }
      const code = lastError instanceof Error && "code" in lastError && lastError.code === "unsafe_output" ? "unsafe_output" : "invalid_response";
      throw new LlmClientError(code, code === "unsafe_output" ? "안전 정책에 맞지 않는 결과를 차단했습니다." : "모델 결과가 필요한 형식과 맞지 않습니다.");
    },
    async estimateFoodCalories(
      input: FoodCalorieEstimateRequest,
      signal?: AbortSignal,
      onProgress?: (event: LlmProgressEvent) => void,
    ): Promise<FoodCalorieEstimateResult> {
      const validatedInput = foodCalorieEstimateRequestSchema.parse(input);
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: FOOD_CALORIE_SYSTEM_PROMPT },
        { role: "user", content: buildFoodCalorieUserPrompt(validatedInput) },
      ];
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const raw = await generate(messages, signal, onProgress);
        try {
          return foodCalorieEstimateResultSchema.parse(parseJsonObject(raw));
        } catch {
          if (attempt === 0) {
            messages.push(
              { role: "assistant", content: raw.slice(0, 12_000) },
              { role: "user", content: buildFoodCalorieRepairPrompt() },
            );
          }
        }
      }
      throw new LlmClientError("invalid_response", "모델의 칼로리 추정 결과가 필요한 형식과 맞지 않습니다.");
    },
  };
};
