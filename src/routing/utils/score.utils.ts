export const calculateDirectScore = (
  gasFeeUsd: number,
  confirmationTimeMs: number,
): number => {
  const score = gasFeeUsd * 0.7 + (confirmationTimeMs / 1000) * 0.3;
  return Number(score.toFixed(6));
};

export const calculateBridgeScore = (
  bridgeFeeUsd: number,
  transferFeeUsd: number,
  totalTimeMs: number,
): number => {
  const feeComponent = (bridgeFeeUsd + transferFeeUsd) * 0.7;
  const timeComponent = (totalTimeMs / 1000) * 0.3;
  return Number((feeComponent + timeComponent).toFixed(6));
};
