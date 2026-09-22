import { IsIn, IsString, MinLength } from 'class-validator';

// Only Binance is a candidate exchange for now (PROJECT_STATUS.md §5) —
// listing it explicitly rather than accepting any string keeps us from
// silently "supporting" an exchange no adapter actually implements.
const SUPPORTED_EXCHANGES = ['binance'];

export class ConnectExchangeAccountDto {
  @IsIn(SUPPORTED_EXCHANGES)
  exchangeName!: string;

  @IsString()
  @MinLength(1)
  apiKey!: string;

  @IsString()
  @MinLength(1)
  apiSecret!: string;
}
