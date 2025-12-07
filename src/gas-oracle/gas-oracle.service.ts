import { Injectable } from '@nestjs/common';
import { GasInfo } from './interfaces/gas-info.interface';

const BASE_GAS_DATA: Omit<
  GasInfo,
  'gasFeeUsd' | 'confirmationMs' | 'bridgeFeeUsd' | 'bridgeTimeMs'
>[] = [
  { chainId: 'polygon' },
  { chainId: 'ethereum' },
  { chainId: 'arbitrum' },
];

@Injectable()
export class GasOracleService {
  private readonly template: Record<
    string,
    {
      gasFeeUsd: number;
      confirmationMs: number;
      bridgeFeeUsd: number;
      bridgeTimeMs: number;
    }
  > = {
    polygon: {
      gasFeeUsd: 0.005,
      confirmationMs: 30_000,
      bridgeFeeUsd: 0.2,
      bridgeTimeMs: 90_000,
    },
    ethereum: {
      gasFeeUsd: 2.5,
      confirmationMs: 90_000,
      bridgeFeeUsd: 4.5,
      bridgeTimeMs: 300_000,
    },
    arbitrum: {
      gasFeeUsd: 0.02,
      confirmationMs: 15_000,
      bridgeFeeUsd: 0.5,
      bridgeTimeMs: 45_000,
    },
  };

  getGasInfo(): Promise<GasInfo[]> {
    return Promise.resolve(
      BASE_GAS_DATA.map(({ chainId }) => {
        const base = this.template[chainId];
        return {
          chainId,
          gasFeeUsd: this.randomize(base.gasFeeUsd, 0.1),
          confirmationMs: Math.round(this.randomize(base.confirmationMs, 0.05)),
          bridgeFeeUsd: this.randomize(base.bridgeFeeUsd, 0.1),
          bridgeTimeMs: Math.round(this.randomize(base.bridgeTimeMs, 0.05)),
        };
      }),
    );
  }

  private randomize(value: number, varianceRatio: number) {
    const variance = value * varianceRatio;
    const delta = Math.random() * variance - variance / 2;
    return Number((value + delta).toFixed(6));
  }
}
