import { Module } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { BalancesModule } from '../balances/balances.module';
import { GasOracleModule } from '../gas-oracle/gas-oracle.module';
import { ChainsModule } from '../chains/chains.module';

@Module({
  imports: [BalancesModule, GasOracleModule, ChainsModule],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}
