package com.example.assignment.controller

import com.example.assignment.dto.auth.LoginRequest
import com.example.assignment.dto.auth.LoginResponse
import com.example.assignment.service.AuthService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Content
import io.swagger.v3.oas.annotations.media.ExampleObject
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.responses.ApiResponse
import io.swagger.v3.oas.annotations.responses.ApiResponses
import io.swagger.v3.oas.annotations.security.SecurityRequirements
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth", description = "인증 API")
class AuthController(
    private val authService: AuthService,
) {
    @PostMapping("/login")
    @Operation(summary = "로그인")
    @SecurityRequirements
    @ApiResponses(
        value = [
            ApiResponse(
                responseCode = "200",
                description = "로그인 성공",
                content = [Content(schema = Schema(implementation = LoginResponse::class))],
            ),
            ApiResponse(
                responseCode = "400",
                description = "요청 데이터 유효성 검증 실패",
                content = [Content(examples = [ExampleObject(value = """{"status":400,"message":"이메일은 필수입니다"}""")])],
            ),
            ApiResponse(
                responseCode = "401",
                description = "이메일 또는 비밀번호가 올바르지 않음",
                content = [Content(examples = [ExampleObject(value = """{"status":401,"message":"이메일 또는 비밀번호가 올바르지 않습니다"}""")])],
            ),
        ]
    )
    fun login(
        @RequestBody @Valid request: LoginRequest
    ): ResponseEntity<LoginResponse> {
        return ResponseEntity.ok(authService.login(request))
    }

    @GetMapping("/me")
    @Operation(summary = "내 정보 조회")
    @ApiResponses(
        value = [
            ApiResponse(responseCode = "200", description = "사용자 정보 조회 성공"),
            ApiResponse(
                responseCode = "401",
                description = "인증되지 않은 사용자",
                content = [Content(examples = [ExampleObject(value = """{"code":"UNAUTHORIZED","message":"로그인이 필요합니다"}""")])],
            ),
        ]
    )
    fun getMe(authentication: Authentication?): ResponseEntity<Any> {
        if (authentication == null) {
            return ResponseEntity.status(401)
                .body(mapOf("code" to "UNAUTHORIZED", "message" to "로그인이 필요합니다"))
        }
        val userId = authentication.principal as Long
        return ResponseEntity.ok(mapOf("user" to authService.getUser(userId)))
    }

    @PostMapping("/logout")
    @Operation(summary = "로그아웃")
    @SecurityRequirements
    @ApiResponses(
        value = [
            ApiResponse(
                responseCode = "200",
                description = "로그아웃 성공",
                content = [Content(examples = [ExampleObject(value = """{"success":true}""")])],
            ),
        ]
    )
    fun logout(): ResponseEntity<Any> {
        return ResponseEntity.ok(mapOf("success" to true))
    }
}
