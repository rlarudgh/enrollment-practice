# Backend Architecture

## 1. 아키텍처 개요

### 1.1 계층형 아키텍처 (Layered Architecture)

본 프로젝트는 **계층형 아키텍처**를 적용하여 관심사를 분리하고 의존성을 일방향으로 관리합니다.

```
┌─────────────────┐
│  Controller     │  ← REST API 엔드포인트, 요청/응답 처리
├─────────────────┤
│    Service      │  ← 비즈니스 로직, 트랜잭션 관리
├─────────────────┤
│   Repository    │  ← 데이터 접근 계층 (Spring Data JPA)
├─────────────────┤
│  Domain/Entity  │  ← 도메인 모델 (JPA Entity)
└─────────────────┘
```

**의존성 방향**: Controller → Service → Repository → Domain

### 1.2 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| **Framework** | Spring Boot | 3.4.5 |
| **Language** | Kotlin | 2.0.21 |
| **JDK** | Java | 17 |
| **ORM** | Spring Data JPA | 3.4.5 |
| **Database** | MySQL | 8.0+ |
| **Security** | Spring Security + JWT | - |
| **Validation** | Jakarta Validation | - |
| **Build Tool** | Gradle | 8.x |
| **API Docs** | SpringDoc OpenAPI | 2.8.8 |

---

## 2. ERD (Entity Relationship Diagram)

### 2.1 도메인 모델

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │     │   Course    │     │ Enrollment  │
│             │     │             │     │             │
│ - id        │     │ - id        │     │ - id        │
│ - email     │     │ - title     │     │ - userId    │
│ - name      │     │ - price     │     │ - courseId  │
│ - password  │     │ - capacity  │     │ - status    │
│ - role      │     │ - status    │     │ - enrolledAt│
│ - createdAt │     │ - start/end │     │ - confirmedAt│
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                    (User creates Course,
                     User enrolls in Course)
```

### 2.2 Entity 상세 설계

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

#### Course (강의)
```kotlin
@Entity
@Table(name = "courses")
class Course(
    val id: Long?,                    // PK
    val title: String,                // 강의 제목
    val description: String,          // 설명
    val price: Int,                   // 가격
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

### 2.3 관계 정의

| 관계 | 설명 | 구현 방식 |
|------|------|----------|
| User ← Course | 1:N (한 명의 강사는 여러 강의 개설) | `Course.instructorId: Long` |
| User ← Enrollment | 1:N (한 명의 사용자는 여러 신청) | `Enrollment.userId: Long` |
| Course ← Enrollment | 1:N (한 강의는 여러 신청) | `Enrollment.courseId: Long` |
| User + Course → Enrollment | N:1 (중복 신청 방지) | `@UniqueConstraint` |

---

## 3. 핵심 도메인 설계

### 3.1 UserRole (사용자 역할)

```kotlin
enum class UserRole {
    CREATOR,      // 크리에이터 (강사) - 강의 개설, 수강생 관리
    CLASSMATE     // 클래스메이트 (수강생) - 강의 신청
}
```

**권한 매핑**:
- `CREATOR`: 강의 CRUD, 수강생 목록 조회
- `CLASSMATE`: 강의 조회, 수강 신청

### 3.2 CourseStatus (강의 상태)

```kotlin
enum class CourseStatus {
    DRAFT,       // 초안 (신청 불가)
    OPEN,        // 모집 중 (신청 가능)
    CLOSED       // 모집 마감 (신청 불가)
}
```

**상태 전이**:
```
DRAFT → OPEN → CLOSED
  ↑        ↓
  └────────┘ (재오픈 가능 시)
```

### 3.3 EnrollmentStatus (수강 신청 상태)

```kotlin
enum class EnrollmentStatus {
    PENDING,     // 대기 (결제 대기)
    CONFIRMED,   // 확정 (결제 완료)
    CANCELLED    // 취소
}
```

**상태 전이**:
```
PENDING → CONFIRMED → CANCELLED
           ↓
         (7일 이내 취소 가능)
```

---

## 4. API 설계 (RESTful)

### 4.1 API 엔드포인트 구조

```
/api/auth/*           - 인증 (로그인, 회원가입)
/api/courses/*        - 강의 관리
/api/enrollments/*    - 수강 신청
```

### 4.2 HTTP Method + Status Code

| Operation | HTTP Method | Status Code | 설명 |
|-----------|-------------|-------------|------|
| 생성 | POST | 201 Created | 리소스 생성 성공 |
| 조회 | GET | 200 OK | 리소스 조회 성공 |
| 수정 | PATCH | 200 OK | 리소스 수정 성공 |
| 삭제 | DELETE | 204 No Content | 리소스 삭제 성공 |
| 에러 | - | 400 Bad Request | 잘못된 요청 |
| 에러 | - | 401 Unauthorized | 인증되지 않음 |
| 에러 | - | 403 Forbidden | 권한 없음 |
| 에러 | - | 404 Not Found | 리소스 없음 |
| 에러 | - | 409 Conflict | 중복 리소스 |

---

## 5. 예외 처리 전략

### 5.1 커스텀 예외 계층 구조

```
Throwable
  └─ Exception
      └─ BaseException (abstract)
          ├─ BadRequestException (400)
          ├─ UnauthorizedException (401)
          ├─ ForbiddenException (403)
          ├─ NotFoundException (404)
          └─ ConflictException (409)
```

### 5.2 GlobalExceptionHandler

```kotlin
@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(BadRequestException::class)
    fun handleBadRequest(e: BadRequestException): ResponseEntity<ErrorResponse> {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(status = 400, message = e.message))
    }

    @ExceptionHandler(NotFoundException::class)
    fun handleNotFound(e: NotFoundException): ResponseEntity<ErrorResponse> {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(status = 404, message = e.message))
    }

    // ... 다른 예외 핸들러
}
```

### 5.3 예외 메시지 표준화

| 상황 | 예외 타입 | 메시지 |
|------|-----------|--------|
| 강의 찾기 실패 | `NotFoundException` | "강의를 찾을 수 없습니다" |
| 정원 초과 | `BadRequestException` | "정원이 초과되었습니다" |
| 중복 신청 | `ConflictException` | "이미 신청한 강의입니다" |
| 권한 없음 | `ForbiddenException` | "본인의 강의만 조회할 수 있습니다" |

---

## 6. 트랜잭션 관리

### 6.1 트랜잭션 전략

```kotlin
@Service
@Transactional(readOnly = true)  // 기본적으로 읽기 전용
class EnrollmentService(
    private val enrollmentRepository: EnrollmentRepository,
    private val courseRepository: CourseRepository,
) {
    @Transactional  // 쓰기 작업은 명시적으로 트랜잭션
    fun enroll(userId: Long, request: CreateEnrollmentRequest): EnrollmentResponse {
        // 비즈니스 로직
    }
}
```

**트랜잭션 속성**:
- `readOnly = true`: 조회 메서드 (성능 최적화)
- `@Transactional`: 쓰기 메서드 (자동 커밋/롤백)

### 6.2 트랜잭션 경계

| 레이어 | 트랜잭션 | 설명 |
|-------|----------|------|
| Controller | ❌ | 트랜잭션 없음 |
| Service | ✅ | 트랜잭션 시작 |
| Repository | ✅ | Service 트랜잭션 참여 |

---

## 7. 동시성 제어 (Concurrency Control)

### 7.1 비관적 락 (Pessimistic Lock)

**문제**: 수강 신청 시 정원 초과 방지

**해결**: `@Lock(LockModeType.PESSIMISTIC_WRITE)` 사용

```kotlin
// CourseRepository.kt
interface CourseRepository : JpaRepository<Course, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Course c WHERE c.id = :id")
    fun findWithLockById(@Param("id") id: Long): Optional<Course>
}
```

**작동 방식**:
```
Thread A: SELECT ... FOR UPDATE (Lock 획득)
Thread B: SELECT ... FOR UPDATE (Lock 대기)
Thread A: COMMIT (Lock 해제)
Thread B: Lock 획득 후 진행
```

### 7.2 정원 확인 로직

```kotlin
@Transactional
fun enroll(userId: Long, request: CreateEnrollmentRequest): EnrollmentResponse {
    // 1. 비관적 락으로 강의 조회
    val course = courseRepository.findWithLockById(courseId)
        .orElseThrow { NotFoundException("강의를 찾을 수 없습니다") }

    // 2. 상태 확인
    if (course.status != CourseStatus.OPEN) {
        throw BadRequestException("모집 중인 강의만 신청 가능합니다")
    }

    // 3. 정원 확인 (CANCELLED 제외)
    val currentCount = enrollmentRepository
        .countByCourseIdAndStatusNot(courseId, EnrollmentStatus.CANCELLED)

    if (currentCount >= course.maxCapacity) {
        throw BadRequestException("정원이 초과되었습니다")
    }

    // 4. 중복 신청 확인
    if (enrollmentRepository.existsByCourseIdAndUserId(courseId, userId)) {
        throw ConflictException("이미 신청한 강의입니다")
    }

    // 5. 신청 생성
    val enrollment = enrollmentRepository.save(
        Enrollment(userId = userId, courseId = courseId)
    )

    return EnrollmentResponse.from(enrollment, course.title)
}
```

### 7.3 동시성 테스트 시나리오

**시나리오**: 30명의 정원에 31명이 동시 신청

```
1. 30개의 스레드가 동시에 enroll() 호출
2. Thread 1~30: Lock 순차 획득, 정원 내이므로 성공
3. Thread 31: Lock 획득 후 정원 초과 에러 반환
```

---

## 8. 보안 아키텍처

### 8.1 JWT 기반 인증

**토큰 생성**:
```kotlin
fun createToken(userId: Long, email: String, role: String): String {
    val now = Date()
    return Jwts.builder()
        .subject(userId.toString())
        .claim("email", email)
        .claim("role", role)
        .issuedAt(now)
        .expiration(Date(now.time + expiration))  // 24시간
        .signWith(key)
        .compact()
}
```

**토큰 검증**:
```kotlin
fun validateToken(token: String): Boolean {
    return try {
        getClaims(token)  // 서명 검증, 만료 확인
        true
    } catch (_: Exception) {
        false
    }
}
```

### 8.2 Spring Security 필터 체인

```
HTTP Request
    ↓
JwtAuthenticationFilter (토큰 추출 → Authentication 설정)
    ↓
SecurityFilterChain (권한 확인)
    ↓
Controller (비즈니스 로직)
```

### 8.3 권한 제어

**SecurityConfig 설정**:
```kotlin
http
    .csrf { it.disable() }  // JWT는 STATELESS이므로 CSRF 비활성화
    .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
    .authorizeHttpRequests { auth ->
        auth
            .requestMatchers("/api/auth/login").permitAll()
            .requestMatchers("/api/auth/signup").permitAll()
            .requestMatchers("/swagger-ui/**").permitAll()
            .requestMatchers("/api/**").authenticated()  // 나머지는 인증 필요
            .anyRequest().permitAll()
    }
    .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)
```

---

## 9. 데이터베이스 설계

### 9.1 테이블 생성 전략

**개발 환경** (`application-dev.yml`):
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update  # 엔티티 변경 시 자동으로 테이블 업데이트
```

**프로덕션 환경** (추천):
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate  # Flyway/Liquibase 마이그레이션 사용
```

### 9.2 인덱스 전략

**자동 생성 인덱스**:
- `users.email` (Unique)
- `enrollments.user_id + course_id` (Unique)

**추가 인덱스 (추천)**:
```sql
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_courses_status ON courses(status);
```

---

## 10. 패키지 구조

```
com.example.assignment/
├── config/           # 설정 (Security, JWT, Web, Swagger)
├── controller/       # REST API 엔드포인트
├── dto/              # 요청/응답 DTO
│   ├── auth/
│   ├── course/
│   └── enrollment/
├── domain/           # JPA Entity
├── exception/        # 커스텀 예외
├── repository/       # Spring Data JPA Repository
└── service/          # 비즈니스 로직
```

---

## 11. 확장 가능성

### 11.1 새로운 API 추가

**패턴**:
1. Entity 생성 (`domain/`)
2. Repository 생성 (`repository/`)
3. Service 생성 (`service/`)
4. Controller 생성 (`controller/`)
5. DTO 생성 (`dto/`)

### 11.2 새로운 권한 추가

**UserRole 확장**:
```kotlin
enum class UserRole {
    CREATOR,       // 강사
    CLASSMATE,     // 수강생
    ADMIN,         // 관리자 (추가)
}
```

**SecurityConfig 업데이트**:
```kotlin
.requestMatchers("/api/admin/**").hasRole("ADMIN")
```

---

**문서 버전**: 1.0
**최종 수정**: 2026-04-26
