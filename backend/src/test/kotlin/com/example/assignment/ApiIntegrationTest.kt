package com.example.assignment

import com.example.assignment.dto.auth.LoginRequest
import com.example.assignment.dto.course.CreateCourseRequest
import com.example.assignment.dto.enrollment.CreateEnrollmentRequest
import com.example.assignment.repository.CourseRepository
import com.example.assignment.repository.EnrollmentRepository
import com.example.assignment.repository.UserRepository
import com.example.assignment.service.AuthService
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.LocalDate

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiIntegrationTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var authService: AuthService

    @Autowired
    private lateinit var enrollmentRepository: EnrollmentRepository

    @Autowired
    private lateinit var courseRepository: CourseRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    private var creatorToken: String = ""
    private var classmateToken: String = ""

    @BeforeEach
    fun setup() {
        enrollmentRepository.deleteAll()
        courseRepository.deleteAll()
        userRepository.deleteAll()

        authService.signup("creator@test.com", "크리에이터", "password123", com.example.assignment.domain.UserRole.CREATOR)
        creatorToken = login("creator@test.com", "password123")

        authService.signup("student@test.com", "수강생", "password123", com.example.assignment.domain.UserRole.CLASSMATE)
        classmateToken = login("student@test.com", "password123")
    }

    @Nested
    @DisplayName("인증 API")
    inner class AuthTests {
        @Test
        @DisplayName("로그인 성공 시 토큰과 사용자 정보 반환")
        fun `login returns token and user`() {
            val body = toJson(LoginRequest("creator@test.com", "password123"))
            mockMvc.post("/api/auth/login", body)
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.user.email").value("creator@test.com"))
                .andExpect(jsonPath("$.user.role").value("CREATOR"))
        }

        @Test
        @DisplayName("잘못된 비밀번호로 로그인 실패")
        fun `login with wrong password`() {
            val body = toJson(LoginRequest("creator@test.com", "wrongpassword"))
            mockMvc.post("/api/auth/login", body)
                .andExpect(status().isUnauthorized)
        }

        @Test
        @DisplayName("토큰으로 내 정보 조회 성공")
        fun `get me with token`() {
            mockMvc.getWithAuth("/api/auth/me", creatorToken)
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.user.email").value("creator@test.com"))
        }

        @Test
        @DisplayName("토큰 없이 내 정보 조회 시 401")
        fun `get me without token`() {
            mockMvc.get("/api/auth/me")
                .andExpect(status().isUnauthorized)
        }
    }

    @Nested
    @DisplayName("강의 관리 API")
    inner class CourseTests {
        @Test
        @DisplayName("강의 등록 (DRAFT 상태)")
        fun `create course returns draft`() {
            val body =
                toJson(
                    CreateCourseRequest(
                        title = "테스트 강의",
                        price = 100000,
                        maxCapacity = 30,
                        startDate = LocalDate.now().plusDays(1),
                        endDate = LocalDate.now().plusMonths(1),
                    ),
                )
            mockMvc.postWithAuth("/api/courses", body, creatorToken)
                .andExpect(status().isCreated)
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.title").value("테스트 강의"))
        }

        @Test
        @DisplayName("강의 목록 조회")
        fun `get course list`() {
            createCourse(creatorToken, "강의1")
            createCourse(creatorToken, "강의2")

            mockMvc.get("/api/courses")
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.courses.length()").value(2))
                .andExpect(jsonPath("$.categories").exists())
        }

        @Test
        @DisplayName("카테고리 필터로 강의 목록 조회")
        fun `filter courses by category`() {
            createCourse(creatorToken, "개발강의", "development")
            createCourse(creatorToken, "디자인강의", "design")

            mockMvc.get("/api/courses?category=development")
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.courses.length()").value(1))
        }

        @Test
        @DisplayName("강의 상태 변경 DRAFT → OPEN → CLOSED")
        fun `course status transitions`() {
            val id = createCourse(creatorToken, "상태강의")

            // DRAFT → OPEN
            val openBody = toJson(mapOf("status" to "OPEN"))
            mockMvc.patchWithAuth("/api/courses/$id/status", openBody, creatorToken)
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.status").value("OPEN"))

            // OPEN → CLOSED
            val closeBody = toJson(mapOf("status" to "CLOSED"))
            mockMvc.patchWithAuth("/api/courses/$id/status", closeBody, creatorToken)
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.status").value("CLOSED"))
        }

        @Test
        @DisplayName("DRAFT → CLOSED 직접 변경 불가")
        fun `cannot skip status`() {
            val id = createCourse(creatorToken, "스킵강의")
            val body = toJson(mapOf("status" to "CLOSED"))

            mockMvc.patchWithAuth("/api/courses/$id/status", body, creatorToken)
                .andExpect(status().isBadRequest)
        }

        @Test
        @DisplayName("강의 상세 조회에 현재 신청 인원 포함")
        fun `course detail includes enrollment count`() {
            val id = createCourse(creatorToken, "상세강의")
            openCourse(id, creatorToken)

            mockMvc.get("/api/courses/$id")
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.currentEnrollment").value(0))
        }
    }

    @Nested
    @DisplayName("수강 신청 API")
    inner class EnrollmentTests {
        private lateinit var openCourseId: String

        @BeforeEach
        fun createOpenCourse() {
            openCourseId = createCourse(creatorToken, "수강신청강의")
            openCourse(openCourseId, creatorToken)
        }

        @Test
        @DisplayName("수강 신청 성공 (PENDING 상태)")
        fun `enroll returns pending`() {
            val body = toJson(CreateEnrollmentRequest(openCourseId.toLong()))

            mockMvc.postWithAuth("/api/enrollments", body, classmateToken)
                .andExpect(status().isCreated)
                .andExpect(jsonPath("$.status").value("pending"))
        }

        @Test
        @DisplayName("중복 수강 신청 거부")
        fun `duplicate enrollment rejected`() {
            val body = toJson(CreateEnrollmentRequest(openCourseId.toLong()))
            mockMvc.postWithAuth("/api/enrollments", body, classmateToken)

            mockMvc.postWithAuth("/api/enrollments", body, classmateToken)
                .andExpect(status().isConflict)
        }

        @Test
        @DisplayName("결제 확정 (PENDING → CONFIRMED)")
        fun `confirm enrollment`() {
            val enrollmentId = enroll(openCourseId, classmateToken)

            mockMvc.patchWithAuth("/api/enrollments/$enrollmentId/confirm", "", classmateToken)
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.status").value("confirmed"))
        }

        @Test
        @DisplayName("수강 취소 (CONFIRMED → CANCELLED)")
        fun `cancel enrollment`() {
            val enrollmentId = enroll(openCourseId, classmateToken)
            mockMvc.patchWithAuth("/api/enrollments/$enrollmentId/confirm", "", classmateToken)

            mockMvc.patchWithAuth("/api/enrollments/$enrollmentId/cancel", "", classmateToken)
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.status").value("cancelled"))
        }

        @Test
        @DisplayName("PENDING 상태에서 취소 불가")
        fun `cannot cancel pending enrollment`() {
            val enrollmentId = enroll(openCourseId, classmateToken)

            mockMvc.patchWithAuth("/api/enrollments/$enrollmentId/cancel", "", classmateToken)
                .andExpect(status().isBadRequest)
        }

        @Test
        @DisplayName("내 수강 신청 목록 조회")
        fun `get my enrollments`() {
            enroll(openCourseId, classmateToken)

            mockMvc.getWithAuth("/api/enrollments", classmateToken)
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.length()").value(1))
        }

        @Test
        @DisplayName("정원 초과 시 신청 거부")
        fun `capacity full rejects enrollment`() {
            val fullCourseId = createCourseWithCapacity(creatorToken, "소규모강의", 1)
            openCourse(fullCourseId, creatorToken)

            val mate1Token = signupAndLogin("mate1@test.com", "수강생1")
            val body = toJson(CreateEnrollmentRequest(fullCourseId.toLong()))

            mockMvc.postWithAuth("/api/enrollments", body, mate1Token)
                .andExpect(status().isCreated)

            val mate2Token = signupAndLogin("mate2@test.com", "수강생2")
            mockMvc.postWithAuth("/api/enrollments", body, mate2Token)
                .andExpect(status().isBadRequest)
        }

        @Test
        @DisplayName("취소 후 정원 복원")
        fun `capacity restored after cancel`() {
            val fullCourseId = createCourseWithCapacity(creatorToken, "복원강의", 1)
            openCourse(fullCourseId, creatorToken)

            val mate1Token = signupAndLogin("restore1@test.com", "수강생1")
            val mate2Token = signupAndLogin("restore2@test.com", "수강생2")

            // 첫 번째 신청 + 확정
            val enrollmentId = enroll(fullCourseId, mate1Token)
            mockMvc.patchWithAuth("/api/enrollments/$enrollmentId/confirm", "", mate1Token)

            // 취소
            mockMvc.patchWithAuth("/api/enrollments/$enrollmentId/cancel", "", mate1Token)
                .andExpect(status().isOk)

            // 두 번째 수강생 신청 가능
            val body = toJson(CreateEnrollmentRequest(fullCourseId.toLong()))
            mockMvc.postWithAuth("/api/enrollments", body, mate2Token)
                .andExpect(status().isCreated)
        }

        @Test
        @DisplayName("DRAFT 강의에 신청 불가")
        fun `cannot enroll in draft course`() {
            val draftCourseId = createCourse(creatorToken, "초안강의")
            val body = toJson(CreateEnrollmentRequest(draftCourseId.toLong()))

            mockMvc.postWithAuth("/api/enrollments", body, classmateToken)
                .andExpect(status().isBadRequest)
        }
    }

    // === Helpers ===

    private fun login(
        email: String,
        password: String
    ): String {
        val body = toJson(LoginRequest(email, password))
        val result = mockMvc.post("/api/auth/login", body).andReturn()
        return objectMapper.readTree(result.response.contentAsString)["token"].asText()
    }

    private fun signupAndLogin(
        email: String,
        name: String
    ): String {
        authService.signup(email, name, "password123", com.example.assignment.domain.UserRole.CLASSMATE)
        return login(email, "password123")
    }

    private fun createCourse(
        token: String,
        title: String,
        category: String = "development",
    ): String {
        val body =
            toJson(
                CreateCourseRequest(
                    title = title,
                    price = 100000,
                    maxCapacity = 30,
                    startDate = LocalDate.now().plusDays(1),
                    endDate = LocalDate.now().plusMonths(1),
                    category = category,
                ),
            )
        val result = mockMvc.postWithAuth("/api/courses", body, token).andReturn()
        return objectMapper.readTree(result.response.contentAsString)["id"].asText()
    }

    private fun createCourseWithCapacity(
        token: String,
        title: String,
        capacity: Int,
    ): String {
        val body =
            toJson(
                CreateCourseRequest(
                    title = title,
                    price = 100000,
                    maxCapacity = capacity,
                    startDate = LocalDate.now().plusDays(1),
                    endDate = LocalDate.now().plusMonths(1),
                ),
            )
        val result = mockMvc.postWithAuth("/api/courses", body, token).andReturn()
        return objectMapper.readTree(result.response.contentAsString)["id"].asText()
    }

    private fun openCourse(
        courseId: String,
        token: String
    ) {
        val body = toJson(mapOf("status" to "OPEN"))
        mockMvc.patchWithAuth("/api/courses/$courseId/status", body, token)
    }

    private fun enroll(
        courseId: String,
        token: String
    ): String {
        val body = toJson(CreateEnrollmentRequest(courseId.toLong()))
        val result = mockMvc.postWithAuth("/api/enrollments", body, token).andReturn()
        return objectMapper.readTree(result.response.contentAsString)["enrollmentId"].asText()
    }

    private fun toJson(obj: Any): String = objectMapper.writeValueAsString(obj)

    private fun MockMvc.post(
        path: String,
        body: String,
    ): ResultActions =
        perform(
            MockMvcRequestBuilders.post(path)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body),
        )

    private fun MockMvc.postWithAuth(
        path: String,
        body: String,
        token: String,
    ): ResultActions =
        perform(
            MockMvcRequestBuilders.post(path)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer $token")
                .content(body),
        )

    private fun MockMvc.get(path: String): ResultActions = perform(MockMvcRequestBuilders.get(path))

    private fun MockMvc.getWithAuth(
        path: String,
        token: String,
    ): ResultActions =
        perform(
            MockMvcRequestBuilders.get(path)
                .header("Authorization", "Bearer $token"),
        )

    private fun MockMvc.patchWithAuth(
        path: String,
        body: String,
        token: String,
    ): ResultActions =
        perform(
            MockMvcRequestBuilders.patch(path)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer $token")
                .content(body),
        )
}
