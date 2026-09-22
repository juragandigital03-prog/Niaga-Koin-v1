import { UserRole } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  purpose: 'access';
}

export interface RegistrationTokenPayload {
  sub: string;
  purpose: 'registration';
}
