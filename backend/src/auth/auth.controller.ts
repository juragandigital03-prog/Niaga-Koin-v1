import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RegistrationRequest, RegistrationTokenGuard } from './guards/registration-token.guard';

// NFR-SEC-007: endpoint login/OTP termasuk kategori rate limit paling ketat.
const SENSITIVE_AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle(SENSITIVE_AUTH_THROTTLE)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-otp')
  @HttpCode(200)
  @Throttle(SENSITIVE_AUTH_THROTTLE)
  @UseGuards(RegistrationTokenGuard)
  verifyOtp(@Req() req: RegistrationRequest, @Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(req.registrationUserId, dto);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(SENSITIVE_AUTH_THROTTLE)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
