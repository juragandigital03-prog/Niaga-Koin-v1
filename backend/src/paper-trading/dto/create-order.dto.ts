import { IsIn, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  symbol!: string;

  @IsIn(['buy', 'sell'])
  side!: 'buy' | 'sell';

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  quantity!: number;
}
