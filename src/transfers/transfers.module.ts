import { Module } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { TransfersController } from './transfers.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RoutingModule } from '../routing/routing.module';
import { BalancesModule } from '../balances/balances.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [PrismaModule, RoutingModule, BalancesModule, BlockchainModule],
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
