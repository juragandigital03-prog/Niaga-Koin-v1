// Auth API calls (see API_CONTRACT.md "Auth"). Kept separate from
// AuthContext.tsx: these are plain request functions, not session state.
import { apiFetch } from './api';

export interface RegisterResponse {
  userId: string;
  status: string;
  registrationToken: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  status: string;
  role: string;
  createdAt: string;
}

export function register(email: string, password: string): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>('/auth/register', { method: 'POST', body: { email, password }, auth: false });
}

/** `registrationToken` is the short-lived token from register(), not the access token. */
export function verifyOtp(registrationToken: string, code: string): Promise<{ verified: boolean }> {
  return apiFetch<{ verified: boolean }>('/auth/verify-otp', {
    method: 'POST',
    body: { code },
    authToken: registrationToken,
  });
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false });
}

export function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/users/me');
}
