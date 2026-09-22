import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload } from '../types/jwt-payload.interface';

export interface RequestUser {
  id: string;
  role: AccessTokenPayload['role'];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') as string,
    });
  }

  validate(payload: AccessTokenPayload): RequestUser {
    if (payload.purpose !== 'access') {
      // A registration token (or anything else) must never authorize app
      // routes — this is the enforcement point for that boundary.
      throw new UnauthorizedException('Invalid token purpose');
    }
    return { id: payload.sub, role: payload.role };
  }
}
