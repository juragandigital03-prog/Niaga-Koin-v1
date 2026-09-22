import { Injectable, Logger } from '@nestjs/common';
import { OtpProvider } from './otp-provider.interface';

/**
 * DEV-ONLY OTP delivery: logs the code instead of sending it via a real
 * SMS/email/Telegram provider (none is chosen yet — OTP_PROVIDER=TBD in
 * .env.example). This must never be the provider wired in a production
 * deployment — swap this binding in AuthModule once Fase 7's Notification
 * Worker exists.
 */
@Injectable()
export class ConsoleOtpProvider implements OtpProvider {
  private readonly logger = new Logger(ConsoleOtpProvider.name);

  async send(destination: string, code: string): Promise<void> {
    this.logger.warn(
      `[DEV OTP — no real provider configured] destination=${destination} code=${code}`,
    );
  }
}
