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

## ERD

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

## API 명세

### 인증 (Auth)

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

## 테스트

### 통합 테스트 (ApiIntegrationTest)

`@SpringBootTest` + `@AutoConfigureMockMvc` + H2 인메모리 DB. MySQL 없이 실행.

| 그룹 | 테스트 수 | 내용 |
|------|-----------|------|
| 인증 API | 4개 | 로그인 성공/실패, 내 정보 조회, 토큰 없이 접근 |
| 강의 관리 API | 5개 | 등록, 목록, 카테고리 필터, 상태 전환, 상세 조회 |
| 수강 신청 API | 8개 | 신청, 중복 방지, 확정, 취소, 정원 초과, 정원 복원, DRAFT 신청 불가 |

`@BeforeEach` 에서 DB 초기화 후 크리에이터/수강생 계정을 생성하여 각 테스트가 독립적으로 실행됩니다.

## 제약사항

- **마이그레이션 없음:** `ddl-auto: update` 사용. 운영 배포 시 Flyway 등 도입 필요
- **운영 프로필 없음:** `application-prod.yml` 미구현
- **페이지네이션 없음:** 강의/수강 목록이 전체 조회
- **대기열 없음:** 정원 초과 시 바로 거부 (waitlist 미구현)
- **관리자 기능 없음:** 관리자 전용 강의/수강 관리 API 미구현
