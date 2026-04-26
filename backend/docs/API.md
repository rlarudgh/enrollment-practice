# Backend API Documentation

## 1. API 개요

### 1.1 기본 정보

- **Base URL**: `http://localhost:8080`
- **API Prefix**: `/api`
- **인증 방식**: JWT Bearer Token
- **Content-Type**: `application/json`
- **문서**: Swagger UI (`http://localhost:8080/swagger-ui.html`)

### 1.2 공통 헤더

```http
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### 1.3 공통 응답 형식

**성공 응답**:
```json
{
  "data": { ... }
}
```

**에러 응답**:
```json
{
  "status": 400,
  "message": "정원이 초과되었습니다"
}
```

---

## 2. 인증 API (`/api/auth`)

### 2.1 회원가입

**엔드포인트**: `POST /api/auth/signup`

**설명**: 새로운 사용자 계정을 생성합니다.

**Request Body**:
```json
{
  "email": "classmate@example.com",
  "password": "Password123!",
  "name": "김수진",
  "role": "CLASSMATE"
}
```

**필드 설명**:
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| email | string | ✅ | 이메일 주소 (중복 불가) |
| password | string | ✅ | 비밀번호 (영문, 숫자, 특수문자 포함 8자 이상) |
| name | string | ✅ | 이름 (2~20자) |
| role | string | ✅ | `CREATOR` 또는 `CLASSMATE` |

**Response**:
```json
{
  "id": 1,
  "email": "classmate@example.com",
  "name": "김수진",
  "role": "CLASSMATE",
  "createdAt": "2026-04-26T10:00:00"
}
```

**Status Codes**:
- `201 Created`: 회원가입 성공
- `400 Bad Request`: 유효성 검증 실패
- `409 Conflict`: 이메일 중복

**예제**:
```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "classmate@example.com",
    "password": "Password123!",
    "name": "김수진",
    "role": "CLASSMATE"
  }'
```

---

### 2.2 로그인

**엔드포인트**: `POST /api/auth/login`

**설명**: 이메일과 비밀번호로 로그인하고 JWT 토큰을 발급받습니다.

**Request Body**:
```json
{
  "email": "classmate@example.com",
  "password": "Password123!"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@test.com",
    "name": "김경호",
    "role": "CLASSMATE"
  }
}
```

**Status Codes**:
- `200 OK`: 로그인 성공
- `401 Unauthorized`: 이메일 또는 비밀번호 불일치

**예제**:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "classmate@example.com",
    "password": "Password123!"
  }'
```

---

## 3. 강의 API (`/api/courses`)

### 3.1 강의 목록 조회

**엔드포인트**: `GET /api/courses`

**설명**: 모든 강의 목록을 조회합니다.

**Query Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| category | string | ❌ | 카테고리 필터 (`development`, `design`, `marketing`, `business`) |
| status | string | ❌ | 상태 필터 (`DRAFT`, `OPEN`, `CLOSED`) |

**Response**:
```json
{
  "courses": [
    {
      "id": 1,
      "title": "React 완벽 가이드",
      "description": "React 18부터 Next.js까지",
      "price": 150000,
      "maxCapacity": 30,
      "currentEnrollment": 25,
      "status": "OPEN",
      "startDate": "2026-05-01",
      "endDate": "2026-05-31",
      "instructor": "김지민",
      "category": "development"
    }
  ]
}
```

**Status Codes**:
- `200 OK`: 조회 성공

**예제**:
```bash
curl -X GET "http://localhost:8080/api/courses?category=development&status=OPEN" \
  -H "Authorization: Bearer {TOKEN}"
```

---

### 3.2 강의 상세 조회

**엔드포인트**: `GET /api/courses/{id}`

**설명**: 특정 강의의 상세 정보를 조회합니다.

**Path Parameters**:
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | long | 강의 ID |

**Response**:
```json
{
  "id": 1,
  "title": "React 완벽 가이드",
  "description": "React 18부터 Next.js까지",
  "price": 150000,
  "maxCapacity": 30,
  "currentEnrollment": 25,
  "status": "OPEN",
  "startDate": "2026-05-01",
  "endDate": "2026-05-31",
  "instructor": "김지민",
  "category": "development",
  "createdAt": "2026-04-01T10:00:00"
}
```

**Status Codes**:
- `200 OK`: 조회 성공
- `404 Not Found`: 강의를 찾을 수 없음

---

### 3.3 강의 생성

**엔드포인트**: `POST /api/courses`

**설명**: 새로운 강의를 개설합니다. (CREATOR 권한 필요)

**Request Body**:
```json
{
  "title": "TypeScript 마스터",
  "description": "타입 안전하게 개발하기",
  "price": 200000,
  "maxCapacity": 30,
  "startDate": "2026-06-01",
  "endDate": "2026-06-30",
  "category": "development"
}
```

**필드 설명**:
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | ✅ | 강의 제목 |
| description | string | ❌ | 강의 설명 (기본값: "") |
| price | int | ✅ | 가격 (원) |
| maxCapacity | int | ✅ | 최대 정원 |
| startDate | string | ✅ | 시작일 (ISO 8601) |
| endDate | string | ✅ | 종료일 (ISO 8601) |
| category | string | ❌ | 카테고리 (기본값: "development") |

**Response**:
```json
{
  "id": 2,
  "title": "TypeScript 마스터",
  "description": "타입 안전하게 개발하기",
  "price": 200000,
  "maxCapacity": 30,
  "currentEnrollment": 0,
  "status": "DRAFT",
  "startDate": "2026-06-01",
  "endDate": "2026-06-30",
  "instructor": "김지민",
  "category": "development",
  "createdAt": "2026-04-26T10:00:00"
}
```

**Status Codes**:
- `201 Created`: 생성 성공
- `400 Bad Request`: 유효성 검증 실패
- `401 Unauthorized**: 인증되지 않음
- `403 Forbidden**: CREATOR 권한 없음

---

### 3.4 강의 상태 변경

**엔드포인트**: `PATCH /api/courses/{id}/status`

**설명**: 강의 상태를 변경합니다 (DRAFT → OPEN → CLOSED). (본인의 강의만 가능)

**Request Body**:
```json
{
  "status": "OPEN"
}
```

**Response**:
```json
{
  "id": 2,
  "title": "TypeScript 마스터",
  "status": "OPEN"
}
```

**Status Codes**:
- `200 OK`: 상태 변경 성공
- `400 Bad Request`: 유효하지 않은 상태 전이
- `401 Unauthorized`: 인증되지 않음
- `403 Forbidden`: 본인의 강의가 아님
- `404 Not Found`: 강의를 찾을 수 없음

---

## 4. 수강 신청 API (`/api/enrollments`)

### 4.1 수강 신청

**엔드포인트**: `POST /api/enrollments`

**설명**: 강의를 신청합니다.

**Request Body**:
```json
{
  "courseId": 1
}
```

**Response**:
```json
{
  "id": 1,
  "courseId": 1,
  "courseTitle": "React 완벽 가이드",
  "status": "PENDING",
  "enrolledAt": "2026-04-26T10:00:00"
}
```

**Status Codes**:
- `201 Created`: 신청 성공
- `400 Bad Request`: 정원 초과 또는 모집 중이 아님
- `401 Unauthorized`: 인증되지 않음
- `404 Not Found`: 강의를 찾을 수 없음
- `409 Conflict`: 이미 신청한 강의

**예제**:
```bash
curl -X POST http://localhost:8080/api/enrollments \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"courseId": 1}'
```

---

### 4.2 내 수강 신청 목록 조회

**엔드포인트**: `GET /api/enrollments`

**설명**: 내 수강 신청 목록을 조회합니다.

**Response**:
```json
[
  {
    "id": 1,
    "courseId": 1,
    "courseTitle": "React 완벽 가이드",
    "status": "PENDING",
    "enrolledAt": "2026-04-26T10:00:00",
    "confirmedAt": null,
    "cancelledAt": null
  }
]
```

**Status Codes**:
- `200 OK`: 조회 성공
- `401 Unauthorized`: 인증되지 않음

---

### 4.3 수강 신청 확정 (결제)

**엔드포인트**: `PATCH /api/enrollments/{id}/confirm`

**설명**: 수강 신청을 확정합니다 (결제 완료).

**Path Parameters**:
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | long | 수강 신청 ID |

**Response**:
```json
{
  "id": 1,
  "courseId": 1,
  "courseTitle": "React 완벽 가이드",
  "status": "CONFIRMED",
  "enrolledAt": "2026-04-26T10:00:00",
  "confirmedAt": "2026-04-26T10:05:00"
}
```

**Status Codes**:
- `200 OK`: 확정 성공
- `400 Bad Request`: PENDING 상태가 아님
- `401 Unauthorized`: 인증되지 않음
- `403 Forbidden`: 본인의 신청이 아님
- `404 Not Found`: 신청을 찾을 수 없음

---

### 4.4 수강 취소

**엔드포인트**: `PATCH /api/enrollments/{id}/cancel`

**설명**: 확정된 수강 신청을 취소합니다 (결제 확정 후 7일 이내).

**Path Parameters**:
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | long | 수강 신청 ID |

**Response**:
```json
{
  "id": 1,
  "courseId": 1,
  "courseTitle": "React 완벽 가이드",
  "status": "CANCELLED",
  "enrolledAt": "2026-04-26T10:00:00",
  "confirmedAt": "2026-04-26T10:05:00",
  "cancelledAt": "2026-04-28T10:00:00"
}
```

**Status Codes**:
- `200 OK`: 취소 성공
- `400 Bad Request`: CONFIRMED 상태가 아니거나 7일 경과
- `401 Unauthorized`: 인증되지 않음
- `403 Forbidden`: 본인의 신청이 아님
- `404 Not Found`: 신청를 찾을 수 없음

---

### 4.5 강의별 수강 신청 목록

**엔드포인트**: `GET /api/courses/{courseId}/enrollments`

**설명**: 특정 강의의 수강 신청 목록을 조회합니다. (강사만 가능)

**Path Parameters**:
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| courseId | long | 강의 ID |

**Response**:
```json
[
  {
    "id": 1,
    "userId": 2,
    "userName": "이수진",
    "status": "CONFIRMED",
    "enrolledAt": "2026-04-26T10:00:00",
    "confirmedAt": "2026-04-26T10:05:00"
  }
]
```

**Status Codes**:
- `200 OK`: 조회 성공
- `401 Unauthorized`: 인증되지 않음
- `403 Forbidden`: 본인의 강의가 아님
- `404 Not Found`: 강의를 찾을 수 없음

---

## 5. 에러 코드

### 5.1 공통 에러 응답

```json
{
  "status": 400,
  "message": "정원이 초과되었습니다"
}
```

### 5.2 에러 코드 목록

| Status Code | 에러 타입 | 설명 |
|-------------|-----------|------|
| 400 | `BadRequestException` | 잘못된 요청 |
| 401 | `UnauthorizedException` | 인증되지 않음 |
| 403 | `ForbiddenException` | 권한 없음 |
| 404 | `NotFoundException` | 리소스를 찾을 수 없음 |
| 409 | `ConflictException` | 중복 리소스 |

### 5.3 에러 메시지 예시

| 상황 | Status | Message |
|------|--------|---------|
| 정원 초과 | 400 | "정원이 초과되었습니다" |
| 중복 신청 | 409 | "이미 신청한 강의입니다" |
| 강의 찾기 실패 | 404 | "강의를 찾을 수 없습니다" |
| 권한 없음 | 403 | "본인의 강의만 조회할 수 있습니다" |
| 로그인 필요 | 401 | "로그인이 필요합니다" |
| 상태 전이 불가 | 400 | "모집 중인 강의만 신청 가능합니다" |
| 취소 기간 경과 | 400 | "결제 확정 후 7일 이내에만 취소할 수 있습니다" |

---

## 6. 인증 흐름

### 6.1 로그인 → 토큰 발급

```
1. POST /api/auth/login
   Request: { "email": "...", "password": "..." }
   Response: { "token": "...", "user": {...} }

2. 이후 모든 요청에 헤더 포함
   Authorization: Bearer {TOKEN}
```

### 6.2 토큰 만료 처리

**만료 시간**: 24시간 (86,400,000ms)

**만료 시**:
- `401 Unauthorized` 응답
- 프론트엔드에서 로그인 페이지로 리다이렉트

---

## 7. 동시성 제어

### 7.1 정원 초과 방지

**문제**: 여러 사용자가 동시에 신청 시 정원 초과 가능성

**해결**: 비관적 락 (Pessimistic Lock)

```sql
SELECT * FROM courses WHERE id = 1 FOR UPDATE;
-- Lock 획득 후 정원 확인 및 신청 처리
```

**동작 시나리오**:
```
1. Thread A: Lock 획득 → 정원 확인(28/30) → 신청 성공 → Lock 해제
2. Thread B: Lock 대기 → Lock 획득 → 정원 확인(29/30) → 신청 성공 → Lock 해제
3. Thread C: Lock 대기 → Lock 획득 → 정원 확인(30/30) → 정원 초과 에러
```

---

## 8. Swagger UI

### 8.1 접근 방법

**URL**: `http://localhost:8080/swagger-ui.html`

### 8.2 사용 방법

1. **Authorize**: 우측 상단 `Authorize` 버튼 클릭 → JWT 토큰 입력
2. **API 테스트**: 각 엔드포인트의 `Try it out` 버튼 클릭
3. **Request 실행**: 필수 파라미터 입력 후 `Execute` 클릭

---

**문서 버전**: 1.0
**최종 수정**: 2026-04-26
