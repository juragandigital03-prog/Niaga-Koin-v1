import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RegistrationTokenPayload } from '../types/jwt-payload.interface';

export interface RegistrationRequest extends Request {
  registrationUserId: string;
}

/**
 * Verifies the short-lived "registration token" issued by POST /auth/register
 * and required by POST /auth/verify-otp (see SDD §7.1: "Auth: Token
 * registrasi sementara"). Deliberately separate from JwtAuthGuard so a
 * registration token can never be reused as a normal access token.
 */
@Injectable()
export class RegistrationTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RegistrationRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

    if (!token) {
      throw new UnauthorizedException('Registration token required');
    }

    let payload: RegistrationTokenPayload;
    try {
      payload = this.jwtService.verify<RegistrationTokenPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired registration token');
    }

    if (payload.purpose !== 'registration') {
      throw new UnauthorizedException('Invalid token purpose');
    }

    request.registrationUserId = payload.sub;
    return true;
  }
}
