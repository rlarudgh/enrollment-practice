# Assignment

## 프로젝트 개요

본 프로젝트는 과제로 제출된 풀스택 웹 애플리케이션입니다.  
Next.js 기반의 프론트엔드와 Spring Boot(Kotlin) 기반의 백엔드로 구성되며, FSD(Feature-Sliced Design) 아키텍처를 프론트엔드에 적용하여 기능 단위로 코드를 구조화했습니다.  
Docker Compose를 통해 MySQL 개발 환경을 구성하고, GitHub Actions로 CI 파이프라인을 운영합니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | React 19, TypeScript, Next.js 16 (App Router), Bun, TailwindCSS v4, TanStack Query, Zustand, Axios |
| **Backend** | Spring Boot 3.4, Kotlin 2.1, JPA (Hibernate), MySQL 8.0, Spring Security, Springdoc OpenAPI |
| **아키텍처** | FSD (Feature-Sliced Design) — Frontend |
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

## 요구사항 해석 및 가정

1. **풀스택 과제**: 프론트엔드와 백엔드가 분리된 구조이며, REST API로 통신합니다.
2. **인증 필요**: Spring Security와 JWT를 기반으로 한 인증/인가를 가정하고 설정했습니다.
3. **데이터베이스**: 관계형 데이터베이스(MySQL)를 사용하며, JPA를 통해 도메인 모델을 관리합니다.
4. **API 문서화**: Swagger/OpenAPI를 활용하여 API 명세를 시각적으로 확인할 수 있도록 가정했습니다.
5. **프론트엔드 라우팅**: Next.js App Router를 사용하며, `/api/*` 요청은 백엔드로 리버스 프록시됩니다.

## 설계 결정과 이유

### 1. FSD (Feature-Sliced Design) 적용 — Frontend

- **이유**: 기능 중심으로 코드를 분리하여 도메인 변경 시 수정 범위를 최소화하고, 대규모 프로젝트에서도 일관된 구조를 유지하기 위함입니다.
- **적용 위치**: `frontend/src/entities/`, `frontend/src/pages/`, `frontend/src/widgets/` 등

### 2. Spring Boot + Kotlin — Backend

- **이유**: Null Safety와 간결한 문법으로 생산성을 높이고, Spring 생태계의 검증된 인프라(Security, JPA, Validation)를 활용하기 위함입니다.

### 3. TanStack Query + Zustand — 상태 관리

- **이유**: TanStack Query로 서버 상태(캐싱, 동기화, 백그라운드 업데이트)를 선언적으로 관리하고, Zustand로 클라이언트 전역 상태를 간결하게 관리하여 역할을 분리합니다.

### 4. Biome — 코드 품질

- **이유**: Rust 기반으로 ESLint + Prettier보다 10~100배 빠륩며, 하나의 설정 파일로 린트와 포맷을 모두 처리하여 개발 경험을 단순화합니다.

### 5. Swagger UI (Springdoc) — API 문서

- **이유**: 코드 기반으로 API 명세를 자동 생성하여 프론트엔드-백엔드 간 협업 비용을 줄입니다.

### 6. Docker Compose — 로컬 MySQL

- **이유**: 개발자마다 동일한 DB 환경을 쉽게 구성할 수 있고, CI 파이프라인에서도 동일한 방식으로 MySQL을 기동할 수 있습니다.

### 7. GitHub Actions — CI

- **이유**: Push / PR 시 자동으로 Lint, Build, Test를 수행하여 코드 품질을 사전에 검증합니다.

## 미구현 / 제약사항

- **도메인 로직 미구현**: 현재 `domain`, `controller`, `service`, `repository`, `dto` 패키지는 비어 있거나 `.gitkeep` 상태입니다. 실제 비즈니스 요구사항에 따라 엔티티와 API를 구현해야 합니다.
- **JWT 인증 미완성**: `SecurityConfig`와 `JWT_SECRET` 환경 변수는 설정되어 있으나, 실제 JWT 발급/검증 필터 및 로그인 엔드포인트는 구현되지 않았습니다.
- **프론트엔드 페이지 미구현**: FSD 폴더 구조만 잡혀 있으며, 실제 UI 컴포넌트와 페이지는 작성되지 않았습니다.
- **테스트 커버리지**: 현재는 Spring Boot 기본 테스트만 존재하며, 도메인 단위 테스트가 없습니다.
- **운환경 설정**: `application-prod.yml` 및 배포 스크립트는 존재하지 않습니다. 현재는 `dev` 프로파일만 제공됩니다.

## AI 활용 범위

- **프로젝트 구조 및 보일러플레이트 생성**: AI를 활용하여 초기 설정, Docker Compose, CI/CD 워크플로우 등을 생성했습니다.
- **문서 작성**: 본 README의 초안 및 프로젝트 관련 문서 작성에 AI를 활용했습니다.
