import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Prisma, StrategyType } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { CreateBotDto } from './dto/create-bot.dto';

@Injectable()
export class BotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly marketData: MarketDataService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(BotsService.name);
  }

  private get maxBotsPerUser(): number {
    // Stand-in for a real subscription-tier limit (F-SUB-01 is still a
    // documented gap — see PROJECT_STATUS.md/FEATURE_MATRIX.md). One flat
    // configurable limit for every user until that decision exists.
    return Number(this.config.get('MAX_BOTS_PER_USER') ?? 10);
  }

  async create(userId: string, dto: CreateBotDto): Promise<Bot> {
    const symbol = dto.symbol.toUpperCase();
    if (!this.marketData.supportedSymbols.includes(symbol)) {
      throw new BadRequestException(
        `Symbol tidak didukung: ${dto.symbol}. Simbol yang didukung: ${this.marketData.supportedSymbols.join(', ')}`,
      );
    }

    const existingCount = await this.prisma.bot.count({ where: { userId } });
    if (existingCount >= this.maxBotsPerUser) {
      throw new BadRequestException(
        `Batas jumlah bot tercapai (maksimum ${this.maxBotsPerUser}). Hapus bot yang tidak dipakai atau hubungi admin.`,
      );
    }

    if (dto.exchangeAccountId) {
      const account = await this.prisma.exchangeAccount.findFirst({
        where: { id: dto.exchangeAccountId, userId },
      });
      if (!account) {
        throw new NotFoundException('Koneksi exchange tidak ditemukan');
      }
    }

    const bot = await this.prisma.bot.create({
      data: {
        userId,
        exchangeAccountId: dto.exchangeAccountId ?? null,
        name: dto.name,
        symbol,
        strategyType: dto.strategyType as StrategyType,
        parameters: dto.parameters as Prisma.InputJsonValue,
        riskLimits: dto.riskLimits as Prisma.InputJsonValue,
        status: 'stopped',
      },
    });

    this.logger.info({ userId, botId: bot.id, symbol }, 'Bot created');
    return bot;
  }

  async list(userId: string): Promise<Bot[]> {
    return this.prisma.bot.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async get(userId: string, botId: string): Promise<Bot> {
    const bot = await this.prisma.bot.findFirst({ where: { id: botId, userId } });
    if (!bot) {
      throw new NotFoundException('Bot tidak ditemukan');
    }
    return bot;
  }

  async start(userId: string, botId: string): Promise<Bot> {
    const bot = await this.get(userId, botId);
    if (bot.status === 'active') {
      return bot; // idempotent: repeated start on a running bot is a no-op, not an error
    }
    return this.setStatus(botId, 'active');
  }

  async pause(userId: string, botId: string): Promise<Bot> {
    const bot = await this.get(userId, botId);
    if (bot.status === 'paused') {
      return bot; // idempotent
    }
    if (bot.status !== 'active') {
      throw new BadRequestException('Bot harus berstatus active untuk dijeda');
    }
    return this.setStatus(botId, 'paused');
  }

  async stop(userId: string, botId: string): Promise<Bot> {
    const bot = await this.get(userId, botId);
    if (bot.status === 'stopped') {
      return bot; // idempotent
    }
    return this.setStatus(botId, 'stopped');
  }

  async remove(userId: string, botId: string): Promise<void> {
    const bot = await this.get(userId, botId);
    if (bot.status !== 'stopped') {
      throw new ConflictException('Hentikan bot terlebih dahulu sebelum menghapusnya');
    }
    await this.prisma.bot.delete({ where: { id: bot.id } });
    this.logger.info({ userId, botId }, 'Bot deleted');
  }

  private async setStatus(botId: string, status: Bot['status']): Promise<Bot> {
    const bot = await this.prisma.bot.update({ where: { id: botId }, data: { status } });
    this.logger.info({ botId, status }, 'Bot status changed');
    return bot;
  }
}
