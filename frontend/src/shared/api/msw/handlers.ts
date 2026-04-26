import type {
  Course,
  CourseListResponse,
  EnrollmentRequest,
  EnrollmentResponse,
  ErrorResponse,
} from "@/entities/enrollment";
import { http, HttpResponse, delay } from "msw";
import coursesData from "./mock-data/courses.json";

const categories = ["development", "design", "marketing", "business"];

// Type assertion for JSON data
const courses = coursesData.courses as Course[];

// In-memory store for enrollment tracking (email:courseId)
const enrollments = new Set<string>();

function createErrorResponse(
  code: ErrorResponse["code"],
  message: string,
  details?: Record<string, string>
): ErrorResponse {
  return { code, message, details };
}

function validateEnrollmentRequest(body: EnrollmentRequest): ErrorResponse | null {
  const errors: Record<string, string> = {};

  // Check applicant info
  if (!body.applicant.name?.trim()) {
    errors["applicant.name"] = "이름을 입력해주세요";
  }
  if (!body.applicant.email?.trim()) {
    errors["applicant.email"] = "이메일을 입력해주세요";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.applicant.email)) {
    errors["applicant.email"] = "올바른 이메일 형식이 아닙니다";
  }
  if (!body.applicant.phone?.trim()) {
    errors["applicant.phone"] = "전화번호를 입력해주세요";
  }

  // Check group info for group enrollment
  if (body.type === "group") {
    if (!body.group.organizationName?.trim()) {
      errors["group.organizationName"] = "단체명을 입력해주세요";
    }
    if (!body.group.contactPerson?.trim()) {
      errors["group.contactPerson"] = "담당자 연락처를 입력해주세요";
    }
    if (body.group.headCount < 2 || body.group.headCount > 10) {
      errors["group.headCount"] = "신청 인원은 2~10명이어야 합니다";
    }
    if (body.group.participants.length !== body.group.headCount) {
      errors["group.participants"] = "참가자 명단이 신청 인원과 일치하지 않습니다";
    }
    body.group.participants.forEach((p, index) => {
      if (!p.name?.trim()) {
        errors[`group.participants.${index}.name`] = `참가자 ${index + 1}의 이름을 입력해주세요`;
      }
      if (!p.email?.trim()) {
        errors[`group.participants.${index}.email`] = `참가자 ${index + 1}의 이메일을 입력해주세요`;
      }
    });
  }

  if (Object.keys(errors).length > 0) {
    return createErrorResponse("INVALID_INPUT", "입력값을 확인해 주세요", errors);
  }

  return null;
}

export const handlers = [
  // Get all courses
  http.get("/api/courses", async ({ request }) => {
    await delay(800);

    const url = new URL(request.url);
    const category = url.searchParams.get("category");

    let filteredCourses = courses;
    if (category && category !== "all") {
      filteredCourses = courses.filter((c) => c.category === category);
    }

    const response: CourseListResponse = {
      courses: filteredCourses,
      categories,
    };

    return HttpResponse.json(response);
  }),

  // Get course by ID
  http.get("/api/courses/:id", async ({ params }) => {
    await delay(300);

    const course = courses.find((c) => c.id === params.id);

    if (!course) {
      return HttpResponse.json(createErrorResponse("COURSE_NOT_FOUND", "강의를 찾을 수 없습니다"), {
        status: 404,
      });
    }

    return HttpResponse.json(course);
  }),

  // Create enrollment
  http.post("/api/enrollments", async ({ request }) => {
    await delay(1500);

    const body = (await request.json()) as EnrollmentRequest;
    const course = courses.find((c) => c.id === body.courseId);

    if (!course) {
      return HttpResponse.json(createErrorResponse("COURSE_NOT_FOUND", "강의를 찾을 수 없습니다"), {
        status: 404,
      });
    }

    // 1. Validate input
    const validationError = validateEnrollmentRequest(body);
    if (validationError) {
      return HttpResponse.json(validationError, { status: 400 });
    }

    // 2. Check capacity
    if (course.currentEnrollment >= course.maxCapacity) {
      return HttpResponse.json(createErrorResponse("COURSE_FULL", "정원이 초과되었습니다"), {
        status: 400,
      });
    }

    // 3. Check duplicate enrollment (by email)
    const enrollmentKey = `${body.applicant.email}:${body.courseId}`;
    if (enrollments.has(enrollmentKey)) {
      return HttpResponse.json(
        createErrorResponse("DUPLICATE_ENROLLMENT", "이미 신청한 강의입니다"),
        { status: 409 }
      );
    }

    // Success: Save enrollment and update capacity
    enrollments.add(enrollmentKey);
    course.currentEnrollment += 1;

    const response: EnrollmentResponse = {
      enrollmentId: `ENR-${Date.now()}`,
      status: "confirmed",
      enrolledAt: new Date().toISOString(),
    };

    return HttpResponse.json(response, { status: 201 });
  }),
];

// Export combined handlers
export { authHandlers } from "./auth-handlers";
