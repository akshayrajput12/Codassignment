import { describe, it, expect } from 'vitest';
import {
  calculateRtoLoss,
  calculateDeliveredContribution,
  calculateShipEv,
  calculateBreakEvenRisk,
  calculatePrepaidEv,
  calculatePrepaidUplift,
  reconcileFinancialBridge,
  DEFAULT_COST_CONFIG,
} from '@/domain/economics/contribution';

describe('Phase 2: Economics and Financial Formulas', () => {
  const config = DEFAULT_COST_CONFIG;

  it('calculates expected RTO loss L = ₹169.40 exactly', () => {
    const L = calculateRtoLoss(config);
    // 65 + 65 + 25 + (0.08 * 180) = 155 + 14.40 = 169.40
    expect(L).toBeCloseTo(169.40, 2);
  });

  it('calculates delivered gross contribution G(649) = ₹312.38 under default accounting', () => {
    const G = calculateDeliveredContribution(649, config);
    // 0.62 * 649 - 65 - 25 = 402.38 - 90 = 312.38
    expect(G).toBeCloseTo(312.38, 2);
  });

  it('calculates delivered contribution under alternate accounting without double-deduction', () => {
    const altConfig = { ...config, shippingIncludedInMargin: true };
    const G_alt = calculateDeliveredContribution(649, altConfig);
    // 0.62 * 649 = 402.38
    expect(G_alt).toBeCloseTo(402.38, 2);
  });

  it('calculates EV_ship(649, 0.28) = ₹177.4816', () => {
    const ev = calculateShipEv(649, 0.28, config);
    // (1 - 0.28) * 312.38 - 0.28 * 169.40 = 224.9136 - 47.4320 = 177.4816
    expect(ev).toBeCloseTo(177.4816, 3);
  });

  it('calculates economic break-even risk threshold p_break ≈ 64.84%', () => {
    const pBreak = calculateBreakEvenRisk(649, config);
    // G / (G + L) = 312.38 / (312.38 + 169.40) = 312.38 / 481.78 ≈ 0.648387
    expect(pBreak).toBeCloseTo(0.648387, 4);
    expect(pBreak * 100).toBeCloseTo(64.84, 2);
  });

  it('calculates EV_prepaid with d=30 and p_prepaid=0.04 = ₹264.3088', () => {
    const evPrepaid = calculatePrepaidEv(649, 0.04, 30, config);
    // 0.96 * (312.38 - 30) - 0.04 * 169.40 = 0.96 * 282.38 - 6.776 = 271.0848 - 6.776 = 264.3088
    expect(evPrepaid).toBeCloseTo(264.3088, 3);
  });

  it('calculates converted prepaid uplift of ₹86.8272 per converted order', () => {
    const uplift = calculatePrepaidUplift(649, 0.28, 0.04, 30, config);
    // 264.3088 - 177.4816 = 86.8272
    expect(uplift).toBeCloseTo(86.8272, 3);
  });

  it('reconciles the financial bridge equation exactly', () => {
    const bridge = reconcileFinancialBridge({
      baselineContribution: 100000,
      avoidedRtoCost: 25000,
      foregoneGenuineContribution: 15000,
      otherPolicyEffects: 5000,
    });

    // net = avoidedRtoCost - foregoneGenuineContribution + otherPolicyEffects = 25000 - 15000 + 5000 = 15000
    expect(bridge.netImpact).toBe(15000);
    // policyContribution = baselineContribution + net = 100000 + 15000 = 115000
    expect(bridge.policyContribution).toBe(115000);
  });
});
