# Backend

수강 신청 시스템 백엔드 서버.
Spring Boot 3.4 + Kotlin 2.1 기반 REST API, JPA + MySQL 8.0.

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Spring Boot 3.4.5 |
| Language | Kotlin 2.0.21 (JVM 17) |
| Database | MySQL 8.0 (dev) / H2 (test) |
| ORM | Spring Data JPA (Hibernate) |
| Auth | Spring Security + JWT (jjwt 0.12.6) |
| Build | Gradle (Kotlin DSL) |
| API Docs | Springdoc OpenAPI 2.8.8 |
| Code Quality | ktlint |

## 실행 방법

### 1. MySQL 실행

```bash
# 프로젝트 루트
docker compose up -d
```

### 2. 서버 실행

```bash
./gradlew bootRun
```

### 3. 테스트 실행

```bash
./gradlew test          # 전체 테스트 (H2 인메모리 DB 사용)
./gradlew ktlintCheck   # 코드 스타일 검사
```

### 접속

- API 서버: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- API 테스터: http://localhost:8080/test.html

### 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `DB_HOST` | MySQL 호스트 | `localhost` |
| `DB_PORT` | MySQL 포트 | `3306` |
| `DB_NAME` | 데이터베이스 이름 | `assignment_db` |
| `DB_USERNAME` | MySQL 사용자 | `root` |
| `DB_PASSWORD` | MySQL 비밀번호 | `password` |
| `JWT_SECRET` | JWT 서명 키 | `change-me-in-production` |

## 데이터 모델 설명

### Entity (도메인 모델)

#### User (사용자)
```kotlin
@Entity
@Table(name = "users")
class User(
    val id: Long?,                    // PK
    val email: String,                // Unique, 로그인용
    val name: String,                 // 이름
    val password: String,             // BCrypt 암호화
    val role: UserRole,               // CREATOR, CLASSMATE
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)
```

**UserRole Enum**:
- `CREATOR`: 크리에이터 (강사) - 강의 개설, 수강생 관리
- `CLASSMATE`: 클래스메이트 (수강생) - 강의 신청

#### Course (강의)
```kotlin
@Entity
@Table(name = "courses")
class Course(
    val id: Long?,                    // PK
    val title: String,                // 강의 제목
    val description: String,          // 설명
    val price: Int,                   // 가격 (원)
    val maxCapacity: Int,             // 정원
    val status: CourseStatus,         // DRAFT, OPEN, CLOSED
    val startDate: LocalDate,         // 시작일
    val endDate: LocalDate,           // 종료일
    val instructorId: Long,           // 강사 ID (FK → User)
    val category: String,             // 카테고리
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)
```

**CourseStatus Enum**:
- `DRAFT`: 초안 (신청 불가)
- `OPEN`: 모집 중 (신청 가능)
- `CLOSED`: 모집 마감 (신청 불가)

#### Enrollment (수강 신청)
```kotlin
@Entity
@Table(
    name = "enrollments",
    uniqueConstraints = [
        UniqueConstraint(name = "uk_user_course", columnNames = ["user_id", "course_id"])
    ]
)
class Enrollment(
    val id: Long?,                    // PK
    val userId: Long,                 // FK → User
    val courseId: Long,               // FK → Course
    val status: EnrollmentStatus,     // PENDING, CONFIRMED, CANCELLED
    val enrolledAt: LocalDateTime,    // 신청일시
    val confirmedAt: LocalDateTime?,  // 확정일시
    val cancelledAt: LocalDateTime?,  // 취소일시
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)
```

**EnrollmentStatus Enum**:
- `PENDING`: 대기 (결제 대기)
- `CONFIRMED`: 확정 (결제 완료)
- `CANCELLED`: 취소

### 관계 정의

| 관계 | 설명 |
|------|------|
| User ← Course | 1:N (한 명의 강사는 여러 강의 개설) |
| User ← Enrollment | 1:N (한 명의 사용자는 여러 신청) |
| Course ← Enrollment | 1:N (한 강의는 여러 신청) |
| User + Course → Enrollment | N:1 (중복 신청 방지: UNIQUE 제약) |

### ERD

```
┌──────────────────────┐       ┌─────────────────────────────┐
│        users          │       │          courses             │
├──────────────────────┤       ├─────────────────────────────┤
│ id (PK, BIGINT, AUTO) │       │ id (PK, BIGINT, AUTO)       │
│ email (UNIQUE)        │       │ title (NOT NULL)            │
│ name (NOT NULL)       │       │ description                 │
│ password (NOT NULL)   │       │ price (기본 0)              │
│ role (CREATOR/MATE)   │──┐    │ max_capacity (NOT NULL)     │
│ created_at            │  │    │ status (DRAFT/OPEN/CLOSED)  │
│ updated_at            │  │    │ start_date                  │
└──────────────────────┘  │    │ end_date                    │
                          │    │ instructor_id (FK → users)  │
                          │    │ category                    │
                          │    │ created_at / updated_at     │
                          │    └─────────────────────────────┘
                          │                  │
                          │  ┌─────────────────────────────┐
                          │  │        enrollments           │
                          │  ├─────────────────────────────┤
                          └──│ user_id (FK → users)        │
                             │ course_id (FK → courses)    │◄─┘
                             │ status (PENDING/CONFIRMED/  │
                             │          CANCELLED)         │
                             │ enrolled_at / confirmed_at  │
                             │ cancelled_at                │
                             │ created_at / updated_at     │
                             └─────────────────────────────┘

UNIQUE(user_id, course_id) — 중복 신청 방지
```

## 프로젝트 구조

```
com.example.assignment/
├── config/
│   ├── SecurityConfig.kt           # Spring Security + JWT 필터
│   ├── JwtTokenProvider.kt         # JWT 발급/검증
│   ├── JwtAuthenticationFilter.kt  # Bearer 토큰 처리
│   ├── DataInitializer.kt          # 시드 데이터 (dev 프로필)
│   ├── SwaggerConfig.kt            # OpenAPI 설정
│   └── WebConfig.kt                # CORS 설정
├── controller/
│   ├── AuthController.kt           # 인증 API
│   ├── ClassController.kt          # 강의 관리 API
│   └── EnrollmentController.kt     # 수강 신청 API
├── service/
│   ├── AuthService.kt              # 로그인, 회원가입
│   ├── ClassService.kt             # 강의 CRUD + 상태 전환
│   └── EnrollmentService.kt        # 수강 신청 + 정원 관리
├── repository/
│   ├── UserRepository.kt
│   ├── CourseRepository.kt         # 비관적 락 메서드 포함
│   └── EnrollmentRepository.kt
├── domain/
│   ├── User.kt                     # 사용자 엔티티
│   ├── Course.kt                   # 강의 엔티티
│   └── Enrollment.kt               # 수강 신청 엔티티
├── dto/
│   ├── auth/AuthDtos.kt
│   ├── course/CourseDtos.kt
│   └── enrollment/EnrollmentDtos.kt
└── exception/
    ├── GlobalExceptionHandler.kt
    └── CustomExceptions.kt
```

## API 목록 및 예시

상세한 API 명세는 [docs/API.md](docs/API.md)를 참고하세요.

### 인증 API (`/api/auth`)

| 엔드포인트 | 메서드 | 설명 | 인증 |
|------------|--------|------|------|
| `/api/auth/signup` | POST | 회원가입 | ❌ |
| `/api/auth/login` | POST | 로그인 (토큰 발급) | ❌ |
| `/api/auth/me` | GET | 내 정보 조회 | ✅ |
| `/api/auth/logout` | POST | 로그아웃 | ✅ |

**로그인 예시**:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "classmate@test.com",
    "password": "password123"
  }'
```

**응답**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "classmate@test.com",
    "name": "클래스메이트",
    "role": "CLASSMATE"
  }
}
```

---

### 강의 API (`/api/courses`)

| 엔드포인트 | 메서드 | 설명 | 인증 |
|------------|--------|------|------|
| `/api/courses` | GET | 강의 목록 조회 | ❌ |
| `/api/courses/{id}` | GET | 강의 상세 조회 | ❌ |
| `/api/courses` | POST | 강의 생성 | ✅ (CREATOR) |
| `/api/courses/{id}/status` | PATCH | 강의 상태 변경 | ✅ (본인만) |
| `/api/courses/{id}/enrollments` | GET | 강의별 수강생 목록 | ✅ (본인만) |

**강의 목록 조회 예시**:
```bash
curl -X GET "http://localhost:8080/api/courses?status=OPEN&category=development"
```

---

### 수강 신청 API (`/api/enrollments`)

| 엔드포인트 | 메서드 | 설명 | 인증 |
|------------|--------|------|------|
| `/api/enrollments` | GET | 내 수강 신청 목록 | ✅ |
| `/api/enrollments` | POST | 수강 신청 | ✅ |
| `/api/enrollments/{id}/confirm` | PATCH | 결제 확정 | ✅ (본인만) |
| `/api/enrollments/{id}/cancel` | PATCH | 수강 취소 | ✅ (본인만) |

**수강 신청 예시**:
```bash
curl -X POST http://localhost:8080/api/enrollments \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"courseId": 1}'
```

---

### 에러 코드

| 코드 | HTTP Status | 설명 |
|------|-------------|------|
| `INVALID_CREDENTIALS` | 401 | 이메일 또는 비밀번호 불일치 |
| `UNAUTHORIZED` | 401 | 인증되지 않음 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스를 찾을 수 없음 |
| `COURSE_FULL` | 400 | 정원 초과 |
| `DUPLICATE_ENROLLMENT` | 409 | 이미 신청한 강의 |

---

## 상세 문서

백엔드 아키텍처, API 명세, 개발 가이드, 보안 등 상세 문서는 [docs/](docs/)를 참고하세요.

| 문서 | 설명 |
|------|------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 계층형 아키텍처, ERD, API 설계, 동시성 제어 |
| [API.md](docs/API.md) | REST API 명세, 요청/응답 예시, 에러 코드 |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | 개발 환경 설정, 빌드, 테스트, 디버깅 |
| [SECURITY.md](docs/SECURITY.md) | JWT, Spring Security, 권한 제어, 보안 조치 |
| [SEQUENCE_DIAGRAMS.md](docs/SEQUENCE_DIAGRAMS.md) | 시퀀스 다이어그램 (인증, 수강신청, 동시성제어) |
| [INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md) | 인프라 구조, 배포 전략, 모니터링, CI/CD |

---

#### POST /api/auth/login

로그인 후 JWT 토큰 발급.

**Request:**
```json
{
  "email": "creator@test.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "1",
    "email": "creator@test.com",
    "name": "크리에이터",
    "role": "CREATOR"
  }
}
```

**Error (401):** 이메일 또는 비밀번호 불일치

---

#### GET /api/auth/me

내 정보 조회. `Authorization: Bearer <token>` 필요.

**Response (200):**
```json
{
  "user": {
    "id": "1",
    "email": "creator@test.com",
    "name": "크리에이터",
    "role": "CREATOR"
  }
}
```

**Error (401):** 토큰 없음/만료

---

### 강의 관리 (Courses)

#### POST /api/courses

강의 등록. CREATOR 권한 필요. DRAFT 상태로 생성됨.

**Request:**
```json
{
  "title": "Kotlin 기초",
  "description": "Kotlin 입문 강의입니다",
  "price": 50000,
  "maxCapacity": 30,
  "startDate": "2026-05-01",
  "endDate": "2026-06-30",
  "category": "development"
}
```

**Response (201):**
```json
{
  "id": "1",
  "title": "Kotlin 기초",
  "description": "Kotlin 입문 강의입니다",
  "price": 50000,
  "maxCapacity": 30,
  "currentEnrollment": 0,
  "status": "DRAFT",
  "startDate": "2026-05-01",
  "endDate": "2026-06-30",
  "instructor": "크리에이터",
  "category": "development"
}
```

---

#### GET /api/courses

강의 목록 조회. 공개 API (인증 불필요).

**Query Parameters:**

| 파라미터 | 설명 | 예시 |
|-----------|------|------|
| `status` | 상태 필터 | `OPEN`, `DRAFT`, `CLOSED` |
| `category` | 카테고리 필터 | `development`, `design`, `marketing` |

**Response (200):**
```json
{
  "courses": [],
  "categories": ["development", "design", "marketing"]
}
```

---

#### GET /api/courses/{id}

강의 상세 조회. 공개 API. `currentEnrollment` 포함.

**Response (200):** CourseResponse (위와 동일)

---

#### PATCH /api/courses/{id}/status

강의 상태 변경. CREATOR 본인만 가능.

**상태 전환 규칙:** `DRAFT → OPEN → CLOSED` (순차 전환만 허용)

**Request:**
```json
{ "status": "OPEN" }
```

**Response (200):** CourseResponse

**Error (400):** 건너뛰기 (예: DRAFT → CLOSED)

---

### 수강 신청 (Enrollments)

#### POST /api/enrollments

수강 신청. 인증 필요. PENDING 상태로 생성.

**검증:** 강의가 OPEN 상태 / 정원 초과 시 거부 / 중복 신청 거부

**Request:**
```json
{ "courseId": 1 }
```

**Response (201):**
```json
{
  "enrollmentId": "1",
  "status": "pending",
  "enrolledAt": "2026-04-24T14:30:00",
  "courseId": "1",
  "courseTitle": "Kotlin 기초"
}
```

---

#### GET /api/enrollments

내 수강 신청 목록. 인증 필요.

**Response (200):**
```json
[
  {
    "enrollmentId": "1",
    "status": "PENDING",
    "courseId": "1",
    "courseTitle": "Kotlin 기초",
    "enrolledAt": "2026-04-24T14:30:00",
    "confirmedAt": null,
    "cancelledAt": null
  }
]
```

---

#### PATCH /api/enrollments/{id}/confirm

결제 확정. 본인 신청만 가능. `PENDING → CONFIRMED`

**Response (200):** EnrollmentResponse (`status: "confirmed"`)

---

#### PATCH /api/enrollments/{id}/cancel

수강 취소. 본인 신청만 가능. `CONFIRMED → CANCELLED`

**제약:** 결제 확정 후 7일 이내에만 취소 가능

**Response (200):** EnrollmentResponse (`status: "cancelled"`)

**Error (400):** PENDING 상태에서 취소 시도, 7일 초과

---

## 핵심 설계 결정

### 1. 정원 관리 — 비관적 락

수강 신청 시 `SELECT ... FOR UPDATE` 로 강의 행에 락을 획득한 후 정원을 확인합니다. 같은 트랜잭션 안에서 카운트 → 검증 → INSERT가 처리되므로, 마지막 자리에 여러 사용자가 동시에 신청해도 1명만 성공합니다.

### 2. 상태 전환 검증

강의 상태는 `DRAFT → OPEN → CLOSED` 순서로만 변경 가능합니다. 서비스 단에서 이전 상태를 확인하여 건너뛰기 전환을 차단합니다.

### 3. UNIQUE 제약으로 중복 방지

`enrollments` 테이블에 `UNIQUE(user_id, course_id)` 제약을 걸어 DB 레벨에서 중복 신청을 차단합니다.

### 4. 취소 기간 제한

결제 확정 후 7일 이내에만 취소 가능합니다. `confirmedAt` 시간과 현재 시간의 차이를 계산하여 검증합니다.

### 5. 카테고리 필드

요구사항에는 없지만 프론트엔드에서 이미 카테고리 필터를 사용하고 있어 추가했습니다.

## 테스트 실행 방법

### 1. 전체 테스트 실행

```bash
./gradlew test --no-daemon
```

**설명**: 모든 테스트 케이스 실행 (H2 인메모리 DB 사용)

### 2. 특정 테스트 실행

```bash
# 특정 테스트 클래스
./gradlew test --tests "EnrollmentServiceTest" --no-daemon

# 특정 테스트 메서드 (Spock 스타일)
./gradlew test --tests "EnrollmentServiceTest.정원_초과_시_신청_실패" --no-daemon
```

### 3. 테스트 커버리지 확인

```bash
./gradlew test jacocoTestReport --no-daemon
open build/reports/jacoco/test/html/index.html
```

### 4. 코드 스타일 검사

```bash
./gradlew ktlintCheck --no-daemon      # 검사만
./gradlew ktlintFormat --no-daemon     # 자동 수정
```

### 테스트 구조

| 테스트 클래스 | 테스트 수 | 설명 |
|---------------|-----------|------|
| `AuthControllerTest` | 4개 | 로그인 성공/실패, 내 정보 조회, 토큰 없이 접근 |
| `CourseControllerTest` | 5개 | 등록, 목록, 카테고리 필터, 상태 전환, 상세 조회 |
| `EnrollmentControllerTest` | 8개 | 신청, 중복 방지, 확정, 취소, 정원 초과, 정원 복원 |

**테스트 설정**:
- `@SpringBootTest`: 전체 애플리케이션 컨텍스트 로드
- `@AutoConfigureMockMvc`: MockMvc 사용
- H2 인메모리 DB: MySQL 없이 테스트 가능
- `@BeforeEach`: 각 테스트 전 DB 초기화

### 테스트 시나리오

**정원 초과 동시성 테스트**:
```
1. 30명 정원 강의 생성
2. 31명이 동시에 신청 시도
3. 30명은 성공, 1명은 실패 (정원 초과 에러)
```

**중복 신청 방지 테스트**:
```
1. 같은 사용자가 같은 강의에 2번 신청
2. 첫 번째는 성공
3. 두 번째는 409 Conflict 에러
```

---

## 제약사항

- **마이그레이션 없음:** `ddl-auto: update` 사용. 운영 배포 시 Flyway 등 도입 필요
- **운영 프로필 없음:** `application-prod.yml` 미구현
- **페이지네이션 없음:** 강의/수강 목록이 전체 조회
- **대기열 없음:** 정원 초과 시 바로 거부 (waitlist 미구현)
- **관리자 기능 없음:** 관리자 전용 강의/수강 관리 API 미구현
