# 스프링 연습용 프로젝트

## 프로젝트 개요

본 프로젝트는 과제로 제출된 풀스택 웹 애플리케이션입니다.  
Next.js 기반의 프론트엔드와 Spring Boot(Kotlin) 기반의 백엔드로 구성되며, FSD(Feature-Sliced Design) 아키텍처를 프론트엔드에 적용하여 기능 단위로 코드를 구조화했습니다.  
Docker Compose를 통해 MySQL 개발 환경을 구성하고, GitHub Actions로 CI 파이프라인을 운영합니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | React 19, TypeScript, Next.js 16 (App Router), Bun, TailwindCSS v4, TanStack Query, Zustand, Axios |
| **Backend** | Spring Boot 3.4, Kotlin 2.1, JPA (Hibernate), MySQL 8.0, Spring Security, Springdoc OpenAPI |
| **아키텍처** | FSD (Feature-Sliced Design) — Frontend, Layered Architecture — Backend |
| **인프라** | Docker Compose (MySQL), GitHub Actions (CI) |
| **품질 도구** | Biome, ktlint, Gradle Test |

## 실행 방법

### 사전 요구사항

- [Bun](https://bun.sh)이 설치되어 있어야 합니다.
- Docker & Docker Compose가 설치되어 있어야 합니다.
- JDK 17 이상이 설치되어 있어야 합니다 (Backend 실행 시).

### 1. 의존성 설치 & MySQL 실행

```bash
./scripts/setup.sh
```

- 프론트엔드 의존성을 설치하고(`bun install`)
- 백엔드 Gradle Wrapper 권한을 설정하며
- Docker Compose로 MySQL 컨테이너를 실행합니다.

### 2. 개발 서버 실행

```bash
./scripts/dev.sh
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html

> `./scripts/dev.sh`는 백엔드와 프론트엔드를 백그라운드로 실행합니다. 종료하려면 `Ctrl+C`를 누르세요.

### 환경 변수

프로젝트 루트에 `.env` 파일을 생성하려면 `.env.example`을 복사해서 사용하세요.

```bash
cp .env.example .env
```

주요 환경 변수:

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NEXT_PUBLIC_API_URL` | 프론트엔드에서 호출할 API 기본 주소 | `http://localhost:8080` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | MySQL 연결 정보 | `localhost:3306/assignment_db` |
| `DB_USERNAME` / `DB_PASSWORD` | MySQL 인증 정보 | `root` / `password` |
| `JWT_SECRET` | JWT 서명용 비밀 키 | `change-me-in-production` |

## 문서

| 문서 | 설명 | 링크 |
|------|------|------|
| **Frontend Architecture** | FSD 아키텍처, 상태 관리, 다단계 폼 구조 | [frontend/docs/ARCHITECTURE.md](frontend/docs/ARCHITECTURE.md) |
| **Frontend Development** | 개발 환경 설정, 로컬 실행, 디버깅, 테스트 | [frontend/docs/DEVELOPMENT.md](frontend/docs/DEVELOPMENT.md) |
| **Frontend PRD** | 제품 요구사항, 사용자 스토리, 기능 명세 | [frontend/docs/PRD.md](frontend/docs/PRD.md) |
| **Frontend Security** | XSS 방지, 인증, CSRF, PII 처리 | [frontend/docs/SECURITY.md](frontend/docs/SECURITY.md) |
| **Frontend Mock API** | MSW Mock 서버 API 명세, 요청/응답 예시 | [frontend/docs/MOCK_API.md](frontend/docs/MOCK_API.md) |
| **Backend Architecture** | 계층형 아키텍처, ERD, API 설계 | [backend/docs/ARCHITECTURE.md](backend/docs/ARCHITECTURE.md) |
| **Backend API** | REST API 명세, 요청/응답 예시, 에러 코드 | [backend/docs/API.md](backend/docs/API.md) |
| **Backend Development** | 개발 환경 설정, 빌드, 테스트, 디버깅 | [backend/docs/DEVELOPMENT.md](backend/docs/DEVELOPMENT.md) |
| **Backend Security** | JWT, Spring Security, 권한 제어, 보안 조치 | [backend/docs/SECURITY.md](backend/docs/SECURITY.md) |
| **Backend Sequence Diagrams** | 시퀀스 다이어그램 (인증, 수강신청, 동시성제어) | [backend/docs/SEQUENCE_DIAGRAMS.md](backend/docs/SEQUENCE_DIAGRAMS.md) |
| **Backend Infrastructure** | 인프라 구조, 배포 전략, 모니터링, CI/CD | [backend/docs/INFRASTRUCTURE.md](backend/docs/INFRASTRUCTURE.md) |


## 설계 결정과 이유

### 1. FSD (Feature-Sliced Design) 적용 — Frontend

- **이유**: 기능 중심으로 코드를 분리하여 도메인 변경 시 수정 범위를 최소화하고, 대규모 프로젝트에서도 일관된 구조를 유지하기 위함입니다.
- **적용 위치**: `frontend/src/entities/`, `frontend/src/pages/`, `frontend/src/widgets/` 등

### 2. Spring Boot + Kotlin — Backend

- **Kotlin 선택 이유**: Java 대비 간결한 문법(data class, expression body, 확장 함수)으로 보일러플레이트를 크게 줄이면서도, Null Safety를 언어 차원에서 보장하여 런타임 NPE 위험을 컴파일 타임에 차단합니다. Java와 100% 상호운용되므로 Spring 생태계의 모든 라이브러리(JPA, Security, Validation 등)를 그대로 사용할 수 있으면서도 더 안전하고 읽기 쉬운 코드를 작성할 수 있습니다.
- **Spring Boot 선택 이유**: 검증된 인프라(Security, JPA, Validation)와 방대한 생태계를 활용하여 비즈니스 로직에 집중하기 위함입니다.

### 3. TanStack Query + Zustand — 상태 관리

- **이유**: TanStack Query로 서버 상태(캐싱, 동기화, 백그라운드 업데이트)를 선언적으로 관리하고, Zustand로 클라이언트 전역 상태를 간결하게 관리하여 역할을 분리합니다.

### 4. Biome — 코드 품질

- **이유**: Rust 기반으로 ESLint + Prettier보다 10~100배 빠르고, 하나의 설정 파일로 린트와 포맷을 모두 처리하여 개발 경험을 단순화합니다. (기존: Prettier + Eslint, 현재: Biome)

### 5. Swagger UI (Springdoc) — API 문서

- **이유**: 코드 기반으로 API 명세를 자동 생성하여 프론트엔드-백엔드 간 협업 비용을 줄입니다.

### 6. Docker Compose — 로컬 MySQL

- **이유**: 개발자마다 동일한 DB 환경을 쉽게 구성할 수 있고, CI 파이프라인에서도 동일한 방식으로 MySQL을 기동할 수 있습니다.

### 7. GitHub Actions — CI

- **이유**: Push / PR 시 자동으로 Lint, Build, Test를 수행하여 코드 품질을 사전에 검증합니다.

## 선택적 구현 항목

- **sessionStorage 임시 저장**: 수강 신청 폼에서 브라우저 탭을 닫으면 자동으로 데이터가 삭제되는 임시 저장 기능을 구현했습니다.
- **비관적 락(Pessimistic Lock)**: 수강 신청 시 정원 초과를 방지하기 위해 `@Lock(LockModeType.PESSIMISTIC_WRITE)`를 적용했습니다.
- **대기열(Waitlist)**: 정원 초과 시 자동으로 대기열에 배정되며, 취소 발생 시 순차 승급됩니다. 강사가 수동/자동 승급할 수 있습니다.
- **페이지네이션**: 강의 목록 및 수강 신청 목록에 페이지네이션이 적용되어 있습니다.
- **MSW(Mock Service Worker)**: 프론트엔드 개발 시 백엔드 없이 테스트 가능한 Mock 서버를 구현했습니다.

## 제약사항

- **Rate Limiting**: API 요청 속도 제한 기능은 구현되지 않았습니다.
- **운영환경 설정**: `application-prod.yml` 및 배포 스크립트는 존재하지 않습니다. 현재는 `dev` 프로파일만 제공됩니다.

## AI 활용 범위

AI는 참고 목적과 반복적인 기능 구현에 활용했습니다. 모든 핵심 코드와 비즈니스 로직은 직접 작성했습니다.

### AI 활용 영역

- **문서 초안 작성**: 기본 틀 작성 → 내용 검토 및 수정
- **코드 리팩토링 제안**: 리팩토링 아이디어 제시 → 직접 판단 후 적용
- **보안 검토 제안**: 취약점 식별 → 수정 방향 결정 후 직접 수정

### 직접 구현

- **핵심 비즈니스 로직**: 수강 신청, 다단계 폼, 정원 관리
- **아키텍처 설계**: FSD 적용, 상태 관리, API 통신
- **데이터 유효성 검증**: Zod 스키마, 폼 검증 로직
- **UI/UX 구현**: 이탈 방지, 에러 처리
- **보안 조치**: JWT 인증, 권한 제어, 동시성 제어

### 원칙

- **AI 제안 사용자 검증**: 모든 AI 제안은 직접 검토 후 승인된 것만 적용
- **코드 이해 필수**: AI가 생성한 코드라도 라인별로 이해하고 수정
- **직접 실행 및 테스트**: 모든 코드가 실제로 동작하는지 직접 확인
