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
    const candidates: {
      destinationChain: string;
      score: number;
      bridgeSteps: {
        sourceChain: string;
        amount: DecimalType;
        sourceGas: {
          gasFeeUsd: number;
          confirmationMs: number;
          bridgeFeeUsd: number;
          bridgeTimeMs: number;
        };
      }[];
      destGas: {
        gasFeeUsd: number;
        confirmationMs: number;
        bridgeFeeUsd: number;
        bridgeTimeMs: number;
      };
    }[] = [];

    // Consider each active chain as a potential *destination* chain
    for (const destChainId of activeSet) {
      const destGas = gasMap.get(destChainId);
      if (!destGas) continue;

      const destBalance = balanceMap.get(destChainId) ?? toDecimal(0);
      // If destination already has enough for a direct route,
      // we should have picked it in pickDirectRoute, so skip here.
      if (destBalance.gte(amount)) {
        continue;
      }

      let remaining = amount.minus(destBalance);
      if (remaining.lte(0)) {
        continue;
      }

      // Build list of potential source chains (all others with > 0 balance)
      const sources = balances
        .filter((b) => b.chainId !== destChainId)
        .map((b) => {
          const available = toDecimal(b.balance);
          const sourceGas = gasMap.get(b.chainId);
          return {
            chainId: b.chainId,
            available,
            sourceGas,
          };
        })
        .filter(
          (s) => s.available.gt(0) && !!s.sourceGas && activeSet.has(s.chainId),
        ) as {
        chainId: string;
        available: DecimalType;
        sourceGas: {
          gasFeeUsd: number;
          confirmationMs: number;
          bridgeFeeUsd: number;
          bridgeTimeMs: number;
        };
      }[];

      // Greedy: sort sources by cheapest bridge fee first
      sources.sort(
        (a, b) => a.sourceGas.bridgeFeeUsd - b.sourceGas.bridgeFeeUsd,
      );

      const bridgeSteps: {
        sourceChain: string;
        amount: DecimalType;
        sourceGas: {
          gasFeeUsd: number;
          confirmationMs: number;
          bridgeFeeUsd: number;
          bridgeTimeMs: number;
        };
      }[] = [];

      for (const source of sources) {
        if (remaining.lte(0)) break;

        const bridgeAmount = source.available.gte(remaining)
          ? remaining
          : source.available;

        if (bridgeAmount.lte(0)) continue;

        bridgeSteps.push({
          sourceChain: source.chainId,
          amount: bridgeAmount,
          sourceGas: source.sourceGas,
        });

        remaining = remaining.minus(bridgeAmount);
      }

      // If after using all sources we still don't cover the amount, skip this dest
      if (remaining.gt(0)) {
        continue;
      }

      // Compute aggregate bridge fee and time for scoring
      const totalBridgeFeeUsd = bridgeSteps.reduce(
        (sum, step) => sum + step.sourceGas.bridgeFeeUsd,
        0,
      );
      const totalBridgeTimeMs = bridgeSteps.reduce(
        (sum, step) => sum + step.sourceGas.bridgeTimeMs,
        0,
      );

      const totalTimeMs = totalBridgeTimeMs + destGas.confirmationMs;

      const score = calculateBridgeScore(
        totalBridgeFeeUsd,
        destGas.gasFeeUsd,
        totalTimeMs,
      );

      candidates.push({
        destinationChain: destChainId,
        score,
        bridgeSteps,
        destGas,
      });
    }

    if (!candidates.length) {
      return null;
    }

    const best = candidates.reduce((prev, current) =>
      current.score < prev.score ? current : prev,
    );

    const allBridgeSteps = best.bridgeSteps.map((step) => ({
      type: 'bridge' as const,
      chainId: step.sourceChain,
      amount: step.amount.toFixed(6),
      estimatedFeeUsd: step.sourceGas.bridgeFeeUsd,
      estimatedConfirmationMs: step.sourceGas.bridgeTimeMs,
      metadata: { toChainId: best.destinationChain },
    }));

    return {
      sourceChain:
        allBridgeSteps.length === 1
          ? allBridgeSteps[0].chainId
          : 'multi-source',
      destinationChain: best.destinationChain,
      needsBridge: true,
      score: best.score,
      steps: [
        ...allBridgeSteps,
        {
          type: 'transfer',
          chainId: best.destinationChain,
          amount: amount.toFixed(6),
          estimatedFeeUsd: best.destGas.gasFeeUsd,
          estimatedConfirmationMs: best.destGas.confirmationMs,
        },
      ],
      reason:
        allBridgeSteps.length === 1
          ? `Bridging from ${allBridgeSteps[0].chainId} to ${best.destinationChain} to satisfy liquidity`
          : `Aggregating liquidity from ${allBridgeSteps
              .map((s) => s.chainId)
              .join(', ')} to ${best.destinationChain} to satisfy liquidity`,
    };
  }
}
