# Backend Infrastructure

## 1. 인프라 개요

### 1.1 개발 환경 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        Developer's Machine                  │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   Frontend   │      │   Backend    │                    │
│  │  (Next.js)   │      │ (Spring Boot)│                    │
│  │  :3000       │      │   :8080      │                    │
│  └──────┬───────┘      └──────┬───────┘                    │
│         │                     │                             │
│         │ HTTP                │ JDBC                        │
│         │ (API)               │                             │
│         ▼                     ▼                             │
│  ┌──────────────────────────────────────────────┐          │
│  │         Docker Compose (MySQL)               │          │
│  │              :3306                           │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 프로덕션 환경 아키텍처 (제안)

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                            │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Load Balancer (Nginx/ALB)               │   │
│  │              :443 (HTTPS), :80 (HTTP)                │   │
│  └──────────────┬──────────────────────────────────────┘   │
│                 │                                           │
│        ┌────────┴────────┐                                │
│        ▼                 ▼                                │
│  ┌──────────┐      ┌──────────┐                          │
│  │ Frontend │      │ Backend  │                          │
│  │  (Nginx) │      │ (Spring  │                          │
│  │  :3000   │      │   Boot)  │                          │
│  └──────────┘      │   :8080   │                          │
│                   └─────┬─────┘                          │
│                         │                                 │
│                         ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Database (MySQL 8.0 - RDS)                 │   │
│  │              :3306 (Internal Only)                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 컴포넌트 상세

### 2.1 프론트엔드 서버

**기술 스택**:
- Next.js 16 (App Router)
- Node.js 18+ / Bun 1.x
- Nginx (프로덕션)

**역할**:
- SSR (Server-Side Rendering)
- 정적 파일 제공 (CSS, JS, Images)
- API Reverse Proxy (`/api/*` → Backend)

**예시 Nginx 설정**:
```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2.2 백엔드 서버

**기술 스택**:
- Spring Boot 3.4.5
- Kotlin 2.0.21
- OpenJDK 17

**역할**:
- REST API 제공
- 비즈니스 로직 처리
- JWT 인증/인가
- 데이터베이스 연결 풀링

**JVM 설정**:
```bash
# 프로덕션 실행 시 JVM 옵션
java -jar build/libs/assignment-0.0.1-SNAPSHOT.jar \
  -Xms512m \
  -Xmx1024m \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -Dspring.profiles.active=prod
```

### 2.3 데이터베이스

**기술 스택**:
- MySQL 8.0+
- InnoDB 스토리지 엔진

**역할**:
- 영구 데이터 저장
- 트랜잭션 관리 (ACID)
- 비관적 락 지원

**설정**:
```sql
-- 성능 최적화
SET GLOBAL innodb_buffer_pool_size = 2147483648;  -- 2GB
SET GLOBAL max_connections = 150;
SET GLOBAL query_cache_size = 0;  -- MySQL 8.0에서 제거됨
```

---

## 3. 네트워크 구성

### 3.1 포트 매핑

| 서비스 | 내부 포트 | 외부 노출 | 프로토콜 |
|--------|-----------|-----------|----------|
| Frontend | 3000 | 80, 443 | HTTP, HTTPS |
| Backend | 8080 | ❌ (내부만) | HTTP |
| MySQL | 3306 | ❌ (내부만) | MySQL |
| Swagger UI | 8080/swagger-ui | ❌ (개발만) | HTTP |

### 3.2 방화벽 규칙 (개발 환경)

```bash
# 로컬 개발 환경에서는 모든 포트 개방
# Docker Compose로 MySQL 실행 시
ports:
  - "3306:3306"  # MySQL (개발용)

# 프로덕션에서는 내부 트래픽만 허용
# 3306 포트 외부 노출 금지
```

### 3.3 CORS 설정

**WebConfig.kt**:
```kotlin
@Configuration
class WebConfig : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/api/**")
            .allowedOrigins(
                "http://localhost:3000",      // 개발 환경
                "https://example.com"          // 프로덕션 도메인
            )
            .allowedMethods("GET", "POST", "PATCH", "DELETE")
            .allowCredentials(true)
            .maxAge(3600)
    }
}
```

---

## 4. Docker Compose 구성

### 4.1 docker-compose.yml

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: assignment-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:-root}
      MYSQL_DATABASE: ${DB_NAME:-assignment_db}
      MYSQL_USER: ${DB_USERNAME:-assignment}
      MYSQL_PASSWORD: ${DB_PASSWORD:-password}
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql-data:
    driver: local
```

### 4.2 컨테이너 관리 명령어

```bash
# MySQL 실행
docker compose up -d mysql

# 로그 확인
docker compose logs -f mysql

# 컨테이너 진입
docker compose exec mysql bash

# MySQL 접속
docker compose exec mysql mysql -u root -p

# 컨테이너 정지
docker compose down

# 볼륨 삭제 (데이터 초기화)
docker compose down -v
```

---

## 5. 배포 전략

### 5.1 CI/CD 파이프라인

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Grant execute permission
        run: chmod +x gradlew

      - name: Build
        run: ./gradlew build --no-daemon

      - name: Test
        run: ./gradlew test --no-daemon

      - name: ktlint
        run: ./gradlew ktlintCheck --no-daemon

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            yourusername/assignment-backend:latest
            yourusername/assignment-backend:${{ github.sha }}
```

### 5.2 블루-그린 배포 (Blue-Green Deployment)

**개념**:
- 블루(현재 운영) + 그린(새 배포) 2개 환경 유지
- 그린 배포 후 health check 완료 시 트래픽 전환
- 문제 발생 시 즉시 롤백

**스크립트 예시**:
```bash
#!/bin/bash
# deploy.sh

BLUE="assignment-backend-blue"
GREEN="assignment-backend-green"

# 현재 운영 중인 컨테이너 확인
CURRENT=$(docker ps --filter "name=assignment-backend" --format "{{.Names}}")

if [[ $CURRENT == *blue* ]]; then
  TARGET=$GREEN
else
  TARGET=$BLUE
fi

echo "Deploying to $TARGET..."

# 새 컨테이너 실행
docker run -d --name $TARGET \
  -p 8081:8080 \
  --network assignment-network \
  yourusername/assignment-backend:latest

# Health check
sleep 30
curl -f http://localhost:8081/actuator/health || exit 1

# 트래픽 전환 (Nginx 재설정)
# ... Nginx 설정 수정 및 재로드 ...

# 이전 컨테이너 종료
docker stop $CURRENT
docker rm $CURRENT

echo "Deployed to $TARGET successfully!"
```

---

## 6. 모니터링 및 로깅

### 6.1 Health Check

**Actuator 엔드포인트** (추가 구현 필요):
```kotlin
// build.gradle.kts
implementation("org.springframework.boot:spring-boot-starter-actuator")
```

**application-prod.yml**:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
  health:
    db:
      enabled: true
```

**Health Check 엔드포인트**:
```bash
curl http://localhost:8080/actuator/health

# 응답
{
  "status": "UP",
  "components": {
    "db": { "status": "UP" },
    "diskSpace": { "status": "UP" }
  }
}
```

### 6.2 로그 수집

**Logback 설정** (`logback-spring.xml`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/application.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/application-%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="CONSOLE" />
        <appender-ref ref="FILE" />
    </root>
</configuration>
```

### 6.3 메트릭 수집 (Prometheus - 선택적)

**의존성 추가**:
```kotlin
implementation("io.micrometer:micrometer-registry-prometheus")
```

**엔드포인트**:
```bash
curl http://localhost:8080/actuator/prometheus
```

**Grafana Dashboard 예시**:
- JVM Memory
- HTTP Requests
- Database Connections
- Custom Business Metrics

---

## 7. 보안 및 인증

### 7.1 HTTPS 설정

**Let's Encrypt 사용 (무료 SSL)**:
```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d example.com

# 자동 갱신
sudo certbot renew --dry-run
```

### 7.2 환경 변수 관리

**프로덕션 환경** (Kubernetes Secrets 예시):
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
type: Opaque
data:
  db-password: cGFzc3dvcmQxMjM=  # base64 encoded
  jwt-secret: eW91ci1zZWNyZXQta2V5LW1pbi0yNTYtYml0cw==
```

**사용**:
```yaml
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: backend-secrets
        key: db-password
```

### 7.3 데이터베이스 보안

**사용자 권한 최소화**:
```sql
-- 애플리케이션 전용 사용자
CREATE USER 'assignment_app'@'%' IDENTIFIED BY 'strong_password';

-- 필요한 권한만 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON assignment_db.* TO 'assignment_app'@'%';
FLUSH PRIVILEGES;

-- 루트 계정 비활성화 (선택적)
DROP USER 'root'@'%';
```

---

## 8. 확장 가능성

### 8.1 수평 확장 (Horizontal Scaling)

**Backend 다중화**:
```
Load Balancer
      │
      ├─ Backend 1 (8080)
      ├─ Backend 2 (8081)
      └─ Backend 3 (8082)
```

**세션 관리**:
- JWT 사용으로 세션 불필요 (STATELESS)
- 스테이트리스 설계로 수평 확장 용이

### 8.2 데이터베이스 복제 (Replication)

**마스터-슬레이브 구성**:
```
┌──────────────┐
│   Master     │ ← 쓰기 (Write)
│   (MySQL)    │
└──────┬───────┘
       │
       ├─→ Slave 1 (Read)
       ├─→ Slave 2 (Read)
       └─→ Slave 3 (Read)
```

**읽기/쓰기 분리** (추가 구현 필요):
```kotlin
// application-prod.yml
spring:
  datasource:
    write:
      url: jdbc:mysql://master-db:3306/assignment_db
    read:
      url: jdbc:mysql://slave-db:3306/assignment_db
```

### 8.3 캐싱 전략 (Redis - 선택적)

**용도**:
- JWT 토큰 블랙리스트
- Rate Limiting
- 세션 저장 (선택적)
- 캐싱 (강의 목록 등)

**Docker Compose 추가**:
```yaml
redis:
  image: redis:7-alpine
  container_name: assignment-redis
  ports:
    - "6379:6379"
  volumes:
    - redis-data:/data
```

---

## 9. 재해 복구 (Disaster Recovery)

### 9.1 백업 전략

**MySQL 백업 스크립트**:
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mysql"
DB_NAME="assignment_db"

# 전체 백업
docker compose exec -T mysql mysqldump -u root -p${DB_PASSWORD} ${DB_NAME} > ${BACKUP_DIR}/backup_${DATE}.sql

# 7일 이전 백업 삭제
find ${BACKUP_DIR} -name "backup_*.sql" -mtime +7 -delete

# 압축
gzip ${BACKUP_DIR}/backup_${DATE}.sql
```

**Cron 설정**:
```bash
# 매일 새벽 2시에 백업
0 2 * * * /path/to/backup.sh
```

### 9.2 복구 절차

**백업에서 복구**:
```bash
# 압축 해제
gunzip backup_20260426_020000.sql.gz

# 복구
docker compose exec -T mysql mysql -u root -p${DB_PASSWORD} ${DB_NAME} < backup_20260426_020000.sql
```

---

## 10. 비용 최적화

### 10.1 리소스 추천

**AWS 예시 (소규모 서비스)**:
- **EC2**: t3.medium (2 vCPU, 4GB RAM) - Frontend + Backend
- **RDS**: db.t3.micro (1 vCPU, 1GB RAM) - MySQL
- **ALB**: Application Load Balancer

**월 예상 비용**: 약 $50~100

### 10.2 무료 / 저비용 대안

**개발 / 테스트 환경**:
- **Oracle Cloud Free Tier**: 2개 ARM AMP ( Always Free)
- **Google Cloud Free Tier**: e2-micro 인스턴트 (한 달 무료)
- **Railway / Render**: 무료 티어 제공

---

**문서 버전**: 1.0
**최종 수정**: 2026-04-26
