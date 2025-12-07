import { calculateBridgeScore, calculateDirectScore } from './score.utils';

describe('Score Utils', () => {
  it('calculates direct score with weighted gas and time', () => {
    const score = calculateDirectScore(2, 60_000);
    expect(score).toBeCloseTo(2 * 0.7 + 60 * 0.3, 5);
  });

  it('calculates bridge score by combining fees and time', () => {
    const score = calculateBridgeScore(0.5, 1, 120_000);
    expect(score).toBeCloseTo((0.5 + 1) * 0.7 + 120 * 0.3, 5);
  });
});
