# 주간 평균 통계 테스트 보고서

- Workflow ID: `wf_20260619_weekly_average_stats`
- Stage: `test`
- Producing agent: `default` (tester 역할 수행)
- Source task ID: `task_weekly_test_001`
- Timestamp: `2026-06-19T09:32:50+09:00`
- Summary: 도메인 경계값, 평균 계산, UI 상태와 전체 앱 회귀 검증을 완료했다.
- Inputs used: 최종 구현 소스와 기존 테스트 전체
- Open assumptions: 인앱 브라우저 자동화 도구가 없어 실제 360px 시각 검증은 미실행

## 자동 검증 결과

| 검증 | 결과 |
| --- | --- |
| `npm.cmd run build` | 통과, 109개 모듈 변환 |
| `npm.cmd test` | 통과, 4개 파일·16개 테스트 |
| `npm.cmd run lint` | 통과, 오류·경고 없음 |
| 개발 서버 HTTP 스모크 | 200 응답, 앱 root 및 모듈 확인 |

## 추가 검증 항목

- 월요일~일요일 경계와 다음 주 월요일 전환
- 연도 경계 및 윤년
- 기록된 날 기준 열량·운동 평균
- 체중 결측치와 미래 날짜 제외
- 빈 주의 `undefined` 처리
- 이번 주와 지난주 증감량
- 최근 8주 시간순 정렬
- 평균 카드, 표본 수와 비교 문구 렌더링
- 빈 데이터 및 체중 표본 1회 안내

기존 일일 기록 관련 8개 테스트도 함께 통과했다.

