# Backend Development Guide

## 1. 개발 환경 설정

### 1.1 필수 조건

**필수 프로그램**:
- [JDK 17](https://adoptium.net/) (Java 17)
- [Gradle 8.x](https://gradle.org/install/) (또는 Gradle Wrapper 사용)
- [MySQL 8.0+](https://dev.mysql.com/downloads/mysql/)

**권장사항 없음** - 사용자 계정에서 바로 설치 가능

### 1.2 설치 방법

#### JDK 17 설치

**macOS (Homebrew)**:
```bash
brew install openjdk@17
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install openjdk-17-jdk
```

**Windows**:
- [Adoptium](https://adoptium.net/)에서 다운로드

#### MySQL 설치

**macOS (Homebrew)**:
```bash
brew install mysql
brew services start mysql
```

**Docker (권장)**:
```bash
docker compose up -d mysql
```

#### 의존성 설치

```bash
cd backend
./gradlew build --no-daemon
```

---

## 2. 로컬 실행 방법

### 2.1 MySQL 데이터베이스 설정

**데이터베이스 생성**:
```sql
CREATE DATABASE assignment_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**사용자 생성 (선택)**:
```sql
CREATE USER 'assignment'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON assignment_db.* TO 'assignment'@'localhost';
FLUSH PRIVILEGES;
```

### 2.2 환경 변수 설정

**`.env` 파일 생성** (프로젝트 루트):
```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=assignment_db
DB_USERNAME=root
DB_PASSWORD=

# JWT
JWT_SECRET=your-secret-key-at-least-256-bits-long-for-hs256
JWT_EXPIRATION=86400000
```

**`application-dev.yml` 설정**:
```yaml
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:assignment_db}
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true

jwt:
  secret: ${JWT_SECRET}
  expiration: ${JWT_EXPIRATION:86400000}
```

### 2.3 개발 서버 실행

```bash
./gradlew bootRun
```

- **주소**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html

### 2.4 IDE에서 실행

**IntelliJ IDEA**:
1. `AssignmentApplication.kt` 파일 열기
2. `main()` 함수 옆 녹색 재생 버튼 클릭
3. `Run 'AssignmentApplication'` 클릭

---

## 3. 테스트 실행

### 3.1 전체 테스트 실행

```bash
./gradlew test --no-daemon
```

### 3.2 특정 테스트 실행

```bash
# 특정 테스트 클래스
./gradlew test --tests "EnrollmentServiceTest" --no-daemon

# 특정 테스트 메서드
./gradlew test --tests "EnrollmentServiceTest.정원_초과_시_신청_실패" --no-daemon
```

### 3.3 테스트 커버리지 확인

```bash
./gradlew test jacocoTestReport --no-daemon
open build/reports/jacoco/test/html/index.html
```

### 3.4 테스트 데이터베이스

**H2 데이터베이스** (테스트용):
```yaml
# application-test.yml (자동 로드)
spring:
  datasource:
    url: jdbc:h2:mem:testdb
    driver-class-name: org.h2.Driver
    username: sa
    password:
```

---

## 4. 코드 품질 검사

### 4.1 ktlint (Kotlin Lint)

**검사만**:
```bash
./gradlew ktlintCheck --no-daemon
```

**자동 수정**:
```bash
./gradlew ktlintFormat --no-daemon
```

### 4.2 Gradle Build

**빌드**:
```bash
./gradlew build --no-daemon
```

**Clean + Build**:
```bash
./gradlew clean build --no-daemon
```

### 4.3 CI/CD 통합

**GitHub Actions 예시**:
```yaml
name: CI

on:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Build with Gradle
        run: ./gradlew build --no-daemon
      - name: Run tests
        run: ./gradlew test --no-daemon
```

---

## 5. 빌드 및 배포

### 5.1 프로덕션 빌드

```bash
./gradlew clean build --no-daemon
```

**결과물**: `build/libs/assignment-0.0.1-SNAPSHOT.jar`

### 5.2 프로덕션 실행

```bash
java -jar build/libs/assignment-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=prod \
  --DB_HOST=prod-db-host \
  --JWT_SECRET=your-production-secret
```

### 5.3 Docker 배포

**Dockerfile**:
```dockerfile
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src
RUN ./gradlew build --no-daemon --no-daemon

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Docker Compose**:
```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: assignment_db
    ports:
      - "3306:3306"

  backend:
    build: .
    ports:
      - "8080:8080"
    environment:
      DB_HOST: mysql
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - mysql
```

---

## 6. 환경 변수

### 6.1 환경 변수 목록

| 변수 | 설명 | 기본값 | 필수 |
|------|------|--------|------|
| `DB_HOST` | 데이터베이스 호스트 | localhost | ❌ |
| `DB_PORT` | 데이터베이스 포트 | 3306 | ❌ |
| `DB_NAME` | 데이터베이스 이름 | assignment_db | ❌ |
| `DB_USERNAME` | 데이터베이스 사용자 | root | ❌ |
| `DB_PASSWORD` | 데이터베이스 비밀번호 | (empty) | ❌ |
| `JWT_SECRET` | JWT 시크릿 키 | (없음) | ✅ |
| `JWT_EXPIRATION` | JWT 만료 시간(ms) | 86400000 | ❌ |

### 6.2 `.env.example` 파일

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=assignment_db
DB_USERNAME=root
DB_PASSWORD=

# JWT (minimum 256 bits for HS256)
JWT_SECRET=change-this-to-a-secure-random-string-at-least-32-chars
JWT_EXPIRATION=86400000
```

### 6.3 JWT 시크릿 키 생성

**OpenSSL 사용**:
```bash
openssl rand -base64 32
```

**예시**:
```
JWT_SECRET=xK9mN2pL4qR6sT8uV1wY3zA5bC7dE9fG1hI2jK3lM4nO
```

---

## 7. 디버깅 방법

### 7.1 IntelliJ IDEA 디버깅

**디버그 모드 실행**:
1. `AssignmentApplication.kt` 열기
2. `main()` 함수 옆 디버그 아이콘 (벌레 모양) 클릭
3. `Debug 'AssignmentApplication'` 클릭

**중단점 설정**:
- 라인 번호 옆 클릭 → 빨간 점 표시
- 조건부 중단점: 우클릭 → `Condition` 입력

### 7.2 원격 디버깅

**Gradle 설정**:
```bash
./gradlew bootRun --args='-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005'
```

**IntelliJ IDEA 원격 디버그**:
1. `Run` → `Edit Configurations`
2. `+` → `Remote JVM Debug`
3. Host: `localhost`, Port: `5005`
4. `Debug` 버튼 클릭

### 7.3 로깅

**로그 레벨 설정** (`application-dev.yml`):
```yaml
logging:
  level:
    com.example.assignment: DEBUG
    org.springframework.security: DEBUG
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

**로그 출력 예시**:
```
2026-04-26 10:00:00 DEBUG EnrollmentService - 정원 확인: 28/30
2026-04-26 10:00:01 DEBUG  - insert into enrollments (user_id,course_id,status) values (?,?,?)
```

---

## 8. 문제 해결 가이드

### 8.1 포트 충돌

**문제**: `Port 8080 was already in use`

**해결**:
```bash
# 8080번 포트 사용 중인 프로세스 종료 (macOS/Linux)
lsof -ti:8080 | xargs kill -9

# 또는 다른 포트 사용
./gradlew bootRun --args='--server.port=8081'
```

### 8.2 데이터베이스 연결 실패

**문제**: `Communications link failure`

**해결**:
1. MySQL 실행 확인:
   ```bash
   brew services list | grep mysql
   ```

2. MySQL 시작:
   ```bash
   brew services start mysql
   # 또는
   mysql.server start
   ```

3. 데이터베이스 생성 확인:
   ```bash
   mysql -u root -p -e "SHOW DATABASES LIKE 'assignment_db';"
   ```

### 8.3 JWT 시크릿 키 에러

**문제**: `JWT secret key must be at least 256 bits`

**해결**:
```bash
# .env 파일에서 JWT_SECRET을 32자 이상으로 변경
JWT_SECRET=$(openssl rand -base64 32)
```

### 8.4 Gradle 빌드 실패

**문제**: `Could not resolve dependencies`

**해결**:
```bash
# Gradle 캐시 삭제 후 재시도
./gradlew clean --no-daemon
rm -rf ~/.gradle/caches/
./gradlew build --no-daemon
```

### 8.5 Kotlin 컴파일 에러

**문제**: `Cannot access 'java.lang.UnsupportedOperationException'`

**해결**:
```bash
# Java 17 사용 확인
java -version  # 17.x.x

# JAVA_HOME 설정
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

---

## 9. 개발 워크플로우

### 9.1 새로운 기능 개발 순서

1. **Entity 생성** (`domain/Xxx.kt`)
2. **Repository 생성** (`repository/XxxRepository.kt`)
3. **DTO 생성** (`dto/xxx/XxxRequest.kt`, `XxxResponse.kt`)
4. **Service 생성** (`service/XxxService.kt`)
5. **Controller 생성** (`controller/XxxController.kt`)
6. **테스트 작성** (`service/XxxServiceTest.kt`)

### 9.2 Git Flow

```
main (배포)
  ↑
  develop (개발 통합)
  ↑
  feature/* (기능 개발)
```

### 9.3 커밋 컨벤션

```
feat: 강의 상태 변경 API 추가
fix: 정원 초과 시 에러 메시지 수정
docs: Swagger API 문서 업데이트
refactor: 중복 코드 제거
test: 수강 신청 동시성 테스트 추가
```

---

## 10. 의존성 관리

### 10.1 의존성 추가

**build.gradle.kts**:
```kotlin
dependencies {
    // Spring Boot
    implementation("org.springframework.boot:spring-boot-starter-web")

    // JWT
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")

    // 추가할 의존성
    implementation("org.example:new-library:1.0.0")
}
```

### 10.2 의존성 업데이트

```bash
./gradlew dependencies --no-daemon  # 의존성 트리 확인
./gradlew dependencyUpdates --no-daemon  # 업데이트 가능한 의존성 확인
```

---

## 11. 성능 최적화

### 11.1 JPA N+1 문제 해결

**Entity Graph 사용**:
```kotlin
@EntityGraph(attributePaths = ["course", "user"])
fun findAllByUserId(userId: Long): List<Enrollment>
```

**@EntityGraph**:
```kotlin
@Entity
class Enrollment(
    @ManyToOne(fetch = FetchType.LAZY)
    var course: Course? = null
)
```

### 11.2 쿼리 최적화

**인덱스 추가**:
```sql
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
```

**쿼리 힌트**:
```kotlin
@QueryHints(QueryHint(name = "org.hibernate.readOnly", value = "true"))
fun findAllByUserId(userId: Long): List<Enrollment>
```

---

## 12. 모니터링

### 12.1 Actuator (선택적 추가)

**build.gradle.kts**:
```kotlin
implementation("org.springframework.boot:spring-boot-starter-actuator")
```

**application.yml**:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,info
```

**엔드포인트**:
- `http://localhost:8080/actuator/health`
- `http://localhost:8080/actuator/metrics`

### 12.2 로그 수집

**로그 파일 설정**:
```yaml
logging:
  file:
    name: logs/application.log
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
```

---

## 13. CI/CD 파이프라인

### 13.1 GitHub Actions 예시

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Grant execute permission for gradlew
        run: chmod +x gradlew

      - name: Build with Gradle
        run: ./gradlew build --no-daemon

      - name: Run tests
        run: ./gradlew test --no-daemon

      - name: ktlint check
        run: ./gradlew ktlintCheck --no-daemon
```

---

## 14. 유용한 Snippets

### 14.1 새로운 Service 만들기

```kotlin
@Service
@Transactional(readOnly = true)
class XxxService(
    private val xxxRepository: XxxRepository,
) {
    fun getXxx(id: Long): XxxResponse {
        val xxx = xxxRepository.findById(id)
            .orElseThrow { NotFoundException("찾을 수 없습니다") }
        return XxxResponse.from(xxx)
    }

    @Transactional
    fun createXxx(request: CreateXxxRequest): XxxResponse {
        val xxx = xxxRepository.save(Xxx(...))
        return XxxResponse.from(xxx)
    }
}
```

### 14.2 새로운 Controller 만들기

```kotlin
@RestController
@RequestMapping("/api/xxx")
@Tag(name = "Xxx", description = "XXX API")
class XxxController(
    private val xxxService: XxxService,
) {
    @GetMapping
    @Operation(summary = "XXX 목록 조회")
    fun getXxxList(): ResponseEntity<List<XxxResponse>> {
        return ResponseEntity.ok(xxxService.getXxxList())
    }

    @PostMapping
    @Operation(summary = "XXX 생성")
    fun createXxx(@RequestBody @Valid request: CreateXxxRequest): ResponseEntity<XxxResponse> {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(xxxService.createXxx(request))
    }
}
```

---

**문서 버전**: 1.0
**최종 수정**: 2026-04-26
