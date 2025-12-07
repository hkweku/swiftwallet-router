import { Module } from '@nestjs/common';
import { ChainsService } from './chains.service';
import { ChainsController } from './chains.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChainsController],
  providers: [ChainsService],
  exports: [ChainsService],
})
export class ChainsModule {}
