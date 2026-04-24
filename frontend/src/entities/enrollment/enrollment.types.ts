export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  maxCapacity: number;
  currentEnrollment: number;
  startDate: string;
  endDate: string;
  instructor: string;
  thumbnail?: string;
}

export interface CourseListResponse {
  courses: Course[];
  categories: string[];
}

export type EnrollmentType = "personal" | "group";

export interface ApplicantInfo {
  name: string;
  email: string;
  phone: string;
  motivation?: string;
}

export interface GroupInfo {
  organizationName: string;
  headCount: number;
  participants: Array<{ name: string; email: string }>;
  contactPerson: string;
}

// API Request Types (Discriminated Union)
export interface PersonalEnrollmentRequest {
  courseId: string;
  type: "personal";
  applicant: ApplicantInfo;
  agreedToTerms: boolean;
}

export interface GroupEnrollmentRequest {
  courseId: string;
  type: "group";
  applicant: ApplicantInfo;
  group: GroupInfo;
  agreedToTerms: boolean;
}

export type EnrollmentRequest = PersonalEnrollmentRequest | GroupEnrollmentRequest;

// Form State Type (UI에서 사용)
export interface EnrollmentFormData {
  courseId: string;
  type: EnrollmentType;
  applicant: ApplicantInfo;
  group?: GroupInfo;
  agreedToTerms: boolean;
}

// Transform function: FormData -> API Request
export function toEnrollmentRequest(formData: EnrollmentFormData): EnrollmentRequest {
  if (formData.type === "personal") {
    return {
      courseId: formData.courseId,
      type: "personal",
      applicant: formData.applicant,
      agreedToTerms: formData.agreedToTerms,
    };
  }

  if (!formData.group) {
    throw new Error("Group data is required for group enrollment");
  }

  return {
    courseId: formData.courseId,
    type: "group",
    applicant: formData.applicant,
    group: formData.group,
    agreedToTerms: formData.agreedToTerms,
  };
}

export interface EnrollmentResponse {
  enrollmentId: string;
  status: "confirmed" | "pending";
  enrolledAt: string;
}

export interface ErrorResponse {
  code: "COURSE_FULL" | "DUPLICATE_ENROLLMENT" | "INVALID_INPUT" | "COURSE_NOT_FOUND";
  message: string;
  details?: Record<string, string>;
}

export type EnrollmentStep = 1 | 2 | 3;

// Custom Error Class
export class EnrollmentError extends Error {
  constructor(
    public code: ErrorResponse["code"],
    message: string,
    public details?: Record<string, string>
  ) {
    super(message);
    this.name = "EnrollmentError";
  }
}

// Error code to message mapping
export const errorCodeMessages: Record<ErrorResponse["code"], string> = {
  COURSE_FULL: "정원이 초과되었습니다. 다음 기회를 이용해 주세요.",
  DUPLICATE_ENROLLMENT: "이미 신청한 강의입니다.",
  INVALID_INPUT: "입력값을 확인해 주세요.",
  COURSE_NOT_FOUND: "강의를 찾을 수 없습니다.",
};
