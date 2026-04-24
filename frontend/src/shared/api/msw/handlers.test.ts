import type { EnrollmentRequest, ErrorResponse } from "@/entities/enrollment";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { handlers } from "./handlers";

const server = setupServer(...handlers);

describe("MSW Handlers", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  describe("GET /api/courses", () => {
    it("should return all courses when no category specified", async () => {
      const response = await fetch("/api/courses");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.courses).toHaveLength(8);
      expect(data.categories).toContain("development");
      expect(data.categories).toContain("design");
    });

    it("should filter courses by category", async () => {
      const response = await fetch("/api/courses?category=development");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.courses).toHaveLength(2);
      expect(data.courses[0].category).toBe("development");
    });

    it("should return empty array for non-existent category", async () => {
      const response = await fetch("/api/courses?category=nonexistent");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.courses).toHaveLength(0);
    });
  });

  describe("GET /api/courses/:id", () => {
    it("should return course by id", async () => {
      const response = await fetch("/api/courses/course-1");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("course-1");
      expect(data.title).toBe("React 완벽 가이드");
    });

    it("should return 404 for non-existent course", async () => {
      const response = await fetch("/api/courses/nonexistent");
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(404);
      expect(data.code).toBe("COURSE_NOT_FOUND");
      expect(data.message).toBe("강의를 찾을 수 없습니다");
    });
  });

  describe("POST /api/enrollments", () => {
    const validPersonalRequest: EnrollmentRequest = {
      courseId: "course-1",
      type: "personal",
      applicant: {
        name: "홍길동",
        email: "hong@example.com",
        phone: "010-1234-5678",
      },
      agreedToTerms: true,
    };

    it("should create enrollment for valid personal request", async () => {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPersonalRequest),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.enrollmentId).toMatch(/^ENR-\d+$/);
      expect(data.status).toBe("confirmed");
      expect(data.enrolledAt).toBeDefined();
    });

    it("should create enrollment for valid group request", async () => {
      const groupRequest: EnrollmentRequest = {
        courseId: "course-2", // Different course to avoid duplicate
        type: "group",
        applicant: {
          name: "홍길동",
          email: "group-test@example.com", // Unique email
          phone: "010-1234-5678",
        },
        group: {
          organizationName: "ABC Company",
          headCount: 3,
          participants: [
            { name: "홍길동", email: "group-test@example.com" },
            { name: "김철수", email: "kim@example.com" },
            { name: "이영희", email: "lee@example.com" },
          ],
          contactPerson: "010-9876-5432",
        },
        agreedToTerms: true,
      };

      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupRequest),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.enrollmentId).toBeDefined();
    });

    it("should return COURSE_NOT_FOUND for non-existent course", async () => {
      const request = { ...validPersonalRequest, courseId: "nonexistent" };

      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(404);
      expect(data.code).toBe("COURSE_NOT_FOUND");
    });

    it("should return INVALID_INPUT for missing required fields", async () => {
      const invalidRequest = {
        ...validPersonalRequest,
        applicant: {
          name: "",
          email: "",
          phone: "",
        },
      };

      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidRequest),
      });
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
      expect(data.details).toBeDefined();
      expect(data.details?.["applicant.name"]).toBe("이름을 입력해주세요");
      expect(data.details?.["applicant.email"]).toBe("이메일을 입력해주세요");
    });

    it("should return INVALID_INPUT for invalid email format", async () => {
      const invalidRequest = {
        ...validPersonalRequest,
        applicant: {
          ...validPersonalRequest.applicant,
          email: "invalid-email",
        },
      };

      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidRequest),
      });
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
      expect(data.details?.["applicant.email"]).toBe("올바른 이메일 형식이 아닙니다");
    });

    it("should return COURSE_FULL when capacity exceeded", async () => {
      // Use course-7 which has small capacity (maxCapacity: 20, currentEnrollment: 5)
      const fullCourseId = "course-7";

      // Make 15 successful enrollments to fill the course (parallel requests)
      const enrollmentPromises = [];
      for (let i = 0; i < 15; i++) {
        enrollmentPromises.push(
          fetch("/api/enrollments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...validPersonalRequest,
              courseId: fullCourseId,
              applicant: {
                ...validPersonalRequest.applicant,
                email: `fill-${i}-${Date.now()}@example.com`,
              },
            }),
          })
        );
      }
      await Promise.all(enrollmentPromises);

      // Try one more enrollment
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validPersonalRequest,
          courseId: fullCourseId,
          applicant: {
            ...validPersonalRequest.applicant,
            email: `overflow-${Date.now()}@example.com`,
          },
        }),
      });
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.code).toBe("COURSE_FULL");
    }, 10000);

    it("should return DUPLICATE_ENROLLMENT for same email and course", async () => {
      // First enrollment
      await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPersonalRequest),
      });

      // Duplicate enrollment
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPersonalRequest),
      });
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(409);
      expect(data.code).toBe("DUPLICATE_ENROLLMENT");
      expect(data.message).toBe("이미 신청한 강의입니다");
    });

    it("should return INVALID_INPUT for invalid group data", async () => {
      const invalidGroupRequest: EnrollmentRequest = {
        courseId: "course-1",
        type: "group",
        applicant: {
          name: "홍길동",
          email: "hong@example.com",
          phone: "010-1234-5678",
        },
        group: {
          organizationName: "",
          headCount: 1, // Invalid: less than 2
          participants: [{ name: "", email: "" }],
          contactPerson: "",
        },
        agreedToTerms: true,
      };

      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidGroupRequest),
      });
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
      expect(data.details?.["group.organizationName"]).toBe("단첼명을 입력해주세요");
      expect(data.details?.["group.headCount"]).toBe("신청 인원은 2~10명이어야 합니다");
    });
  });
});
