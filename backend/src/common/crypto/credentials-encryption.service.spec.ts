import { CredentialsEncryptionService } from './credentials-encryption.service';

function serviceWithKey(key = 'test-passphrase-for-unit-tests') {
  const config = { get: () => key } as any;
  return new CredentialsEncryptionService(config);
}

describe('CredentialsEncryptionService', () => {
  it('throws at construction time if CREDENTIALS_ENCRYPTION_KEY is missing (fail fast, not on first use)', () => {
    const config = { get: () => undefined } as any;
    expect(() => new CredentialsEncryptionService(config)).toThrow(/CREDENTIALS_ENCRYPTION_KEY/);
  });

  it('round-trips a plaintext value through encrypt/decrypt', () => {
    const svc = serviceWithKey();
    const ciphertext = svc.encrypt('super-secret-api-key');
    expect(svc.decrypt(ciphertext)).toBe('super-secret-api-key');
  });

  it('never stores the plaintext inside the ciphertext', () => {
    const svc = serviceWithKey();
    const ciphertext = svc.encrypt('super-secret-api-key');
    expect(ciphertext).not.toContain('super-secret-api-key');
  });

  it('produces different ciphertext for the same plaintext each time (random IV)', () => {
    const svc = serviceWithKey();
    const a = svc.encrypt('same-value');
    const b = svc.encrypt('same-value');
    expect(a).not.toBe(b);
  });

  it('fails to decrypt if the ciphertext has been tampered with (GCM integrity check)', () => {
    const svc = serviceWithKey();
    const ciphertext = svc.encrypt('super-secret-api-key');
    const tampered = Buffer.from(ciphertext, 'base64');
    tampered[tampered.length - 1] ^= 0xff; // flip a byte in the ciphertext portion
    expect(() => svc.decrypt(tampered.toString('base64'))).toThrow();
  });

  it('cannot decrypt a value encrypted under a different key', () => {
    const encrypted = serviceWithKey('key-a').encrypt('super-secret-api-key');
    expect(() => serviceWithKey('key-b').decrypt(encrypted)).toThrow();
  });
});
