# Security Rules for Enrollment System

> ⚠️ **CRITICAL**: All code MUST follow these security guidelines. Violations will be rejected.

## 1. Authentication & Authorization

### JWT-Based Authentication
- ✅ Use Spring Security with JWT tokens
- ✅ Token expiration: Access token 15min, Refresh token 7days
- ✅ JWT secret must be stored in environment variables only
- ❌ NEVER hardcode JWT secrets
- ❌ NEVER store tokens in localStorage (use httpOnly cookies)

### Role-Based Access Control
```kotlin
// GOOD: Using @PreAuthorize
@PreAuthorize("hasRole('CREATOR')")
@PostMapping("/lectures")
fun createLecture(@RequestBody request: CreateLectureRequest) { }

// GOOD: Using custom security expressions
@PreAuthorize("@lectureSecurity.isOwner(#lectureId, authentication)")
@PutMapping("/lectures/{lectureId}")
fun updateLecture(@PathVariable lectureId: Long) { }
```

### Password Security
- ✅ Use BCryptPasswordEncoder with strength 12 or higher
- ✅ Enforce password policy: min 8 chars, upper/lower/number/special
- ❌ NEVER log passwords (even hashed)
- ❌ NEVER return password fields in API responses

## 2. Input Validation

### Request DTO Validation
```kotlin
// GOOD: Using Bean Validation
data class CreateLectureRequest(
    @field:NotBlank(message = "Title is required")
    @field:Size(min = 2, max = 255, message = "Title must be 2-255 characters")
    val title: String,
    
    @field:NotNull(message = "Price is required")
    @field:Min(value = 0, message = "Price must be >= 0")
    val price: BigDecimal,
    
    @field:NotNull(message = "Max capacity is required")
    @field:Min(value = 1, message = "Capacity must be >= 1")
    val maxCapacity: Int
)
```

### SQL Injection Prevention
- ✅ Use JPA/Hibernate with named parameters
- ✅ Use QueryDSL or Spring Data JPA
- ❌ NEVER use String concatenation in SQL queries

```kotlin
// GOOD: Named parameters
@Query("SELECT e FROM Enrollment e WHERE e.user.id = :userId AND e.status = :status")
fun findByUserIdAndStatus(@Param("userId") userId: Long, @Param("status") status: EnrollmentStatus): List<Enrollment>

// BAD: String concatenation
@Query("SELECT * FROM enrollments WHERE user_id = " + userId)  // NEVER DO THIS
```

### XSS Prevention
- ✅ Use Thymeleaf or similar template engines (auto-escape by default)
- ✅ Validate and sanitize all user inputs
- ❌ NEVER render user input as raw HTML

## 3. Sensitive Data Protection

### Environment Variables
- ✅ All secrets must be in `.env` file
- ✅ Never commit `.env` to git
- ✅ Use `.env.example` with placeholder values for documentation

```kotlin
// GOOD: Using @Value with environment variable
@Value("\${jwt.secret}")
private lateinit var jwtSecret: String

// BAD: Hardcoded secret
val jwtSecret = "my-secret-key"  // NEVER DO THIS
```

### Data Masking in Logs
```kotlin
// GOOD: Masking sensitive data
@Component
class UserService {
    private val logger = LoggerFactory.getLogger(this::class.java)
    
    fun createUser(request: CreateUserRequest) {
        logger.info("Creating user: email=${request.email.mask()}, name=${request.name}")
        // email will be logged as "us***@example.com"
    }
}

// Extension function for masking
fun String.mask(): String = if (this.contains("@")) {
    val parts = this.split("@")
    "${parts[0].take(2)}***@${parts[1]}"
} else {
    "***"
}
```

### API Response Filtering
```kotlin
// GOOD: Using @JsonIgnore for sensitive fields
@Entity
data class User(
    val id: Long,
    val email: String,
    val name: String,
    
    @JsonIgnore
    val password: String,  // Never exposed in API
    
    @JsonIgnore
    val refreshToken: String?
)
```

## 4. API Security

### Rate Limiting
- ✅ Apply rate limiting to all public endpoints
- ✅ Stricter limits for authentication endpoints (5 req/min)
- ✅ Use Bucket4j or Spring Cloud Gateway

```kotlin
// GOOD: Rate limiting configuration
@Configuration
class RateLimitConfig {
    
    @Bean
    fun rateLimiter(): RateLimiter {
        return Bucket4jRateLimiter.builder()
            .addLimit(Bandwidth.classic(100, Duration.ofMinutes(1)))
            .build()
    }
}
```

### CORS Configuration
- ✅ Only allow specific origins in production
- ❌ NEVER use `allowedOrigins = "*"` in production

```kotlin
// GOOD: Restricted CORS
@Configuration
class WebConfig : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/api/**")
            .allowedOrigins("https://yourdomain.com")  // Specific origin only
            .allowedMethods("GET", "POST", "PUT", "DELETE")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600)
    }
}
```

### Security Headers
```kotlin
// GOOD: Security headers in SecurityConfig
http {
    headers {
        frameOptions { deny }
        xssProtection { }
        contentSecurityPolicy {
            policyDirectives = "default-src 'self'"
        }
    }
}
```

## 5. Business Logic Security

### Concurrency Control (Race Condition Prevention)
- ✅ MUST use Optimistic Locking for capacity management
- ✅ Check capacity at database level, not application level

```kotlin
// GOOD: Optimistic locking
@Entity
data class Lecture(
    @Id
    val id: Long,
    
    val maxCapacity: Int,
    var currentCount: Int,
    
    @Version
    val version: Long = 0  // Optimistic locking
)

// GOOD: Atomic increment with version check
@Modifying
@Query("UPDATE Lecture l SET l.currentCount = l.currentCount + 1 WHERE l.id = :id AND l.currentCount < l.maxCapacity AND l.version = :version")
fun incrementCapacity(@Param("id") id: Long, @Param("version") version: Long): Int
```

### Capacity Management
```kotlin
// GOOD: Database-level constraint
@Entity
@Table(
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["user_id", "lecture_id"])
    ]
)
data class Enrollment(
    @ManyToOne
    @JoinColumn(name = "user_id")
    val user: User,
    
    @ManyToOne
    @JoinColumn(name = "lecture_id")
    val lecture: Lecture,
    
    @Enumerated(EnumType.STRING)
    var status: EnrollmentStatus
)
```

### Cancellation Period Validation
```kotlin
// GOOD: Server-side validation
fun cancelEnrollment(enrollmentId: Long, userId: Long) {
    val enrollment = enrollmentRepository.findById(enrollmentId)
        .orElseThrow { EnrollmentNotFoundException() }
    
    // Verify ownership
    if (enrollment.user.id != userId) {
        throw AccessDeniedException("Not your enrollment")
    }
    
    // Check cancellation period (e.g., 7 days after confirmation)
    val confirmedAt = enrollment.confirmedAt 
        ?: throw IllegalStateException("Not confirmed yet")
    
    if (confirmedAt.plusDays(7).isBefore(LocalDateTime.now())) {
        throw CancellationPeriodExpiredException()
    }
    
    // Process cancellation
    enrollment.status = EnrollmentStatus.CANCELLED
    enrollment.cancelledAt = LocalDateTime.now()
}
```

## 6. Error Handling

### Safe Error Messages
- ✅ Return generic error messages to clients
- ✅ Log detailed errors internally
- ❌ NEVER expose internal stack traces or sensitive info

```kotlin
// GOOD: Generic error response
@RestControllerAdvice
class GlobalExceptionHandler {
    
    @ExceptionHandler(Exception::class)
    fun handleException(ex: Exception): ResponseEntity<ErrorResponse> {
        // Log full error internally
        logger.error("Unexpected error", ex)
        
        // Return generic message to client
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse(
                code = "INTERNAL_ERROR",
                message = "An unexpected error occurred. Please try again later."
            ))
    }
}

// BAD: Exposing internal details
@ExceptionHandler(Exception::class)
fun handleException(ex: Exception): String {
    return ex.stackTraceToString()  // NEVER DO THIS
}
```

## 7. Dependencies & Vulnerabilities

### Regular Security Checks
- ✅ Run `npm audit` / `./gradlew dependencyCheckAnalyze` regularly
- ✅ Keep dependencies up-to-date
- ✅ Review security advisories for used libraries

```bash
# Run security audit
./gradlew dependencyCheckAnalyze

# Check for known vulnerabilities
npm audit
```

## 8. Testing

### Security Test Requirements
- ✅ All authentication flows must be tested
- ✅ All authorization rules must be tested
- ✅ Input validation must be tested
- ✅ Race conditions must be tested (concurrent enrollment)

```kotlin
@Test
fun `should not allow double enrollment`() {
    val lecture = createLecture(maxCapacity = 1)
    val user1 = createUser()
    val user2 = createUser()
    
    // Simulate concurrent enrollment
    val executor = Executors.newFixedThreadPool(2)
    val futures = listOf(
        executor.submit { enrollmentService.enroll(user1.id, lecture.id) },
        executor.submit { enrollmentService.enroll(user2.id, lecture.id) }
    )
    
    val results = futures.map { it.get() }
    
    // Only one should succeed
    assertEquals(1, results.count { it.isSuccess })
    assertEquals(1, results.count { it.isFailure })
}
```

## 9. Logging & Monitoring

### Security Event Logging
```kotlin
@Component
class SecurityAuditLogger {
    
    private val logger = LoggerFactory.getLogger("SECURITY_AUDIT")
    
    fun logLoginAttempt(email: String, success: Boolean, ipAddress: String) {
        logger.info("LOGIN_ATTEMPT | email={} | success={} | ip={} | time={}",
            email.mask(), success, ipAddress, LocalDateTime.now())
    }
    
    fun logEnrollment(userId: Long, lectureId: Long, success: Boolean) {
        logger.info("ENROLLMENT | userId={} | lectureId={} | success={} | time={}",
            userId, lectureId, success, LocalDateTime.now())
    }
    
    fun logSuspiciousActivity(description: String, userId: Long?, ipAddress: String) {
        logger.warn("SUSPICIOUS_ACTIVITY | desc={} | userId={} | ip={} | time={}",
            description, userId ?: "anonymous", ipAddress, LocalDateTime.now())
    }
}
```

## 10. Review Checklist

Before committing code, verify:

- [ ] No hardcoded secrets or credentials
- [ ] All user inputs are validated
- [ ] All API endpoints have proper authorization
- [ ] Sensitive data is not logged
- [ ] Passwords are properly hashed
- [ ] SQL injection is prevented (no string concatenation)
- [ ] Race conditions are handled (optimistic locking)
- [ ] Error messages don't expose internal details
- [ ] Security headers are configured
- [ ] Rate limiting is applied where needed
- [ ] Dependencies have no known vulnerabilities

---

**Remember**: Security is not an afterthought. Build it in from the start! 🛡️
