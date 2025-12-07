export interface BlockchainResponse {
  txId: string;
  latencyMs: number;
  status: 'success' | 'failed';
  metadata?: Record<string, any>;
}
