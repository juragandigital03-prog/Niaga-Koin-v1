import { Controller, Get, NotFoundException, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      throw new NotFoundException('Akun tidak ditemukan');
    }

    // Never return passwordHash — this is the one place that would be
    // trivial to leak by accident (spread the Prisma row) and it must not
    // happen (NFR-SEC-001, KONTRAK BACKEND: error/response tidak boleh
    // membocorkan detail internal).
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
