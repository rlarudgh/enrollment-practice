import { useAuth } from "@/features/auth/model/auth-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  Course,
  CourseListResponse,
  EnrollmentRequest,
  EnrollmentResponse,
  ErrorResponse,
} from "./enrollment.types";
import { EnrollmentError, errorCodeMessages, toEnrollmentRequest } from "./enrollment.types";
import type { EnrollmentFormData } from "./index";

const API_BASE_URL = "/api";

// Custom fetch error handler with auth check
function useAuthenticatedFetch() {
  const { getToken, handleSessionExpired } = useAuth();

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - session expired
    if (response.status === 401) {
      handleSessionExpired();
      throw new EnrollmentError("UNAUTHORIZED", "세션이 만료되었습니다. 다시 로그인해주세요.");
    }

    return response;
  };

  return { fetchWithAuth };
}

// Custom fetch error handler
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = (await response.json()) as ErrorResponse;
    throw new EnrollmentError(
      error.code,
      error.message || errorCodeMessages[error.code] || "알 수 없는 오류가 발생했습니다",
      error.details
    );
  }
  return response.json();
}

// React Query Hooks
export function useCourses(category?: string) {
  const { fetchWithAuth } = useAuthenticatedFetch();

  return useQuery({
    queryKey: ["courses", category],
    queryFn: async () => {
      const params = category && category !== "all" ? `?category=${category}` : "";
      const response = await fetchWithAuth(`${API_BASE_URL}/courses${params}`);
      return handleResponse<CourseListResponse>(response);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCourse(id: string) {
  const { fetchWithAuth } = useAuthenticatedFetch();

  return useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const response = await fetchWithAuth(`${API_BASE_URL}/courses/${id}`);
      return handleResponse<Course>(response);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEnrollment() {
  const { fetchWithAuth } = useAuthenticatedFetch();

  return useMutation({
    mutationFn: async (data: EnrollmentRequest) => {
      const response = await fetchWithAuth(`${API_BASE_URL}/enrollments`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return handleResponse<EnrollmentResponse>(response);
    },
  });
}

// Helper function to convert form data and submit
export function useSubmitEnrollment() {
  const mutation = useCreateEnrollment();

  const submit = (formData: EnrollmentFormData) => {
    const request = toEnrollmentRequest(formData);
    return mutation.mutateAsync(request);
  };

  return {
    ...mutation,
    submit,
  };
}

export { toEnrollmentRequest, errorCodeMessages };
export { EnrollmentError };
