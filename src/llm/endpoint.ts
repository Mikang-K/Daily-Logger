import { LlmClientError } from "./errors";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const parseLoopbackEndpoint = (value: string): URL => {
  let url: URL;
  try { url = new URL(value); } catch { throw new LlmClientError("invalid_endpoint", "유효한 로컬 LLM 주소를 입력해 주세요."); }
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname) || url.username || url.password || url.search || url.hash) {
    throw new LlmClientError("invalid_endpoint", "로컬 LLM 주소는 http localhost, 127.0.0.1 또는 [::1]만 사용할 수 있습니다.");
  }
  return url;
};

export const endpointUrl = (base: URL, path: string): URL => {
  const prefix = base.pathname.replace(/\/$/, "");
  const url = new URL(base.origin);
  url.pathname = `${prefix}${path}`;
  return url;
};
