# PR Description

- Workflow ID: `wf_20260619_local_ai_runtime_reliability`
- Stage: `release`
- Producing agent: `release` (orchestrator-generated)
- Source task ID: `task_runtime_reliability_001`
- Timestamp: `2026-06-19T16:55:00+09:00`

## Summary

로컬 AI의 긴 콜드 스타트와 불명확한 대기 상태를 다루기 위해 모델 사전 로딩, 유지 시간, 스트리밍 진행 상태, 선택 가능한 타임아웃과 리소스 경고를 추가한다.

## Changes

- 2분·5분·10분 응답 제한 시간 선택
- 명시적 모델 미리 불러오기 및 취소
- Ollama 모델 10분 유지
- 로딩과 생성 상태 분리, 생성 토큰 진행 표시
- 모델 크기·양자화 메타데이터 및 RAM·VRAM 적합성 진단
- 서버 5xx의 메모리 부족 가능성을 설명하는 안전한 오류 안내
- 런타임 및 UI 테스트 확장

## Verification

- 10개 테스트 파일, 72개 테스트 통과
- 프로덕션 빌드 통과
- ESLint 통과

## Operational note

개발 PC의 `qwen3.6:latest`는 약 13.2GiB CUDA host buffer 할당 실패로 로드되지 않는다. 7B~9B급 Q4 모델로 교체한 뒤 실제 분석 E2E를 수행해야 한다.

## Inputs used

- 구현 결과와 최종 자동 검증
- 실제 Ollama 사전 로딩 실험

## Open assumptions

- 모델 설치·교체는 앱 범위 밖이며 사용자가 Ollama에서 수행한다.
