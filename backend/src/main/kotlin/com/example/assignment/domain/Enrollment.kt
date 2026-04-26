package com.example.assignment.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDateTime

@Entity
@Table(
    name = "enrollments",
    uniqueConstraints = [
        UniqueConstraint(name = "uk_user_course", columnNames = ["user_id", "course_id"]),
    ],
)
class Enrollment(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    @Column(name = "user_id", nullable = false)
    val userId: Long,
    @Column(name = "course_id", nullable = false)
    val courseId: Long,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val status: EnrollmentStatus = EnrollmentStatus.PENDING,
    @Column(name = "enrolled_at", nullable = false)
    val enrolledAt: LocalDateTime = LocalDateTime.now(),
    @Column(name = "confirmed_at")
    val confirmedAt: LocalDateTime? = null,
    @Column(name = "cancelled_at")
    val cancelledAt: LocalDateTime? = null,
    @Column(name = "created_at", nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
    @Column(name = "updated_at", nullable = false)
    val updatedAt: LocalDateTime = LocalDateTime.now(),
)

enum class EnrollmentStatus {
    PENDING,
    CONFIRMED,
    CANCELLED,
    WAITLIST, // 대기열
}
