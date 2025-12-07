import { Injectable } from '@nestjs/common';
import { BalancesService } from '../balances/balances.service';
import { GasOracleService } from '../gas-oracle/gas-oracle.service';
import { ChainsService } from '../chains/chains.service';
import { RouteDecision } from './interfaces/route-decision.interface';
import { RoutingUnavailableException } from '../common/exceptions/routing-unavailable.exception';
import {
  calculateBridgeScore,
  calculateDirectScore,
} from './utils/score.utils';
import { toDecimal, DecimalType } from '../common/utils/decimal.utils';
import { InsufficientBalanceException } from '../common/exceptions/insufficient-balance.exception';

@Injectable()
export class RoutingService {
  constructor(
    private readonly balancesService: BalancesService,
    private readonly gasOracleService: GasOracleService,
    private readonly chainsService: ChainsService,
  ) {}

  async getBestRoute(
    userId: string,
    amount: DecimalType,
  ): Promise<RouteDecision> {
    const normalizedAmount = toDecimal(amount);
    if (normalizedAmount.lte(0)) {
      throw new InsufficientBalanceException(
        'Transfer amount must be greater than zero',
      );
    }

    const [balances, gasInfo, activeChains] = await Promise.all([
      this.balancesService.getUserBalances(userId),
      this.gasOracleService.getGasInfo(),
      this.chainsService.findActive(),
    ]);

    if (!balances.length) {
      throw new RoutingUnavailableException(
        'User has no balances to route from',
      );
    }

    const gasMap = new Map(gasInfo.map((info) => [info.chainId, info]));
    const activeSet = new Set(activeChains.map((chain) => chain.id));
    const eligibleBalances = balances.filter((balance) =>
      activeSet.has(balance.chainId),
    );

    if (!eligibleBalances.length) {
      throw new RoutingUnavailableException(
        'User has no balances on active chains',
      );
    }

    const balanceMap = new Map<string, DecimalType>();
    eligibleBalances.forEach((balance) => {
      balanceMap.set(balance.chainId, toDecimal(balance.balance));
    });

    const direct = this.pickDirectRoute(
      eligibleBalances,
      normalizedAmount,
      gasMap,
    );
    if (direct) {
      return direct;
    }

    const bridged = this.pickBridgeRoute(
      eligibleBalances,
      normalizedAmount,
      gasMap,
      activeSet,
      balanceMap,
    );
    if (bridged) {
      return bridged;
    }

    throw new InsufficientBalanceException(
      'No single chain has sufficient liquidity for this transfer',
    );
  }

  private pickDirectRoute(
    balances: { chainId: string; balance: string }[],
    amount: DecimalType,
    gasMap: Map<string, { gasFeeUsd: number; confirmationMs: number }>,
  ): RouteDecision | null {
    const candidates = balances
      .map((balance) => ({
        chainId: balance.chainId,
        balance: toDecimal(balance.balance),
      }))
      .filter(
        (balance) => balance.balance.gte(amount) && gasMap.has(balance.chainId),
      )
      .map((balance) => {
        const gas = gasMap.get(balance.chainId)!;
        const score = calculateDirectScore(gas.gasFeeUsd, gas.confirmationMs);
        return { chainId: balance.chainId, score, gas };
      });

    if (!candidates.length) {
      return null;
    }

    const best = candidates.reduce((prev, current) =>
      current.score < prev.score ? current : prev,
    );

    return {
      sourceChain: best.chainId,
      destinationChain: best.chainId,
      needsBridge: false,
      score: best.score,
      steps: [
        {
          type: 'transfer',
          chainId: best.chainId,
          amount: amount.toFixed(6),
          estimatedFeeUsd: best.gas.gasFeeUsd,
          estimatedConfirmationMs: best.gas.confirmationMs,
        },
      ],
      reason: `Direct transfer on ${best.chainId} due to lowest gas score`,
    };
  }

  private pickBridgeRoute(
    balances: { chainId: string; balance: string }[],
    amount: DecimalType,
    gasMap: Map<
      string,
      {
        gasFeeUsd: number;
        confirmationMs: number;
        bridgeFeeUsd: number;
        bridgeTimeMs: number;
      }
    >,
    activeSet: Set<string>,
    balanceMap: Map<string, DecimalType>,
  ): RouteDecision | null {
    const candidates = [];

    for (const balance of balances) {
      const sourceAmount = toDecimal(balance.balance);
      const sourceGas = gasMap.get(balance.chainId);
      if (!sourceGas) {
        continue;
      }

      for (const [destChainId, destinationGas] of gasMap.entries()) {
        if (destChainId === balance.chainId || !activeSet.has(destChainId)) {
          continue;
        }

        if (!destinationGas) {
          continue;
        }

        const currentDestBalance = balanceMap.get(destChainId) ?? toDecimal(0);
        if (currentDestBalance.gte(amount)) {
          continue;
        }

        const requiredBridge = amount.minus(currentDestBalance);
        if (requiredBridge.lte(0) || sourceAmount.lt(requiredBridge)) {
          continue;
        }

        const totalTimeMs =
          sourceGas.bridgeTimeMs + destinationGas.confirmationMs;
        const score = calculateBridgeScore(
          sourceGas.bridgeFeeUsd,
          destinationGas.gasFeeUsd,
          totalTimeMs,
        );

        candidates.push({
          sourceChain: balance.chainId,
          destinationChain: destChainId,
          score,
          sourceGas,
          destinationGas,
          bridgeAmount: requiredBridge,
        });
      }
    }

    if (!candidates.length) {
      return null;
    }

    const best = candidates.reduce((prev, current) =>
      current.score < prev.score ? current : prev,
    );

    return {
      sourceChain: best.sourceChain,
      destinationChain: best.destinationChain,
      needsBridge: true,
      score: best.score,
      steps: [
        {
          type: 'bridge',
          chainId: best.sourceChain,
          amount: best.bridgeAmount.toFixed(6),
          estimatedFeeUsd: best.sourceGas.bridgeFeeUsd,
          estimatedConfirmationMs: best.sourceGas.bridgeTimeMs,
          metadata: { toChainId: best.destinationChain },
        },
        {
          type: 'transfer',
          chainId: best.destinationChain,
          amount: amount.toFixed(6),
          estimatedFeeUsd: best.destinationGas.gasFeeUsd,
          estimatedConfirmationMs: best.destinationGas.confirmationMs,
        },
      ],
      reason: `Bridging from ${best.sourceChain} to ${best.destinationChain} to satisfy liquidity`,
    };
  }
}
