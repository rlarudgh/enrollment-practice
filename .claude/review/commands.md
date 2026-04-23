# Review Commands Reference

> 코드 리뷰 관련 명령어 모음입니다.

## 🚀 주요 명령어

### 1. 파일 리뷰
```bash
# 특정 파일 리뷰
/review src/main/kotlin/com/example/UserService.kt

# 변경된 모든 파일 리뷰
/review-all

# PR 전체 리뷰
/review-pr
```

### 2. 보안 검사
```bash
# 보안 중심 리뷰
/check-security src/main/kotlin/com/example/AuthController.kt

# 전체 보안 검사
/check-security-all
```

### 3. 품질 검사
```bash
# 코드 품질 검사
/check-quality src/components/UserCard.tsx

# 전체 품질 검사
/check-quality-all
```

## 📝 리뷰 템플릿

### 코멘트 접두사
| 접두사 | 의미 | 사용 예시 |
|--------|------|-----------|
| 🔴 **[Blocker]** | 반드시 수정 | 보안 취약점, 기능상 버그 |
| 🟠 **[Critical]** | 꼭 수정 권장 | 성능 이슈, 잠재적 버그 |
| 🟡 **[Minor]** | 수정 권장 | 가독성, 스타일 |
| 🟢 **[Nitpick]** | 참고만 | 개인적 선호도 |
| 💬 **[Question]** | 질문 | 의도 파악 |
| 💡 **[Suggestion]** | 제안 | 개선 방안 |
| 👍 **[Praise]** | 칭찬 | 잘한 부분 |

### 코멘트 작성 예시

```
🔴 [Blocker] 비밀번호가 평문으로 저장되고 있습니다.

**문제:**
userRepository.save(new User(password));  // 평문 저장

**권장:**
String encoded = passwordEncoder.encode(password);
userRepository.save(new User(encoded));

**이유:**
보안 규정상 비밀번호는 반드시 해싱되어 저장되어야 합니다.
```

```
🟠 [Critical] N+1 쿼리 문제가 있습니다.

**문제:**
lectures.forEach { println(it.enrollments.size) }
// Lecture 100개 조회 시, enrollments 쿼리 100번 추가 실행

**권장:**
@Query("SELECT l FROM Lecture l LEFT JOIN FETCH l.enrollments")
fun findAllWithEnrollments(): List<Lecture>

**효과:**
쿼리 횟수: 101번 → 1번
```

```
🟡 [Minor] 가독성을 위해 메서드 추출을 고려해 보세요.

**현재:**
if (user.status == ACTIVE && user.age >= 18 && user.isVerified) {
    // ...
}

**제안:**
if (isEligibleUser(user)) {
    // ...
}

private fun isEligibleUser(user: User) = 
    user.status == ACTIVE && user.age >= 18 && user.isVerified

**이유:**
조건의 의도가 메서드명으로 드러나 가독성이 향상됩니다.
```

```
👍 [Praise] 에러 처리가 매우 깔끔하네요!

특히 사용자 친화적인 에러 메시지와 로깅을 분리한 점이 인상적입니다. 👏
```

## 🔍 리뷰 체크리스트

### Kotlin 파일
```bash
# Kotlin 체크리스트 참조
cat .claude/review/kotlin-review-checklist.md
```

**핵심 항목:**
- [ ] Null safety (`!!` 사용 금지)
- [ ] `val` 우선 사용
- [ ] Data class 활용
- [ ] Extension function 적절히 사용
- [ ] JPA N+1 문제 없음
- [ ] Constructor injection 사용

### TypeScript 파일
```bash
# TypeScript 체크리스트 참조
cat .claude/review/typescript-review-checklist.md
```

**핵심 항목:**
- [ ] `any` 타입 사용 금지
- [ ] `strict: true` 준수
- [ ] Interface vs Type 구분
- [ ] Function 매개변수 3개 이하
- [ ] Async/await 사용
- [ ] Optional chaining 적절히 사용

## 🎯 리뷰 워크플로우

### 1. 리뷰 준비
```bash
# 변경사항 확인
git diff --name-only

# 변경 내용 미리보기
git diff
```

### 2. 파일별 리뷰
1. **요구사항 확인**: PR 설명과 연관된 요구사항 확인
2. **구조 검토**: 아키텍처, 디자인 패턴 적절성
3. **코드 품질**: 가독성, 복잡도, 중복
4. **테스트**: 테스트 존재 여부, 커버리지
5. **보안**: 입력 검증, 인증/인가, 정보 노출
6. **성능**: 쿼리 최적화, 불필요한 연산

### 3. 리뷰 완료
```bash
# 리뷰 상태 변경
/review-complete --status approved    # 승인
/review-complete --status changes    # 변경 요청
/review-complete --status comment    # 코멘트만
```

## 📊 리뷰 지표

### 코드 메트릭스 확인
```bash
# 복잡도 확인
/check-complexity

# 중복 코드 확인
/check-duplication

# 테스트 커버리지 확인
/check-coverage
```

### 리뷰 통계
```bash
# 리뷰 통계 보기
/review-stats

# 결과 예시:
# - Files reviewed: 15
# - Comments: 23
#   - Blocker: 1
#   - Critical: 3
#   - Minor: 12
#   - Nitpick: 7
# - Approved: 12
# - Changes requested: 3
```

## 💡 리뷰 팁

### 작성자를 위한 팁
1. **작은 PR**: 300-500줄 이내로 유지
2. **설명 작성**: "왜"와 "무엇을" 명확히
3. **셀프 리뷰**: 먼저 스스로 확인
4. **컨텍스트 제공**: 관련 이슈/문서 링크

### 리뷰어를 위한 팁
1. **시간 제한**: 너무 오래 고민하지 말기
2. **컨텍스트 이해**: PR 목적 먼저 파악
3. **긍정적 피드백**: 잘한 부분 칭찬
4. **해결책 제시**: 문제 제기 시 대안도 함께

## 📚 참고 문서

- [Code Review Guide](code-review-guide.md)
- [Kotlin Review Checklist](kotlin-review-checklist.md)
- [TypeScript Review Checklist](typescript-review-checklist.md)

---

**Remember**: 코드 리뷰는 함께 성장하는 과정입니다! 🤝
