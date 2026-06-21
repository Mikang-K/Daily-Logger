# PR Description

- Workflow ID: `wf_20260620_food_calorie_estimation`
- Stage: `release`
- Producing agent: `release`
- Source task ID: `task_food_estimation_000`
- Timestamp: `2026-06-20T17:38:00+09:00`

## Summary

음식 이름과 섭취 정보를 이용해 로컬 AI가 열량 범위를 제안하고, 사용자가 확인한 대표값만 기록에 적용하는 기능을 추가한다.

## Changes

- 음식별 AI 추정·취소·재시도·검토 UI
- 최소·최대·대표값·신뢰도·가정의 엄격한 검증
- 승인된 AI 추정 메타데이터 저장과 직접 입력 전환
- 개인 음식 사전 저장 및 동일 조건 재사용
- 미산정 음식을 제외하는 일일·주간 통계
- Dexie v3의 `confirmedFoods` 테이블과 백업 지원

## Verification

- 테스트 89개 통과
- 프로덕션 빌드 통과
- ESLint 통과

## Operational note

실제 추정에는 Ollama에서 실행 가능한 모델이 필요하다. 현재 개발 PC의 `qwen3.6:latest`는 메모리 부족으로 로드되지 않으므로 7B~9B급 Q4 모델이 권장된다.

## Inputs used

- 구현 결과와 최종 자동 검증

## Open assumptions

- 사진 분석과 외부 영양 데이터베이스 연동은 이번 범위에 포함하지 않는다.
