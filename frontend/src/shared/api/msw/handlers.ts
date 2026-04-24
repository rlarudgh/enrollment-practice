import type {
  Course,
  CourseListResponse,
  EnrollmentRequest,
  EnrollmentResponse,
  ErrorResponse,
} from "@/entities/enrollment";
import { http, HttpResponse, delay } from "msw";

const categories = ["development", "design", "marketing", "business"];

const courses: Course[] = [
  {
    id: "course-1",
    title: "React 완벽 가이드",
    description: "React의 기초부터 고급 패턴까지 완벽하게 학습합니다.",
    category: "development",
    price: 150000,
    maxCapacity: 30,
    currentEnrollment: 25,
    startDate: "2024-05-01",
    endDate: "2024-05-31",
    instructor: "김민수",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=225&fit=crop",
  },
  {
    id: "course-2",
    title: "TypeScript 마스터 클래스",
    description: "TypeScript의 타입 시스템을 깊이 있게 이해합니다.",
    category: "development",
    price: 180000,
    maxCapacity: 25,
    currentEnrollment: 20,
    startDate: "2024-06-01",
    endDate: "2024-06-30",
    instructor: "박지현",
    thumbnail: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400&h=225&fit=crop",
  },
  {
    id: "course-3",
    title: "UI/UX 디자인 기초",
    description: "사용자 중심 디자인의 기본 원칙부터 학습합니다.",
    category: "design",
    price: 200000,
    maxCapacity: 20,
    currentEnrollment: 8,
    startDate: "2024-05-15",
    endDate: "2024-06-15",
    instructor: "이서연",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=225&fit=crop",
  },
  {
    id: "course-4",
    title: "Figma 실무 활용",
    description: "Figma를 활용한 디자인 시스템 구축과 협업 워크플로우.",
    category: "design",
    price: 160000,
    maxCapacity: 25,
    currentEnrollment: 23,
    startDate: "2024-07-01",
    endDate: "2024-07-31",
    instructor: "최준호",
    thumbnail: "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=400&h=225&fit=crop",
  },
  {
    id: "course-5",
    title: "디지털 마케팅 전략",
    description: "퍼포먼스 마케팅부터 브랜딩까지.",
    category: "marketing",
    price: 220000,
    maxCapacity: 40,
    currentEnrollment: 35,
    startDate: "2024-05-10",
    endDate: "2024-06-10",
    instructor: "정미래",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop",
  },
  {
    id: "course-6",
    title: "콘텐츠 마케팅 실전",
    description: "효과적인 콘텐츠 기획과 제작.",
    category: "marketing",
    price: 170000,
    maxCapacity: 30,
    currentEnrollment: 12,
    startDate: "2024-08-01",
    endDate: "2024-08-31",
    instructor: "강다은",
    thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop",
  },
  {
    id: "course-7",
    title: "스타트업 비즈니스 모델",
    description: "스타트업의 비즈니스 모델 설계와 검증.",
    category: "business",
    price: 250000,
    maxCapacity: 20,
    currentEnrollment: 5,
    startDate: "2024-06-15",
    endDate: "2024-07-15",
    instructor: "송재현",
    thumbnail: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=225&fit=crop",
  },
  {
    id: "course-8",
    title: "리더십과 팀 빌딩",
    description: "효과적인 리더십 발휘와 팀 구성.",
    category: "business",
    price: 280000,
    maxCapacity: 25,
    currentEnrollment: 18,
    startDate: "2024-09-01",
    endDate: "2024-09-30",
    instructor: "윤상훈",
    thumbnail: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=225&fit=crop",
  },
];

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
      errors["group.organizationName"] = "단첼명을 입력해주세요";
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
