package com.example.assignment.service

import com.example.assignment.config.JwtTokenProvider
import com.example.assignment.domain.User
import com.example.assignment.domain.UserRole
import com.example.assignment.dto.auth.LoginRequest
import com.example.assignment.dto.auth.LoginResponse
import com.example.assignment.dto.auth.UserResponse
import com.example.assignment.exception.BadRequestException
import com.example.assignment.exception.ConflictException
import com.example.assignment.exception.UnauthorizedException
import com.example.assignment.repository.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtTokenProvider: JwtTokenProvider,
) {
    fun getUser(userId: Long): UserResponse {
        val user =
            userRepository.findById(userId)
                .orElseThrow { UnauthorizedException("사용자를 찾을 수 없습니다") }
        return UserResponse.from(user)
    }

    @Transactional
    fun login(request: LoginRequest): LoginResponse {
        val user =
            userRepository.findByEmail(request.email)
                ?: throw UnauthorizedException("이메일 또는 비밀번호가 올바르지 않습니다")

        if (!passwordEncoder.matches(request.password, user.password)) {
            throw UnauthorizedException("이메일 또는 비밀번호가 올바르지 않습니다")
        }

        val token =
            jwtTokenProvider.createToken(
                userId = user.id ?: throw BadRequestException("사용자 정보 오류"),
                email = user.email,
                role = user.role.name,
            )

        return LoginResponse(
            token = token,
            user = UserResponse.from(user),
        )
    }

    @Transactional
    fun signup(
        email: String,
        name: String,
        password: String,
        role: UserRole
    ): UserResponse {
        if (userRepository.existsByEmail(email)) {
            throw ConflictException("이미 가입된 이메일입니다")
        }

        val user =
            userRepository.save(
                User(
                    email = email,
                    name = name,
                    password = passwordEncoder.encode(password),
                    role = role,
                ),
            )

        return UserResponse.from(user)
    }
}
