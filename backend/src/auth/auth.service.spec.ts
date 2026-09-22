import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { HashService } from './hash.service';
import { OtpProvider } from './otp/otp-provider.interface';

const CONFIG: Record<string, string | number> = {
  JWT_ACCESS_SECRET: 'test-access-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
  OTP_TTL_SECONDS: 300,
  OTP_MAX_ATTEMPTS: 3,
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_LOCKOUT_MINUTES: 15,
};

const fakeConfig = { get: (key: string) => CONFIG[key] } as any;
const fakeLogger = { setContext: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any;

function buildUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-1',
    email: 'rian@example.com',
    phone: null,
    passwordHash: 'hashed',
    status: 'pending_verification',
    role: 'user',
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let prisma: any;
  let hash: HashService;
  let jwt: JwtService;
  let otpProvider: jest.Mocked<OtpProvider>;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      otpChallenge: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };
    hash = new HashService();
    jwt = new JwtService();
    otpProvider = { send: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(prisma, hash, jwt, fakeConfig, fakeLogger, otpProvider);
  });

  describe('register', () => {
    it('creates a new user, issues an OTP, and returns a registration token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(buildUser());
      prisma.otpChallenge.create.mockResolvedValue({ id: 'otp-1' });

      const result = await service.register({ email: 'rian@example.com', password: 'password123' });

      expect(prisma.user.create).toHaveBeenCalled();
      expect(otpProvider.send).toHaveBeenCalledWith(
        'rian@example.com',
        expect.stringMatching(/^\d{6}$/),
      );
      expect(result.userId).toBe('user-1');
      expect(typeof result.registrationToken).toBe('string');
    });

    it('rejects registering an email that is already active', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser({ status: 'active' }));

      await expect(
        service.register({ email: 'rian@example.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('re-issues an OTP for a still-pending registration instead of erroring (acts as resend)', async () => {
      const pending = buildUser({ status: 'pending_verification' });
      prisma.user.findUnique.mockResolvedValue(pending);
      prisma.user.update.mockResolvedValue(pending);
      prisma.otpChallenge.create.mockResolvedValue({ id: 'otp-2' });

      const result = await service.register({ email: 'rian@example.com', password: 'newpassword123' });

      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(result.userId).toBe('user-1');
    });
  });

  describe('verifyOtp', () => {
    it('activates the account when the code matches', async () => {
      const codeHash = await hash.hash('123456');
      prisma.user.findUnique.mockResolvedValue(buildUser());
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'otp-1',
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.verifyOtp('user-1', { code: '123456' });

      expect(result).toEqual({ verified: true });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('rejects a wrong code and increments attempts', async () => {
      const codeHash = await hash.hash('123456');
      prisma.user.findUnique.mockResolvedValue(buildUser());
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'otp-1',
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.verifyOtp('user-1', { code: '000000' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.otpChallenge.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { attempts: { increment: 1 } },
      });
    });

    it('rejects once the max attempt count has been reached (no further guessing)', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'otp-1',
        codeHash: 'irrelevant',
        attempts: 3,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.verifyOtp('user-1', { code: '123456' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('is idempotent for an already-active account', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser({ status: 'active' }));

      const result = await service.verifyOtp('user-1', { code: '123456' });
      expect(result).toEqual({ verified: true });
      expect(prisma.otpChallenge.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns access and refresh tokens for correct credentials', async () => {
      const passwordHash = await hash.hash('password123');
      prisma.user.findUnique.mockResolvedValue(buildUser({ status: 'active', passwordHash }));
      prisma.user.update.mockResolvedValue({});

      const result = await service.login({ email: 'rian@example.com', password: 'password123' });

      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('rejects an unknown email with a generic error (no user enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a locked account even with the correct password', async () => {
      const passwordHash = await hash.hash('password123');
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ status: 'active', passwordHash, lockedUntil: new Date(Date.now() + 60_000) }),
      );

      await expect(
        service.login({ email: 'rian@example.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unverified account', async () => {
      const passwordHash = await hash.hash('password123');
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ status: 'pending_verification', passwordHash }),
      );

      await expect(
        service.login({ email: 'rian@example.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('locks the account after reaching the max failed attempt threshold', async () => {
      const passwordHash = await hash.hash('password123');
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ status: 'active', passwordHash, failedLoginAttempts: 4 }),
      );
      prisma.user.update.mockResolvedValue({});

      await expect(
        service.login({ email: 'rian@example.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: expect.any(Date) }),
      });
    });
  });
});
