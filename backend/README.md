# Backend

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Spring Boot 3.4 |
| Language | Kotlin 2.1 |
| Database | MySQL 8.0 |
| ORM | JPA (Hibernate) |
| Build | Gradle (Kotlin DSL) |
| API Docs | Swagger (springdoc-openapi) |
| Architecture | Layered Architecture |

## Layered Architecture

```
com.example.assignment/
├── config/        # Spring 설정 (CORS, Security, Swagger)
├── controller/    # REST API Controller
├── service/       # 비즈니스 로직
├── repository/    # 데이터 접근 (JPA Repository)
├── domain/        # JPA Entity
├── dto/           # Request/Response DTO
└── exception/     # 예외 처리
```

## Getting Started

```bash
# MySQL 실행
docker compose up -d mysql

# 서버 실행
./gradlew bootRun
```

Open http://localhost:8080

Swagger UI: http://localhost:8080/swagger-ui.html
