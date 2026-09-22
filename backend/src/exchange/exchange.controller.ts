import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUser } from '../auth/strategies/jwt.strategy';
import { ExchangeService } from './exchange.service';
import { ConnectExchangeAccountDto } from './dto/connect-exchange-account.dto';

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('exchange-accounts')
@UseGuards(JwtAuthGuard)
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  connect(@Req() req: AuthenticatedRequest, @Body() dto: ConnectExchangeAccountDto) {
    return this.exchangeService.connect(req.user.id, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.exchangeService.list(req.user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async disconnect(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.exchangeService.disconnect(req.user.id, id);
  }
}
