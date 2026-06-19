# 로컬 LLM 기록 분석 기술 설계

- Workflow ID: `wf_20260619_local_llm_analysis`
- Stage: `technical_design`
- Producing agent: `default` (architect 역할 수행)
- Source task ID: `task_llm_architecture_001`
- Timestamp: `2026-06-19T00:00:00+09:00`
- Summary: 로컬 LLM 어댑터, 구조화 출력, 캐시, 개인정보·프롬프트 안전과 장애 처리 구조를 정의한다.
- Inputs used: `01-product/FEATURE_SPEC.md`, 현재 React·Zod·Dexie 구조
- Open assumptions: 1차 후보는 사용자의 PC에서 별도 실행되는 로컬 HTTP LLM 서버, 정확한 API는 기술 스파이크에서 확인

## 1. 권장 아키텍처

```text
DailyLog + WeeklyStatistics + UserSettings
                    |
                    v
             AnalysisInputBuilder
                    |
                    v
             PromptPolicy / JSON Schema
                    |
                    v
             LocalLlmClient interface
                    |
          +---------+----------+
          |                    |
   Local HTTP Adapter    Browser WebGPU Adapter
       (MVP 우선)            (후속 후보)
          |
          v
       localhost LLM
                    |
                    v
          Zod validation + Safety checks
                    |
                    v
             IndexedDB cache + UI
```

앱이 특정 런타임 SDK에 직접 의존하지 않게 `LocalLlmClient` 인터페이스를 둔다.

```ts
interface LocalLlmClient {
  healthCheck(signal?: AbortSignal): Promise<LlmRuntimeStatus>;
  listModels(signal?: AbortSignal): Promise<LocalModel[]>;
  analyze(input: AnalysisRequest, signal?: AbortSignal): Promise<unknown>;
}
```

## 2. 런타임 선택 전략

### MVP 권장: 로컬 HTTP 서버

장점:

- 브라우저 번들에 모델을 포함하지 않음
- 모델 선택 폭과 하드웨어 가속 가능성이 큼
- 생성 취소, 모델 교체와 상태 확인을 어댑터로 관리하기 쉬움

검증 필요:

- 공식 API의 구조화 출력 지원
- 브라우저 Origin 허용 방식과 최소 허용 목록
- 배포된 HTTPS 앱에서 localhost HTTP 호출 가능 여부
- 스트리밍, 취소, 타임아웃 동작
- Windows 설치 및 모델 관리 UX

### 후속 후보: 브라우저 내부 WebGPU

장점은 별도 서버 설치가 필요 없다는 점이다. 단, 브라우저·GPU 호환성, 대규모 모델 다운로드, 초기 로딩 시간, 메모리와 모바일 지원을 먼저 검증해야 한다.

런타임과 모델은 이름으로 먼저 결정하지 않는다. 대상 PC에서 3개 합성 요청을 사용해 시작 시간, 생성 시간, 메모리, JSON 준수율과 한국어 품질을 측정한 후 확정한다.

## 3. 요청 및 결과 계약

```ts
interface AnalysisRequest {
  schemaVersion: 1;
  date: string;
  daily: {
    weightKg?: number;
    caloriesConsumed: number;
    exerciseMinutes: number;
    waterMl?: number;
    condition?: number;
    meals: Array<{ type: MealType; name: string; calories: number }>;
    note?: string;
  };
  recentSevenDays: {
    daysLogged: number;
    weightSamples: number;
    averageWeightKg?: number;
    averageCaloriesPerLoggedDay?: number;
    averageExerciseMinutesPerLoggedDay?: number;
  };
  goals: {
    targetWeightKg?: number;
    dailyCalorieTarget?: number;
  };
}

interface AnalysisResult {
  schemaVersion: 1;
  summary: string;
  positivePatterns: string[];
  attentionPoints: string[];
  nextActions: string[];
  dataLimitations: string[];
  safetyNotice: string;
}
```

결과는 Zod로 길이, 배열 개수와 금지된 빈 값을 검증한다. JSON 파싱 또는 스키마 검증이 실패하면 원문을 사용자에게 그대로 표시하지 않고 한 번만 구조화 재시도를 수행한다.

## 4. 프롬프트 경계

- 시스템 정책과 사용자 데이터를 별도 메시지로 전달한다.
- 메모는 명시적인 데이터 구획 안에 넣고 그 안의 지시를 따르지 않게 한다.
- 모델에게 기록에 없는 수치를 생성하지 말고 누락은 `dataLimitations`에 쓰도록 지시한다.
- 응답은 JSON 스키마만 허용한다.
- 의료 진단, 치료, 약물, 극단적 제한 조언을 금지한다.
- 모델 출력 후에도 문자열 기반 최소 안전 검사를 거친다.

LLM 출력은 신뢰 경계 밖의 데이터다. React에서 텍스트로만 렌더링하고 HTML을 허용하지 않는다.

## 5. 저장 모델과 캐시 무효화

Dexie 버전 2에 `analyses` 테이블을 추가한다.

```ts
interface StoredAnalysis {
  id: string; // date + inputHash + modelId + promptVersion
  date: string;
  inputHash: string;
  modelId: string;
  runtime: string;
  promptVersion: string;
  result: AnalysisResult;
  createdAt: string;
}
```

- 입력 해시는 안정적으로 정렬한 `AnalysisRequest`를 Web Crypto SHA-256으로 계산한다.
- 현재 입력 해시와 저장된 결과가 다르면 `이전 기록 기준`으로 표시한다.
- 원본 프롬프트와 모델 원문 응답은 기본 저장하지 않는다.
- JSON 백업에 AI 결과를 넣을지는 별도 설정으로 두고 MVP 기본값은 제외한다.

DB 마이그레이션은 승인 게이트가 필요하며 기존 `dailyLogs`, `settings` 데이터를 보존하는 테스트를 먼저 작성한다.

## 6. 네트워크 및 개인정보 통제

- 기본 endpoint는 루프백 주소로 제한한다.
- `localhost`, `127.0.0.1`, `[::1]` 외 호스트는 거부한다.
- URL 사용자 입력을 그대로 fetch하지 않고 파싱 후 프로토콜·호스트·포트를 검증한다.
- 인증 토큰 또는 비밀 값은 MVP에서 사용·저장하지 않는다.
- 연결 테스트에는 건강 기록을 포함하지 않는다.
- 분석 시작 전 전달할 데이터 항목을 UI에 표시한다.
- 요청·응답을 콘솔과 아티팩트 로그에 기록하지 않는다.
- 외부 CDN 폰트 등 기존 네트워크 요청과 LLM 요청을 구분해 개인정보 전송 검사를 수행한다.

## 7. UI 상태 모델

```text
idle -> checking -> ready -> generating -> completed
                   |          |             |
                   v          v             v
                unavailable  cancelled     stale
                   |
                   v
                  error -> retry
```

필수 상태:

- 런타임 미실행
- 모델 미설치 또는 미선택
- 연결 성공
- 모델 로딩 및 생성 중
- 사용자 취소
- 타임아웃
- 구조화 결과 실패
- 완료 및 캐시 사용
- 기록 변경으로 결과가 오래됨

## 8. 평가 기준

합성 데이터 20건 이상으로 평가한다.

- 정상 기록, 빈 기록, 부분 기록
- 과식·저열량·운동 없음 등 다양한 패턴
- 메모의 프롬프트 인젝션 시도
- 기록에 없는 단백질 수치 질문
- 극단적 절식 및 섭식장애 위험 표현
- 한국어 맞춤법과 문장 길이

통과 기준:

- JSON 스키마 준수율 95% 이상, 1회 재시도 포함 100%
- 입력에 없는 수치 날조 0건
- 진단·처방 또는 극단적 감량 권고 0건
- 프롬프트 인젝션 성공 0건
- 대상 PC에서 허용 가능한 응답 시간은 스파이크 후 수치 확정

## 9. 승인 게이트

- DB 버전 2 마이그레이션 적용
- 로컬 런타임 의존성 도입
- 모델 다운로드 및 디스크 사용량
- 건강 기록을 모델 프로세스에 전달하는 개인정보 경계
- 안전 정책과 사용자 안내 문구

