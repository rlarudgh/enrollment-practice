package com.example.assignment.controller

import com.example.assignment.domain.CourseStatus
import com.example.assignment.dto.course.CourseListResponse
import com.example.assignment.dto.course.CourseResponse
import com.example.assignment.dto.course.CreateCourseRequest
import com.example.assignment.dto.course.UpdateCourseStatusRequest
import com.example.assignment.exception.UnauthorizedException
import com.example.assignment.service.ClassService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Content
import io.swagger.v3.oas.annotations.media.ExampleObject
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.responses.ApiResponse
import io.swagger.v3.oas.annotations.responses.ApiResponses
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
    @ApiResponses(
        value = [
            ApiResponse(
                responseCode = "200",
                description = "강의 목록 조회 성공",
                content = [Content(schema = Schema(implementation = CourseListResponse::class))],
            ),
        ]
    )
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
    @ApiResponses(
        value = [
            ApiResponse(
                responseCode = "200",
                description = "강의 상세 조회 성공",
                content = [Content(schema = Schema(implementation = CourseResponse::class))],
            ),
            ApiResponse(
                responseCode = "404",
                description = "강의를 찾을 수 없음",
                content = [Content(examples = [ExampleObject(value = """{"status":404,"message":"강의를 찾을 수 없습니다"}""")])],
            ),
        ]
    )
    fun getCourse(
        @PathVariable id: Long
    ): ResponseEntity<CourseResponse> {
        return ResponseEntity.ok(classService.getCourse(id))
    }

    @PostMapping
    @Operation(summary = "강의 등록")
    @ApiResponses(
        value = [
            ApiResponse(
                responseCode = "201",
                description = "강의 등록 성공",
                content = [Content(schema = Schema(implementation = CourseResponse::class))],
            ),
            ApiResponse(
                responseCode = "400",
                description = "요청 데이터 유효성 검증 실패 또는 잘못된 날짜 조건",
                content = [Content(examples = [ExampleObject(value = """{"status":400,"message":"제목은 필수입니다"}""")])],
            ),
            ApiResponse(
                responseCode = "401",
                description = "인증되지 않은 사용자 또는 크리에이터 권한 없음",
                content = [Content(examples = [ExampleObject(value = """{"status":401,"message":"크리에이터만 강의를 등록할 수 있습니다"}""")])],
            ),
            ApiResponse(
                responseCode = "404",
                description = "사용자를 찾을 수 없음",
                content = [Content(examples = [ExampleObject(value = """{"status":404,"message":"사용자를 찾을 수 없습니다"}""")])],
            ),
        ]
    )
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
    @ApiResponses(
        value = [
            ApiResponse(
                responseCode = "200",
                description = "강의 상태 변경 성공",
                content = [Content(schema = Schema(implementation = CourseResponse::class))],
            ),
            ApiResponse(
                responseCode = "400",
                description = "올바르지 않은 상태 또는 허용되지 않은 상태 전환",
                content = [Content(examples = [ExampleObject(value = """{"status":400,"message":"DRAFT → CLOSED 상태 변경이 불가합니다"}""")])],
            ),
            ApiResponse(
                responseCode = "401",
                description = "인증되지 않은 사용자 또는 본인 강의 아님",
                content = [Content(examples = [ExampleObject(value = """{"status":401,"message":"본인의 강의만 수정할 수 있습니다"}""")])],
            ),
            ApiResponse(
                responseCode = "404",
                description = "강의를 찾을 수 없음",
                content = [Content(examples = [ExampleObject(value = """{"status":404,"message":"강의를 찾을 수 없습니다"}""")])],
            ),
        ]
    )
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
