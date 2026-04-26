package com.example.assignment.service

import com.example.assignment.domain.CourseStatus
import com.example.assignment.domain.Enrollment
import com.example.assignment.domain.EnrollmentStatus
import com.example.assignment.dto.common.PageResponse
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
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
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

    fun getMyEnrollments(
        userId: Long,
        page: Int = 0,
        size: Int = 10,
    ): PageResponse<EnrollmentDetailResponse> {
        val pageable = PageRequest.of(page, size, Sort.by("createdAt").descending())
        val enrollmentsPage = enrollmentRepository.findAllByUserId(userId, pageable)

        val content =
            enrollmentsPage.content.map { enrollment ->
                val course = courseRepository.findById(enrollment.courseId).orElse(null)
                EnrollmentDetailResponse.from(
                    enrollment = enrollment,
                    courseTitle = course?.title ?: "알 수 없는 강의",
                )
            }

        return PageResponse(
            content = content,
            currentPage = enrollmentsPage.number,
            totalPages = enrollmentsPage.totalPages,
            totalElements = enrollmentsPage.totalElements,
            pageSize = enrollmentsPage.size,
            hasNext = enrollmentsPage.hasNext(),
            hasPrevious = enrollmentsPage.hasPrevious(),
        )
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

    fun getCourseEnrollments(
        courseId: Long,
        instructorId: Long,
        page: Int = 0,
        size: Int = 10,
    ): PageResponse<EnrollmentDetailResponse> {
        val course =
            courseRepository.findById(courseId)
                .orElseThrow { NotFoundException("강의를 찾을 수 없습니다") }

        if (course.instructorId != instructorId) {
            throw ForbiddenException("본인의 강의만 조회할 수 있습니다")
        }

        val pageable = PageRequest.of(page, size, Sort.by("enrolledAt").descending())
        val enrollmentsPage = enrollmentRepository.findAllByCourseId(courseId, pageable)

        val content =
            enrollmentsPage.content.map { enrollment ->
                EnrollmentDetailResponse.from(
                    enrollment = enrollment,
                    courseTitle = course.title,
                )
            }

        return PageResponse(
            content = content,
            currentPage = enrollmentsPage.number,
            totalPages = enrollmentsPage.totalPages,
            totalElements = enrollmentsPage.totalElements,
            pageSize = enrollmentsPage.size,
            hasNext = enrollmentsPage.hasNext(),
            hasPrevious = enrollmentsPage.hasPrevious(),
        )
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

        if (enrollmentRepository.existsByCourseIdAndUserId(courseId, userId)) {
            throw ConflictException("이미 신청한 강의입니다")
        }

        val currentCount =
            enrollmentRepository
                .countByCourseIdAndStatusNot(courseId, EnrollmentStatus.CANCELLED)

        // 정원 초과 시 대기열로 등록
        val status =
            if (currentCount >= course.maxCapacity) {
                EnrollmentStatus.WAITLIST
            } else {
                EnrollmentStatus.PENDING
            }

        val enrollment =
            enrollmentRepository.save(
                Enrollment(userId = userId, courseId = courseId, status = status),
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

        // 취소 후 대기열 자동 승격
        autoPromoteWaitlist(enrollment.courseId)

        val course = courseRepository.findById(cancelled.courseId).orElse(null)
        return EnrollmentResponse.from(
            enrollment = cancelled,
            courseTitle = course?.title ?: "알 수 없는 강의",
        )
    }

    private fun findEnrollmentOrThrow(enrollmentId: Long): Enrollment =
        enrollmentRepository.findById(enrollmentId)
            .orElseThrow { NotFoundException("수강 신청을 찾을 수 없습니다") }

    // ========== 대기열 관련 메서드 ==========

    fun getWaitlist(courseId: Long): List<EnrollmentDetailResponse> {
        val course =
            courseRepository.findById(courseId)
                .orElseThrow { NotFoundException("강의를 찾을 수 없습니다") }

        return enrollmentRepository.findWaitlistByCourseIdOrderByEnrolledAtAsc(courseId)
            .map { enrollment ->
                EnrollmentDetailResponse.from(
                    enrollment = enrollment,
                    courseTitle = course.title,
                )
            }
    }

    @Transactional
    fun promoteWaitlistToConfirmed(
        enrollmentId: Long,
        instructorId: Long,
    ): EnrollmentResponse {
        val enrollment = findEnrollmentOrThrow(enrollmentId)

        if (enrollment.status != EnrollmentStatus.WAITLIST) {
            throw BadRequestException("대기열 상태의 신청만 확정할 수 있습니다")
        }

        val course =
            courseRepository.findById(enrollment.courseId)
                .orElseThrow { NotFoundException("강의를 찾을 수 없습니다") }

        if (course.instructorId != instructorId) {
            throw ForbiddenException("본인의 강의만 대기자를 확정할 수 있습니다")
        }

        val currentCount =
            enrollmentRepository.countByCourseIdAndStatusNot(
                enrollment.courseId,
                EnrollmentStatus.CANCELLED,
            )

        if (currentCount >= course.maxCapacity) {
            throw BadRequestException("정원이 여전히 초과되어 확정할 수 없습니다")
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

        return EnrollmentResponse.from(
            enrollment = confirmed,
            courseTitle = course.title,
        )
    }

    @Transactional
    fun autoPromoteWaitlist(courseId: Long): List<EnrollmentDetailResponse> {
        val course =
            courseRepository.findWithLockById(courseId)
                .orElseThrow { NotFoundException("강의를 찾을 수 없습니다") }

        val currentCount =
            enrollmentRepository.countByCourseIdAndStatusNot(
                courseId,
                EnrollmentStatus.CANCELLED,
            )

        if (currentCount >= course.maxCapacity) {
            return emptyList() // 정원이 여전히 찼음
        }

        val availableSlots = (course.maxCapacity - currentCount).toInt()
        val waitlist = enrollmentRepository.findWaitlistByCourseIdOrderByEnrolledAtAsc(courseId)

        val promoted =
            waitlist.take(availableSlots).map { waitlistEnrollment ->
                enrollmentRepository.save(
                    Enrollment(
                        id = waitlistEnrollment.id,
                        userId = waitlistEnrollment.userId,
                        courseId = waitlistEnrollment.courseId,
                        status = EnrollmentStatus.CONFIRMED,
                        enrolledAt = waitlistEnrollment.enrolledAt,
                        confirmedAt = LocalDateTime.now(),
                        createdAt = waitlistEnrollment.createdAt,
                    ),
                )
            }

        return promoted.map { enrollment ->
            EnrollmentDetailResponse.from(
                enrollment = enrollment,
                courseTitle = course.title,
            )
        }
    }
}
