# Local AI runtime reliability implementation

- Workflow ID: `wf_20260619_local_ai_runtime_reliability`
- Stage: `implementation`
- Producing agent: `ai-engineer`
- Source task ID: `task_runtime_ai_001`
- Timestamp: `2026-06-19T16:49:00+09:00`
- Summary: Added model resource metadata, explicit preload, keep-alive, bounded configurable timeouts, cancellable NDJSON streaming, and metadata-only generation progress to the Ollama adapter.
- Inputs used: Existing `src/analysis`, `src/llm`, AI tests, runtime workflow state, and the diagnosed cold-model timeout behavior.
- Open assumptions: The configured local server implements Ollama `/api/tags`, `/api/generate`, and `/api/chat` semantics.

## Public API

`src/analysis` exports:

```ts
interface LlmProgressEvent {
  phase: "loading" | "generating";
  tokensGenerated?: number;
}

interface LlmWarmupResult {
  modelId: string;
  loaded: boolean;
  loadDurationMs?: number;
}
```

`LocalLlmClient` now includes:

```ts
warmup(signal?: AbortSignal, onProgress?: (event: LlmProgressEvent) => void): Promise<LlmWarmupResult>
analyze(input: AnalysisRequest, signal?: AbortSignal, onProgress?: (event: LlmProgressEvent) => void): Promise<AnalysisResult>
```

The existing two-argument `analyze(input, signal)` call remains valid. `LocalModel` additionally exposes `sizeBytes`, `parameterSize`, `quantizationLevel`, `family`, `format`, `modifiedAt`, and `digest` when Ollama supplies them.

`src/llm` exports timeout and keep-alive defaults:

- `MIN_LLM_TIMEOUT_MS = 60_000`
- `MAX_LLM_TIMEOUT_MS = 900_000`
- `DEFAULT_LLM_TIMEOUT_MS = 300_000`
- `DEFAULT_OLLAMA_KEEP_ALIVE = "10m"`

`createLocalHttpLlmClient` accepts optional `timeoutMs` and `keepAlive`. Invalid timeout settings are rejected before a network request.

## Runtime behavior

- `warmup` calls `/api/generate` with an empty prompt and `stream: false`, retaining the selected model through `keep_alive`.
- Analysis calls `/api/chat` with `stream: true`, `format: "json"`, and the same `keep_alive` value.
- NDJSON fragments are accumulated privately. Callers only receive loading/generating phase and token-count metadata; partial unvalidated JSON is never exposed.
- The final combined response still passes JSON parsing, strict Zod validation, input-aware safety validation, and at most one repair retry.
- Caller cancellation and the bounded timeout remain active while the response stream is consumed.
- Prompts, diet records, stream fragments, and raw output are not logged.

## Verification

- `npm.cmd run test -- --run src/test/ai`: 33 tests passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: AI runtime code type-checks; the overall command was blocked by a concurrent frontend test factory missing its newly required `preloadModel` mock.
