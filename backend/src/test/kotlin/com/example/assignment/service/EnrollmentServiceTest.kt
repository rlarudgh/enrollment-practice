package com.example.assignment.service

import com.example.assignment.domain.Course
import com.example.assignment.domain.CourseStatus
import com.example.assignment.domain.Enrollment
import com.example.assignment.domain.EnrollmentStatus
import com.example.assignment.dto.enrollment.CreateEnrollmentRequest
import com.example.assignment.exception.BadRequestException
import com.example.assignment.exception.ConflictException
import com.example.assignment.exception.ForbiddenException
import com.example.assignment.exception.NotFoundException
import com.example.assignment.repository.CourseRepository
import com.example.assignment.repository.EnrollmentRepository
import com.example.assignment.repository.UserRepository
import com.ninjasquad.springmockk.MockkBean
import io.mockk.every
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.Optional

@SpringBootTest
@ExtendWith(org.springframework.test.context.junit.jupiter.SpringExtension::class)
@ActiveProfiles("test")
@DisplayName("EnrollmentService 단위 테스트")
class EnrollmentServiceTest(
    @Autowired private val enrollmentService: EnrollmentService,
) {
    @MockkBean
    private lateinit var enrollmentRepository: EnrollmentRepository

    @MockkBean
    private lateinit var courseRepository: CourseRepository

    @MockkBean
    private lateinit var userRepository: UserRepository

    private val testUserId = 1L
    private val testCourseId = 100L
    private val testInstructorId = 10L

    @Nested
    @DisplayName("enroll 메서드")
    inner class Enroll {
        @Test
        @DisplayName("정상적으로 수강 신청을 생성한다")
        fun `should create enrollment successfully`() {
            // Given
            val request = CreateEnrollmentRequest(courseId = testCourseId)

            val course =
                Course(
                    id = testCourseId,
                    title = "Test Course",
                    instructorId = testInstructorId,
                    maxCapacity = 30,
                    status = CourseStatus.OPEN,
                    startDate = LocalDate.now().plusDays(7),
                    endDate = LocalDate.now().plusDays(37),
                )

            val enrollment =
                Enrollment(
                    id = 1L,
                    userId = testUserId,
                    courseId = testCourseId,
                    status = EnrollmentStatus.PENDING,
                    enrolledAt = LocalDateTime.now(),
                )

            every { courseRepository.findWithLockById(testCourseId) } returns Optional.of(course)
            every {
                enrollmentRepository.countByCourseIdAndStatusNot(
                    testCourseId,
                    EnrollmentStatus.CANCELLED,
                )
            } returns 5
            every {
                enrollmentRepository.existsByCourseIdAndUserId(
                    testCourseId,
                    testUserId,
                )
            } returns false
            every { enrollmentRepository.save(any()) } returns enrollment

            // When
            val response = enrollmentService.enroll(testUserId, request)

            // Then
            assertNotNull(response)
            assertEquals(testCourseId.toString(), response.courseId)
            assertEquals("pending", response.status)
            verify { courseRepository.findWithLockById(testCourseId) }
            verify { enrollmentRepository.save(any()) }
        }

        @Test
        @DisplayName("존재하지 않는 강의일 경우 예외를 발생시킨다")
        fun `should throw exception when course not found`() {
            // Given
            val request = CreateEnrollmentRequest(courseId = 999L)

            every { courseRepository.findWithLockById(999L) } returns Optional.empty()

            // When & Then
            val exception =
                org.junit.jupiter.api.assertThrows<NotFoundException> {
                    enrollmentService.enroll(testUserId, request)
                }

            assertTrue(exception.message!!.contains("강의를 찾을 수 없습니다"))
        }

        @Test
        @DisplayName("모집 중이 아닌 강의일 경우 예외를 발생시킨다")
        fun `should throw exception when course is not open`() {
            // Given
            val request = CreateEnrollmentRequest(courseId = testCourseId)

            val course =
                Course(
                    id = testCourseId,
                    title = "Test Course",
                    instructorId = testInstructorId,
                    // 모집 마감
                    maxCapacity = 30,
                    status = CourseStatus.CLOSED,
                    startDate = LocalDate.now().plusDays(7),
                    endDate = LocalDate.now().plusDays(37),
                )

            every { courseRepository.findWithLockById(testCourseId) } returns Optional.of(course)

            // When & Then
            val exception =
                org.junit.jupiter.api.assertThrows<BadRequestException> {
                    enrollmentService.enroll(testUserId, request)
                }

            assertTrue(exception.message!!.contains("모집 중인 강의만 신청 가능합니다"))
        }

        @Test
        @DisplayName("정원이 초과된 경우 대기열로 등록한다")
        fun `should join waitlist when capacity exceeded`() {
            // Given
            val request = CreateEnrollmentRequest(courseId = testCourseId)

            val course =
                Course(
                    id = testCourseId,
                    title = "Test Course",
                    instructorId = testInstructorId,
                    maxCapacity = 30,
                    status = CourseStatus.OPEN,
                    startDate = LocalDate.now().plusDays(7),
                    endDate = LocalDate.now().plusDays(37),
                )

            val waitlistEnrollment =
                Enrollment(
                    id = 1L,
                    userId = testUserId,
                    courseId = testCourseId,
                    status = EnrollmentStatus.WAITLIST,
                    enrolledAt = LocalDateTime.now(),
                )

            every { courseRepository.findWithLockById(testCourseId) } returns Optional.of(course)
            every {
                enrollmentRepository.countByCourseIdAndStatusNot(
                    testCourseId,
                    EnrollmentStatus.CANCELLED,
                )
            } returns 30 // 정원 도달
            every {
                enrollmentRepository.existsByCourseIdAndUserId(
                    testCourseId,
                    testUserId,
                )
            } returns false
            every { enrollmentRepository.save(any()) } returns waitlistEnrollment

            // When
            val response = enrollmentService.enroll(testUserId, request)

            // Then
            assertNotNull(response)
            assertEquals("waitlist", response.status)
            verify { enrollmentRepository.save(any()) }
        }

        @Test
        @DisplayName("이미 신청한 강의일 경우 예외를 발생시킨다")
        fun `should throw exception when already enrolled`() {
            // Given
            val request = CreateEnrollmentRequest(courseId = testCourseId)

            val course =
                Course(
                    id = testCourseId,
                    title = "Test Course",
                    instructorId = testInstructorId,
                    maxCapacity = 30,
                    status = CourseStatus.OPEN,
                    startDate = LocalDate.now().plusDays(7),
                    endDate = LocalDate.now().plusDays(37),
                )

            every { courseRepository.findWithLockById(testCourseId) } returns Optional.of(course)
            every {
                enrollmentRepository.countByCourseIdAndStatusNot(
                    testCourseId,
                    EnrollmentStatus.CANCELLED,
                )
            } returns 5
            every {
                enrollmentRepository.existsByCourseIdAndUserId(
                    testCourseId,
                    testUserId,
                )
            } returns true // 이미 신청함

            // When & Then
            val exception =
                org.junit.jupiter.api.assertThrows<ConflictException> {
                    enrollmentService.enroll(testUserId, request)
                }

            assertTrue(exception.message!!.contains("이미 신청한 강의입니다"))
        }
    }

    @Nested
    @DisplayName("confirmEnrollment 메서드")
    inner class ConfirmEnrollment {
        @Test
        @DisplayName("정상적으로 신청을 확정한다")
        fun `should confirm enrollment successfully`() {
            // Given
            val enrollmentId = 1L

            val enrollment =
                Enrollment(
                    id = enrollmentId,
                    userId = testUserId,
                    courseId = testCourseId,
                    status = EnrollmentStatus.PENDING,
                    enrolledAt = LocalDateTime.now(),
                )

            val confirmedEnrollment =
                Enrollment(
                    id = enrollmentId,
                    userId = testUserId,
                    courseId = testCourseId,
                    status = EnrollmentStatus.CONFIRMED,
                    enrolledAt = enrollment.enrolledAt,
                    confirmedAt = LocalDateTime.now(),
                )

            every { enrollmentRepository.findById(enrollmentId) } returns Optional.of(enrollment)
            every { enrollmentRepository.save(any()) } returns confirmedEnrollment
            every { courseRepository.findById(testCourseId) } returns Optional.empty()

            // When
            val response = enrollmentService.confirmEnrollment(enrollmentId, testUserId)

            // Then
            assertNotNull(response)
            assertEquals("confirmed", response.status)
            verify { enrollmentRepository.save(any()) }
        }

        @Test
        @DisplayName("본인의 신청이 아닐 경우 예외를 발생시킨다")
        fun `should throw exception when not owner`() {
            // Given
            val enrollmentId = 1L
            val otherUserId = 999L

            // 다른 사용자
            val enrollment =
                Enrollment(
                    id = enrollmentId,
                    userId = otherUserId,
                    courseId = testCourseId,
                    status = EnrollmentStatus.PENDING,
                    enrolledAt = LocalDateTime.now(),
                )

            every { enrollmentRepository.findById(enrollmentId) } returns Optional.of(enrollment)

            // When & Then
            val exception =
                org.junit.jupiter.api.assertThrows<ForbiddenException> {
                    enrollmentService.confirmEnrollment(enrollmentId, testUserId)
                }

            assertTrue(exception.message!!.contains("본인의 신청만 확정할 수 있습니다"))
        }

        @Test
        @DisplayName("이미 확정된 신청일 경우 예외를 발생시킨다")
        fun `should throw exception when already confirmed`() {
            // Given
            val enrollmentId = 1L

            // 이미 확정됨
            val enrollment =
                Enrollment(
                    id = enrollmentId,
                    userId = testUserId,
                    courseId = testCourseId,
                    status = EnrollmentStatus.CONFIRMED,
                    enrolledAt = LocalDateTime.now(),
                    confirmedAt = LocalDateTime.now(),
                )

            every { enrollmentRepository.findById(enrollmentId) } returns Optional.of(enrollment)

            // When & Then
            val exception =
                org.junit.jupiter.api.assertThrows<BadRequestException> {
                    enrollmentService.confirmEnrollment(enrollmentId, testUserId)
                }

            assertTrue(exception.message!!.contains("대기 상태의 신청만 확정할 수 있습니다"))
        }
    }

    @Nested
    @DisplayName("cancelEnrollment 메서드")
    inner class CancelEnrollment {
        @Test
        @DisplayName("정상적으로 신청을 취소한다")
        fun `should cancel enrollment successfully`() {
            // Given
            val enrollmentId = 1L
            val confirmedAt = LocalDateTime.now().minusDays(3) // 3일 전 확정

            val enrollment =
                Enrollment(
                    id = enrollmentId,
                    userId = testUserId,
                    courseId = testCourseId,
                    status = EnrollmentStatus.CONFIRMED,
                    enrolledAt = confirmedAt.minusDays(1),
                    confirmedAt = confirmedAt,
                )

            val cancelledEnrollment =
                Enrollment(
                    id = enrollmentId,
                    userId = testUserId,
                    courseId = testCourseId,
                    status = EnrollmentStatus.CANCELLED,
                    enrolledAt = enrollment.enrolledAt,
                    confirmedAt = enrollment.confirmedAt,
                    cancelledAt = LocalDateTime.now(),
                )

            val course =
                Course(
                    id = testCourseId,
                    title = "Test Course",
                    instructorId = testInstructorId,
                    maxCapacity = 30,
                    status = CourseStatus.OPEN,
                    startDate = LocalDate.now().plusDays(7),
                    endDate = LocalDate.now().plusDays(37),
                )

            every { enrollmentRepository.findById(enrollmentId) } returns Optional.of(enrollment)
            every { enrollmentRepository.save(any()) } returns cancelledEnrollment
            every { courseRepository.findById(testCourseId) } returns Optional.empty()
            every { courseRepository.findWithLockById(testCourseId) } returns Optional.of(course)
            every {
                enrollmentRepository.countByCourseIdAndStatusNot(
                    testCourseId,
                    EnrollmentStatus.CANCELLED,
                )
            } returns 0
            every { enrollmentRepository.findWaitlistByCourseIdOrderByEnrolledAtAsc(testCourseId) } returns emptyList()

            // When
            val response = enrollmentService.cancelEnrollment(enrollmentId, testUserId)

            // Then
            assertNotNull(response)
            assertEquals("cancelled", response.status)
            verify { enrollmentRepository.save(any()) }
        }

        @Test
        @DisplayName("확정 후 7일이 경과한 경우 예외를 발생시킨다")
        fun `should throw exception when more than 7 days passed`() {
            // Given
            val enrollmentId = 1L
            val confirmedAt = LocalDateTime.now().minusDays(10) // 10일 전 확정

            val enrollment =
                Enrollment(
                    id = enrollmentId,
                    userId = testUserId,
                    courseId = testCourseId,
                    status = EnrollmentStatus.CONFIRMED,
                    enrolledAt = confirmedAt.minusDays(1),
                    confirmedAt = confirmedAt,
                )

            every { enrollmentRepository.findById(enrollmentId) } returns Optional.of(enrollment)

            // When & Then
            val exception =
                org.junit.jupiter.api.assertThrows<BadRequestException> {
                    enrollmentService.cancelEnrollment(enrollmentId, testUserId)
                }

            assertTrue(exception.message!!.contains("결제 확정 후 7일 이내에만 취소할 수 있습니다"))
        }
    }

    @Nested
    @DisplayName("getCourseEnrollments 메서드")
    inner class GetCourseEnrollments {
        @Test
        @DisplayName("정상적으로 강의 신청 목록을 조회한다")
        fun `should get course enrollments successfully`() {
            // Given
            val course =
                Course(
                    id = testCourseId,
                    title = "Test Course",
                    instructorId = testInstructorId,
                    maxCapacity = 30,
                    status = CourseStatus.OPEN,
                    startDate = LocalDate.now().plusDays(7),
                    endDate = LocalDate.now().plusDays(37),
                )

            val enrollments =
                listOf(
                    Enrollment(
                        id = 1L,
                        userId = 1L,
                        courseId = testCourseId,
                        status = EnrollmentStatus.CONFIRMED,
                        enrolledAt = LocalDateTime.now(),
                    ),
                )

            every { courseRepository.findById(testCourseId) } returns Optional.of(course)
            every { enrollmentRepository.findAllByCourseId(testCourseId) } returns enrollments

            // When
            val response = enrollmentService.getCourseEnrollments(testCourseId, testInstructorId)

            // Then
            assertNotNull(response)
            assertEquals(1, response.size)
            verify { enrollmentRepository.findAllByCourseId(testCourseId) }
        }

        @Test
        @DisplayName("본인의 강의가 아닐 경우 예외를 발생시킨다")
        fun `should throw exception when not instructor`() {
            // Given
            val otherInstructorId = 999L

            val course =
                // 원래 강사
                Course(
                    id = testCourseId,
                    title = "Test Course",
                    instructorId = testInstructorId,
                    maxCapacity = 30,
                    status = CourseStatus.OPEN,
                    startDate = LocalDate.now().plusDays(7),
                    endDate = LocalDate.now().plusDays(37),
                )

            every { courseRepository.findById(testCourseId) } returns Optional.of(course)

            // When & Then
            val exception =
                org.junit.jupiter.api.assertThrows<ForbiddenException> {
                    enrollmentService.getCourseEnrollments(testCourseId, otherInstructorId)
                }

            assertTrue(exception.message!!.contains("본인의 강의만 조회할 수 있습니다"))
        }
    }
}
