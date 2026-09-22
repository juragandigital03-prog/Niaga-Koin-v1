import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Fase 2 scope: registrasi email saja. SRS mengizinkan "email dan/atau
 * telepon" — telepon butuh SMS gateway yang belum dipilih (lihat
 * .env.example OTP_PROVIDER=TBD), jadi ditunda sampai provider itu ada
 * (bukan dihilangkan diam-diam — didokumentasikan di PROJECT_STATUS.md).
 */
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  password!: string;
}
