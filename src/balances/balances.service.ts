import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  UserChainBalanceEntity,
  UserChainBalanceType,
} from './entities/user-chain-balance.entity';
import { toDecimal } from '../common/utils/decimal.utils';
import { InsufficientBalanceException } from '../common/exceptions/insufficient-balance.exception';

// Helper to get properly typed Prisma client
function getPrismaClient(prisma: PrismaService): PrismaClient {
  return prisma as unknown as PrismaClient;
}

type DecimalType = ReturnType<typeof toDecimal>;

export interface UnifiedBalanceResponse {
  userId: string;
  totalUsdValue: number;
  perChain: {
    chain: string;
    balance: string;
  }[];
}

@Injectable()
export class BalancesService {
  private readonly prismaClient: PrismaClient;

  constructor(private readonly prisma: PrismaService) {
    // Do the casting once
    this.prismaClient = getPrismaClient(this.prisma);
  }

  async getUserBalances(userId: string): Promise<UserChainBalanceEntity[]> {
    const balances = (await this.prisma.userChainBalance.findMany({
      where: { userId },
      include: { chain: true },
    })) as UserChainBalanceType[];

    return balances.map((balance) => new UserChainBalanceEntity(balance));
  }

  async getUnifiedBalance(userId: string): Promise<UnifiedBalanceResponse> {
    const balances = (await this.prisma.userChainBalance.findMany({
      where: { userId },
      include: { chain: true },
    })) as UserChainBalanceType[];

    const total = balances.reduce<DecimalType>(
      (sum, balance) => sum.add(balance.balance),
      toDecimal(0),
    );

    return {
      userId,
      totalUsdValue: Number(total),
      perChain: balances.map((balance) => ({
        chain: balance.chain?.id ?? balance.chainId,
        balance: balance.balance.toFixed(6),
      })),
    };
  }

  async moveAcrossChains(
    userId: string,
    fromChainId: string,
    toChainId: string,
    amount: DecimalType,
  ) {
    const value = toDecimal(amount);

    await this.prismaClient.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await this.debitInternal(tx, userId, fromChainId, value);
        await this.creditInternal(tx, userId, toChainId, value);
      },
    );
  }

  async transferBetweenUsers(
    fromUserId: string,
    toUserId: string,
    chainId: string,
    amount: DecimalType,
  ) {
    const value = toDecimal(amount);

    await this.prismaClient.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await this.debitInternal(tx, fromUserId, chainId, value);
        await this.creditInternal(tx, toUserId, chainId, value);
      },
    );
  }

  async ensureSufficientBalance(
    userId: string,
    chainId: string,
    amount: DecimalType,
  ) {
    const value = toDecimal(amount);

    const balance = (await this.prisma.userChainBalance.findUnique({
      where: { userId_chainId: { userId, chainId } },
    })) as UserChainBalanceType;

    if (!balance || balance.balance.lt(value)) {
      throw new InsufficientBalanceException(
        `User ${userId} lacks funds on ${chainId}`,
      );
    }
  }

  private async debitInternal(
    client: Prisma.TransactionClient,
    userId: string,
    chainId: string,
    amount: DecimalType,
  ) {
    const balance = await client.userChainBalance.findUnique({
      where: { userId_chainId: { userId, chainId } },
    });

    if (!balance || balance.balance.lt(amount as unknown as any)) {
      throw new InsufficientBalanceException(
        `User ${userId} lacks funds on ${chainId}`,
      );
    }

    await client.userChainBalance.update({
      where: { userId_chainId: { userId, chainId } },
      data: {
        balance: balance.balance.minus(amount as unknown as any),
      },
    });
  }

  private async creditInternal(
    client: Prisma.TransactionClient,
    userId: string,
    chainId: string,
    amount: DecimalType,
  ) {
    await client.userChainBalance.upsert({
      where: { userId_chainId: { userId, chainId } },
      update: {
        balance: { increment: amount as unknown as any },
      },
      create: {
        userId,
        chainId,
        balance: amount as unknown as any,
      },
    });
  }
}
