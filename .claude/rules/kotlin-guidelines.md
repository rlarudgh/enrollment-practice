# Kotlin Guidelines

> Kotlin을 사용하는 모든 코드에 적용되는 기본 가이드라인입니다.

## 1. Null Safety

### Nullable vs Non-nullable
- ✅ 기본적으로 non-nullable 타입 사용 (`String`, `Int`)
- ✅ null이 가능한 경우만 `?` 명시 (`String?`, `Int?`)
- ✅ `!!` 연산자 사용 금지 (NPE 위험)

```kotlin
// GOOD: Non-nullable by default
val name: String = "John"
// name = null  // Compile error

// GOOD: Explicit nullable
var nickname: String? = null
nickname = "Johnny"

// BAD: !! operator
val length = nickname!!.length  // NPE if nickname is null

// GOOD: Safe call operator
val length = nickname?.length

// GOOD: Elvis operator with default
val length = nickname?.length ?: 0

// GOOD: let scope function
nickname?.let {
    println("Nickname: $it")
}
```

### Null 처리 패턴
```kotlin
// GOOD: Early return
fun processUser(user: User?) {
    if (user == null) return
    
    // user is smart-casted to non-nullable
    println(user.name)
}

// GOOD: Safe cast
val stringValue = value as? String ?: "default"

// GOOD: requireNotNull for preconditions
fun processUser(user: User?) {
    requireNotNull(user) { "User must not be null" }
    // user is non-nullable here
}
```

## 2. 변수 선언

### val vs var
- ✅ 기본적으로 `val` (immutable) 사용
- ✅ 상태 변경이 필요한 경우만 `var` 사용
- ✅ `var` 사용 시 변경 가능성 최소화

```kotlin
// GOOD: val for immutable
val userName = "John"
val userList = listOf(user1, user2)

// OK: var when mutation needed
var counter = 0
counter++

// BAD: unnecessary var
var name = "John"
println(name)
// name is never changed, should be val
```

### lateinit
- ✅ 의존성 주입, 테스트에서만 사용
- ✅ primitive 타입에는 사용 불가
- ✅ 사용 전 초기화 확인 (optional)

```kotlin
// GOOD: lateinit for dependency injection
@Service
class UserService {
    @Autowired
    private lateinit var userRepository: UserRepository
    
    // Check initialization
    fun process() {
        if (::userRepository.isInitialized) {
            // safe to use
        }
    }
}
```

## 3. Data Classes

### 기본 사용
- ✅ 데이터 홀더 클래스는 `data class` 사용
- ✅ componentN() 자동 생성 활용
- ✅ copy() 메서드 활용

```kotlin
// GOOD: Data class
data class User(
    val id: Long,
    val name: String,
    val email: String,
    val age: Int = 0  // default value
)

// Destructuring
val (id, name, email) = user

// Copy with modification
val updatedUser = user.copy(name = "Jane")

// equals() and hashCode() automatically generated
val user1 = User(1, "John", "john@example.com")
val user2 = User(1, "John", "john@example.com")
println(user1 == user2)  // true
```

### Data class 주의사항
```kotlin
// BAD: Mutable properties in data class
data class BadUser(
    val id: Long,
    var name: String  // Avoid mutable properties
)

// GOOD: Immutable properties
data class GoodUser(
    val id: Long,
    val name: String
)
```

## 4. 함수

### Expression body
- ✅ 단일 표현식 함수는 `=` 사용
- ✅ 반환 타입 추론 활용

```kotlin
// GOOD: Expression body
fun add(a: Int, b: Int): Int = a + b

// GOOD: Type inference
fun max(a: Int, b: Int) = if (a > b) a else b

// OK: Block body for complex logic
fun processUser(user: User): User {
    validate(user)
    val processed = transform(user)
    return save(processed)
}
```

### Default parameters & Named arguments
```kotlin
// GOOD: Default parameters
fun createUser(
    name: String,
    email: String,
    age: Int = 18,
    isActive: Boolean = true
): User {
    return User(name = name, email = email, age = age, isActive = isActive)
}

// GOOD: Named arguments
createUser(
    name = "John",
    email = "john@example.com",
    isActive = false  // Skip age, use default
)
```

### Extension Functions
- ✅ 기존 클래스에 기능 추가
- ✅ util 함수 대신 확장 함수 사용

```kotlin
// GOOD: Extension function
fun String.isEmailValid(): Boolean {
    return this.contains("@") && this.contains(".")
}

fun String.mask(): String {
    return if (length > 4) {
        "${take(2)}${"*".repeat(length - 4)}${takeLast(2)}"
    } else {
        "*".repeat(length)
    }
}

// Usage
val email = "john@example.com"
if (email.isEmailValid()) {
    println(email.mask())  // jo**********om
}
```

## 5. Collections

### Immutable collections
- ✅ 기본적으로 immutable 사용 (`listOf`, `setOf`, `mapOf`)
- ✅ 수정이 필요한 경우만 mutable 사용 (`mutableListOf`)

```kotlin
// GOOD: Immutable list
val users = listOf(user1, user2, user3)
// users.add(user4)  // Compile error

// GOOD: Mutable list when needed
val mutableUsers = mutableListOf(user1, user2)
mutableUsers.add(user3)

// GOOD: Copy to mutable
val newList = users.toMutableList()
newList.add(user4)
```

### Collection operations
```kotlin
val numbers = listOf(1, 2, 3, 4, 5)

// GOOD: Functional operations
val evens = numbers.filter { it % 2 == 0 }  // [2, 4]
val doubled = numbers.map { it * 2 }  // [2, 4, 6, 8, 10]
val sum = numbers.reduce { acc, n -> acc + n }  // 15

// GOOD: Chaining
val result = users
    .filter { it.isActive }
    .map { it.name }
    .sorted()
    .take(10)
```

## 6. Scope Functions

### 적절한 사용
| Function | Context object | Return value | Use case |
|----------|---------------|--------------|----------|
| `let` | `it` | Lambda result | Null check, transform |
| `run` | `this` | Lambda result | Initialize + compute |
| `with` | `this` | Lambda result | Group operations |
| `apply` | `this` | Context object | Initialize object |
| `also` | `it` | Context object | Side effect, logging |

```kotlin
// GOOD: let for null check
val length = text?.let {
    println("Text: $it")
    it.length
} ?: 0

// GOOD: apply for initialization
val user = User("", "").apply {
    name = "John"
    email = "john@example.com"
}

// GOOD: also for side effects
val user = getUser().also {
    logger.info("User loaded: ${it.id}")
}

// GOOD: run for computation
val result = service.run {
    connect()
    fetchData()
    process()
}

// GOOD: with for grouping
with(user) {
    println(name)
    println(email)
    println(age)
}
```

## 7. Sealed Classes & When

### Sealed class for ADT
```kotlin
// GOOD: Sealed class for state
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val exception: Exception) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

// GOOD: Exhaustive when
fun handleResult(result: Result<User>) {
    when (result) {
        is Result.Success -> println("User: ${result.data.name}")
        is Result.Error -> println("Error: ${result.exception.message}")
        is Result.Loading -> println("Loading...")
    }  // Compiler ensures all cases handled
}
```

### When expression
```kotlin
// GOOD: When as expression
fun getStatusColor(status: Status) = when (status) {
    Status.PENDING -> "yellow"
    Status.APPROVED -> "green"
    Status.REJECTED -> "red"
}

// GOOD: When with multiple conditions
fun describeNumber(n: Int) = when {
    n < 0 -> "negative"
    n == 0 -> "zero"
    n in 1..10 -> "small positive"
    else -> "large positive"
}
```

## 8. Coroutines

### Basic coroutine usage
```kotlin
// GOOD: Suspend functions
suspend fun fetchUser(id: Long): User {
    return withContext(Dispatchers.IO) {
        userRepository.findById(id)
            ?: throw UserNotFoundException()
    }
}

// GOOD: Launch for fire-and-forget
viewModelScope.launch {
    val user = fetchUser(userId)
    updateUI(user)
}

// GOOD: Async for parallel execution
suspend fun fetchAllData(): Data {
    val users = async { fetchUsers() }
    val posts = async { fetchPosts() }
    
    return Data(users.await(), posts.await())
}
```

### Error handling in coroutines
```kotlin
// GOOD: CoroutineExceptionHandler
val handler = CoroutineExceptionHandler { _, exception ->
    logger.error("Coroutine failed", exception)
}

viewModelScope.launch(handler) {
    riskyOperation()
}

// GOOD: Try-catch in coroutine
viewModelScope.launch {
    try {
        val result = fetchData()
        _state.value = Result.Success(result)
    } catch (e: NetworkException) {
        _state.value = Result.Error("Network error")
    } catch (e: Exception) {
        _state.value = Result.Error("Unknown error")
    }
}
```

### Flow for streams
```kotlin
// GOOD: Cold flow
fun getUsers(): Flow<List<User>> = flow {
    while (true) {
        emit(userRepository.findAll())
        delay(5000)
    }
}

// GOOD: Flow operators
viewModelScope.launch {
    getUsers()
        .filter { it.isNotEmpty() }
        .map { users -> users.filter { it.isActive } }
        .catch { e -> logger.error(e) }
        .collect { users ->
            _users.value = users
        }
}
```

## 9. Spring Boot with Kotlin

### Entity classes
```kotlin
// GOOD: JPA Entity
@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    
    @Column(nullable = false)
    val email: String,
    
    @Column(nullable = false)
    val name: String,
    
    @Column(name = "created_at")
    val createdAt: LocalDateTime = LocalDateTime.now()
)
```

### Repository
```kotlin
// GOOD: Spring Data JPA
interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): User?
    fun existsByEmail(email: String): Boolean
    
    @Query("SELECT u FROM User u WHERE u.name LIKE %:keyword%")
    fun searchByName(@Param("keyword") keyword: String): List<User>
}
```

### Service layer
```kotlin
// GOOD: Service with transaction
@Service
@Transactional(readOnly = true)
class UserService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
) {
    fun getUser(id: Long): User = 
        userRepository.findByIdOrNull(id)
            ?: throw UserNotFoundException()
    
    @Transactional
    fun createUser(request: CreateUserRequest): User {
        require(!userRepository.existsByEmail(request.email)) {
            "Email already exists"
        }
        
        val user = User(
            email = request.email,
            name = request.name,
            password = passwordEncoder.encode(request.password)
        )
        
        return userRepository.save(user)
    }
}
```

### Controller
```kotlin
// GOOD: REST Controller
@RestController
@RequestMapping("/api/users")
class UserController(
    private val userService: UserService
) {
    @GetMapping("/{id}")
    fun getUser(@PathVariable id: Long): UserResponse {
        return userService.getUser(id).toResponse()
    }
    
    @PostMapping
    fun createUser(@RequestBody @Valid request: CreateUserRequest): ResponseEntity<UserResponse> {
        val user = userService.createUser(request)
        return ResponseEntity
            .created(URI.create("/api/users/${user.id}"))
            .body(user.toResponse())
    }
}
```

## 10. Testing

### Unit test with JUnit 5
```kotlin
// GOOD: Kotlin-style test
@SpringBootTest
class UserServiceTest {
    
    @MockkBean
    private lateinit var userRepository: UserRepository
    
    @InjectMockKs
    private lateinit var userService: UserService
    
    @Test
    fun `should create user with encoded password`() {
        // Given
        val request = CreateUserRequest("john@example.com", "password", "John")
        every { userRepository.existsByEmail(any()) } returns false
        every { userRepository.save(any()) } returnsArgument 0
        
        // When
        val result = userService.createUser(request)
        
        // Then
        assertNotNull(result)
        verify { userRepository.save(any()) }
    }
    
    @Test
    fun `should throw exception when email exists`() {
        // Given
        val request = CreateUserRequest("john@example.com", "password", "John")
        every { userRepository.existsByEmail(any()) } returns true
        
        // When & Then
        assertThrows<IllegalArgumentException> {
            userService.createUser(request)
        }
    }
}
```

---

**Remember**: Kotlin은 간결하고 안전하며, 자바와의 완벽한 상호운용성을 제공합니다. 🚀