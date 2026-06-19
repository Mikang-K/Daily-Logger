import { analysisResultSchema, assertSafeAnalysis, buildAnalysisUserPrompt, buildRepairPrompt, ANALYSIS_SYSTEM_PROMPT, type AnalysisRequest, type AnalysisResult, type LocalLlmClient, type LocalModel, type LlmRuntimeStatus } from "../analysis";
import { endpointUrl, parseLoopbackEndpoint } from "./endpoint";
import { LlmClientError } from "./errors";

export interface LocalHttpLlmClientOptions {
  endpoint: string;
  modelId: string;
  timeoutMs?: number;
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

export const createLocalHttpLlmClient = (options: LocalHttpLlmClientOptions): LocalLlmClient => {
  const base = parseLoopbackEndpoint(options.endpoint);
  const fetcher = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 300_000;
  if (!options.modelId.trim()) throw new LlmClientError("invalid_response", "분석 모델을 선택해 주세요.");

  const request = async (path: string, init: RequestInit, signal?: AbortSignal): Promise<unknown> => {
    const controller = new AbortController();
    let timedOut = false;
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) controller.abort();
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetcher(endpointUrl(base, path), { ...init, signal: controller.signal });
      if (!response.ok) throw new LlmClientError("http_error", `로컬 LLM 요청이 실패했습니다. (HTTP ${response.status})`, response.status);
      try { return await response.json(); } catch { throw new LlmClientError("invalid_response", "로컬 LLM 응답을 읽을 수 없습니다."); }
    } catch (error) { return normalizeError(error, timedOut); }
    finally { clearTimeout(timer); signal?.removeEventListener("abort", onAbort); }
  };

  const generate = async (messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, signal?: AbortSignal): Promise<string> => {
    const payload = await request("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: options.modelId, stream: false, format: "json", messages, options: { temperature: 0.2 } }),
    }, signal) as { message?: { content?: unknown } };
    if (typeof payload?.message?.content !== "string") throw new LlmClientError("invalid_response", "모델 응답 본문이 없습니다.");
    return payload.message.content;
  };

  return {
    async healthCheck(signal): Promise<LlmRuntimeStatus> {
      try {
        await request("/api/tags", { method: "GET" }, signal);
        return { state: "ready", runtime: "ollama", endpoint: base.origin };
      } catch (error) {
        if (error instanceof LlmClientError && error.code === "cancelled") throw error;
        return { state: "unavailable", runtime: "ollama", endpoint: base.origin, message: error instanceof Error ? error.message : "연결할 수 없습니다." };
      }
    },
    async listModels(signal): Promise<LocalModel[]> {
      const payload = await request("/api/tags", { method: "GET" }, signal) as { models?: Array<{ name?: unknown; model?: unknown; size?: unknown }> };
      if (!Array.isArray(payload.models)) throw new LlmClientError("invalid_response", "모델 목록 형식이 올바르지 않습니다.");
      return payload.models.flatMap((model) => {
        const id = typeof model.model === "string" ? model.model : typeof model.name === "string" ? model.name : undefined;
        return id ? [{ id, name: typeof model.name === "string" ? model.name : id, sizeBytes: typeof model.size === "number" ? model.size : undefined }] : [];
      });
    },
    async analyze(input: AnalysisRequest, signal?: AbortSignal): Promise<AnalysisResult> {
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT }, { role: "user", content: buildAnalysisUserPrompt(input) },
      ];
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const raw = await generate(messages, signal);
        try { return assertSafeAnalysis(analysisResultSchema.parse(parseJsonObject(raw)), input); }
        catch (error) {
          lastError = error;
          if (attempt === 0) messages.push({ role: "assistant", content: raw.slice(0, 12_000) }, { role: "user", content: buildRepairPrompt() });
        }
      }
      const code = lastError instanceof Error && "code" in lastError && lastError.code === "unsafe_output" ? "unsafe_output" : "invalid_response";
      throw new LlmClientError(code, code === "unsafe_output" ? "안전 정책에 맞지 않는 결과를 차단했습니다." : "모델 결과가 필요한 형식과 맞지 않습니다.");
    },
  };
};
