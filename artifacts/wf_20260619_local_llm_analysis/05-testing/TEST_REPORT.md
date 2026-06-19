# 로컬 LLM 분석 테스트 보고서

- Workflow ID: `wf_20260619_local_llm_analysis`
- Stage: `test`
- Producing agent: `default` (orchestrator verification)
- Source task ID: `task_llm_test_001`
- Timestamp: `2026-06-19T13:17:21+09:00`
- Summary: 분석 도메인, 로컬 HTTP 어댑터, 안전 정책, 저장 캐시, UI 상태와 전체 앱 회귀를 검증했다.
- Inputs used: AI Engineer, Backend Architect, Frontend Developer 최종 구현 및 전체 테스트
- Open assumptions: 실제 Ollama와 모델은 현재 PC에 설치되어 있지 않아 실제 생성 품질·성능은 미검증

## 자동 검증 결과

| 검증 | 결과 |
| --- | --- |
| `npm.cmd run build` | 통과, 123개 모듈 변환 |
| `npm.cmd test` | 통과, 9개 파일·58개 테스트 |
| `npm.cmd run lint` | 통과, 오류·경고 없음 |

검증 범위:

- 루프백 주소만 허용하고 원격·HTTPS·자격증명 포함 주소 차단
- 연결 확인, 모델 목록, 구조화 분석, 1회 교정 재시도
- 취소, 타임아웃, HTTP 오류와 잘못된 응답 정규화
- 입력 최소화, 안정적 SHA-256 해시와 캐시 키
- 프롬프트 인젝션, 수치 날조 및 위험 출력 차단
- 극단적 절식·구토·자해 위험 시 일반 감량 조언 중단과 전문 지원 안내 요구
- 분석 저장·조회·stale 분리·날짜별 삭제
- 날짜 변경 시 이전 분석 결과 누수 차단
- 잘못된 localStorage 런타임 설정 안전 처리
- 연결·생성·취소·오류·완료·stale UI 상태

## 미검증 항목

- 실제 Ollama 모델의 한국어 응답 품질, JSON 준수율과 응답 시간
- 실제 브라우저 IndexedDB에서 v1→v2 업그레이드 후 데이터 보존
- 실제 배포 Origin과 Ollama 간 CORS·mixed-content 동작
- 20건 이상의 모델별 합성 품질 평가

`fake-indexeddb` 설치를 두 번 시도했으나 네트워크 제한으로 완료되지 않아 저장소 스텁과 Dexie v2 스키마 검사로 대체했다.

