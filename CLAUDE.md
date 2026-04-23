# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 소개

과제용 풀스택 모노레포. 프론트엔드(Next.js 16 + React 19)와 백엔드(Spring Boot 3.4 + Kotlin 2.1)가 하나의 저장소에 있습니다.

## 주요 명령어

### 프론트엔드 (frontend/)

```bash
bun install           # 의존성 설치
bun dev               # 개발 서버 (localhost:3000)
bun run build         # 빌드
bun run lint          # 린트 검사
bun run check:fix     # 린트 + 포맷 자동 수정
```

### 백엔드 (backend/)

```bash
./gradlew bootRun                  # 개발 서버 (localhost:8080)
./gradlew build --no-daemon        # 빌드
./gradlew test --no-daemon         # 테스트
./gradlew ktlintCheck              # 린트 검사
./gradlew test --tests "FooTest"   # 특정 테스트만 실행
```

### 인프라

```bash
docker compose up -d     # MySQL 실행
./scripts/dev.sh         # 프론트+백엔드 동시 실행
```

## 아키텍처

### 프론트엔드 — FSD (Feature-Sliced Design)

```
src/
├── app/        # 라우트, 레이아웃, 프로바이더
├── entities/   # 도메인 모델 + API 훅
├── features/   # 기능 단위 로직
├── shared/     # 공통 유틸, 타입, API 클라이언트
└── widgets/    # 재사용 UI 컴포넌트
```

- FSD 레이어 규칙: 아래 방향으로만 import. `app → widgets → features → entities → shared`
- 상태관리: 서버 상태는 TanStack Query, 클라이언트 전역 상태는 Zustand
- `/api/*` 요청은 next.config.ts에서 백엔드로 프록시됨

### 백엔드 — 계층형 아키텍처

```
com.example.assignment/
├── config/        # Security, Swagger, Web 설정
├── controller/    # REST API 엔드포인트
├── domain/        # JPA 엔티티
├── dto/           # 요청/응답 DTO
├── service/       # 비즈니스 로직
├── repository/    # Spring Data JPA
└── exception/     # 전역 예외 처리
```

- 개발 환경에서는 `ddl-auto: update` 사용, 마이그레이션 도구는 아직 없음
- Swagger UI: `http://localhost:8080/swagger-ui.html`

## 설정

- 환경변수는 `.env.example` 참고
- 백엔드 프로파일: `application.yml` + `application-dev.yml` (기본 활성: dev)
- CI: main/develop push 시 프론트엔드 lint+build, 백엔드 build+test 실행

## 커밋 컨벤션

`feat:` | `fix:` | `docs:` | `refactor:` | `test:` | `chore:` | `build:` | `ci:`
