export type UserRole = "CREATOR" | "CLASSMATE";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthError {
  code: "INVALID_CREDENTIALS" | "TOKEN_EXPIRED" | "UNAUTHORIZED";
  message: string;
}
