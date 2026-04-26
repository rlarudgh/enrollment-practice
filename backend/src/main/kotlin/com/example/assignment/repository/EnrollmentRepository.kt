package com.example.assignment.repository

import com.example.assignment.domain.Enrollment
import com.example.assignment.domain.EnrollmentStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface EnrollmentRepository : JpaRepository<Enrollment, Long> {
    fun countByCourseIdAndStatusNot(
        courseId: Long,
        status: EnrollmentStatus
    ): Long

    fun existsByCourseIdAndUserId(
        courseId: Long,
        userId: Long
    ): Boolean

    fun findAllByUserId(userId: Long): List<Enrollment>

    fun findAllByUserId(
        userId: Long,
        pageable: Pageable
    ): Page<Enrollment>

    fun findAllByCourseId(courseId: Long): List<Enrollment>

    fun findAllByCourseId(
        courseId: Long,
        pageable: Pageable
    ): Page<Enrollment>

    fun findAllByCourseIdAndStatus(
        courseId: Long,
        status: EnrollmentStatus
    ): List<Enrollment>

    fun findAllByCourseIdAndStatus(
        courseId: Long,
        status: EnrollmentStatus,
        pageable: Pageable
    ): Page<Enrollment>

    fun findByCourseIdAndStatusOrderByEnrolledAtAsc(
        courseId: Long,
        status: EnrollmentStatus
    ): List<Enrollment>

    @Query(
        """
        SELECT e FROM Enrollment e
        WHERE e.courseId = :courseId
        AND e.status = :status
        ORDER BY e.enrolledAt ASC
    """
    )
    fun findWaitlistByCourseIdOrderByEnrolledAtAsc(
        courseId: Long,
        status: EnrollmentStatus = EnrollmentStatus.WAITLIST
    ): List<Enrollment>
}
