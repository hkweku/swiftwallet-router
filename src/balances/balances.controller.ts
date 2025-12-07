import { Controller, Get, Param } from '@nestjs/common';
import { BalancesService } from './balances.service';
import { UnifiedBalanceResponse } from './balances.service';

@Controller('users')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get(':userId/balance')
  getUserBalance(
    @Param('userId') userId: string,
  ): Promise<UnifiedBalanceResponse> {
    return this.balancesService.getUnifiedBalance(userId);
  }
}
