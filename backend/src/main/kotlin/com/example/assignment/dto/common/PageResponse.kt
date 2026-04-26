package com.example.assignment.dto.common

import org.springframework.data.domain.Page

data class PageResponse<T>(
    val content: List<T>,
    val currentPage: Int,
    val totalPages: Int,
    val totalElements: Long,
    val pageSize: Int,
    val hasNext: Boolean,
    val hasPrevious: Boolean,
) {
    companion object {
        fun <T> from(page: Page<T>): PageResponse<T> {
            return PageResponse(
                content = page.content,
                currentPage = page.number,
                totalPages = page.totalPages,
                totalElements = page.totalElements,
                pageSize = page.size,
                hasNext = page.hasNext(),
                hasPrevious = page.hasPrevious(),
            )
        }
    }
}
