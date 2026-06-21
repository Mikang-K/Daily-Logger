# Task Breakdown

- Workflow ID: `wf_20260620_food_calorie_estimation`
- Stage: `task_planning`
- Producing agent: `planner`
- Source task ID: `task_food_estimation_000`
- Timestamp: `2026-06-20T00:00:00+09:00`

## Summary

음식 이름·섭취량·조리 정보를 로컬 LLM에 전달해 열량 범위와 대표값을 제안하고, 사용자가 승인한 값만 일일 기록에 반영한다.

## Tasks

1. Backend Architect: 하위 호환 음식 모델, 개인 음식 사전, 미산정/추정 통계
2. AI Engineer: 엄격한 추정 스키마, 안전 프롬프트, Ollama 추정 API
3. Frontend Developer: 음식별 추정·취소·검토·적용 UI
4. Orchestrator: 공개 계약 통합, 회귀 수정, 전체 검증
5. Reviewer/Release: 리뷰·테스트·PR 산출물 및 README 갱신

## Dependencies

- 프론트엔드 통합은 AI의 `estimateFoodCalories` 계약과 도메인의 `MealEntry` 확장을 사용한다.
- 세 전문 역할은 구현 중 비중첩 쓰기 범위를 유지한다.

## Completion criteria

- AI 결과가 사용자의 명시적 적용 전에는 기록되지 않는다.
- 추정 범위·대표값·신뢰도·가정이 검증되고 UI에 표시된다.
- 미산정 음식은 열량 합계에서 0 kcal로 오인되지 않는다.
- 실패·취소 시 음식 입력이 보존된다.
- 전체 테스트, 빌드, 린트가 통과한다.

## Inputs used

- 기존 일일 기록·로컬 AI·통계 구현
- 사용자가 승인한 음식명 기반 열량 추정 계획

## Open assumptions

- 첫 버전은 텍스트 입력만 지원하며 사진 분석과 외부 영양 DB는 제외한다.
- 모델 설치와 교체는 앱이 수행하지 않는다.
