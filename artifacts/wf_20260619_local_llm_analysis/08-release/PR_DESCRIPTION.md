# PR: 로컬 LLM 일일 기록 분석

- Workflow ID: `wf_20260619_local_llm_analysis`
- Stage: `release`
- Producing agent: `default` (release summary)
- Source task ID: `task_llm_release_001`
- Timestamp: `2026-06-19T13:17:21+09:00`
- Summary: 저장된 일일 기록과 최근 7일 흐름을 로컬 Ollama 호환 모델로 분석하는 선택 기능을 추가한다.
- Inputs used: 제품·기술 계획, 역할별 구현, 테스트 및 안전 리뷰
- Open assumptions: 실제 로컬 모델 설치와 승인 평가는 배포 전 별도 수행

## 변경 내용

- 로컬 런타임 연결 확인과 모델 선택
- 수동 분석, 취소, 재시도와 상태 안내
- 분석 데이터 범위 사전 공개
- 구조화된 요약, 긍정 패턴, 확인점, 다음 행동과 데이터 한계
- 루프백 전용 Ollama HTTP 어댑터
- 입력 해시 및 프롬프트 버전 기반 IndexedDB 캐시
- Dexie v2 분석 테이블과 삭제 수명주기 연결
- 프롬프트 인젝션·의료·극단적 감량 안전 통제
- 42개 신규 테스트를 포함한 전체 58개 테스트

## 검증

- 프로덕션 빌드 통과
- 9개 테스트 파일·58개 테스트 통과
- ESLint 오류·경고 없음
- 실제 Ollama 미설치로 모델 생성 E2E는 미실행

