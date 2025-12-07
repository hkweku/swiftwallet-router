import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ChainsModule } from './chains/chains.module';
import { BalancesModule } from './balances/balances.module';
import { GasOracleModule } from './gas-oracle/gas-oracle.module';
import { RoutingModule } from './routing/routing.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ChainsModule,
    BalancesModule,
    GasOracleModule,
    RoutingModule,
    BlockchainModule,
    TransfersModule,
  ],
})
export class AppModule {}
