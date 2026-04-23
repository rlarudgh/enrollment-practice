# Code Review Guide

> 코드 리뷰는 단순히 버그를 찾는 것이 아니라, 함께 성장하는 과정입니다.

## 🎯 코드 리뷰 철학

### 리뷰의 목적
- ✅ **학습**: 서로의 코드를 통해 새로운 접근법 배우기
- ✅ **품질**: 버그를 조기에 발견하고 코드 품질 향상
- ✅ **공유**: 지식 공유와 팀 내 컨벤션 정렬
- ✅ **성장**: 건설적인 피드백을 통한 개발자 성장

### 리뷰 마인드셋
```
💡 리뷰어: "이 코드를 어떻게 더 개선할 수 있을까?"
💡 작성자: "어떤 관점을 놓치고 있었을까?"
```

---

## 📋 리뷰 체크리스트

### 1. 기능적 정확성 (Functional Correctness)
- [ ] 요구사항이 올바르게 구현되었는가?
- [ ] 모든 edge case가 처리되었는가?
- [ ] 비즈니스 로직이 정확한가?
- [ ] 테스트가 충분한가?

### 2. 코드 품질 (Code Quality)
- [ ] 코드가 읽기 쉬운가? (가독성)
- [ ] 함수/클스가 적절한 크기인가?
- [ ] 중복 코드가 없는가? (DRY)
- [ ] 변수/함수명이 명확한가?

### 3. 아키텍처 & 설계 (Architecture & Design)
- [ ] 적절한 디자인 패턴이 사용되었는가?
- [ ] 단일 책임 원칙(SRP)을 따르는가?
- [ ] 의존성이 적절히 관리되는가?
- [ ] 확장 가능한 구조인가?

### 4. 보안 (Security)
- [ ] 입력값이 검증되는가?
- [ ] 인증/인가가 적절히 처리되었는가?
- [ ] 민감 정보가 노출되지 않는가?
- [ ] 보안 취약점이 없는가?

### 5. 성능 (Performance)
- [ ] 불필요한 연산이 없는가?
- [ ] 데이터베이스 쿼리가 최적화되었는가?
- [ ] 메모리 누수가 없는가?
- [ ] 대용량 데이터 처리가 고려되었는가?

### 6. 테스트 (Testing)
- [ ] 단위 테스트가 있는가?
- [ ] 통합 테스트가 있는가?
- [ ] edge case가 테스트되었는가?
- [ ] 테스트가 독립적인가?

---

## 📝 리뷰 코멘트 작성 가이드

### ✅ 좋은 리뷰 코멘트

#### 1. 질문형 (Question)
```
💬 "여기서 이렇게 처리하는 이유가 궁금합니다. 
   다른 대안으로는 ~도 있을 것 같은데 어떻게 생각하시나요?"
```

#### 2. 제안형 (Suggestion)
```
💬 "가독성을 위해 이렇게 개선핼 수 있을 것 같습니다:
   
   Before:
   if (user != null && user.isActive && user.age >= 18) { ... }
   
   After:
   if (isEligibleUser(user)) { ... }
   
   private fun isEligibleUser(user: User?) = 
       user?.isActive == true && user.age >= 18"
```

#### 3. 칭찬형 (Praise)
```
💬 "이 부분의 에러 처리가 매우 깔끔하네요! 
   특히 ~한 상황을 고려한 점이 인상적입니다. 👍"
```

#### 4. 학습형 (Learning)
```
💬 "FYI: Kotlin에서는 ~라는 기능을 사용하면 
   더 간결하게 작성할 수 있습니다. 참고해 보세요!"
```

### ❌ 피해야 할 코멘트

```
❌ "이건 틀렸어요"
❌ "이해가 안 감"
❌ "왜 이렇게 했어요?" (비판적 톤)
❌ "이건 내 스타일이 아님"
```

---

## 🔍 언어별 리뷰 포인트

### Kotlin
- [ ] Null safety가 적절히 사용되었는가?
- [ ] `val` vs `var` 구분이 적절한가?
- [ ] Scope function(`let`, `apply`, `also`)이 적절히 사용되었는가?
- [ ] Data class가 적절히 활용되었는가?
- [ ] Extension function이 남용되지 않았는가?
- [ ] Coroutines가 적절히 사용되었는가?

```kotlin
// 리뷰 예시
// Before:
if (user != null) {
    if (user.name != null) {
        println(user.name.toUpperCase())
    }
}

// After:
user?.name?.let { println(it.uppercase()) }
```

### TypeScript
- [ ] `any` 타입이 없는가?
- [ ] 적절한 타입 추론/명시가 되었는가?
- [ ] `interface` vs `type` 구분이 적절한가?
- [ ] Generic이 적절히 사용되었는가?
- [ ] Null handling이 적절한가?

```typescript
// 리뷰 예시
// Before:
function processData(data: any): any {
    return data.value;
}

// After:
interface Data<T> {
    value: T;
}

function processData<T>(data: Data<T>): T {
    return data.value;
}
```

### SQL (JPA)
- [ ] N+1 문제가 없는가?
- [ ] 적절한 인덱스가 고려되었는가?
- [ ] 트랜잭션 범위가 적절한가?
- [ ] 페이징 처리가 되었는가?

```kotlin
// 리뷰 예시
// Before: N+1 문제
val lectures = lectureRepository.findAll()
lectures.forEach { println(it.enrollments.size) }

// After: Fetch Join
@Query("SELECT l FROM Lecture l LEFT JOIN FETCH l.enrollments")
fun findAllWithEnrollments(): List<Lecture>
```

---

## 🎭 리뷰 우선순위

### 🔴 Blocker (반드시 수정)
- 보안 취약점
- 기능상 버그
- 테스트 실패
- 메모리 누수

### 🟠 Critical (꼭 수정 권장)
- 성능 저하 우려
- 잠재적 버그
- 아키텍처 위반
- 오류 처리 누락

### 🟡 Minor (수정 권장)
- 코드 스타일
- 가독성 개선
- 사소한 리팩토링
- 주석/문서화

### 🟢 Nitpick (참고만)
- 개인적 선호도
- 미미한 스타일 차이
- Alternative 제안

---

## 💬 리뷰 대화 예시

### 시나리오 1: 보안 이슈 발견
```
🚨 [Blocker] 비밀번호가 평문으로 저장되고 있습니다.

   String password = request.getPassword();
   userRepository.save(new User(password));  // ❌

   다음과 같이 수정 부탁드립니다:
   
   String encodedPassword = passwordEncoder.encode(request.getPassword());
   userRepository.save(new User(encodedPassword));  // ✅
```

### 시나리오 2: 성능 개선 제안
```
🟠 [Critical] 이 쿼리는 N+1 문제가 발생할 수 있습니다.

   @GetMapping("/lectures")
   fun getLectures(): List<LectureResponse> {
       return lectureRepository.findAll()
           .map { it.toResponse() }  // N번의 추가 쿼리 발생
   }

   Fetch Join이나 @EntityGraph를 고려해 보세요:
   
   @Query("SELECT l FROM Lecture l LEFT JOIN FETCH l.creator")
   fun findAllWithCreator(): List<Lecture>
```

### 시나리오 3: 가독성 개선
```
🟡 [Minor] 이 부분을 메서드로 추출하면 가독성이 좋아질 것 같습니다.

   // Before
   if (enrollment.getStatus() == EnrollmentStatus.PENDING && 
       enrollment.getCreatedAt().plusDays(7).isAfter(LocalDateTime.now())) {
       // ...
   }

   // After
   if (isWithinCancellationPeriod(enrollment)) {
       // ...
   }

   private fun isWithinCancellationPeriod(enrollment: Enrollment): Boolean {
       return enrollment.status == PENDING && 
              enrollment.createdAt.plusDays(7).isAfter(LocalDateTime.now())
   }
```

### 시나리오 4: 칭찬과 학습
```
🟢 [Praise] 이 부분의 동시성 처리가 잘 되어 있네요! 

   Optimistic Locking을 적절히 활용하셨고, 재시도 로직도 깔끔합니다. 👍

   FYI: 만약 더 많은 동시 요청이 예상된다면, 
   비관적 락(Pessimistic Locking)도 고려해 보세요.
```

---

## ✅ 리뷰 완료 기준

### 작성자 체크리스트
- [ ] 모든 코멘트에 답변을 달았는가?
- [ ] 수정사항을 반영했는가?
- [ ] 필요한 경우 테스트를 추가했는가?
- [ ] 리뷰어의 질문에 설명을 달았는가?

### 리뷰어 체크리스트
- [ ] 모든 변경사항을 검토했는가?
- [ ] 중요한 이슈를 놓치지 않았는가?
- [ ] 건설적인 피드백을 제공했는가?
- [ ] 승인/변경 요청을 명확히 했는가?

---

## 🚦 리뷰 상태

| 상태 | 설명 | 다음 단계 |
|------|------|-----------|
| ✅ **Approved** | 승인, 머지 가능 | 작성자가 머지 |
| 🟡 **Comment** | 코멘트만 있음, 승인은 아님 | 작성자가 답변/수정 |
| 🔴 **Request Changes** | 변경 필요 | 작성자가 수정 후 재리뷰 요청 |

---

## 💡 리뷰 팁

### 작성자를 위한 팁
1. **작은 PR**: 한 번에 300-500줄 이내로 유지
2. **설명 추가**: PR 설명에 "왜"와 "무엇을" 명확히 작성
3. **Self-review**: 먼저 스스로 리뷰하고 올리기
4. **컨텍스트 제공**: 관련 문서나 이슈 링크 첨부

### 리뷰어를 위한 팁
1. **시간 제한**: 너무 오래 고민하지 말고 질문하기
2. **컨텍스트 이해**: PR의 목적과 배경을 먼저 이해
3. **긍정적 피드백**: 잘한 부분도 칭찬하기
4. **대안 제시**: 문제 제기 시 해결책도 함께 제안

---

**Remember**: 코드 리뷰는 코드를 개선하는 것이 아니라, 함께 성장하는 것입니다! 🤝