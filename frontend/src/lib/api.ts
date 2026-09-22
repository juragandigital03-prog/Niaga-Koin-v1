// Thin fetch wrapper for the GAIN backend (see API_CONTRACT.md). No data
// library (react-query/swr) — scope so far is small enough that raw fetch
// + a typed error class is simpler than adding a dependency for it.

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000/api/v1';

let accessToken: string | null = null;

/** Set by AuthContext on login/logout/hydration — kept out of React state
 * so every apiFetch call (including ones outside a component) sees it. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send the stored access token. Default true; set false for public
   * endpoints (login/register) or when authToken is supplied instead. */
  auth?: boolean;
  /** Use this token instead of the stored access token — e.g. the
   * short-lived registrationToken for POST /auth/verify-otp. */
  authToken?: string;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, authToken } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = authToken ?? (auth ? accessToken : null);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, extractMessage(data, `Permintaan gagal (${res.status})`), data);
  }

  return data as T;
}
