import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUser } from '../auth/strategies/jwt.strategy';
import { BotsService } from './bots.service';
import { CreateBotDto } from './dto/create-bot.dto';

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('bots')
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(private readonly bots: BotsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateBotDto) {
    return this.bots.create(req.user.id, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.bots.list(req.user.id);
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.bots.get(req.user.id, id);
  }

  @Patch(':id/start')
  @HttpCode(200)
  start(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.bots.start(req.user.id, id);
  }

  @Patch(':id/pause')
  @HttpCode(200)
  pause(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.bots.pause(req.user.id, id);
  }

  @Patch(':id/stop')
  @HttpCode(200)
  stop(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.bots.stop(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.bots.remove(req.user.id, id);
  }
}
