package com.example.assignment.service

import com.example.assignment.domain.CourseStatus
import com.example.assignment.domain.Enrollment
import com.example.assignment.domain.EnrollmentStatus
import com.example.assignment.dto.enrollment.CreateEnrollmentRequest
import com.example.assignment.dto.enrollment.EnrollmentDetailResponse
import com.example.assignment.dto.enrollment.EnrollmentResponse
import com.example.assignment.exception.BadRequestException
import com.example.assignment.exception.ConflictException
import com.example.assignment.exception.ForbiddenException
import com.example.assignment.exception.NotFoundException
import com.example.assignment.repository.CourseRepository
import com.example.assignment.repository.EnrollmentRepository
import com.example.assignment.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Transactional(readOnly = true)
class EnrollmentService(
    private val enrollmentRepository: EnrollmentRepository,
    private val courseRepository: CourseRepository,
    private val userRepository: UserRepository,
) {
    fun getMyEnrollments(userId: Long): List<EnrollmentDetailResponse> {
        return enrollmentRepository.findAllByUserId(userId)
            .map { enrollment ->
                val course = courseRepository.findById(enrollment.courseId).orElse(null)
                EnrollmentDetailResponse.from(
                    enrollment = enrollment,
                    courseTitle = course?.title ?: "알 수 없는 강의",
                )
            }
    }

    fun getCourseEnrollments(
        courseId: Long,
        instructorId: Long
    ): List<EnrollmentDetailResponse> {
        val course =
            courseRepository.findById(courseId)
                .orElseThrow { NotFoundException("강의를 찾을 수 없습니다") }

        if (course.instructorId != instructorId) {
            throw ForbiddenException("본인의 강의만 조회할 수 있습니다")
        }

        return enrollmentRepository.findAllByCourseId(courseId)
            .map { enrollment ->
                EnrollmentDetailResponse.from(
                    enrollment = enrollment,
                    courseTitle = course.title,
                )
            }
    }

    @Transactional
    fun enroll(
        userId: Long,
        request: CreateEnrollmentRequest
    ): EnrollmentResponse {
        val courseId = request.courseId

        val course =
            courseRepository.findWithLockById(courseId)
                .orElseThrow { NotFoundException("강의를 찾을 수 없습니다") }

        if (course.status != CourseStatus.OPEN) {
            throw BadRequestException("모집 중인 강의만 신청 가능합니다")
        }

        val currentCount =
            enrollmentRepository
                .countByCourseIdAndStatusNot(courseId, EnrollmentStatus.CANCELLED)
        if (currentCount >= course.maxCapacity) {
            throw BadRequestException("정원이 초과되었습니다")
        }

        if (enrollmentRepository.existsByCourseIdAndUserId(courseId, userId)) {
            throw ConflictException("이미 신청한 강의입니다")
        }

        val enrollment =
            enrollmentRepository.save(
                Enrollment(userId = userId, courseId = courseId),
            )

        return EnrollmentResponse.from(
            enrollment = enrollment,
            courseTitle = course.title,
        )
    }

    @Transactional
    fun confirmEnrollment(
        enrollmentId: Long,
        userId: Long
    ): EnrollmentResponse {
        val enrollment = findEnrollmentOrThrow(enrollmentId)

        if (enrollment.userId != userId) {
            throw ForbiddenException("본인의 신청만 확정할 수 있습니다")
        }

        if (enrollment.status != EnrollmentStatus.PENDING) {
            throw BadRequestException("대기 상태의 신청만 확정할 수 있습니다")
        }

        val confirmed =
            enrollmentRepository.save(
                Enrollment(
                    id = enrollment.id,
                    userId = enrollment.userId,
                    courseId = enrollment.courseId,
                    status = EnrollmentStatus.CONFIRMED,
                    enrolledAt = enrollment.enrolledAt,
                    confirmedAt = LocalDateTime.now(),
                    createdAt = enrollment.createdAt,
                ),
            )

        val course = courseRepository.findById(confirmed.courseId).orElse(null)
        return EnrollmentResponse.from(
            enrollment = confirmed,
            courseTitle = course?.title ?: "알 수 없는 강의",
        )
    }

    @Transactional
    fun cancelEnrollment(
        enrollmentId: Long,
        userId: Long
    ): EnrollmentResponse {
        val enrollment = findEnrollmentOrThrow(enrollmentId)

        if (enrollment.userId != userId) {
            throw ForbiddenException("본인의 신청만 취소할 수 있습니다")
        }

        if (enrollment.status != EnrollmentStatus.CONFIRMED) {
            throw BadRequestException("확정된 신청만 취소할 수 있습니다")
        }

        enrollment.confirmedAt?.let { confirmedAt ->
            val daysSinceConfirm = java.time.Duration.between(confirmedAt, LocalDateTime.now()).toDays()
            if (daysSinceConfirm > 7) {
                throw BadRequestException("결제 확정 후 7일 이내에만 취소할 수 있습니다")
            }
        }

        val cancelled =
            enrollmentRepository.save(
                Enrollment(
                    id = enrollment.id,
                    userId = enrollment.userId,
                    courseId = enrollment.courseId,
                    status = EnrollmentStatus.CANCELLED,
                    enrolledAt = enrollment.enrolledAt,
                    confirmedAt = enrollment.confirmedAt,
                    cancelledAt = LocalDateTime.now(),
                    createdAt = enrollment.createdAt,
                ),
            )

        val course = courseRepository.findById(cancelled.courseId).orElse(null)
        return EnrollmentResponse.from(
            enrollment = cancelled,
            courseTitle = course?.title ?: "알 수 없는 강의",
        )
    }

    private fun findEnrollmentOrThrow(enrollmentId: Long): Enrollment =
        enrollmentRepository.findById(enrollmentId)
            .orElseThrow { NotFoundException("수강 신청을 찾을 수 없습니다") }
}
