import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { CredentialsEncryptionService } from '../common/crypto/credentials-encryption.service';
import { UpstreamUnavailableError } from '../common/http/upstream-unavailable.error';
import { InvalidExchangeCredentialsError } from './exchange-adapter.interface';

const fakeLogger = { setContext: jest.fn(), info: jest.fn(), warn: jest.fn() } as any;

describe('ExchangeService', () => {
  let prisma: any;
  let adapter: { checkPermissions: jest.Mock };
  let encryption: CredentialsEncryptionService;
  let service: ExchangeService;

  beforeEach(() => {
    prisma = {
      exchangeAccount: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
      bot: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    adapter = { checkPermissions: jest.fn() };
    encryption = new CredentialsEncryptionService({ get: () => 'test-key' } as any);
    service = new ExchangeService(prisma, encryption, adapter, fakeLogger);
  });

  const dto = { exchangeName: 'binance', apiKey: 'api-key', apiSecret: 'api-secret' };

  describe('connect', () => {
    it('stores an encrypted credential and returns connected status for a trade-only key', async () => {
      adapter.checkPermissions.mockResolvedValue({ canTrade: true, canWithdraw: false });
      prisma.exchangeAccount.create.mockResolvedValue({ id: 'acct-1', connectionStatus: 'connected' });

      const result = await service.connect('user-1', dto);

      expect(result).toEqual({ id: 'acct-1', connectionStatus: 'connected' });
      const createArgs = prisma.exchangeAccount.create.mock.calls[0][0];
      expect(createArgs.data.userId).toBe('user-1');
      expect(createArgs.data.credential.create.encryptedApiKey).not.toBe('api-key');
      expect(createArgs.data.credential.create.encryptedApiSecret).not.toBe('api-secret');
      expect(createArgs.data.credential.create.permissionScope).toBe('trade-only');
    });

    it('rejects a key with withdrawal permission (BR-KEY-001) and never persists it', async () => {
      adapter.checkPermissions.mockResolvedValue({ canTrade: true, canWithdraw: true });

      await expect(service.connect('user-1', dto)).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.exchangeAccount.create).not.toHaveBeenCalled();
    });

    it('rejects invalid credentials as 400 without persisting anything', async () => {
      adapter.checkPermissions.mockRejectedValue(new InvalidExchangeCredentialsError());

      await expect(service.connect('user-1', dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.exchangeAccount.create).not.toHaveBeenCalled();
    });

    it('maps an unreachable exchange to 503, never silently accepting an unverified key', async () => {
      adapter.checkPermissions.mockRejectedValue(new UpstreamUnavailableError('down'));

      await expect(service.connect('user-1', dto)).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(prisma.exchangeAccount.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('never includes credential fields in the response shape', async () => {
      prisma.exchangeAccount.findMany.mockResolvedValue([
        {
          id: 'acct-1',
          exchangeName: 'binance',
          connectionStatus: 'connected',
          connectedAt: new Date(),
          userId: 'user-1',
          credential: { encryptedApiKey: 'should-never-appear' },
        },
      ]);

      const result = await service.list('user-1');

      expect(prisma.exchangeAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(result[0]).not.toHaveProperty('credential');
      expect(JSON.stringify(result)).not.toContain('should-never-appear');
    });
  });

  describe('disconnect', () => {
    it('deletes an account owned by the requesting user', async () => {
      prisma.exchangeAccount.findFirst.mockResolvedValue({ id: 'acct-1', userId: 'user-1' });

      await service.disconnect('user-1', 'acct-1');

      expect(prisma.exchangeAccount.findFirst).toHaveBeenCalledWith({
        where: { id: 'acct-1', userId: 'user-1' },
      });
      expect(prisma.exchangeAccount.delete).toHaveBeenCalledWith({ where: { id: 'acct-1' } });
    });

    it("throws 404 rather than deleting another user's account", async () => {
      prisma.exchangeAccount.findFirst.mockResolvedValue(null);

      await expect(service.disconnect('user-2', 'acct-owned-by-user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.exchangeAccount.delete).not.toHaveBeenCalled();
    });

    it('stops active/paused bots depending on the connection before deleting it (FR-EXC-002)', async () => {
      prisma.exchangeAccount.findFirst.mockResolvedValue({ id: 'acct-1', userId: 'user-1' });
      prisma.bot.updateMany.mockResolvedValue({ count: 2 });

      await service.disconnect('user-1', 'acct-1');

      expect(prisma.bot.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', exchangeAccountId: 'acct-1', status: { in: ['active', 'paused'] } },
        data: { status: 'stopped' },
      });
      // Bots must be stopped before the account is deleted, not after.
      const stopOrder = prisma.bot.updateMany.mock.invocationCallOrder[0];
      const deleteOrder = prisma.exchangeAccount.delete.mock.invocationCallOrder[0];
      expect(stopOrder).toBeLessThan(deleteOrder);
    });
  });
});
