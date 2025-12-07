import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChainEntity } from './entities/chain.entity';

@Injectable()
export class ChainsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ChainEntity[]> {
    const chains = await this.prisma.chain.findMany();
    return chains.map(
      (chain: {
        id: string;
        name: string;
        nativeToken: string;
        usdcAddress: string;
        isActive: boolean;
      }) => new ChainEntity(chain),
    );
  }

  async findActive(): Promise<ChainEntity[]> {
    const chains = await this.prisma.chain.findMany({
      where: { isActive: true },
    });
    return chains.map(
      (chain: {
        id: string;
        name: string;
        nativeToken: string;
        usdcAddress: string;
        isActive: boolean;
      }) => new ChainEntity(chain),
    );
  }

  async findById(chainId: string): Promise<ChainEntity> {
    const chain = await this.prisma.chain.findUnique({
      where: { id: chainId },
    });
    if (!chain) {
      throw new NotFoundException(`Chain ${chainId} was not found`);
    }
    return new ChainEntity(chain);
  }
}
