package com.example.assignment.service

import com.example.assignment.domain.Course
import com.example.assignment.domain.CourseStatus
import com.example.assignment.domain.EnrollmentStatus
import com.example.assignment.domain.UserRole
import com.example.assignment.dto.course.CourseListResponse
import com.example.assignment.dto.course.CourseResponse
import com.example.assignment.dto.course.CreateCourseRequest
import com.example.assignment.dto.course.UpdateCourseStatusRequest
import com.example.assignment.exception.BadRequestException
import com.example.assignment.exception.NotFoundException
import com.example.assignment.exception.UnauthorizedException
import com.example.assignment.repository.CourseRepository
import com.example.assignment.repository.EnrollmentRepository
import com.example.assignment.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class ClassService(
    private val courseRepository: CourseRepository,
    private val userRepository: UserRepository,
    private val enrollmentRepository: EnrollmentRepository,
) {
    fun getCourseList(
        status: CourseStatus?,
        category: String?,
    ): CourseListResponse {
        val courses =
            when {
                status != null && category != null && category != "all" ->
                    courseRepository.findAllByStatusAndCategory(status, category)
                status != null ->
                    courseRepository.findAllByStatus(status)
                category != null && category != "all" ->
                    courseRepository.findAll().filter { it.category == category }
                else ->
                    courseRepository.findAll()
            }

        val responses = courses.map { toResponse(it) }
        val categories = courseRepository.findAll().map { it.category }.distinct()

        return CourseListResponse(courses = responses, categories = categories)
    }

    fun getCourse(courseId: Long): CourseResponse {
        val course = findCourseOrThrow(courseId)
        return toResponse(course)
    }

    fun getInstructorCourses(instructorId: Long): CourseListResponse {
        val courses = courseRepository.findAllByInstructorId(instructorId)
        val responses = courses.map { toResponse(it) }
        val categories = responses.map { it.category }.distinct()
        return CourseListResponse(courses = responses, categories = categories)
    }

    @Transactional
    fun createCourse(
        instructorId: Long,
        request: CreateCourseRequest
    ): CourseResponse {
        val instructor =
            userRepository.findById(instructorId)
                .orElseThrow { NotFoundException("사용자를 찾을 수 없습니다") }

        if (instructor.role != UserRole.CREATOR) {
            throw UnauthorizedException("크리에이터만 강의를 등록할 수 있습니다")
        }

        if (request.startDate.isAfter(request.endDate)) {
            throw BadRequestException("종료일은 시작일 이후여야 합니다")
        }

        val course =
            courseRepository.save(
                Course(
                    title = request.title,
                    description = request.description,
                    price = request.price,
                    maxCapacity = request.maxCapacity,
                    startDate = request.startDate,
                    endDate = request.endDate,
                    instructorId = instructorId,
                    category = request.category,
                    status = CourseStatus.DRAFT,
                ),
            )

        return toResponse(course)
    }

    @Transactional
    fun updateCourseStatus(
        courseId: Long,
        instructorId: Long,
        request: UpdateCourseStatusRequest,
    ): CourseResponse {
        val course = findCourseOrThrow(courseId)

        if (course.instructorId != instructorId) {
            throw UnauthorizedException("본인의 강의만 수정할 수 있습니다")
        }

        val newStatus =
            try {
                CourseStatus.valueOf(request.status)
            } catch (_: IllegalArgumentException) {
                throw BadRequestException("올바르지 않은 상태입니다: ${request.status}")
            }

        validateStatusTransition(course.status, newStatus)

        val updated =
            courseRepository.save(
                Course(
                    id = course.id,
                    title = course.title,
                    description = course.description,
                    price = course.price,
                    maxCapacity = course.maxCapacity,
                    status = newStatus,
                    startDate = course.startDate,
                    endDate = course.endDate,
                    instructorId = course.instructorId,
                    category = course.category,
                    createdAt = course.createdAt,
                ),
            )

        return toResponse(updated)
    }

    private fun validateStatusTransition(
        current: CourseStatus,
        target: CourseStatus
    ) {
        val valid =
            when (current) {
                CourseStatus.DRAFT -> target == CourseStatus.OPEN
                CourseStatus.OPEN -> target == CourseStatus.CLOSED
                CourseStatus.CLOSED -> false
            }
        if (!valid) {
            throw BadRequestException("${current.name} → ${target.name} 상태 변경이 불가합니다")
        }
    }

    private fun findCourseOrThrow(courseId: Long): Course =
        courseRepository.findById(courseId)
            .orElseThrow { NotFoundException("강의를 찾을 수 없습니다") }

    private fun toResponse(course: Course): CourseResponse {
        val instructor = userRepository.findById(course.instructorId).orElse(null)
        val currentEnrollment =
            course.id?.let {
                enrollmentRepository.countByCourseIdAndStatusNot(it, EnrollmentStatus.CANCELLED).toInt()
            } ?: 0

        return CourseResponse.from(
            course = course,
            instructorName = instructor?.name ?: "알 수 없음",
            currentEnrollment = currentEnrollment,
        )
    }
}
