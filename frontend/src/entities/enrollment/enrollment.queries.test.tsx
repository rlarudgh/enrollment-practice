import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { handlers } from "../../shared/api/msw/handlers";
import {
  toEnrollmentRequest,
  useCourse,
  useCourses,
  useSubmitEnrollment,
} from "./enrollment.queries";
import type { EnrollmentFormData } from "./enrollment.types";

const server = setupServer(...handlers);

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useCourses", () => {
  beforeAll(() => server.listen());
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  it("should fetch all courses when no category specified", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCourses(), { wrapper });

    // Initial state
    expect(result.current.isLoading).toBe(true);

    // Wait for data
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.courses).toHaveLength(8);
    expect(result.current.data?.categories).toContain("development");
    expect(result.current.data?.categories).toContain("design");
  });

  it("should fetch courses filtered by category", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCourses("development"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.courses).toHaveLength(2);
    expect(result.current.data?.courses[0].category).toBe("development");
  });

  it("should handle empty category result", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCourses("nonexistent"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.courses).toHaveLength(0);
  });

  it("should cache data with correct query key", async () => {
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(({ category }) => useCourses(category), {
      wrapper,
      initialProps: { category: undefined as string | undefined },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstData = result.current.data;

    // Rerender with same category
    rerender({ category: undefined });

    // Should return cached data immediately
    expect(result.current.data).toBe(firstData);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useCourse", () => {
  beforeAll(() => server.listen());
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  it("should fetch course by id", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCourse("course-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.id).toBe("course-1");
    expect(result.current.data?.title).toBe("React 완벽 가이드");
  });

  it("should not fetch when id is empty", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCourse(""), { wrapper });

    // Should be idle since enabled is false
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("should handle non-existent course", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCourse("nonexistent"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe("useSubmitEnrollment", () => {
  beforeAll(() => server.listen());
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  const validFormData: EnrollmentFormData = {
    courseId: "course-1",
    type: "personal",
    applicant: {
      name: "홍길동",
      email: `test-${Date.now()}@example.com`, // Unique email
      phone: "010-1234-5678",
    },
    agreedToTerms: true,
  };

  it("should submit enrollment successfully", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubmitEnrollment(), { wrapper });

    result.current.mutate(validFormData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.enrollmentId).toMatch(/^ENR-\d+$/);
    expect(result.current.data?.status).toBe("confirmed");
  });

  it("should handle validation error", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubmitEnrollment(), { wrapper });

    const invalidData: EnrollmentFormData = {
      ...validFormData,
      applicant: {
        ...validFormData.applicant,
        name: "", // Invalid
      },
    };

    result.current.mutate(invalidData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain("입력값을 확인해 주세요");
  });

  it("should handle duplicate enrollment error", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubmitEnrollment(), { wrapper });

    const duplicateEmail = `duplicate-${Date.now()}@example.com`;
    const data: EnrollmentFormData = {
      ...validFormData,
      applicant: {
        ...validFormData.applicant,
        email: duplicateEmail,
      },
    };

    // First submission
    result.current.mutate(data);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Second submission with same email
    const { result: result2 } = renderHook(() => useSubmitEnrollment(), { wrapper });
    result2.current.mutate(data);

    await waitFor(() => expect(result2.current.isError).toBe(true));
    expect(result2.current.error?.message).toContain("이미 신청한 강의입니다");
  });

  it("should handle course full error", async () => {
    const wrapper = createWrapper();

    // Fill up course-3 (capacity: 20)
    const { result: fillResult } = renderHook(() => useSubmitEnrollment(), { wrapper });

    for (let i = 0; i < 12; i++) {
      fillResult.current.mutate({
        courseId: "course-3",
        type: "personal",
        applicant: {
          name: `User${i}`,
          email: `fill-${Date.now()}-${i}@example.com`,
          phone: "010-0000-0000",
        },
        agreedToTerms: true,
      });
      await waitFor(() =>
        expect(fillResult.current.isSuccess || fillResult.current.isError).toBe(true)
      );
    }

    // Try to enroll in full course
    const { result } = renderHook(() => useSubmitEnrollment(), { wrapper });
    result.current.mutate({
      courseId: "course-3",
      type: "personal",
      applicant: {
        name: "Test",
        email: `full-${Date.now()}@example.com`,
        phone: "010-1234-5678",
      },
      agreedToTerms: true,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("정원이 초과되었습니다");
  });
});

describe("toEnrollmentRequest integration", () => {
  it("should work with useSubmitEnrollment", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubmitEnrollment(), { wrapper });

    const formData: EnrollmentFormData = {
      courseId: "course-2",
      type: "group",
      applicant: {
        name: "홍길동",
        email: `group-${Date.now()}@example.com`,
        phone: "010-1234-5678",
      },
      group: {
        organizationName: "Test Company",
        headCount: 2,
        participants: [
          { name: "User1", email: "user1@example.com" },
          { name: "User2", email: "user2@example.com" },
        ],
        contactPerson: "010-9876-5432",
      },
      agreedToTerms: true,
    };

    // Verify transformation before submission
    const request = toEnrollmentRequest(formData);
    expect(request.type).toBe("group");
    expect(request.group.headCount).toBe(2);

    // Submit with form data (hook internally transforms)
    result.current.mutate(formData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.enrollmentId).toBeDefined();
  });
});
