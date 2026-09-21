import { Controller, Get, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface HealthResponse {
  status: 'ok';
  timestamp: string;
  database: 'ok';
  tradingMode: 'paper-only';
  liveTradingEnabled: false;
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(200)
  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database connection failed');
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'ok',
      // Explicit in the health payload so paper/live status is never ambiguous
      // to anyone monitoring the system (see master prompt: "tampilkan status
      // PAPER TRADING secara sangat jelas").
      tradingMode: 'paper-only',
      liveTradingEnabled: false,
    };
  }
}
