# Test Report

- Workflow ID: `wf_20260619_local_ai_runtime_reliability`
- Stage: `test`
- Producing agent: `default` (orchestrator verification)
- Source task ID: `task_runtime_reliability_001`
- Timestamp: `2026-06-19T16:55:00+09:00`

## Summary

로컬 AI 사전 로딩, 유지 시간, 스트리밍 진행 상태, 응답 제한 시간과 리소스 진단 변경을 통합 검증했다.

## Automated verification

- `npm.cmd test -- --run`: 10개 파일, 72개 테스트 통과
- `npm.cmd run build`: TypeScript 및 Vite 빌드 통과, 126개 모듈 변환
- `npm.cmd run lint`: ESLint 오류·경고 없음

## Real runtime verification

- Runtime: Ollama `0.30.10`
- Model: `qwen3.6:latest`, 약 23.9GB, Q4_K_M, 35B.A3B
- GPU: NVIDIA RTX 4070 12GB
- Request: `/api/generate`, `stream=false`, `keep_alive=10m`, 클라이언트 제한 600초
- Result: 약 68.9초 후 HTTP 500
- Server cause: 약 13.2GiB CUDA host buffer 할당 실패

따라서 기존 300초 타임아웃과 별개로, 이 모델은 현재 가용 RAM·VRAM 구성에서 로드할 수 없다. 앱은 서버 5xx 발생 시 모델 크기와 RAM·VRAM 확인 안내를 표시한다.

## Inputs used

- 통합 소스 및 테스트
- 로컬 Ollama API 응답
- Ollama `server.log`의 모델 로더 오류

## Open assumptions

- 실제 분석 품질 E2E는 7B~9B급 Q4 모델 설치 후 별도 수행한다.
- 브라우저는 총 VRAM을 표준 API로 제공하지 않으므로 런타임 리소스 적합성은 보수적으로 안내한다.
