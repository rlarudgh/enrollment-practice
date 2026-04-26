# Backend Security

## 1. 보안 개요

본 문서는 백엔드 애플리케이션의 보안 설계, 구현된 보안 조치, 모벨 사례를 설명합니다.

---

## 2. 인증/인가 구조

### 2.1 JWT 기반 인증

**토큰 생성** (`JwtTokenProvider.kt`):
```kotlin
@Component
class JwtTokenProvider(
    @Value("\${jwt.secret}")  // 환경변수 필수
    private val secret: String,
    @Value("\${jwt.expiration:86400000}")
    private val expiration: Long,
) {
    fun createToken(userId: Long, email: String, role: String): String {
        val now = Date()
        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .claim("role", role)
            .issuedAt(now)
            .expiration(Date(now.time + expiration))
            .signWith(key)  // HMAC SHA256
            .compact()
    }
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

### 2.2 JWT 인증 필터

**JwtAuthenticationFilter**:
```kotlin
class JwtAuthenticationFilter(
    private val jwtTokenProvider: JwtTokenProvider
) : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val token = extractToken(request)
        if (token != null && jwtTokenProvider.validateToken(token)) {
            val userId = jwtTokenProvider.getUserId(token)
            val authentication = UsernamePasswordAuthenticationToken(
                userId, null, emptyList()
            )
            SecurityContextHolder.getContext().authentication = authentication
        }
        filterChain.doFilter(request, response)
    }
}
```

**토큰 추출**:
```kotlin
private fun extractToken(request: HttpServletRequest): String? {
    val bearerToken = request.getHeader("Authorization")
    return if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
        bearerToken.substring(7)
    } else null
}
```

### 2.3 Spring Security 설정

**SecurityConfig.kt**:
```kotlin
@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val jwtAuthenticationFilter: JwtAuthenticationFilter,
) {
    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }  // JWT는 STATELESS이므로 CSRF 비활성화
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    // 공개 엔드포인트만 명시적으로 허용
                    .requestMatchers("/api/auth/login").permitAll()
                    .requestMatchers("/api/auth/signup").permitAll()
                    // Swagger는 개발 환경에서만 허용
                    .requestMatchers("/swagger-ui/**").permitAll()
                    .requestMatchers("/v3/api-docs/**").permitAll()
                    // 나머지 API는 인증 필요
                    .requestMatchers("/api/**").authenticated()
                    .anyRequest().permitAll()
            }
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)
        return http.build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()
}
```

---

## 3. 데이터 보호

### 3.1 비밀번호 암호화

**BCryptPasswordEncoder 사용**:
```kotlin
@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
) {
    fun signup(request: SignupRequest): UserResponse {
        if (userRepository.existsByEmail(request.email)) {
            throw ConflictException("이미 존재하는 이메일입니다")
        }

        val encodedPassword = passwordEncoder.encode(request.password)

        val user = userRepository.save(
            User(
                email = request.email,
                name = request.name,
                password = encodedPassword,
                role = request.role,
            )
        )

        return UserResponse.from(user)
    }
}
```

**BCrypt 특징**:
- 자동 솔트(Salt) 생성
- 2^10 라운드 기본 (강도 조절 가능)
- 단방향 해시 (복호화 불가)

### 3.2 PII (개인정보) 처리

**PII 데이터 종류**:
- 이메일 (email)
- 이름 (name)
- 비밀번호 (password) - 해시 저장

**저장소**:
- **MySQL**: 영구 저장
- **Redis** (선택적): 세션/캐시 저장

**데이터 최소화**:
- 민감한 정보는 로그에 남기지 않음
- 에러 응답에 상세 정보 노출 안 함

### 3.3 SQL Injection 방지

**JPA 사용** (자동 방지):
```kotlin
// 안전함 - JPA가 파라미터 바인딩 처리
val user = userRepository.findByEmail(email)

// 안전함 - @Query도 파라미터 바인딩
@Query("SELECT u FROM User u WHERE u.email = :email")
fun findByEmail(@Param("email") email: String): User?
```

**Native Query 사용 시 주의**:
```kotlin
// 위험 - 사용하지 않기
@Query(value = "SELECT * FROM users WHERE email = '" + email + "'", nativeQuery = true)

// 안전함 - 파라미터 바인딩 사용
@Query(value = "SELECT * FROM users WHERE email = :email", nativeQuery = true)
fun findByEmailNative(@Param("email") email: String): User?
```

---

## 4. 취약점 분석

### 4.1 JWT 시크릿 키 하드코딩

**위험도**: 낮음 ✅ (수정 완료)

**이전 문제점**:
```kotlin
// 이전 - 기본값 노출 위험
@Value("\${jwt.secret:myDefaultSecretKeyForDevelopmentAtLeast256BitsLong!!}")
```

**수정 후**:
```kotlin
// 수정 후 - 환경변수 필수
@Value("\${jwt.secret}")  // 환경변수 없으면 시작 실패
private val secret: String
```

**보안 강화**:
- 환경변수 미설정 시 애플리케이션 시작 실패
- 최소 256비트 (32바이트) 키 강제

### 4.2 CSRF (Cross-Site Request Forgery)

**위험도**: 낮음 ✅

**이유**:
- JWT 토큰 사용 (STATELESS 세션)
- 쿠키 기반 세션 사용 안 함
- SameSite 쿠키 설정 불필요

### 4.3 Authorization Bypass

**위험도**: 낮음 ✅ (수정 완료)

**이전 문제점**:
```kotlin
// 이전 - 모든 API 개방
.requestMatchers("/api/**").permitAll()
```

**수정 후**:
```kotlin
// 수정 후 - 명시적 경로만 허용
.requestMatchers("/api/auth/login").permitAll()
.requestMatchers("/api/auth/signup").permitAll()
.requestMatchers("/api/**").authenticated()  // 나머지는 인증 필요
```

### 4.4 동시성 경쟁 조건 (Race Condition)

**위험도**: 낮음 ✅

**이유**:
- 비관적 락 (Pessimistic Lock) 사용
- `@Lock(LockModeType.PESSIMISTIC_WRITE)`로 정원 초과 방지

```kotlin
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT c FROM Course c WHERE c.id = :id")
fun findWithLockById(@Param("id") id: Long): Optional<Course>
```

---

## 5. 보안 모벨 사케스트

### 5.1 입력값 검증

**Jakarta Validation 사용**:
```kotlin
data class CreateEnrollmentRequest(
    @field:NotNull(message = "강의 ID는 필수입니다")
    val courseId: Long?,
)

@PostMapping
fun enroll(
    @RequestBody @Valid request: CreateEnrollmentRequest,
): ResponseEntity<EnrollmentResponse> {
    // ...
}
```

**Zod 스키마** (프론트엔드와 연동):
```kotlin
// 프론트엔드 Zod 스키마와 동일한 검증 규칙
data class SignupRequest(
    @field:Email(message = "이메일 형식이 아닙니다")
    @field:Size(min = 2, max = 20, message = "이름은 2~20자여야 합니다")
    val name: String,
)
```

### 5.2 에러 메시지 처리

**사용자 친화적 메시지**:
```kotlin
if (currentCount >= course.maxCapacity) {
    throw BadRequestException("정원이 초과되었습니다")
}

if (enrollmentRepository.existsByCourseIdAndUserId(courseId, userId)) {
    throw ConflictException("이미 신청한 강의입니다")
}
```

**중요 정보 노출 방지**:
- 스택 트레이스 숨김
- 사용자에게는 일반적인 메시지만 제공
- 개발자는 로그에서 상세 에러 확인

### 5.3 로깅 보안

**보안 가이드**:
```kotlin
// ❌ 로깅하지 않음 (보안 위반)
log.error("Login failed for user: $password")

// ✅ 로깅함
log.error("Login failed for user: ${user.email}")

// ❌ 로깅하지 않음 (PII 노출)
log.info("User created: ${user.password}")

// ✅ 로깅함
log.info("User created: ${user.email}")
```

---

## 6. API 보안

### 6.1 CORS 설정

**WebConfig.kt**:
```kotlin
@Configuration
class WebConfig : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:3000")  // 프론트엔드 도메인
            .allowedMethods("GET", "POST", "PATCH", "DELETE")
            .allowCredentials(true)
    }
}
```

### 6.2 HTTPS 권장

**프로덕션**:
- HTTPS 사용 강제 권장
- mixed content 방지
- TLS 1.2+ 사용

### 6.3 Rate Limiting (선택적 구현)

**Spring Security + Bucket4j** (추가 구현 필요):
```kotlin
// Bucket4j 의존성 추가 후
@Configuration
class RateLimitConfig {
    @Bean
    fun rateLimitFilter(): Filter {
        // 1분에 100회 요청 제한
        return Bucket4jFilter()
    }
}
```

---

## 7. 취약점 및 완화 방안

### 7.1 대기열(Waitlist) 기능

**미구현**: 정원 초과 시 대기열 없음

**완화 방안**:
```kotlin
// 시나리오
if (currentCount >= course.maxCapacity) {
    // 대기열에 추가
    waitlistRepository.save(
        Waitlist(userId = userId, courseId = courseId)
    )
}
```

### 7.2 보안 헤더

**미구현**: Security Headers 미설정

**완화 방안**:
```kotlin
@Configuration
class SecurityHeadersConfig : WebMvcConfigurer {
    override fun addViewControllers(registry: ViewControllerRegistry) {
        registry.addRedirectViewController("/", "/swagger-ui.html")
    }

    @Bean
    fun securityHeadersFilter(): Filter {
        val headers = SecurityHeadersDefaults.headers()
            .addXContentTypeOptionsHeader()
            .addXFrameOptionsHeader()
            .addContentSecurityPolicyHeader("default-src 'self'")
            .addStrictTransportSecurityHeader()
        return headers.toFilter()
    }
}
```

### 7.3 로그인 시도 제한

**미구현**: 무차별 대입(Brute Force) 방지 미구현

**완화 방안**:
```kotlin
// Spring Security + Redis
@Configuration
class LoginAttemptConfig {
    @Bean
    fun loginAttemptService(): LoginAttemptService {
        return LoginAttemptService(maxAttempts = 5, durationMinutes = 15)
    }
}

// 로그인 시도 체크
if (loginAttemptService.isBlocked(email)) {
    throw ForbiddenException("로그인 시도 횟수 초과. 15분 후 다시 시도해주세요.")
}
```

---

## 8. 보안 테스트

### 8.1 인증 우회 테스트

**테스트 코드**:
```kotlin
@Test
fun `인증 없이 API 접근 시 401 반환`() {
    // Given
    val request = CreateEnrollmentRequest(1)

    // When
    val response = restTemplate.postForEntity("/api/enrollments", request, ErrorResponse::class.java)

    // Then
    assertThat(response.statusCode).isEqualTo(HttpStatus.UNAUTHORIZED)
}
```

### 8.2 권한 테스트

**테스트 코드**:
```kotlin
@Test
fun `타인의 강의 조회 시 403 반환`() {
    // Given
    val instructorId = 1L
    val otherInstructorId = 2L
    val course = courseRepository.save(Course(instructorId = instructorId))

    // When
    val response = restTemplate.exchange(
        "/api/courses/${course.id}/enrollments",
        HttpMethod.GET,
        HttpEntity(null, headersForUser(otherInstructorId)),
        ErrorResponse::class.java
    )

    // Then
    assertThat(response.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
}
```

### 8.3 정원 초과 동시성 테스트

**테스트 코드**:
```kotlin
@Test
fun `30명 정원에 31명이 동시 신청 시 1명은 실패`() {
    // Given
    val course = courseRepository.save(Course(maxCapacity = 30, status = CourseStatus.OPEN))

    // When - 31개의 스레드가 동시 신청
    val executor = Executors.newFixedThreadPool(31)
    val futures = (1..31).map { i ->
        executor.submit<EnrollmentResponse> {
            enrollmentService.enroll(i.toLong(), CreateEnrollmentRequest(course.id!!))
        }
    }
    executor.shutdown()

    // Then - 30명은 성공, 1명은 실패
    val successes = futures.mapNotNull { it.get() }.count()
    val failures = futures.count { it.getException() is BadRequestException }

    assertThat(successes).isEqualTo(30)
    assertThat(failures).isEqualTo(1)
}
```

---

## 9. 모니터링 및 로깅

### 9.1 보안 이벤트 로깅

**로그 수준**:
- `WARN`: 인증 실패, 권한 없음
- `ERROR`: 정원 초과, 중복 신청
- `INFO`: 사용자 생성, 강의 생성

**예시**:
```kotlin
@PostMapping
fun enroll(authentication: Authentication?, request: CreateEnrollmentRequest): ResponseEntity<*> {
    val userId = extractUserId(authentication)
    log.info("User $userId attempting to enroll in course ${request.courseId}")

    try {
        val result = enrollmentService.enroll(userId, request)
        log.info("User $userId successfully enrolled in course ${request.courseId}")
        return ResponseEntity.status(HttpStatus.CREATED).body(result)
    } catch (e: BadRequestException) {
        log.warn("Enrollment failed for user $userId: ${e.message}")
        throw e
    }
}
```

### 9.2 취약점 스캔

**OWASP Dependency Check** (추천):
```bash
# Gradle 플러그인 추가 후
./gradlew dependencyCheckAnalyze --no-daemon
```

**SBOM (Software Bill of Materials)**:
```bash
# CycloneDX 사용
./gradlew cyclonedxBom --no-daemon
```

---

## 10. 배포 시 보안 체크리스트

### 10.1 환경 변수 확인

- [ ] `JWT_SECRET` 설정 (최소 256비트)
- [ ] `DB_PASSWORD` 설정 (프로덕션 비밀번호)
- [ ] `.env` 파일이 .gitignore에 포함되어 있는지 확인

### 10.2 의존성 취약점 점검

```bash
# 취약점 스캔
./gradlew dependencyCheckAnalyze --no-daemon
```

### 10.3 빌드 최적화

- [ ] 프로덕션 빌드 (배포용)
- [ ] source maps 제거
- [ ] 불필요한 의존성 제거

### 10.4 데이터베이스 보안

- [ ] 루트 계정 미사용
- [ ] 최소 권한 원칙 적용
- [ ] SSL/TLS 연결 (프로덕션)

---

## 11. 보안 정책

### 11.1 데이터 수집

**수집 데이터**:
- 이메일, 이름, 비밀번호 (해시)
- 수강 신청 이력

**수집 목적**:
- 서비스 제공
- 사용자 식별
- 불량 이용 방지

### 11.2 데이터 보존 정책

- **보관 기간**: 수강 신청 완료 후 3년
- **삭제**: 계정 삭제 시 즉시 파기
- **이관**: 전자상거래 기록 (이메일, 로그인)

### 11.3 제3자 공유

**공유 대상**: 없음

**데이터 판매/공유**: 없음

---

## 12. 보안 인시던트 대응

### 12.1 보안 취약점 발견 시

**보고 절차**:
1. 보고: `security@example.com`
2. 내용: 취약점 설명
3. 재현 단계
4. 영향 평가

### 12.2 보안 업데이트

**주기적 업데이트**:
- 종속성 패치 최신화 (주차: 매주)
- 의존성 업데이트 (월 1회)

**긴급 업데이트**:
- 심각한 취약점 (24시간 내)

---

## 13. 참고 자료

- [Spring Security Reference](https://docs.spring.io/spring-security/reference/index.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Kotlin Security Guide](https://kotlinlang.org/docs/security.html)

---

**문서 버전**: 1.0
**최종 수정**: 2026-04-26
