# Backend AI Agent Guidelines

## 역할

이 문서는 AI 에이전트가 백엔드 코드베이스를 작업할 때 참고하는 가이드라인입니다.

---

## 프로젝트 개요

**프로젝트**: 온라인 교육 플랫폼 수강 신청 시스템 (백엔드)
**기술 스택**: Spring Boot 3.4.5, Kotlin 2.0.21, JDK 17, MySQL 8.0, Spring Security
**아키텍처**: 계층형 아키텍처 (Controller → Service → Repository)

---

## 핵심 원칙

### 1. 계층형 아키텍처 준수

```
Controller (API 엔드포인트)
    ↓
Service (비즈니스 로직, 트랜잭션)
    ↓
Repository (데이터 접근)
    ↓
Entity (JPA 도메인 모델)
```

**의존성 방향**: 위 → 아래 (역방향 의존 금지)

### 2. Kotlin 관용구 (Idiomatic Kotlin)

**Null Safety**:
```kotlin
// ✅ Good - Non-null by default
val name: String = "John"

// ✅ Good - Explicit nullable
var nickname: String? = null

// ❌ Bad - !! operator
val length = nickname!!.length

// ✅ Good - Safe call
val length = nickname?.length ?: 0
```

**Data Class**:
```kotlin
// ✅ Good - Data class for DTO
data class UserResponse(
    val id: Long,
    val email: String,
    val name: String,
)

// ❌ Bad - Regular class for data holder
class UserResponse(val id: Long, val email: String, val name: String)
```

### 3. 코드 스타일

- **ktlint 사용**: Kotlin 표준 코딩 컨벤션
- **줄 길이**: 제한 없음 (권장 120)
- **들여쓰기**: 4스페이스
- **중괄호**: K&R 스타일 (Opening brace on same line)

### 4. 함수 설계

**Expression Body**:
```kotlin
// ✅ Good - Single expression
fun add(a: Int, b: Int): Int = a + b

// ✅ OK - Block body for complex logic
fun processUser(user: User): User {
    validate(user)
    val processed = transform(user)
    return save(processed)
}
```

---

## 작업 가이드

### 새로운 API 추가

1. **Entity 생성** - 도메인 모델
   ```kt
   // domain/Xxx.kt
   @Entity
   @Table(name = "xxx")
   class Xxx(
       @Id
       @GeneratedValue(strategy = GenerationType.IDENTITY)
       val id: Long? = null,
       // ...
   )
   ```

2. **Repository 생성** - 데이터 접근
   ```kt
   // repository/XxxRepository.kt
   interface XxxRepository : JpaRepository<Xxx, Long> {
       fun findByName(name: String): Xxx?
   }
   ```

3. **DTO 생성** - 요청/응답
   ```kotlin
   // dto/xxx/XxxRequest.kt
   data class CreateXxxRequest(
       @field:NotNull
       val name: String?,
   )

   // dto/xxx/XxxResponse.kt
   data class XxxResponse(
       val id: Long,
       val name: String,
   ) {
       companion object {
           fun from(entity: Xxx): XxxResponse = ...
       }
   }
   ```

4. **Service 생성** - 비즈니스 로직
   ```kotlin
   // service/XxxService.kt
   @Service
   @Transactional(readOnly = true)
   class XxxService(
       private val xxxRepository: XxxRepository,
   ) {
       fun getXxx(id: Long): XxxResponse { ... }

       @Transactional
       fun createXxx(request: CreateXxxRequest): XxxResponse { ... }
   }
   ```

5. **Controller 생성** - API 엔드포인트
   ```kotlin
   // controller/XxxController.kt
   @RestController
   @RequestMapping("/api/xxx")
   @Tag(name = "Xxx", description = "XXX API")
   class XxxController(
       private val xxxService: XxxService,
   ) {
       @GetMapping
       fun getXxx(): ResponseEntity<List<XxxResponse>> { ... }
   }
   ```

### 데이터베이스 쿼리

**Spring Data JPA 메서드 쿼리**:
```kotlin
// ✅ Good - Method name query
fun findByEmailAndStatus(email: String, status: UserStatus): User?

// ✅ Good - Optional return
fun findById(id: Long): Optional<User>
```

**@Query 사용**:
```kotlin
// ✅ Good - JPQL
@Query("SELECT u FROM User u WHERE u.email = :email")
fun findByEmail(@Param("email") email: String): User?

// ✅ Good - Native query with parameter binding
@Query(value = "SELECT * FROM users WHERE email = :email", nativeQuery = true)
fun findByEmailNative(@Param("email") email: String): User?
```

**비관적 락** (동시성 제어):
```kotlin
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT c FROM Course c WHERE c.id = :id")
fun findWithLockById(@Param("id") id: Long): Optional<Course>
```

### 예외 처리

**커스텀 예외 사용**:
```kotlin
// ✅ Good - Specific exception
if (currentCount >= maxCapacity) {
    throw BadRequestException("정원이 초과되었습니다")
}

// ❌ Bad - Generic exception
if (currentCount >= maxCapacity) {
    throw IllegalArgumentException("정원이 초과되었습니다")
}
```

**GlobalExceptionHandler** (이미 구현됨):
```kotlin
@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(BadRequestException::class)
    fun handleBadRequest(e: BadRequestException): ResponseEntity<ErrorResponse> {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(status = 400, message = e.message))
    }
}
```

### 트랜잭션 관리

**읽기 전용**:
```kotlin
@Service
@Transactional(readOnly = true)  // 기본값
class XxxService {
    fun getXxx(id: Long): XxxResponse { ... }
}
```

**쓰기 작업**:
```kotlin
@Transactional
fun createXxx(request: CreateXxxRequest): XxxResponse {
    // 자동 커밋/롤백
}
```

---

## 테스트 작성

### 단위 테스트

```kotlin
@SpringBootTest
class XxxServiceTest {
    @MockkBean
    private lateinit var xxxRepository: XxxRepository

    @InjectMockKs
    private lateinit var xxxService: XxxService

    @Test
    fun `should create xxx`() {
        // Given
        val request = CreateXxxRequest(name = "Test")
        every { xxxRepository.save(any()) } returnsArgument 0

        // When
        val result = xxxService.createXxx(request)

        // Then
        assertNotNull(result)
        verify { xxxRepository.save(any()) }
    }
}
```

### 통합 테스트

```kotlin
@SpringBootTest
@AutoConfigureMockMvc
class XxxControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Test
    fun `should return 200 on get xxx`() {
        mockMvc.get("/api/xxx")
            .andExpect { status {isOk()} }
    }
}
```

---

## 빌드 및 실행

### 개발 서버
```bash
./gradlew bootRun  # http://localhost:8080
```

### 빌드
```bash
./gradlew build --no-daemon
```

### 테스트
```bash
./gradlew test --no-daemon
./gradlew test --tests "XxxServiceTest" --no-daemon
```

### 코드 품질
```bash
./gradlew ktlintCheck --no-daemon      # 검사
./gradlew ktlintFormat --no-daemon     # 자동 수정
```

---

## 주의사항

### ❌ 하지 말아야 할 것

1. **`!!` 연산자 사용**: NPE 위험
2. **`any` 타입 사용**: 구체적인 타입 명시
3. **Service 간 직접 호출**: 순환 의존 위험
4. **Controller에 비즈니스 로직**: Service로 위임
5. **@Transactional 없는 쓰기**: 명시적 트랜잭션

### ✅ 권장하는 것

1. **Extension Functions**: 유틸리티 함수
2. **Data Class**: 데이터 홀더
3. **Sealed Class**: 계층적인 에러 처리
4. **Coroutines**: 비동기 처리
5. **Early Return**: 가독성 향상

---

## 보안

### JWT 인증

**토큰 생성**:
```kotlin
jwtTokenProvider.createToken(userId, email, role)
```

**인증 필터**:
```kotlin
// JwtAuthenticationFilter가 자동 처리
// Controller에서 Authentication principal로 userId 추출
val userId = authentication.principal as Long
```

### 권한 제어

**SecurityConfig 설정**:
```kotlin
.requestMatchers("/api/auth/login").permitAll()
.requestMatchers("/api/**").authenticated()  // 인증 필요
```

**Controller에서 권한 확인**:
```kotlin
if (course.instructorId != instructorId) {
    throw ForbiddenException("본인의 강의만 조회할 수 있습니다")
}
```

---

## 참고 문서

- [Spring Boot Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Spring Security Reference](https://docs.spring.io/spring-security/reference/index.html)
- [Kotlin Language Reference](https://kotlinlang.org/docs/home.html)
- [Spring Data JPA Reference](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/)

---

**버전**: 1.0
**최종 수정**: 2026-04-26
