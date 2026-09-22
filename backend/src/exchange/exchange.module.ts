import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExchangeController } from './exchange.controller';
import { ExchangeService } from './exchange.service';
import { CredentialsEncryptionService } from '../common/crypto/credentials-encryption.service';
import { EXCHANGE_ADAPTER } from './exchange-adapter.interface';
import { BinanceExchangeAdapter } from './adapters/binance-exchange.adapter';

@Module({
  imports: [AuthModule],
  controllers: [ExchangeController],
  providers: [
    ExchangeService,
    CredentialsEncryptionService,
    // Adapter pattern (SDD §5.2): swap this binding to add a second
    // exchange later without touching ExchangeService/Controller.
    { provide: EXCHANGE_ADAPTER, useClass: BinanceExchangeAdapter },
  ],
})
export class ExchangeModule {}
