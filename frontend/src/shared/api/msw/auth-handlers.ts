import type { AuthError, LoginRequest, LoginResponse, User } from "@/entities/user/user.types";
import { http, HttpResponse, delay } from "msw";
import usersData from "./mock-data/users.json";

// Mock users
const users = usersData.users as User[];

// Simple token storage (in-memory)
const tokens = new Map<string, User>();

function generateToken(): string {
  return `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const authHandlers = [
  // Login
  http.post("/api/auth/login", async ({ request }) => {
    await delay(800);

    const body = (await request.json()) as LoginRequest;
    const { email, password } = body;

    // Simple validation
    if (!email || !password) {
      return HttpResponse.json(
        { code: "INVALID_CREDENTIALS", message: "이메일과 비밀번호를 입력해주세요" } as AuthError,
        { status: 400 }
      );
    }

    // Mock authentication (any password works for demo)
    const user = users.find((u) => u.email === email);

    if (!user) {
      return HttpResponse.json(
        {
          code: "INVALID_CREDENTIALS",
          message: "이메일 또는 비밀번호가 올바르지 않습니다",
        } as AuthError,
        { status: 401 }
      );
    }

    const token = generateToken();
    tokens.set(token, user);

    const response: LoginResponse = {
      token,
      user,
    };

    return HttpResponse.json(response, { status: 200 });
  }),

  // Get current user
  http.get("/api/auth/me", async ({ request }) => {
    await delay(300);

    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token || !tokens.has(token)) {
      return HttpResponse.json(
        { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } as AuthError,
        { status: 401 }
      );
    }

    const user = tokens.get(token);
    if (!user) {
      return HttpResponse.json(
        { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } as AuthError,
        { status: 401 }
      );
    }
    return HttpResponse.json({ user });
  }),

  // Logout
  http.post("/api/auth/logout", async ({ request }) => {
    await delay(300);

    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token) {
      tokens.delete(token);
    }

    return HttpResponse.json({ success: true });
  }),
];
