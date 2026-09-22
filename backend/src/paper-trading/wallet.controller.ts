import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUser } from '../auth/strategies/jwt.strategy';
import { WalletService } from './wallet.service';

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  get(@Req() req: AuthenticatedRequest) {
    return this.wallet.getSummary(req.user.id);
  }

  @Post('reset')
  reset(@Req() req: AuthenticatedRequest) {
    return this.wallet.reset(req.user.id);
  }
}
