import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order, OrderSide, Prisma, Trade } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { WalletService } from './wallet.service';
import { CreateOrderDto } from './dto/create-order.dto';

const QUOTE_ASSET = 'USDT';

export interface OrderResult {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: string;
  status: string;
  rejectReason: string | null;
  createdAt: Date;
  trade: { executedPrice: string; executedQuantity: string; fee: string; executedAt: Date } | null;
}

/**
 * Paper market order simulator. Every call resolves synchronously to
 * either `filled` or `rejected` — never throws for a business-rule
 * rejection (insufficient balance, below minimum notional, market data
 * unavailable). Rejections are still persisted as an Order row so the
 * user's order history is a complete, honest record (SRS FR-ORD-002),
 * while balance/position are guaranteed untouched (fail-safe).
 *
 * Concurrency: the actual balance/position debit is a single conditional
 * UPDATE (`WHERE amount >= totalCost`), not a separate read-then-write —
 * two simultaneous orders against the same wallet can't both succeed past
 * what the balance actually allows.
 */
@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly marketData: MarketDataService,
    private readonly wallet: WalletService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OrderService.name);
  }

  private get feePercent(): Prisma.Decimal {
    return new Prisma.Decimal(this.config.get('PAPER_TRADING_FEE_PERCENT') ?? 0.1);
  }

  private get slippagePercent(): Prisma.Decimal {
    return new Prisma.Decimal(this.config.get('PAPER_TRADING_SLIPPAGE_PERCENT') ?? 0.05);
  }

  private get minNotionalUsdt(): Prisma.Decimal {
    return new Prisma.Decimal(this.config.get('PAPER_TRADING_MIN_NOTIONAL_USDT') ?? 10);
  }

  private get quantityPrecision(): number {
    return Number(this.config.get('PAPER_TRADING_QUANTITY_PRECISION') ?? 6);
  }

  async placeOrder(userId: string, dto: CreateOrderDto): Promise<OrderResult> {
    const symbol = dto.symbol.toUpperCase();
    if (!this.marketData.supportedSymbols.includes(symbol)) {
      // A malformed/unsupported request never even becomes an Order row —
      // this is an input error, not a trading outcome.
      throw new BadRequestException(
        `Symbol tidak didukung: ${dto.symbol}. Simbol yang didukung: ${this.marketData.supportedSymbols.join(', ')}`,
      );
    }

    // Exchanges silently truncate quantity to their lot-size step; we do
    // the same (round down) rather than reject, using a single
    // configured precision for every symbol (real per-symbol LOT_SIZE
    // filters are TBD — see .env.example).
    const quantity = new Prisma.Decimal(dto.quantity).toDecimalPlaces(
      this.quantityPrecision,
      Prisma.Decimal.ROUND_DOWN,
    );
    if (quantity.isZero()) {
      throw new BadRequestException('Quantity terlalu kecil setelah dibulatkan ke presisi yang didukung');
    }

    // Ensure the wallet exists before we ever try a conditional debit
    // against it — a brand-new user hasn't necessarily called GET /wallet
    // first.
    await this.wallet.getOrCreateBalance(userId);

    let tickerPrice: Prisma.Decimal;
    try {
      const ticker = await this.marketData.getTicker(symbol);
      tickerPrice = new Prisma.Decimal(ticker.price);
    } catch (err) {
      if (err instanceof ServiceUnavailableException) {
        // Fail-safe (master prompt): never guess a price. Record the
        // attempt as rejected rather than silently dropping it or
        // bubbling a bare 503 with no audit trail.
        this.logger.warn({ userId, symbol }, 'Order rejected: market data unavailable');
        return this.recordRejected(userId, symbol, dto.side, quantity, 'MARKET_DATA_UNAVAILABLE');
      }
      throw err;
    }

    const slippageFactor = this.slippagePercent.div(100);
    const executionPrice =
      dto.side === 'buy'
        ? tickerPrice.mul(new Prisma.Decimal(1).plus(slippageFactor))
        : tickerPrice.mul(new Prisma.Decimal(1).minus(slippageFactor));

    const notional = quantity.mul(executionPrice);
    const fee = notional.mul(this.feePercent.div(100));

    if (notional.lessThan(this.minNotionalUsdt)) {
      return this.recordRejected(userId, symbol, dto.side, quantity, 'BELOW_MIN_NOTIONAL');
    }

    if (dto.side === 'buy') {
      return this.executeBuy(userId, symbol, quantity, executionPrice, notional, fee);
    }
    return this.executeSell(userId, symbol, quantity, executionPrice, notional, fee);
  }

  private async executeBuy(
    userId: string,
    symbol: string,
    quantity: Prisma.Decimal,
    executionPrice: Prisma.Decimal,
    notional: Prisma.Decimal,
    fee: Prisma.Decimal,
  ): Promise<OrderResult> {
    const totalCost = notional.plus(fee);

    return this.prisma.$transaction(async (tx) => {
      const debited = await tx.balance.updateMany({
        where: { userId, asset: QUOTE_ASSET, isPaper: true, amount: { gte: totalCost } },
        data: { amount: { decrement: totalCost } },
      });

      if (debited.count === 0) {
        const order = await tx.order.create({
          data: {
            userId,
            symbol,
            side: 'buy',
            quantity,
            status: 'rejected',
            rejectReason: 'INSUFFICIENT_BALANCE',
            isPaper: true,
          },
        });
        return this.toResult(order, null);
      }

      const existingPosition = await tx.position.findUnique({
        where: { userId_symbol_isPaper: { userId, symbol, isPaper: true } },
      });
      const newQuantity = (existingPosition?.quantity ?? new Prisma.Decimal(0)).plus(quantity);
      // Weighted average entry price — only BUYs move it (standard spot accounting).
      const newAvgEntry = existingPosition
        ? existingPosition.quantity
            .mul(existingPosition.avgEntryPrice)
            .plus(quantity.mul(executionPrice))
            .div(newQuantity)
        : executionPrice;

      await tx.position.upsert({
        where: { userId_symbol_isPaper: { userId, symbol, isPaper: true } },
        create: { userId, symbol, quantity, avgEntryPrice: executionPrice, isPaper: true },
        update: { quantity: newQuantity, avgEntryPrice: newAvgEntry },
      });

      const order = await tx.order.create({
        data: { userId, symbol, side: 'buy', quantity, status: 'filled', isPaper: true },
      });
      const trade = await tx.trade.create({
        data: { orderId: order.id, executedPrice: executionPrice, executedQuantity: quantity, fee },
      });

      this.logger.info({ userId, symbol, orderId: order.id }, 'Paper buy order filled');
      return this.toResult(order, trade);
    });
  }

  private async executeSell(
    userId: string,
    symbol: string,
    quantity: Prisma.Decimal,
    executionPrice: Prisma.Decimal,
    notional: Prisma.Decimal,
    fee: Prisma.Decimal,
  ): Promise<OrderResult> {
    const proceeds = notional.minus(fee);

    return this.prisma.$transaction(async (tx) => {
      // No short selling: this only succeeds if the user actually holds
      // at least `quantity` of the symbol right now.
      const debited = await tx.position.updateMany({
        where: { userId, symbol, isPaper: true, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      });

      if (debited.count === 0) {
        const order = await tx.order.create({
          data: {
            userId,
            symbol,
            side: 'sell',
            quantity,
            status: 'rejected',
            rejectReason: 'INSUFFICIENT_POSITION',
            isPaper: true,
          },
        });
        return this.toResult(order, null);
      }

      await tx.balance.upsert({
        where: { userId_asset_isPaper: { userId, asset: QUOTE_ASSET, isPaper: true } },
        create: { userId, asset: QUOTE_ASSET, amount: proceeds, isPaper: true },
        update: { amount: { increment: proceeds } },
      });

      const order = await tx.order.create({
        data: { userId, symbol, side: 'sell', quantity, status: 'filled', isPaper: true },
      });
      const trade = await tx.trade.create({
        data: { orderId: order.id, executedPrice: executionPrice, executedQuantity: quantity, fee },
      });

      this.logger.info({ userId, symbol, orderId: order.id }, 'Paper sell order filled');
      return this.toResult(order, trade);
    });
  }

  private async recordRejected(
    userId: string,
    symbol: string,
    side: OrderSide,
    quantity: Prisma.Decimal,
    reason: string,
  ): Promise<OrderResult> {
    const order = await this.prisma.order.create({
      data: { userId, symbol, side, quantity, status: 'rejected', rejectReason: reason, isPaper: true },
    });
    return this.toResult(order, null);
  }

  async listOrders(userId: string, symbol?: string): Promise<OrderResult[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId, isPaper: true, ...(symbol ? { symbol: symbol.toUpperCase() } : {}) },
      include: { trade: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.toResult(o, o.trade));
  }

  private toResult(order: Order, trade: Trade | null): OrderResult {
    return {
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity.toString(),
      status: order.status,
      rejectReason: order.rejectReason,
      createdAt: order.createdAt,
      trade: trade
        ? {
            executedPrice: trade.executedPrice.toString(),
            executedQuantity: trade.executedQuantity.toString(),
            fee: trade.fee.toString(),
            executedAt: trade.executedAt,
          }
        : null,
    };
  }
}
