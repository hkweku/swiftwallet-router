import { Module } from '@nestjs/common';
import { GasOracleService } from './gas-oracle.service';

@Module({
  providers: [GasOracleService],
  exports: [GasOracleService],
})
export class GasOracleModule {}
