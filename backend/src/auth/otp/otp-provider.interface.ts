export const OTP_PROVIDER = Symbol('OTP_PROVIDER');

/**
 * Abstraction over however an OTP code actually reaches the user
 * (SMS/email/Telegram — see SRS §6.1/§6.2, all still TBD/no provider
 * chosen). Kept as an interface so a real provider can be swapped in
 * later (Fase 7, Notification Worker) without touching AuthService.
 */
export interface OtpProvider {
  send(destination: string, code: string): Promise<void>;
}
