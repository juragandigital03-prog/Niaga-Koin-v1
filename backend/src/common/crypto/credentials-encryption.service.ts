import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts secrets at rest (exchange API keys/secrets — NFR-SEC-005/006).
 * Never stores plaintext; ciphertext is useless without both the app's
 * CREDENTIALS_ENCRYPTION_KEY and the per-value random IV/auth tag.
 *
 * The env var can be any passphrase string — it's hashed down to a fixed
 * 32-byte AES-256 key rather than requiring the operator to generate raw
 * key bytes by hand (simpler to operate correctly, still a full 256-bit key).
 */
@Injectable()
export class CredentialsEncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const passphrase = config.get<string>('CREDENTIALS_ENCRYPTION_KEY');
    if (!passphrase) {
      throw new Error('Missing required environment variable: CREDENTIALS_ENCRYPTION_KEY');
    }
    this.key = createHash('sha256').update(passphrase).digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
  }

  decrypt(encoded: string): string {
    const raw = Buffer.from(encoded, 'base64');
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
