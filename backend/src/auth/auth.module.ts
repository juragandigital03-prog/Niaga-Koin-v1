import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HashService } from './hash.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegistrationTokenGuard } from './guards/registration-token.guard';
import { RolesGuard } from './guards/roles.guard';
import { OTP_PROVIDER } from './otp/otp-provider.interface';
import { ConsoleOtpProvider } from './otp/console-otp.provider';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_ACCESS_TTL') ?? '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    HashService,
    JwtStrategy,
    JwtAuthGuard,
    RegistrationTokenGuard,
    RolesGuard,
    // Dev-only OTP delivery — swap this binding for a real provider once
    // Fase 7 (Notification Worker) exists. See otp-provider.interface.ts.
    { provide: OTP_PROVIDER, useClass: ConsoleOtpProvider },
  ],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
