import { createHmac } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchJsonWithRetry, NonRetryableHttpError } from '../../common/http/fetch-with-retry';
import {
  ExchangeAdapter,
  ExchangePermissions,
  InvalidExchangeCredentialsError,
} from '../exchange-adapter.interface';

interface BinanceAccountResponse {
  canTrade: boolean;
  canWithdraw: boolean;
}

const NON_RETRYABLE_AUTH_STATUSES = new Set([400, 401]);

@Injectable()
export class BinanceExchangeAdapter implements ExchangeAdapter {
  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('BINANCE_API_BASE_URL') ?? 'https://api.binance.com';
  }

  async checkPermissions(apiKey: string, apiSecret: string): Promise<ExchangePermissions> {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}&recvWindow=5000`;
    const signature = createHmac('sha256', apiSecret).update(query).digest('hex');
    const url = `${this.baseUrl}/api/v3/account?${query}&signature=${signature}`;

    try {
      const body = (await fetchJsonWithRetry(
        url,
        {
          timeoutMs: Number(this.config.get('EXCHANGE_REQUEST_TIMEOUT_MS') ?? 5000),
          maxRetries: Number(this.config.get('EXCHANGE_MAX_RETRIES') ?? 2),
          init: { headers: { 'X-MBX-APIKEY': apiKey } },
        },
        (status) => NON_RETRYABLE_AUTH_STATUSES.has(status),
      )) as BinanceAccountResponse;

      return { canTrade: Boolean(body.canTrade), canWithdraw: Boolean(body.canWithdraw) };
    } catch (err) {
      if (err instanceof NonRetryableHttpError) {
        throw new InvalidExchangeCredentialsError();
      }
      throw err;
    }
  }
}
