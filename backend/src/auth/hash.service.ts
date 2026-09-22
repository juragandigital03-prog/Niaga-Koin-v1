import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Thin wrapper so the rest of AuthService doesn't depend on bcryptjs
 * directly — used for both password hashing (NFR-SEC-001) and OTP code
 * hashing (OTP codes are never stored in plaintext).
 */
@Injectable()
export class HashService {
  hash(value: string): Promise<string> {
    return bcrypt.hash(value, SALT_ROUNDS);
  }

  compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}
