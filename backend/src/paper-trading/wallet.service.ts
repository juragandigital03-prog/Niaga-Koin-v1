import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';

const QUOTE_ASSET = 'USDT';

export interface WalletSummary {
  balanceUsdt: string;
  positions: Array<{ symbol: string; quantity: string; avgEntryPrice: string }>;
}

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WalletService.name);
  }

  private get defaultBalance(): Prisma.Decimal {
    return new Prisma.Decimal(this.config.get('PAPER_TRADING_DEFAULT_BALANCE_USDT') ?? 10_000);
  }

  /** Lazily creates the paper wallet on first use — no exchange account or
   * API key required (SRS §3.8: paper trading works with public market
   * data only). */
  async getOrCreateBalance(userId: string): Promise<{ id: string; amount: Prisma.Decimal }> {
    const existing = await this.prisma.balance.findUnique({
      where: { userId_asset_isPaper: { userId, asset: QUOTE_ASSET, isPaper: true } },
    });
    if (existing) {
      return existing;
    }

    const created = await this.prisma.balance.create({
      data: { userId, asset: QUOTE_ASSET, amount: this.defaultBalance, isPaper: true },
    });
    this.logger.info({ userId, amount: created.amount.toString() }, 'Paper wallet created');
    return created;
  }

  async getSummary(userId: string): Promise<WalletSummary> {
    const [balance, positions] = await Promise.all([
      this.getOrCreateBalance(userId),
      this.prisma.position.findMany({
        where: { userId, isPaper: true, quantity: { gt: 0 } },
        orderBy: { symbol: 'asc' },
      }),
    ]);

    return {
      balanceUsdt: balance.amount.toString(),
      positions: positions.map((p) => ({
        symbol: p.symbol,
        quantity: p.quantity.toString(),
        avgEntryPrice: p.avgEntryPrice.toString(),
      })),
    };
  }

  /** Resets balance to the configured default and clears all positions.
   * The confirmation gate is a UI-level responsibility (master prompt:
   * confirmation dialogs for irreversible actions) — this endpoint being
   * explicit and dedicated is the backend's half of that contract. */
  async reset(userId: string): Promise<WalletSummary> {
    await this.getOrCreateBalance(userId); // ensure a row exists before we update it
    await this.prisma.$transaction([
      this.prisma.balance.update({
        where: { userId_asset_isPaper: { userId, asset: QUOTE_ASSET, isPaper: true } },
        data: { amount: this.defaultBalance },
      }),
      this.prisma.position.deleteMany({ where: { userId, isPaper: true } }),
    ]);

    this.logger.warn(
      { userId, resetToUsdt: this.defaultBalance.toString() },
      'Paper wallet reset by user',
    );
    return this.getSummary(userId);
  }
}
