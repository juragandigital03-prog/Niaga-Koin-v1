import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialsEncryptionService } from '../common/crypto/credentials-encryption.service';
import { UpstreamUnavailableError } from '../common/http/upstream-unavailable.error';
import {
  EXCHANGE_ADAPTER,
  ExchangeAdapter,
  InvalidExchangeCredentialsError,
} from './exchange-adapter.interface';
import { ConnectExchangeAccountDto } from './dto/connect-exchange-account.dto';

export interface ExchangeAccountSummary {
  id: string;
  exchangeName: string;
  connectionStatus: string;
  connectedAt: Date | null;
}

@Injectable()
export class ExchangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: CredentialsEncryptionService,
    @Inject(EXCHANGE_ADAPTER) private readonly adapter: ExchangeAdapter,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ExchangeService.name);
  }

  async connect(
    userId: string,
    dto: ConnectExchangeAccountDto,
  ): Promise<{ id: string; connectionStatus: string }> {
    let permissions;
    try {
      permissions = await this.adapter.checkPermissions(dto.apiKey, dto.apiSecret);
    } catch (err) {
      if (err instanceof InvalidExchangeCredentialsError) {
        throw new BadRequestException({ error: 'INVALID_CREDENTIALS' });
      }
      if (err instanceof UpstreamUnavailableError) {
        this.logger.warn({ userId, cause: String(err.cause) }, 'Exchange unreachable while validating credentials');
        throw new ServiceUnavailableException(
          'Tidak dapat memvalidasi API key saat ini — exchange tidak dapat dihubungi, coba lagi nanti',
        );
      }
      throw err;
    }

    // BR-KEY-001: a withdrawal-capable key is never accepted, no exceptions.
    if (permissions.canWithdraw) {
      this.logger.warn({ userId, exchangeName: dto.exchangeName }, 'Rejected API key with withdrawal permission');
      throw new UnprocessableEntityException({ error: 'INVALID_PERMISSION_SCOPE' });
    }

    const encryptedApiKey = this.encryption.encrypt(dto.apiKey);
    const encryptedApiSecret = this.encryption.encrypt(dto.apiSecret);
    const permissionScope = permissions.canTrade ? 'trade-only' : 'read-only';

    const account = await this.prisma.exchangeAccount.create({
      data: {
        userId,
        exchangeName: dto.exchangeName,
        connectionStatus: 'connected',
        connectedAt: new Date(),
        credential: {
          create: { encryptedApiKey, encryptedApiSecret, permissionScope },
        },
      },
    });

    this.logger.info({ userId, exchangeAccountId: account.id }, 'Exchange account connected');
    return { id: account.id, connectionStatus: account.connectionStatus };
  }

  async list(userId: string): Promise<ExchangeAccountSummary[]> {
    const accounts = await this.prisma.exchangeAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Deliberately hand-pick fields — never spread the Prisma row, so a
    // future column addition can't accidentally leak into this response.
    return accounts.map((a) => ({
      id: a.id,
      exchangeName: a.exchangeName,
      connectionStatus: a.connectionStatus,
      connectedAt: a.connectedAt,
    }));
  }

  async disconnect(userId: string, exchangeAccountId: string): Promise<void> {
    // Scoped by userId in the WHERE clause itself, not checked after the
    // fact — a lookup that doesn't match both id AND userId simply finds
    // nothing, so one user can never disconnect another user's account.
    const account = await this.prisma.exchangeAccount.findFirst({
      where: { id: exchangeAccountId, userId },
    });

    if (!account) {
      throw new NotFoundException('Koneksi exchange tidak ditemukan');
    }

    // TODO(Fase 5): once bots reference exchange_account_id, stop any bots
    // depending on this connection before deleting it (FR-EXC-002
    // acceptance criteria). No bots exist yet, so nothing to stop today.
    await this.prisma.exchangeAccount.delete({ where: { id: exchangeAccountId } });
    this.logger.info({ userId, exchangeAccountId }, 'Exchange account disconnected');
  }
}
