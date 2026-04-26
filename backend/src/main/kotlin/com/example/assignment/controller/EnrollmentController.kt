package com.example.assignment.controller

import com.example.assignment.dto.enrollment.CreateEnrollmentRequest
import com.example.assignment.dto.enrollment.EnrollmentDetailResponse
import com.example.assignment.dto.enrollment.EnrollmentResponse
import com.example.assignment.exception.UnauthorizedException
import com.example.assignment.service.EnrollmentService
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
@RequestMapping("/api/enrollments")
@Tag(name = "Enrollments", description = "수강 신청 API")
class EnrollmentController(
    private val enrollmentService: EnrollmentService,
) {
    @PostMapping
    @Operation(summary = "수강 신청")
    @ApiResponses(
        value = [
            ApiResponse(
                responseCode = "201",
                description = "수강 신청 성공",
                content = [Content(schema = Schema(implementation = EnrollmentResponse::class))],
            ),
            ApiResponse(
                responseCode = "400",
                description = "모집 중인 강의가 아니거나 정원 초과",
                content = [Content(examples = [ExampleObject(value = """{"status":400,"message":"정원이 초과되었습니다"}""")])],
            ),
            ApiResponse(
                responseCode = "401",
                description = "인증되지 않은 사용자",
                content = [Content(examples = [ExampleObject(value = """{"status":401,"message":"로그인이 필요합니다"}""")])],
            ),
            ApiResponse(
                responseCode = "404",
                description = "강의를 찾을 수 없음",
                content = [Content(examples = [ExampleObject(value = """{"status":404,"message":"강의를 찾을 수 없습니다"}""")])],
            ),
            ApiResponse(
                responseCode = "409",
                description = "이미 신청한 강의",
                content = [Content(examples = [ExampleObject(value = """{"status":409,"message":"이미 신청한 강의입니다"}""")])],
            ),
        ]
    )
    fun enroll(
        authentication: Authentication?,
        @RequestBody @Valid request: CreateEnrollmentRequest,
    ): ResponseEntity<EnrollmentResponse> {
        val userId = extractUserId(authentication)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(enrollmentService.enroll(userId, request))
    }

    @GetMapping
    @Operation(summary = "내 수강 신청 목록")
    @ApiResponses(
        value = [
            ApiResponse(
                responseCode = "200",
                description = "수강 신청 목록 조회 성공",
            ),
            ApiResponse(
                responseCode = "401",
                description = "인증되지 않은 사용자",
                content = [Content(examples = [ExampleObject(value = """{"status":401,"message":"로그인이 필요합니다"}""")])],
            ),
        ]
    )
    fun getMyEnrollments(
        authentication: Authentication?,
        @RequestParam(required = false) page: Int?,
        @RequestParam(required = false, defaultValue = "10") size: Int,
    ): ResponseEntity<Any> {
        val userId = extractUserId(authentication)
        return if (page != null) {
            ResponseEntity.ok(enrollmentService.getMyEnrollments(userId, page, size))
        } else {
            ResponseEntity.ok(enrollmentService.getMyEnrollments(userId))
        }
    }

    @PatchMapping("/{id}/confirm")
    @Operation(summary = "결제 확정")
    @ApiResponses(
        value = [
            ApiResponse(
                responseCode = "200",
                description = "결제 확정 성공",
                content = [Content(schema = Schema(implementation = EnrollmentResponse::class))],
            ),
            ApiResponse(
                responseCode = "400",
                description = "대기 상태의 신청만 확정 가능",
                content = [Content(examples = [ExampleObject(value = """{"status":400,"message":"대기 상태의 신청만 확정할 수 있습니다"}""")])],
            ),
            ApiResponse(
                responseCode = "401",
                description = "인증되지 않은 사용자",
                content = [Content(examples = [ExampleObject(value = """{"status":401,"message":"로그인이 필요합니다"}""")])],
            ),
            ApiResponse(
                responseCode = "403",
                description = "본인의 신청만 확정할 수 있음",
                content = [Content(examples = [ExampleObject(value = """{"status":403,"message":"본인의 신청만 확정할 수 있습니다"}""")])],
            ),
            ApiResponse(
                responseCode = "404",
                description = "수강 신청을 찾을 수 없음",
                content = [Content(examples = [ExampleObject(value = """{"status":404,"message":"수강 신청을 찾을 수 없습니다"}""")])],
            ),
        ]
    )
    fun confirmEnrollment(
        @PathVariable id: Long,
        authentication: Authentication?,
    ): ResponseEntity<EnrollmentResponse> {
        val userId = extractUserId(authentication)
        return ResponseEntity.ok(enrollmentService.confirmEnrollment(id, userId))
    }

    @PatchMapping("/{id}/cancel")
    @Operation(summary = "수강 취소")
    @ApiResponses(
        value = [
            ApiResponse(
                responseCode = "200",
                description = "수강 취소 성공",
                content = [Content(schema = Schema(implementation = EnrollmentResponse::class))],
            ),
            ApiResponse(
                responseCode = "400",
                description = "확정된 신청만 취소 가능하거나 결제 확정 후 7일 초과",
                content = [Content(examples = [ExampleObject(value = """{"status":400,"message":"확정된 신청만 취소할 수 있습니다"}""")])],
            ),
            ApiResponse(
                responseCode = "401",
                description = "인증되지 않은 사용자",
                content = [Content(examples = [ExampleObject(value = """{"status":401,"message":"로그인이 필요합니다"}""")])],
            ),
            ApiResponse(
                responseCode = "403",
                description = "본인의 신청만 취소할 수 있음",
                content = [Content(examples = [ExampleObject(value = """{"status":403,"message":"본인의 신청만 취소할 수 있습니다"}""")])],
            ),
            ApiResponse(
                responseCode = "404",
                description = "수강 신청을 찾을 수 없음",
                content = [Content(examples = [ExampleObject(value = """{"status":404,"message":"수강 신청을 찾을 수 없습니다"}""")])],
            ),
        ]
    )
    fun cancelEnrollment(
        @PathVariable id: Long,
        authentication: Authentication?,
    ): ResponseEntity<EnrollmentResponse> {
        val userId = extractUserId(authentication)
        return ResponseEntity.ok(enrollmentService.cancelEnrollment(id, userId))
    }

    @GetMapping("/waitlist/{courseId}")
    @Operation(summary = "강의 대기열 조회")
    @ApiResponses(
        value = [
            ApiResponse(
                responseCode = "200",
                description = "대기열 조회 성공",
            ),
            ApiResponse(
                responseCode = "401",
                description = "인증되지 않은 사용자",
                content = [Content(examples = [ExampleObject(value = """{"status":401,"message":"로그인이 필요합니다"}""")])],
            ),
            ApiResponse(
                responseCode = "404",
                description = "강의를 찾을 수 없음",
                content = [Content(examples = [ExampleObject(value = """{"status":404,"message":"강의를 찾을 수 없습니다"}""")])],
            ),
        ]
    )
    fun getWaitlist(
        @PathVariable courseId: Long,
        authentication: Authentication?,
    ): ResponseEntity<List<EnrollmentDetailResponse>> {
        extractUserId(authentication)
        return ResponseEntity.ok(enrollmentService.getWaitlist(courseId))
    }

    @PatchMapping("/waitlist/{id}/promote")
    @Operation(summary = "대기열 수동 승격")
    @ApiResponses(
        value = [
            ApiResponse(
                responseCode = "200",
                description = "대기열 승격 성공",
                content = [Content(schema = Schema(implementation = EnrollmentResponse::class))],
            ),
            ApiResponse(
                responseCode = "400",
                description = "대기열 상태가 아니거나 정원 초과",
                content = [Content(examples = [ExampleObject(value = """{"status":400,"message":"정원이 여전히 초과되어 확정할 수 없습니다"}""")])],
            ),
            ApiResponse(
                responseCode = "401",
                description = "인증되지 않은 사용자",
                content = [Content(examples = [ExampleObject(value = """{"status":401,"message":"로그인이 필요합니다"}""")])],
            ),
            ApiResponse(
                responseCode = "403",
                description = "본인의 강의만 대기자를 확정할 수 있음",
                content = [Content(examples = [ExampleObject(value = """{"status":403,"message":"본인의 강의만 대기자를 확정할 수 있습니다"}""")])],
            ),
            ApiResponse(
                responseCode = "404",
                description = "수강 신청을 찾을 수 없음",
                content = [Content(examples = [ExampleObject(value = """{"status":404,"message":"수강 신청을 찾을 수 없습니다"}""")])],
            ),
        ]
    )
    fun promoteWaitlist(
        @PathVariable id: Long,
        authentication: Authentication?,
    ): ResponseEntity<EnrollmentResponse> {
        val instructorId = extractUserId(authentication)
        return ResponseEntity.ok(enrollmentService.promoteWaitlistToConfirmed(id, instructorId))
    }

    @PostMapping("/waitlist/{courseId}/auto-promote")
    @Operation(summary = "대기열 자동 승격")
    @ApiResponses(
        value = [
            ApiResponse(
                responseCode = "200",
                description = "대기열 자동 승격 성공",
            ),
            ApiResponse(
                responseCode = "401",
                description = "인증되지 않은 사용자",
                content = [Content(examples = [ExampleObject(value = """{"status":401,"message":"로그인이 필요합니다"}""")])],
            ),
            ApiResponse(
                responseCode = "404",
                description = "강의를 찾을 수 없음",
                content = [Content(examples = [ExampleObject(value = """{"status":404,"message":"강의를 찾을 수 없습니다"}""")])],
            ),
        ]
    )
    fun autoPromoteWaitlist(
        @PathVariable courseId: Long,
        authentication: Authentication?,
    ): ResponseEntity<List<EnrollmentDetailResponse>> {
        extractUserId(authentication)
        return ResponseEntity.ok(enrollmentService.autoPromoteWaitlist(courseId))
    }

    private fun extractUserId(authentication: Authentication?): Long {
        if (authentication == null) {
            throw UnauthorizedException("로그인이 필요합니다")
        }
        return authentication.principal as Long
    }
}
