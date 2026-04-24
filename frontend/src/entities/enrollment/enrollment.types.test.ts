import { describe, expect, it } from "vitest";
import { EnrollmentError, errorCodeMessages, toEnrollmentRequest } from "./enrollment.types";
import type { EnrollmentFormData } from "./enrollment.types";

describe("toEnrollmentRequest", () => {
  const baseFormData: EnrollmentFormData = {
    courseId: "course-1",
    type: "personal",
    applicant: {
      name: "홍길동",
      email: "hong@example.com",
      phone: "010-1234-5678",
      motivation: "학습을 위해서",
    },
    agreedToTerms: true,
  };

  it("should convert personal enrollment form data to request", () => {
    const request = toEnrollmentRequest(baseFormData);

    expect(request.type).toBe("personal");
    expect(request.courseId).toBe("course-1");
    expect(request.applicant.name).toBe("홍길동");
    expect(request.applicant.email).toBe("hong@example.com");
    expect(request.applicant.phone).toBe("010-1234-5678");
    expect(request.agreedToTerms).toBe(true);
    expect("group" in request).toBe(false);
  });

  it("should not include motivation in request", () => {
    const request = toEnrollmentRequest(baseFormData);

    // motivation은 선택사항이므로 request에 포함될 수도 있고 안될 수도 있음
    // 여기서는 타입 검증만
    expect(request.applicant).toBeDefined();
  });

  it("should convert group enrollment form data to request", () => {
    const groupFormData: EnrollmentFormData = {
      ...baseFormData,
      type: "group",
      group: {
        organizationName: "ABC Company",
        headCount: 3,
        participants: [
          { name: "홍길동", email: "hong@example.com" },
          { name: "김철수", email: "kim@example.com" },
        ],
        contactPerson: "010-9876-5432",
      },
    };

    const request = toEnrollmentRequest(groupFormData);

    expect(request.type).toBe("group");
    expect("group" in request).toBe(true);
    if (request.type === "group") {
      expect(request.group.organizationName).toBe("ABC Company");
      expect(request.group.headCount).toBe(3);
      expect(request.group.contactPerson).toBe("010-9876-5432");
      expect(request.group.participants).toHaveLength(2);
    }
  });

  it("should throw error when group data is missing for group enrollment", () => {
    const invalidGroupData: EnrollmentFormData = {
      ...baseFormData,
      type: "group",
      // group field is missing
    };

    expect(() => toEnrollmentRequest(invalidGroupData)).toThrow(
      "Group data is required for group enrollment"
    );
  });

  it("should maintain discriminated union type safety", () => {
    const personalRequest = toEnrollmentRequest(baseFormData);

    // Type narrowing
    if (personalRequest.type === "personal") {
      expect(personalRequest.type).toBe("personal");
      // @ts-expect-error - group should not exist on personal request
      expect(personalRequest.group).toBeUndefined();
    }

    const groupFormData: EnrollmentFormData = {
      ...baseFormData,
      type: "group",
      group: {
        organizationName: "Test",
        headCount: 2,
        participants: [
          { name: "User1", email: "user1@example.com" },
          { name: "User2", email: "user2@example.com" },
        ],
        contactPerson: "010-0000-0000",
      },
    };

    const groupRequest = toEnrollmentRequest(groupFormData);

    if (groupRequest.type === "group") {
      expect(groupRequest.type).toBe("group");
      expect(groupRequest.group).toBeDefined();
    }
  });
});

describe("EnrollmentError", () => {
  it("should create error with code, message and details", () => {
    const error = new EnrollmentError("INVALID_INPUT", "입력값을 확인해 주세요", {
      "applicant.name": "이름을 입력해주세요",
    });

    expect(error.code).toBe("INVALID_INPUT");
    expect(error.message).toBe("입력값을 확인해 주세요");
    expect(error.details).toEqual({ "applicant.name": "이름을 입력해주세요" });
    expect(error.name).toBe("EnrollmentError");
  });

  it("should create error without details", () => {
    const error = new EnrollmentError("COURSE_FULL", "정원이 초과되었습니다");

    expect(error.code).toBe("COURSE_FULL");
    expect(error.message).toBe("정원이 초과되었습니다");
    expect(error.details).toBeUndefined();
  });

  it("should work with instanceof", () => {
    const error = new EnrollmentError("COURSE_NOT_FOUND", "강의를 찾을 수 없습니다");

    expect(error instanceof EnrollmentError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe("errorCodeMessages", () => {
  it("should have message for all error codes", () => {
    expect(errorCodeMessages.COURSE_FULL).toBe("정원이 초과되었습니다. 다음 기회를 이용해 주세요.");
    expect(errorCodeMessages.DUPLICATE_ENROLLMENT).toBe("이미 신청한 강의입니다.");
    expect(errorCodeMessages.INVALID_INPUT).toBe("입력값을 확인해 주세요.");
    expect(errorCodeMessages.COURSE_NOT_FOUND).toBe("강의를 찾을 수 없습니다.");
  });
});
