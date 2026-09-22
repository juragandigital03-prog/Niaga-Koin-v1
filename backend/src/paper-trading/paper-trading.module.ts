import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { WalletController } from './wallet.controller';
import { OrdersController } from './orders.controller';
import { WalletService } from './wallet.service';
import { OrderService } from './order.service';

@Module({
  imports: [AuthModule, MarketDataModule],
  controllers: [WalletController, OrdersController],
  providers: [WalletService, OrderService],
  exports: [OrderService],
})
export class PaperTradingModule {}
