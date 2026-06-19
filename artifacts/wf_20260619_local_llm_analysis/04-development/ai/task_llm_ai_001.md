# AI Engineer implementation notes

- Workflow ID: `wf_20260619_local_llm_analysis`
- Stage: `implementation`
- Producing agent: `ai-engineer`
- Source task ID: `task_llm_ai_001`
- Timestamp: `2026-06-19T13:07:00+09:00`
- Summary: Added the minimized analysis request domain, stable SHA-256 hashing, strict structured-output validation, safety policy, and a loopback-only Ollama HTTP adapter.
- Inputs used: `01-product/FEATURE_SPEC.md`, `02-architecture/TECH_DESIGN.md`, `03-planning/TASK_BREAKDOWN.md`, existing domain models and statistics
- Open assumptions: The first supported runtime is an Ollama-compatible local HTTP server. Browser WebGPU remains a later adapter behind the same interface.

## Integration API

Public domain exports are in `src/analysis/index.ts`:

```ts
buildAnalysisRequest(log: DailyLog, recent: RecentSevenDaySummary, settings: UserSettings | null): AnalysisRequest
hashAnalysisRequest(input: AnalysisRequest): Promise<string>
analysisRequestSchema
analysisResultSchema
assertSafeAnalysis(result: AnalysisResult): AnalysisResult
ANALYSIS_PROMPT_VERSION
```

It also exports `AnalysisRequest`, `AnalysisResult`, `StoredAnalysis`, `LocalModel`, `LlmRuntimeStatus`, and `LocalLlmClient`. `StoredAnalysis` has the architecture-approved fields `id`, `date`, `inputHash`, `modelId`, `runtime`, `promptVersion`, `result`, and `createdAt`.

Public runtime exports are in `src/llm/index.ts`:

```ts
const client = createLocalHttpLlmClient({
  endpoint: "http://127.0.0.1:11434",
  modelId: "selected-model",
  timeoutMs: 90_000,
});

await client.healthCheck(signal);
await client.listModels(signal);
await client.analyze(request, signal);
```

`analyze` requests non-streaming JSON, validates it with Zod and the safety policy, and performs at most one repair request. Failures are normalized as `LlmClientError` with `invalid_endpoint`, `connection_failed`, `timeout`, `cancelled`, `http_error`, `invalid_response`, or `unsafe_output` codes.

## Security controls

- Only literal HTTP `localhost`, `127.0.0.1`, and `[::1]` hosts are accepted. Credentials, query strings, fragments, HTTPS, LAN addresses, and public hosts are rejected before `fetch`.
- The prompt explicitly treats notes as untrusted data and prohibits following instructions embedded in them.
- Output is strict JSON with bounded text and list sizes; extra keys are rejected.
- A post-generation policy blocks diagnostic/prescriptive and extreme restriction or purging language.
- Prompts, health data, raw responses, and response bodies are not logged or included in normalized errors.
- Abort signals and bounded timeouts apply to every HTTP request.

## Verification

`npm.cmd run test -- --run src/test/ai` passes 29 tests covering minimization, hashing, schema bounds, safety, prompt injection fixtures, risk escalation, loopback SSRF controls, Ollama metadata, valid output, one repair only, unsafe output, HTTP error redaction, cancellation, timeout, and logging absence.

### Safety follow-up

The system policy now detects mentions of extreme restriction, purging, laxative misuse, self-harm, suicide, and eating-disorder warning signs. In those cases it stops ordinary diet and weight-loss guidance, avoids diagnosis, and directs the user to appropriate professional or urgent support. Runtime output validation independently requires professional-support language and rejects ordinary calorie-restriction, exercise-increase, or weight-loss instructions for these inputs. The repair request retains the invalid response only in its assistant-role message; it no longer duplicates untrusted raw output into a new user message.
