# Kotlin Code Review Checklist

> Kotlin 코드 리뷰 시 확인해야 할 항목들입니다.

## 🔴 Critical (반드시 확인)

### Null Safety
- [ ] `!!` 연산자 사용 없이 안전한 null 처리가 되었는가?
- [ ] Nullable 타입(`String?`)이 적절히 사용되었는가?
- [ ] `lateinit` 사용이 적절한가? (의존성 주입 외에는 지양)

```kotlin
// ❌ Bad
val length = nullableString!!.length

// ✅ Good
val length = nullableString?.length ?: 0
```

### 예외 처리
- [ ] 예외가 적절히 처리되었는가?
- [ ] 예외 메시지가 명확한가?
- [ ] Checked Exception 처리가 적절한가?

```kotlin
// ❌ Bad
val user = userRepository.findById(id).get()  // NoSuchElementException 위험

// ✅ Good
val user = userRepository.findByIdOrNull(id)
    ?: throw UserNotFoundException("User not found: $id")
```

## 🟠 Major (중요)

### Immutability
- [ ] `val`을 우선적으로 사용하고, `var`는 꼭 필요한 경우만 사용했는가?
- [ ] Mutable collections 대신 immutable collections를 사용했는가?

```kotlin
// ❌ Bad
var count = 0
val list = mutableListOf(1, 2, 3)

// ✅ Good
val count = calculateCount()
val list = listOf(1, 2, 3)
```

### Data Classes
- [ ] 데이터 홀더 클래스는 `data class`를 사용했는가?
- [ ] `copy()` 메서드를 활용했는가?
- [ ] `toString()`, `equals()`, `hashCode()`가 필요한 경우 data class 사용했는가?

```kotlin
// ✅ Good
data class User(
    val id: Long,
    val name: String,
    val email: String
)

val updatedUser = user.copy(name = "New Name")
```

### 함수 설계
- [ ] 함수가 단일 책임을 가지는가?
- [ ] 함수 매개변수가 3개 이하인가? (4개 이상은 객체로 묶기)
- [ ] 반환 타입이 명확한가?

```kotlin
// ❌ Bad
fun createUser(name: String, email: String, age: Int, phone: String, address: String)

// ✅ Good
fun createUser(request: CreateUserRequest)
```

## 🟡 Minor (권장)

### Scope Functions
- [ ] `let`, `run`, `apply`, `also`, `with`가 적절히 사용되었는가?
- [ ] Scope function 중첩이 과도하지 않은가?

```kotlin
// ✅ Good: let for null check
val length = text?.let {
    println("Text: $it")
    it.length
} ?: 0

// ✅ Good: apply for initialization
val user = User("", "").apply {
    name = "John"
    email = "john@example.com"
}
```

### Extension Functions
- [ ] Extension function이 적절히 사용되었는가?
- [ ] 확장 함수가 너무 많지 않은가? (해당 클래스의 일부처럼 느껴지는지 확인)

```kotlin
// ✅ Good
fun String.isEmailValid(): Boolean = 
    contains("@") && contains(".")

fun String.mask(): String = 
    if (length > 4) "${take(2)}***${takeLast(2)}" else "*".repeat(length)
```

### Collection Operations
- [ ] Functional operations(`filter`, `map`, `reduce`)가 적절히 사용되었는가?
- [ ] `for` 루프보다 함수형 스타일을 선호했는가?

```kotlin
// ❌ Bad
val adults = mutableListOf<User>()
for (user in users) {
    if (user.age >= 18) {
        adults.add(user)
    }
}

// ✅ Good
val adults = users.filter { it.age >= 18 }
```

## 🟢 Style (스타일)

### Naming Conventions
- [ ] 클래스/인터페이스: PascalCase (`UserService`)
- [ ] 함수/변수: camelCase (`getUserById`)
- [ ] 상수: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)
- [ ] 패키지: lowercase (`com.example.service`)

### 코드 포맷팅
- [ ] 들여쓰기가 4 spaces로 일관된가?
- [ ] 함수 본문이 20줄 이하인가?
- [ ] 클래스가 200줄 이하인가?
- [ ] 중괄호 스타일이 일관된가?

```kotlin
// ✅ Good
class UserService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
) {
    fun getUser(id: Long): User {
        return userRepository.findByIdOrNull(id)
            ?: throw UserNotFoundException()
    }
}
```

## 🔒 Spring Boot 특화

### JPA
- [ ] Entity 클래스가 `data class`가 아닌 일반 `class`인가?
- [ ] Lazy loading이 적절히 사용되었는가?
- [ ] N+1 문제가 없는가?
- [ ] `@Transactional`이 적절히 사용되었는가?

```kotlin
// ❌ Bad: data class for entity
@Entity
data class User(...)  // equals/hashCode 문제

// ✅ Good: regular class
@Entity
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    
    @Column(nullable = false)
    val email: String
)
```

### Dependency Injection
- [ ] Constructor injection을 사용했는가?
- [ ] `@Autowired` 필드 주입을 피했는가?

```kotlin
// ❌ Bad: Field injection
@Service
class UserService {
    @Autowired
    private lateinit var userRepository: UserRepository
}

// ✅ Good: Constructor injection
@Service
class UserService(
    private val userRepository: UserRepository
)
```

### Exception Handling
- [ ] `@RestControllerAdvice`를 사용하여 전역 예외 처리를 했는가?
- [ ] Business exception이 적절히 정의되었는가?
- [ ] 에러 응답이 일관된 형식을 가지는가?

```kotlin
@RestControllerAdvice
class GlobalExceptionHandler {
    
    @ExceptionHandler(UserNotFoundException::class)
    fun handleUserNotFound(ex: UserNotFoundException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(
                code = "USER_NOT_FOUND",
                message = ex.message
            ))
    }
}
```

## 🧪 Testing

### Test Structure
- [ ] Given-When-Then 패턴을 따르는가?
- [ ] 테스트 이름이 명확한가?
- [ ] 테스트가 독립적인가?

```kotlin
@Test
fun `should throw exception when user not found`() {
    // Given
    val userId = 999L
    every { userRepository.findByIdOrNull(userId) } returns null
    
    // When & Then
    assertThrows<UserNotFoundException> {
        userService.getUser(userId)
    }
}
```

### Mocking
- [ ] MockK를 사용하여 적절히 mocking했는가?
- [ ] `verify`를 사용하여 호출 검증을 했는가?

```kotlin
@Test
fun `should save user with encoded password`() {
    // Given
    val request = CreateUserRequest("john@example.com", "password")
    every { passwordEncoder.encode(any()) } returns "encodedPassword"
    every { userRepository.save(any()) } returnsArgument 0
    
    // When
    userService.createUser(request)
    
    // Then
    verify { passwordEncoder.encode("password") }
    verify { userRepository.save(match { it.password == "encodedPassword" }) }
}
```

## 📝 Documentation

### KDoc
- [ ] Public API에 KDoc이 작성되었는가?
- [ ] Parameter와 return value가 문서화되었는가?
- [ ] Exception이 문서화되었는가?

```kotlin
/**
 * 사용자를 생성합니다.
 *
 * @param request 사용자 생성 요청 정보
 * @return 생성된 사용자
 * @throws IllegalArgumentException 이미 존재하는 이메일인 경우
 */
fun createUser(request: CreateUserRequest): User {
    // ...
}
```

---

**Remember**: 모든 항목을 기계적으로 따르기보다는, 상황에 맞게 판단하세요! 🎯