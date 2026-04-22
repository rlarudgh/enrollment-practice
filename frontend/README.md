# Frontend

## 프로젝트 개요

Assignment 프로젝트의 프론트엔드 애플리케이션입니다.  
Next.js 16 (App Router) + React 19 + TypeScript 기반으로 구축되었으며, FSD(Feature-Sliced Design) 아키텍처를 적용하여 기능 단위로 코드를 구조화했습니다.  
TanStack Query로 서버 상태를 관리하고, Zustand로 클라이언트 상태를 관리하며, Axios를 통해 백엔드 REST API와 통신합니다.

## 기술 스택

| 분류 | 기술 |
|------|------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Runtime** | Bun |
| **UI** | React 19, TailwindCSS v4 |
| **Server State** | TanStack Query (React Query) |
| **Client State** | Zustand |
| **HTTP Client** | Axios |
| **Architecture** | FSD (Feature-Sliced Design) |
| **Code Quality** | Biome |

## 실행 방법

### 사전 요구사항

- [Bun](https://bun.sh)이 설치되어 있어야 합니다.

### 1. 의존성 설치

```bash
bun install
```

### 2. 개발 서버 실행

```bash
bun dev
```

- 프론트엔드: http://localhost:3000
- API 프록시: `/api/*` 요청은 백엔드(`http://localhost:8080`)로 리버스 프록시됩니다.

### 3. 코드 품질 검사

```bash
# 린트 + 포맷 검사
bun run check

# 린트 + 포맷 자동 수정
bun run check:fix

# 린트만 실행
bun run lint

# 포맷만 실행
bun run format
```

### 4. 빌드

```bash
bun run build
```

### 환경 변수

프로젝트 루트의 `.env` 파일을 참조하거나, `frontend/.env`에 직접 설정할 수 있습니다.

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NEXT_PUBLIC_API_URL` | 백엔드 API 기본 주소 | `http://localhost:8080` |

## 요구사항 해석 및 가정

1. **풀스택 연동**: 백엔드 Spring Boot 서버와 REST API로 통신하며, Next.js의 rewrite 설정으로 `/api/*` 경로를 백엔드로 프록시합니다.
2. **App Router 사용**: Next.js 13 이후 권장 방식인 App Router를 사용하며, 서버/클리이언트 컴포넌트를 적절히 활용합니다.
3. **서버 상태 관리**: API 호출, 캐싱, 동기화, 백그라운드 업데이트 등을 TanStack Query로 처리합니다.
4. **클리이언트 상태 관리**: 복잡한 전역 상태 없이도 직관적인 상태 관리가 가능한 Zustand를 사용합니다.
5. **스타일링**: 유틸리티 퍼스트 CSS 프레임워크인 TailwindCSS v4를 사용하여 일관된 디자인 시스템을 구축합니다.
6. **아키텍처**: FSD를 통해 기능 단위로 코드를 분리하여, 도메인 변경 시 수정 범위를 최소화하고 확장성을 확보합니다.

## 설계 결정과 이유

### 1. FSD (Feature-Sliced Design)

```
src/
├── app/        # Layer 1 - Next.js App Router, providers, global styles
├── pages/      # Layer 2 - Route page components
├── widgets/    # Layer 3 - Composite UI blocks (header, sidebar, etc.)
├── features/   # Layer 4 - User interaction features (auth, search, etc.)
├── entities/   # Layer 5 - Business domain entities (user, product, etc.)
└── shared/     # Layer 6 - Shared code (UI components, API client, utils, types)
```

- **이유**: 기능 중심의 평탄한 구조로 대규모 프로젝트에서도 일관된 아키텍처를 유지하며, 코드 탐색과 리팩토링이 용이합니다.

### 2. Next.js 16 + App Router

- **이유**: 서버 컴포넌트를 통한 초기 로딩 성능 최적화와 SEO 개선이 가능하며, React 19의 최신 기능을 활용할 수 있습니다.

### 3. TanStack Query

- **이유**: 서버 상태 관리(캐싱, 재시도, 폴리, 무효화 등)를 선언적으로 처리하여 데이터 페칭 로직을 간결하게 만들고, 로딩/에러 상태 관리를 표준화합니다.

### 4. Zustand

- **이유**: Redux에 비해 보일러플레이트가 적고, TypeScript와의 호환성이 우수하며, 비동기 상태 관리도 직관적으로 처리할 수 있습니다. (TanStack Query와 역할 분리)

### 5. Biome

- **이유**: Rust 기반으로 ESLint + Prettier보다 10~100배 빠륩며, 하나의 설정 파일로 린트와 포맷을 모두 처리하여 개발 경험을 단순화합니다.

### 6. TailwindCSS v4

- **이유**: CSS-in-JS 없이도 빠른 UI 개발이 가능하며, 런타임 오버헤드 없이 정적 CSS를 생성하여 성능이 우수합니다.

### 7. Bun

- **이유**: npm/yarn 대비 의존성 설치 및 빌드 속도가 빠륩며, 내장 번들러와 테스트 러너로 개발 경험을 향상시킵니다.

## 미구현 / 제약사항

- **페이지 및 컴포넌트 미구현**: FSD 폴구조(`pages/`, `widgets/`, `entities/` 등)는 잡혀 있으나, 실제 UI 컴포넌트와 페이지는 작성되지 않았습니다.
- **API 클라이언트 설정**: Axios 인스턴스 및 TanStack Query QueryClient 설정이 되어 있지 않으며, API 호출 유틸리티를 구현해야 합니다.
- **TanStack Query Provider**: QueryClientProvider와 Hydration 설정이 필요합니다.
- **인증 상태 관리**: Zustand 스토어는 생성되지 않았으며, JWT 토큰 관리(저장/갱신/만료 처리) 로직이 필요합니다.
- **에러 및 로딩 UI**: 글로벌 에러 바울러리, 서스펜스 로딩 상태 등이 미구현입니다.
- **반응형 디자인**: TailwindCSS는 설정되어 있으나, 반응형 브레이크포인트 기준 및 모바일 최적화가 되어 있지 않습니다.

## AI 활용 범위

- **프로젝트 초기 설정**: Next.js 16 + TypeScript + TailwindCSS v4 + FSD 폴구 생성 및 설정에 AI를 활용했습니다.
- **설정 파일 작성**: `next.config.ts`, `postcss.config.mjs`, `biome.json`, `tsconfig.json` 등의 작성에 AI를 참고했습니다.
- **아키텍처 설계**: FSD 레이어별 책임 분리 및 폴구 설계에 AI를 활용했습니다.
- **핵심 UI/비즈니스 로직**: 현재는 미구현 상태이며, 향후 컴포넌트 및 상태 관리 구현 시 AI를 보조 도구로 활용할 예정입니다.
