# 일일 다이어트 로그 MVP 기술 설계

- Workflow ID: `wf_20260619_daily_diet_log`
- Stage: `technical_design`
- Producing agent: `default` (architect 역할 수행)
- Source task ID: `task_architecture_001`
- Timestamp: `2026-06-19T00:00:00+09:00`
- Summary: 서버 없이 실행되는 모바일 우선 웹 앱의 구조, 데이터 모델, 검증 및 테스트 전략을 정의한다.
- Inputs used: `01-product/PRD.md`, 빈 저장소 탐색 결과
- Open assumptions: React·TypeScript 기반 프런트엔드, IndexedDB 저장, 배포 대상 미정

## 1. 권장 구조

MVP는 `React + TypeScript + Vite` 단일 페이지 앱으로 구현한다. 데이터는 `IndexedDB`에 저장하며 저장 계층을 인터페이스로 분리한다. 서버와 계정이 필요 없는 범위에 맞고, 향후 API 저장소로 교체하기 쉽다.

권장 라이브러리:

- UI 및 빌드: React, TypeScript, Vite
- 폼·검증: React Hook Form, Zod
- 로컬 저장: Dexie(IndexedDB 래퍼)
- 차트: Recharts 또는 경량 SVG 차트
- 단위 테스트: Vitest, Testing Library
- 브라우저 테스트: Playwright
- 코드 품질: ESLint, Prettier

의존성 버전은 구현 시점에 호환 가능한 안정 버전을 확인해 고정한다.

## 2. 모듈 경계

```text
src/
  app/              라우팅, 앱 셸, 전역 오류 처리
  features/
    daily-log/      오늘/날짜별 로그 편집
    history/        기록 목록과 날짜 탐색
    insights/       7일/30일 통계 계산과 표시
    settings/       목표값과 백업/복원
  domain/           타입, Zod 스키마, 순수 계산 함수
  storage/          저장소 인터페이스, IndexedDB 구현, 마이그레이션
  components/       공용 UI 컴포넌트
  test/             테스트 헬퍼와 픽스처
```

화면 컴포넌트가 IndexedDB를 직접 호출하지 않게 한다. `DailyLogRepository` 인터페이스를 통해 저장하고 통계 계산은 순수 함수로 유지한다.

## 3. 데이터 모델

```ts
type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface MealEntry {
  id: string;
  type: MealType;
  name: string;
  calories: number;
  note?: string;
}

interface ExerciseEntry {
  id: string;
  name: string;
  durationMinutes: number;
  caloriesBurned?: number;
}

interface DailyLog {
  date: string; // YYYY-MM-DD, primary key
  weightKg?: number;
  meals: MealEntry[];
  exercises: ExerciseEntry[];
  waterMl?: number;
  condition?: 1 | 2 | 3 | 4 | 5;
  note?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
}

interface UserSettings {
  id: "local";
  targetWeightKg?: number;
  dailyCalorieTarget?: number;
  updatedAt: string;
}
```

저장 테이블은 `dailyLogs`와 `settings`로 분리한다. `dailyLogs.date`를 기본 키로 두어 날짜별 중복을 구조적으로 방지한다.

## 4. 주요 처리 흐름

- 화면 진입: 로컬 날짜 계산 → 저장소에서 날짜 키 조회 → 없으면 빈 초안 생성
- 저장: 폼 검증 → 도메인 스키마 검증 → `updatedAt` 부여 → 트랜잭션 upsert
- 통계: 범위 내 로그 조회 → 날짜순 정렬 → 체중 결측치는 선을 끊고 열량은 저장된 식사 합으로 계산
- 가져오기: 파일 크기 제한 → JSON 파싱 → 전체 스키마 검증 → 사용자 확인 → 트랜잭션으로 병합 또는 교체
- 내보내기: 스키마 버전과 생성 시각을 포함한 JSON 생성

## 5. 보안과 개인정보

- 외부 네트워크 요청과 분석 도구를 MVP 기본값에서 제외한다.
- 메모를 HTML로 렌더링하지 않고 텍스트로만 취급한다.
- 가져오기 파일은 신뢰하지 않고 Zod 스키마와 크기 제한을 적용한다.
- 전체 삭제 및 데이터 교체 가져오기는 명시적 확인 후 실행한다.
- 브라우저 로컬 저장은 기기 공유 환경에서 비밀 저장소가 아니라는 안내를 설정 화면에 표시한다.

## 6. 오류 및 데이터 복구

- 저장 오류 시 입력 상태를 유지하고 재시도 버튼을 제공한다.
- DB 초기화 실패와 저장 용량 부족을 사용자 메시지로 구분한다.
- 데이터 스키마에 버전을 포함하고 마이그레이션을 순차 적용한다.
- 가져오기는 검증이 끝나기 전 기존 데이터를 변경하지 않는다.
- 가져오기 직전 자동 백업본을 메모리에 만들거나 사용자에게 선행 내보내기를 안내한다.

## 7. 테스트 전략

- 도메인 단위 테스트: 유효성 범위, 열량 합계, 통계 범위, 날짜 정렬, 결측치 처리
- 저장소 통합 테스트: 날짜별 upsert, 삭제, IndexedDB 재조회, 마이그레이션
- 컴포넌트 테스트: 항목 추가·수정·삭제, 오류 표시, 저장 상태
- E2E: 오늘 기록 저장 → 과거 조회 → 통계 반영 → 내보내기/초기화/가져오기 복원
- 접근성 검사: 레이블, 포커스 순서, 오류 연결, 색상 외 상태 표현

## 8. 기술 결정과 보류 사항

### 채택 제안

- 서버 없는 로컬 우선 구조: MVP 개발·운영 복잡도를 줄이고 개인정보 외부 전송을 피한다.
- IndexedDB: 구조화된 복수 기록과 향후 마이그레이션에 `localStorage`보다 적합하다.
- 저장소 추상화: 나중에 계정과 동기화를 도입할 때 UI 및 도메인 로직 변경을 제한한다.

### 구현 전 승인 또는 확인

- 프레임워크와 주요 의존성 도입
- 로컬 전용 데이터 모델
- 가져오기 시 병합/교체 UX의 기본값
- 배포 대상과 브라우저 지원 범위

