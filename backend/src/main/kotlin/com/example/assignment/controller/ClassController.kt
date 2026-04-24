package com.example.assignment.controller

import com.example.assignment.domain.CourseStatus
import com.example.assignment.dto.course.CourseListResponse
import com.example.assignment.dto.course.CourseResponse
import com.example.assignment.dto.course.CreateCourseRequest
import com.example.assignment.dto.course.UpdateCourseStatusRequest
import com.example.assignment.exception.UnauthorizedException
import com.example.assignment.service.ClassService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/courses")
@Tag(name = "Courses", description = "강의 관리 API")
class ClassController(
    private val classService: ClassService,
) {
    @GetMapping
    @Operation(summary = "강의 목록 조회")
    fun getCourseList(
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) category: String?,
    ): ResponseEntity<CourseListResponse> {
        val courseStatus =
            status?.let {
                try {
                    CourseStatus.valueOf(it)
                } catch (_: IllegalArgumentException) {
                    null
                }
            }
        return ResponseEntity.ok(classService.getCourseList(courseStatus, category))
    }

    @GetMapping("/{id}")
    @Operation(summary = "강의 상세 조회")
    fun getCourse(
        @PathVariable id: Long
    ): ResponseEntity<CourseResponse> {
        return ResponseEntity.ok(classService.getCourse(id))
    }

    @PostMapping
    @Operation(summary = "강의 등록")
    fun createCourse(
        authentication: Authentication?,
        @RequestBody @Valid request: CreateCourseRequest,
    ): ResponseEntity<CourseResponse> {
        val userId = extractUserId(authentication)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(classService.createCourse(userId, request))
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "강의 상태 변경")
    fun updateCourseStatus(
        @PathVariable id: Long,
        authentication: Authentication?,
        @RequestBody @Valid request: UpdateCourseStatusRequest,
    ): ResponseEntity<CourseResponse> {
        val userId = extractUserId(authentication)
        return ResponseEntity.ok(classService.updateCourseStatus(id, userId, request))
    }

    private fun extractUserId(authentication: Authentication?): Long {
        if (authentication == null) {
            throw UnauthorizedException("로그인이 필요합니다")
        }
        return authentication.principal as Long
    }
}
