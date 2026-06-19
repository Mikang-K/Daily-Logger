export type LlmErrorCode = "invalid_endpoint" | "invalid_configuration" | "connection_failed" | "timeout" | "cancelled" | "http_error" | "invalid_response" | "unsafe_output";

export class LlmClientError extends Error {
  constructor(public readonly code: LlmErrorCode, message: string, public readonly status?: number) {
    super(message); this.name = "LlmClientError";
  }
}
