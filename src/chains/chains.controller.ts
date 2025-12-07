import { Controller, Get, Param } from '@nestjs/common';
import { ChainsService } from './chains.service';
import { ChainEntity } from './entities/chain.entity';

@Controller('chains')
export class ChainsController {
  constructor(private readonly chainsService: ChainsService) {}

  @Get()
  getChains(): Promise<ChainEntity[]> {
    return this.chainsService.findAll();
  }

  @Get(':chainId')
  getChain(@Param('chainId') chainId: string): Promise<ChainEntity> {
    return this.chainsService.findById(chainId);
  }
}
