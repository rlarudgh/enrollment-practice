# Backend Sequence Diagrams

## 1. 인증 흐름 (Authentication Flow)

### 1.1 회원가입 (Signup)

```mermaid
sequenceDiagram
    actor Client as 클라이언트
    participant AuthController as AuthController
    participant AuthService as AuthService
    participant UserRepository as UserRepository
    participant PasswordEncoder as PasswordEncoder
    participant DB as Database

    Client->>AuthController: POST /api/auth/signup
    AuthController->>AuthService: signup(request)
    AuthService->>UserRepository: existsByEmail(email)
    UserRepository->>DB: SELECT COUNT(*) FROM users WHERE email = ?
    DB-->>UserRepository: count
    UserRepository-->>AuthService: exists

    alt 이메일 중복
        AuthService-->>AuthController: ConflictException
        AuthController-->>Client: 409 Conflict
    else 이메일 사용 가능
        AuthService->>PasswordEncoder: encode(password)
        PasswordEncoder-->>AuthService: encodedPassword
        AuthService->>UserRepository: save(User)
        UserRepository->>DB: INSERT INTO users (email, name, password) VALUES (?,?,?)
        DB-->>UserRepository: User
        UserRepository-->>AuthService: User
        AuthService-->>AuthController: UserResponse
        AuthController-->>Client: 201 Created + { user }
    end
```

### 1.2 로그인 (Login)

```mermaid
sequenceDiagram
    actor Client as 클라이언트
    participant AuthController as AuthController
    participant AuthService as AuthService
    participant UserRepository as UserRepository
    participant PasswordEncoder as PasswordEncoder
    participant JwtTokenProvider as JwtTokenProvider
    participant DB as Database

    Client->>AuthController: POST /api/auth/login
    AuthController->>AuthService: login(email, password)
    AuthService->>UserRepository: findByEmail(email)
    UserRepository->>DB: SELECT * FROM users WHERE email = ?
    DB-->>UserRepository: User
    UserRepository-->>AuthService: User

    alt 사용자 없음
        AuthService-->>AuthController: UnauthorizedException
        AuthController-->>Client: 401 Unauthorized
    else 비밀번호 불일치
        AuthService->>PasswordEncoder: matches(rawPassword, encodedPassword)
        PasswordEncoder-->>AuthService: false
        AuthService-->>AuthController: UnauthorizedException
        AuthController-->>Client: 401 Unauthorized
    else 로그인 성공
        AuthService->>PasswordEncoder: matches(rawPassword, encodedPassword)
        PasswordEncoder-->>AuthService: true
        AuthService->>JwtTokenProvider: createToken(userId, email, role)
        JwtTokenProvider-->>AuthService: JWT Token
        AuthService-->>AuthController: LoginResponse { token, user }
        AuthController-->>Client: 200 OK + { token, user }
    end
```

### 1.3 JWT 인증 필터 (JWT Authentication Filter)

```mermaid
sequenceDiagram
    actor Client as 클라이언트
    participant JwtFilter as JwtAuthenticationFilter
    participant JwtProvider as JwtTokenProvider
    participant SecurityContext as SecurityContext
    participant Controller as Controller

    Client->>JwtFilter: Request (Authorization: Bearer {token})
    JwtFilter->>JwtFilter: extractToken(request)

    alt 토큰 없음
        JwtFilter->>Controller: (인증 없이 통과)
    else 토큰 있음
        JwtFilter->>JwtProvider: validateToken(token)
        JwtProvider->>JwtProvider: verifyWith(key)
        alt 토큰 유효
            JwtProvider-->>JwtFilter: true
            JwtFilter->>JwtProvider: getUserId(token)
            JwtProvider-->>JwtFilter: userId
            JwtFilter->>SecurityContext: setAuthentication(userId)
            JwtFilter->>Controller: Request (인증됨)
        else 토큰 만료/위조
            JwtProvider-->>JwtFilter: false
            JwtFilter->>Controller: (인증 없이 통과)
            Controller-->>Client: 401 Unauthorized
        end
    end
```

---

## 2. 수강 신청 흐름 (Enrollment Flow)

### 2.1 수강 신청 (Enroll in Course)

```mermaid
sequenceDiagram
    actor Client as 클라이언트
    participant EnrollmentController as EnrollmentController
    participant EnrollmentService as EnrollmentService
    participant CourseRepository as CourseRepository
    participant Lock as @Lock(PESSIMISTIC_WRITE)
    participant EnrollmentRepository as EnrollmentRepository
    participant DB as Database

    Client->>EnrollmentController: POST /api/enrollments { courseId }
    EnrollmentController->>EnrollmentService: enroll(userId, request)

    EnrollmentService->>CourseRepository: findWithLockById(courseId)
    CourseRepository->>Lock: SELECT ... FOR UPDATE
    Lock->>DB: BEGIN TRANSACTION
    DB->>Lock: LOCK acquired
    Lock-->>CourseRepository: Course (LOCKED)
    CourseRepository-->>EnrollmentService: course

    alt 강의 없음
        EnrollmentService-->>EnrollmentController: NotFoundException
        EnrollmentController-->>Client: 404 Not Found
    else 강의 상태가 OPEN이 아님
        EnrollmentService-->>EnrollmentController: BadRequestException
        EnrollmentController-->>Client: 400 Bad Request
    else 정원 초과
        EnrollmentService->>EnrollmentRepository: countByCourseIdAndStatusNot(courseId, CANCELLED)
        EnrollmentRepository->>DB: SELECT COUNT(*) FROM enrollments
        DB-->>EnrollmentRepository: count
        EnrollmentRepository-->>EnrollmentService: currentCount
        EnrollmentService->>EnrollmentService: currentCount >= maxCapacity
        EnrollmentService-->>EnrollmentController: BadRequestException
        EnrollmentController-->>Client: 400 Bad Request
    else 중복 신청
        EnrollmentService->>EnrollmentRepository: existsByCourseIdAndUserId(courseId, userId)
        EnrollmentRepository->>DB: SELECT COUNT(*) FROM enrollments WHERE user_id = ? AND course_id = ?
        DB-->>EnrollmentRepository: exists
        EnrollmentRepository-->>EnrollmentService: true
        EnrollmentService-->>EnrollmentController: ConflictException
        EnrollmentController-->>Client: 409 Conflict
    else 신청 성공
        EnrollmentService->>EnrollmentRepository: save(Enrollment)
        EnrollmentRepository->>DB: INSERT INTO enrollments (user_id, course_id, status) VALUES (?,?,?)
        DB-->>EnrollmentRepository: Enrollment
        DB->>Lock: COMMIT
        Lock->>DB: LOCK released
        EnrollmentRepository-->>EnrollmentService: Enrollment
        EnrollmentService-->>EnrollmentController: EnrollmentResponse
        EnrollmentController-->>Client: 201 Created
    end
```

### 2.2 결제 확정 (Confirm Enrollment)

```mermaid
sequenceDiagram
    actor Client as 클라이언트
    participant EnrollmentController as EnrollmentController
    participant EnrollmentService as EnrollmentService
    participant EnrollmentRepository as EnrollmentRepository
    participant DB as Database

    Client->>EnrollmentController: PATCH /api/enrollments/{id}/confirm
    EnrollmentController->>EnrollmentService: confirmEnrollment(enrollmentId, userId)

    EnrollmentService->>EnrollmentRepository: findById(enrollmentId)
    EnrollmentRepository->>DB: SELECT * FROM enrollments WHERE id = ?
    DB-->>EnrollmentRepository: Enrollment
    EnrollmentRepository-->>EnrollmentService: enrollment

    alt 신청 없음
        EnrollmentService-->>EnrollmentController: NotFoundException
        EnrollmentController-->>Client: 404 Not Found
    else 본인의 신청이 아님
        EnrollmentService->>EnrollmentService: enrollment.userId != userId
        EnrollmentService-->>EnrollmentController: ForbiddenException
        EnrollmentController-->>Client: 403 Forbidden
    else PENDING 상태가 아님
        EnrollmentService->>EnrollmentService: enrollment.status != PENDING
        EnrollmentService-->>EnrollmentController: BadRequestException
        EnrollmentController-->>Client: 400 Bad Request
    else 확정 성공
        EnrollmentService->>EnrollmentRepository: save(Enrollment(status=CONFIRMED, confirmedAt=now))
        EnrollmentRepository->>DB: UPDATE enrollments SET status = 'CONFIRMED', confirmed_at = ? WHERE id = ?
        DB-->>EnrollmentRepository: Enrollment
        EnrollmentRepository-->>EnrollmentService: Enrollment
        EnrollmentService-->>EnrollmentController: EnrollmentResponse
        EnrollmentController-->>Client: 200 OK
    end
```

### 2.3 수강 취소 (Cancel Enrollment)

```mermaid
sequenceDiagram
    actor Client as 클라이언트
    participant EnrollmentController as EnrollmentController
    participant EnrollmentService as EnrollmentService
    participant EnrollmentRepository as EnrollmentRepository
    participant DB as Database

    Client->>EnrollmentController: PATCH /api/enrollments/{id}/cancel
    EnrollmentController->>EnrollmentService: cancelEnrollment(enrollmentId, userId)

    EnrollmentService->>EnrollmentRepository: findById(enrollmentId)
    EnrollmentRepository->>DB: SELECT * FROM enrollments WHERE id = ?
    DB-->>EnrollmentRepository: Enrollment
    EnrollmentRepository-->>EnrollmentService: enrollment

    alt 신청 없음
        EnrollmentService-->>EnrollmentController: NotFoundException
        EnrollmentController-->>Client: 404 Not Found
    else 본인의 신청이 아님
        EnrollmentService->>EnrollmentService: enrollment.userId != userId
        EnrollmentService-->>EnrollmentController: ForbiddenException
        EnrollmentController-->>Client: 403 Forbidden
    else CONFIRMED 상태가 아님
        EnrollmentService->>EnrollmentService: enrollment.status != CONFIRMED
        EnrollmentService-->>EnrollmentController: BadRequestException
        EnrollmentController-->>Client: 400 Bad Request
    else 7일 경과
        EnrollmentService->>EnrollmentService: Duration.between(confirmedAt, now).toDays() > 7
        EnrollmentService-->>EnrollmentController: BadRequestException
        EnrollmentController-->>Client: 400 Bad Request
    else 취소 성공
        EnrollmentService->>EnrollmentRepository: save(Enrollment(status=CANCELLED, cancelledAt=now))
        EnrollmentRepository->>DB: UPDATE enrollments SET status = 'CANCELLED', cancelled_at = ? WHERE id = ?
        DB-->>EnrollmentRepository: Enrollment
        EnrollmentRepository-->>EnrollmentService: Enrollment
        EnrollmentService-->>EnrollmentController: EnrollmentResponse
        EnrollmentController-->>Client: 200 OK
    end
```

---

## 3. 강의 관리 흐름 (Course Management Flow)

### 3.1 강의 생성 (Create Course)

```mermaid
sequenceDiagram
    actor Client as 크리에이터
    participant ClassController as ClassController
    participant ClassService as ClassService
    participant CourseRepository as CourseRepository
    participant DB as Database

    Client->>ClassController: POST /api/courses { title, price, maxCapacity, ... }
    ClassController->>ClassService: createCourse(instructorId, request)
    ClassService->>CourseRepository: save(Course)
    CourseRepository->>DB: INSERT INTO courses (title, price, max_capacity, instructor_id, status) VALUES (?,?,?,?,?)
    DB-->>CourseRepository: Course
    CourseRepository-->>ClassService: Course
    ClassService-->>ClassController: CourseResponse
    ClassController-->>Client: 201 Created
```

### 3.2 강의 상태 변경 (Change Course Status)

```mermaid
sequenceDiagram
    actor Client as 크리에이터
    participant ClassController as ClassController
    participant ClassService as ClassService
    participant CourseRepository as CourseRepository
    participant DB as Database

    Client->>ClassController: PATCH /api/courses/{id}/status { status: "OPEN" }
    ClassController->>ClassService: updateCourseStatus(courseId, instructorId, status)
    ClassService->>CourseRepository: findById(courseId)
    CourseRepository->>DB: SELECT * FROM courses WHERE id = ?
    DB-->>CourseRepository: Course
    CourseRepository-->>ClassService: course

    alt 강의 없음
        ClassService-->>ClassController: NotFoundException
        ClassController-->>Client: 404 Not Found
    else 본인의 강의가 아님
        ClassService->>ClassService: course.instructorId != instructorId
        ClassService-->>ClassController: ForbiddenException
        ClassController-->>Client: 403 Forbidden
    else 상태 변경 성공
        ClassService->>CourseRepository: save(Course(status=status))
        CourseRepository->>DB: UPDATE courses SET status = ? WHERE id = ?
        DB-->>CourseRepository: Course
        CourseRepository-->>ClassService: Course
        ClassService-->>ClassController: CourseResponse
        ClassController-->>Client: 200 OK
    end
```

### 3.3 강의별 수강생 목록 (Get Course Enrollments)

```mermaid
sequenceDiagram
    actor Client as 크리에이터
    participant ClassController as ClassController
    participant ClassService as ClassService
    participant CourseRepository as CourseRepository
    participant EnrollmentRepository as EnrollmentRepository
    participant DB as Database

    Client->>ClassController: GET /api/courses/{courseId}/enrollments
    ClassController->>ClassService: getCourseEnrollments(courseId, instructorId)
    ClassService->>CourseRepository: findById(courseId)
    CourseRepository->>DB: SELECT * FROM courses WHERE id = ?
    DB-->>CourseRepository: Course
    CourseRepository-->>ClassService: course

    alt 강의 없음
        ClassService-->>ClassController: NotFoundException
        ClassController-->>Client: 404 Not Found
    else 본인의 강의가 아님
        ClassService->>ClassService: course.instructorId != instructorId
        ClassService-->>ClassController: ForbiddenException
        ClassController-->>Client: 403 Forbidden
    else 조회 성공
        ClassService->>EnrollmentRepository: findAllByCourseId(courseId)
        EnrollmentRepository->>DB: SELECT * FROM enrollments WHERE course_id = ?
        DB-->>EnrollmentRepository: List<Enrollment>
        EnrollmentRepository-->>ClassService: enrollments
        ClassService->>ClassService: map to EnrollmentDetailResponse
        ClassService-->>ClassController: List<EnrollmentDetailResponse>
        ClassController-->>Client: 200 OK
    end
```

---

## 4. 동시성 제어 시나리오 (Concurrency Control)

### 4.1 정원 초과 방지 (Race Condition Prevention)

```mermaid
sequenceDiagram
    autonumber
    participant ThreadA as Thread A
    participant ThreadB as Thread B
    participant ThreadC as Thread C
    participant DB as Database (MySQL)

    Note over ThreadA,DB: 3개의 스레드가 동시에 신청 시도

    ThreadA->>DB: SELECT ... FOR UPDATE (Lock 획득 시도)
    DB-->>ThreadA: LOCK 획득 ✅

    ThreadB->>DB: SELECT ... FOR UPDATE (Lock 획득 시도)
    ThreadC->>DB: SELECT ... FOR UPDATE (Lock 획득 시도)

    ThreadA->>ThreadA: 정원 확인: 28/30
    ThreadA->>DB: INSERT INTO enrollments ...
    DB-->>ThreadA: INSERT 성공
    ThreadA->>DB: COMMIT
    ThreadA->>DB: LOCK 해제

    DB-->>ThreadB: LOCK 획득 ✅ (A가 해제 후)

    ThreadB->>ThreadB: 정원 확인: 29/30
    ThreadB->>DB: INSERT INTO enrollments ...
    DB-->>ThreadB: INSERT 성공
    ThreadB->>DB: COMMIT
    ThreadB->>DB: LOCK 해제

    DB-->>ThreadC: LOCK 획득 ✅ (B가 해제 후)

    ThreadC->>ThreadC: 정원 확인: 30/30
    ThreadC->>ThreadC: 정원 초과 에러!
    ThreadC-->>ThreadC: 400 Bad Request

    Note over ThreadA,DB: 결과: 30명 성공, 1명 실패
```

---

## 5. 에러 처리 흐름 (Error Handling)

### 5.1 전역 예외 처리 (Global Exception Handler)

```mermaid
sequenceDiagram
    actor Client as 클라이언트
    participant Controller as Controller
    participant Service as Service
    participant GlobalHandler as GlobalExceptionHandler
    participant DB as Database

    Client->>Controller: Request
    Controller->>Service: businessLogic()
    Service->>DB: Database Query
    DB-->>Service: Error occurs
    Service-->>Controller: NotFoundException

    Controller->>GlobalHandler: Exception propagation
    GlobalHandler->>GlobalHandler: @ExceptionHandler(NotFoundException)

    alt NotFoundException
        GlobalHandler-->>Client: 404 Not Found { status: 404, message: "..." }
    else BadRequestException
        GlobalHandler-->>Client: 400 Bad Request { status: 400, message: "..." }
    else ForbiddenException
        GlobalHandler-->>Client: 403 Forbidden { status: 403, message: "..." }
    else ConflictException
        GlobalHandler-->>Client: 409 Conflict { status: 409, message: "..." }
    else UnauthorizedException
        GlobalHandler-->>Client: 401 Unauthorized { status: 401, message: "..." }
    else Unexpected Exception
        GlobalHandler-->>Client: 500 Internal Server Error { status: 500, message: "서버 오류가 발생했습니다" }
    end
```

---

## 6. API 요청-응답 예시 (API Request-Response Examples)

### 6.1 정상 흐름 (Happy Path)

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Frontend as 프론트엔드
    participant Backend as 백엔드
    participant DB as Database

    User->>Frontend: 로그인 버튼 클릭
    Frontend->>Backend: POST /api/auth/login { email, password }
    Backend->>DB: SELECT * FROM users WHERE email = ?
    DB-->>Backend: User
    Backend-->>Frontend: 200 OK { token, user }
    Frontend->>Frontend: localStorage.setItem("auth_token", token)

    User->>Frontend: 강의 신청 버튼 클릭
    Frontend->>Backend: POST /api/enrollments { courseId }<br/>Authorization: Bearer {token}
    Backend->>Backend: JWT 토큰 검증 → userId 추출
    Backend->>DB: SELECT ... FOR UPDATE FROM courses WHERE id = ?
    DB-->>Backend: Course (LOCKED)
    Backend->>DB: INSERT INTO enrollments (user_id, course_id, status)
    DB-->>Backend: Enrollment
    Backend->>DB: COMMIT
    Backend-->>Frontend: 201 Created { enrollment }
    Frontend->>User: "신청이 완료되었습니다"
```

---

**문서 버전**: 1.0
**최종 수정**: 2026-04-26
