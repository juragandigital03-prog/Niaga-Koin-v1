import { IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Length(6, 6, { message: 'Kode OTP harus 6 digit' })
  code!: string;
}
