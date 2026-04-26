package com.example.assignment.config

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.Date
import javax.crypto.SecretKey

@Component
class JwtTokenProvider(
    @Value("\${jwt.secret}") // 환경변수 필수, 기본값 없음
    private val secret: String,
    @Value("\${jwt.expiration:86400000}")
    private val expiration: Long,
) {
    private val key: SecretKey by lazy {
        Keys.hmacShaKeyFor(secret.toByteArray())
    }

    fun createToken(
        userId: Long,
        email: String,
        role: String
    ): String {
        val now = Date()
        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .claim("role", role)
            .issuedAt(now)
            .expiration(Date(now.time + expiration))
            .signWith(key)
            .compact()
    }

    fun getUserId(token: String): Long {
        return getClaims(token).subject.toLong()
    }

    fun getEmail(token: String): String {
        return getClaims(token)["email"] as String
    }

    fun getRole(token: String): String {
        return getClaims(token)["role"] as String
    }

    fun validateToken(token: String): Boolean {
        return try {
            getClaims(token)
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun getClaims(token: String): Claims {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .payload
    }
}
