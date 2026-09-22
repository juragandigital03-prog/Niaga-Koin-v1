import { randomInt } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { HashService } from './hash.service';
import { OTP_PROVIDER, OtpProvider } from './otp/otp-provider.interface';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hash: HashService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async register(dto: RegisterDto): Promise<{ userId: string; status: string; registrationToken: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (existing && existing.status === 'active') {
      // Deliberately vague — do not confirm which specific field collided
      // beyond "already registered" (avoids exposing password-guessing hints).
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await this.hash.hash(dto.password);

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash },
        })
      : await this.prisma.user.create({
          data: { email: dto.email, passwordHash },
        });

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    // ConfigService always returns raw env strings — Number(...) is required
    // here, Prisma's Int columns reject a numeric string outright.
    const otpTtlSeconds = Number(this.config.get('OTP_TTL_SECONDS') ?? 300);
    const codeHash = await this.hash.hash(code);

    await this.prisma.otpChallenge.create({
      data: {
        userId: user.id,
        purpose: 'registration',
        codeHash,
        maxAttempts: Number(this.config.get('OTP_MAX_ATTEMPTS') ?? 3),
        expiresAt: new Date(Date.now() + otpTtlSeconds * 1000),
      },
    });

    await this.otpProvider.send(dto.email, code);
    this.logger.info({ userId: user.id }, 'Registration OTP issued');

    const registrationToken = this.jwt.sign(
      { sub: user.id, purpose: 'registration' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: otpTtlSeconds,
      },
    );

    return { userId: user.id, status: user.status, registrationToken };
  }

  async verifyOtp(userId: string, dto: VerifyOtpDto): Promise<{ verified: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Akun tidak ditemukan');
    }

    if (user.status === 'active') {
      // Idempotent: re-verifying an already-active account is a no-op, not
      // an error — avoids punishing a duplicate/retried client request.
      return { verified: true };
    }

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { userId, purpose: 'registration', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      throw new BadRequestException('Kode OTP tidak ditemukan atau sudah kedaluwarsa, silakan daftar ulang');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      throw new BadRequestException(
        'Terlalu banyak percobaan salah — silakan daftar ulang untuk mendapatkan kode baru',
      );
    }

    const matches = await this.hash.compare(dto.code, challenge.codeHash);

    if (!matches) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Kode OTP salah');
    }

    await this.prisma.$transaction([
      this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'active' },
      }),
    ]);

    this.logger.info({ userId }, 'Registration OTP verified, account activated');
    return { verified: true };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Same generic error for "no such user" and "wrong password" — never
    // reveal which one it was (prevents account enumeration).
    const invalidCredentials = () => new UnauthorizedException('Email atau password salah');

    if (!user) {
      throw invalidCredentials();
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Akun terkunci sementara akibat terlalu banyak percobaan gagal');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Akun belum terverifikasi — selesaikan verifikasi OTP terlebih dahulu');
    }

    const passwordMatches = await this.hash.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      const maxAttempts = Number(this.config.get('LOGIN_MAX_ATTEMPTS') ?? 5);
      const lockoutMinutes = Number(this.config.get('LOGIN_LOCKOUT_MINUTES') ?? 15);
      const attempts = user.failedLoginAttempts + 1;
      const lockingNow = attempts >= maxAttempts;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lockingNow ? 0 : attempts,
          lockedUntil: lockingNow ? new Date(Date.now() + lockoutMinutes * 60_000) : null,
        },
      });

      if (lockingNow) {
        this.logger.warn({ userId: user.id }, 'Account locked after too many failed login attempts');
      }

      throw invalidCredentials();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const accessToken = this.jwt.sign(
      { sub: user.id, role: user.role, purpose: 'access' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      },
    );
    const refreshToken = this.jwt.sign(
      { sub: user.id, purpose: 'refresh' },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_TTL') ?? '7d',
      },
    );

    this.logger.info({ userId: user.id }, 'Login successful');
    return { accessToken, refreshToken };
  }
}
