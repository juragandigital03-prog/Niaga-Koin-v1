import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUser } from '../auth/strategies/jwt.strategy';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrderService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    return this.orders.placeOrder(req.user.id, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query('symbol') symbol?: string) {
    return this.orders.listOrders(req.user.id, symbol);
  }
}
