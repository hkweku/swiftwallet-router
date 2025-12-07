export type RouteStepType = 'bridge' | 'transfer';

export interface RouteStep {
  type: RouteStepType;
  chainId: string;
  amount: string;
  estimatedFeeUsd: number;
  estimatedConfirmationMs: number;
  metadata?: Record<string, string>;
}

export interface RouteDecision {
  sourceChain: string;
  destinationChain: string;
  needsBridge: boolean;
  steps: RouteStep[];
  reason: string;
  score: number;
}
