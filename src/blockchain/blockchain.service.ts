import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BlockchainResponse } from './interfaces/blockchain-response.interface';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);

  async transfer(
    chainId: string,
    fromUserId: string,
    toUserId: string,
    amount: string,
  ): Promise<BlockchainResponse> {
    return this.simulateCall('transfer', {
      chainId,
      fromUserId,
      toUserId,
      amount,
    });
  }

  async bridge(
    fromChainId: string,
    toChainId: string,
    userId: string,
    amount: string,
  ): Promise<BlockchainResponse> {
    return this.simulateCall('bridge', {
      fromChainId,
      toChainId,
      userId,
      amount,
    });
  }

  private simulateCall(
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<BlockchainResponse> {
    const latencyMs = this.randomLatency();
    const txId = randomUUID();

    this.logger.debug(
      `${action.toUpperCase()} simulated txId=${txId} latency=${latencyMs}ms payload=${JSON.stringify(metadata)}`,
    );

    return Promise.resolve({
      txId,
      latencyMs,
      status: 'success' as const,
      metadata,
    });
  }

  private randomLatency(): number {
    return 300 + Math.floor(Math.random() * 900);
  }
}
