package com.example.assignment.dto.course

import com.example.assignment.domain.Course
import com.example.assignment.domain.CourseStatus
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.LocalDate

data class CreateCourseRequest(
    @field:NotBlank(message = "제목은 필수입니다")
    val title: String,
    val description: String = "",
    @field:Min(value = 0, message = "가격은 0 이상이어야 합니다")
    val price: Int = 0,
    @field:Min(value = 1, message = "정원은 1명 이상이어야 합니다")
    val maxCapacity: Int,
    @field:NotNull(message = "시작일은 필수입니다")
    val startDate: LocalDate,
    @field:NotNull(message = "종료일은 필수입니다")
    val endDate: LocalDate,
    val category: String = "development",
)

data class UpdateCourseStatusRequest(
    @field:NotBlank(message = "상태는 필수입니다")
    val status: String,
)

data class CourseResponse(
    val id: String,
    val title: String,
    val description: String,
    val price: Int,
    val maxCapacity: Int,
    val currentEnrollment: Int,
    val status: CourseStatus,
    val startDate: String,
    val endDate: String,
    val instructor: String,
    val category: String,
) {
    companion object {
        fun from(
            course: Course,
            instructorName: String,
            currentEnrollment: Int
        ): CourseResponse =
            CourseResponse(
                id = course.id.toString(),
                title = course.title,
                description = course.description,
                price = course.price,
                maxCapacity = course.maxCapacity,
                currentEnrollment = currentEnrollment,
                status = course.status,
                startDate = course.startDate.toString(),
                endDate = course.endDate.toString(),
                instructor = instructorName,
                category = course.category,
            )
    }
}

data class CourseListResponse(
    val courses: List<CourseResponse>,
    val categories: List<String>,
)
