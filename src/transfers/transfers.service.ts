import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoutingService } from '../routing/routing.service';
import { BalancesService } from '../balances/balances.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CreateTransferDto } from './dtos/create-transfer.dto';
import { TransferStepEntity } from './entities/transfer-step.entity';
import { RoutingUnavailableException } from '../common/exceptions/routing-unavailable.exception';
import { RouteResponseDto } from '../common/dtos/route-response.dto';
import { TransferStatus } from '../common/constants/transfer-status.constant';
import { toDecimal, DecimalType } from '../common/utils/decimal.utils';

export interface TransferResponse extends RouteResponseDto {
  steps: TransferStepEntity[];
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routingService: RoutingService,
    private readonly balancesService: BalancesService,
    private readonly blockchainService: BlockchainService,
  ) {}

  async createTransfer(dto: CreateTransferDto): Promise<TransferResponse> {
    if (dto.fromUserId === dto.toUserId) {
      throw new BadRequestException('Sender and receiver must differ');
    }

    const amount = toDecimal(dto.amount);
    if (amount.lte(0)) {
      throw new BadRequestException(
        'Transfer amount must be greater than zero',
      );
    }

    const route = await this.routingService.getBestRoute(
      dto.fromUserId,
      amount,
    );
    const transfer = await this.prisma.transfer.create({
      data: {
        fromUserId: dto.fromUserId,
        toUserId: dto.toUserId,
        amount: amount as unknown as any,
        status: TransferStatus.Pending,
      },
    });

    const executedSteps: TransferStepEntity[] = [];

    try {
      for (const step of route.steps) {
        const stepAmount = toDecimal(step.amount);

        const createdStep = await this.prisma.transferStep.create({
          data: {
            transferId: transfer.id,
            type: step.type,
            chainId: step.chainId,
            amount: stepAmount as unknown as any,
            feeUsd: toDecimal(step.estimatedFeeUsd) as unknown as any,
            status: TransferStatus.Pending,
          },
        });

        let txId: string;

        if (step.type === 'bridge') {
          const destinationChain = step.metadata?.toChainId;
          if (!destinationChain) {
            throw new RoutingUnavailableException(
              'Bridge step lacked destination metadata',
            );
          }

          const response = await this.blockchainService.bridge(
            step.chainId,
            destinationChain,
            dto.fromUserId,
            stepAmount.toFixed(6),
          );
          txId = response.txId;
          await this.balancesService.moveAcrossChains(
            dto.fromUserId,
            step.chainId,
            destinationChain,
            stepAmount,
          );
        } else {
          const response = await this.blockchainService.transfer(
            step.chainId,
            dto.fromUserId,
            dto.toUserId,
            stepAmount.toFixed(6),
          );
          txId = response.txId;
          await this.balancesService.transferBetweenUsers(
            dto.fromUserId,
            dto.toUserId,
            step.chainId,
            stepAmount,
          );
        }

        const finalized = await this.prisma.transferStep.update({
          where: { id: createdStep.id },
          data: { status: TransferStatus.Completed, txId },
        });

        executedSteps.push(
          new TransferStepEntity(
            finalized as {
              id: string;
              transferId: string;
              type: string;
              chainId: string;
              amount: DecimalType;
              feeUsd: DecimalType;
              txId: string | null;
              status: string;
            },
          ),
        );
      }

      const finalTransfer = await this.prisma.transfer.update({
        where: { id: transfer.id },
        data: { status: TransferStatus.Completed },
      });

      return {
        transferId: finalTransfer.id,
        status: finalTransfer.status,
        route,
        steps: executedSteps,
      };
    } catch (error) {
      await this.prisma.transfer.update({
        where: { id: transfer.id },
        data: { status: TransferStatus.Failed },
      });
      throw error;
    }
  }
}
