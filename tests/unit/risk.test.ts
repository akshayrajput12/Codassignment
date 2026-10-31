import { describe, it, expect } from 'vitest';
import {
  calculateSmoothedRate,
  estimateOrderRisk,
  TRAINING_PRIORS,
} from '@/domain/risk/estimate';

describe('Phase 2: Risk Estimator with Shrinkage & Leakage Protection', () => {
  it('shrinks a zero-support group completely to global prior', () => {
    const rate = calculateSmoothedRate(0, 0, 0.28, 20);
    // (0 + 20 * 0.28) / (0 + 20) = 0.28
    expect(rate).toBeCloseTo(0.28, 4);
  });

  it('shrinks a single RTO (1 order, 1 RTO) heavily toward prior instead of 100%', () => {
    const rate = calculateSmoothedRate(1, 1, 0.28, 30);
    // (1 + 30 * 0.28) / (1 + 30) = (1 + 8.4) / 31 = 9.4 / 31 ≈ 0.3032
    expect(rate).toBeCloseTo(0.3032, 4);
    expect(rate).toBeLessThan(0.35); // Does NOT treat as 100% fraud
  });

  it('estimates lower risk for repeat customer with 0 prior RTOs', () => {
    const firstTimeRisk = estimateOrderRisk({
      priorOrders: 0,
      priorRto: 0,
      pincode: '400001',
      orderValue: 649,
    });

    const repeatGoodRisk = estimateOrderRisk({
      priorOrders: 3,
      priorRto: 0,
      pincode: '400001',
      orderValue: 649,
    });

    expect(repeatGoodRisk.probability).toBeLessThan(firstTimeRisk.probability);
    expect(repeatGoodRisk.band).toBeDefined();
  });

  it('flags sparse pincode when historical support is under 5', () => {
    const risk = estimateOrderRisk({
      priorOrders: 0,
      priorRto: 0,
      pincode: '999999', // Unknown/sparse pincode
      orderValue: 649,
    });

    expect(risk.pincodeSupport).toBeLessThan(5);
    expect(risk.isSparsePincode).toBe(true);
  });

  it('never outputs NaN or out-of-bounds probability', () => {
    const risk = estimateOrderRisk({
      priorOrders: -1, // invalid input test
      priorRto: 5,
      pincode: '',
      orderValue: 0,
    });

    expect(risk.probability).toBeGreaterThanOrEqual(0);
    expect(risk.probability).toBeLessThanOrEqual(1);
    expect(isNaN(risk.probability)).toBe(false);
  });
});
