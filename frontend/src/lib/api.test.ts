import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiError, setAccessToken } from './api';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    setAccessToken(null);
    vi.unstubAllGlobals();
  });

  it('sends the stored access token as a Bearer header by default', async () => {
    setAccessToken('token-123');
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await apiFetch('/wallet');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
  });

  it('omits the Authorization header when auth is false', async () => {
    setAccessToken('token-123');
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    await apiFetch('/auth/login', { method: 'POST', body: {}, auth: false });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('uses authToken over the stored access token when both are present', async () => {
    setAccessToken('stored-token');
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    await apiFetch('/auth/verify-otp', { method: 'POST', authToken: 'registration-token' });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer registration-token');
  });

  it('returns parsed JSON on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ symbol: 'BTCUSDT', price: 65000 }), { status: 200 }),
    );

    const result = await apiFetch<{ symbol: string; price: number }>('/market-data/ticker/BTCUSDT', {
      auth: false,
    });

    expect(result).toEqual({ symbol: 'BTCUSDT', price: 65000 });
  });

  it('throws ApiError with the backend message on a non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Email atau password salah', statusCode: 401 }), {
        status: 401,
      }),
    );

    await expect(apiFetch('/auth/login', { method: 'POST', auth: false })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Email atau password salah',
    });
  });

  it('joins an array validation message into one string', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: ['email must be an email', 'password too short'] }), {
        status: 400,
      }),
    );

    await expect(apiFetch('/auth/register', { method: 'POST', auth: false })).rejects.toThrow(
      'email must be an email, password too short',
    );
  });

  it('is an instance of ApiError', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 500 }));
    try {
      await apiFetch('/health', { auth: false });
      throw new Error('expected apiFetch to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });
});
