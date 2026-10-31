import { describe, it, expect } from 'vitest';
import { PolicySchema, DEFAULT_POLICY } from '@/domain/policy/schema';

describe('Phase 2: Policy Schema & Validation', () => {
  it('parses the default balanced policy successfully', () => {
    const result = PolicySchema.safeParse(DEFAULT_POLICY);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.routingRules.autoCancelEnabled).toBe(false);
      expect(result.data.nudgeConfig.discountAmountRupees).toBe(30);
    }
  });

  it('rejects unordered risk thresholds where shipCeiling > confirmCeiling', () => {
    const invalidPolicy = {
      ...DEFAULT_POLICY,
      routingRules: {
        ...DEFAULT_POLICY.routingRules,
        shipCeiling: 0.50,
        confirmCeiling: 0.30, // Invalid: confirm < ship
      },
    };

    const result = PolicySchema.safeParse(invalidPolicy);
    expect(result.success).toBe(false);
  });

  it('enforces safety rules: first-order auto-cancel blocked by default', () => {
    expect(DEFAULT_POLICY.routingRules.blockFirstOrderAutoCancel).toBe(true);
    expect(DEFAULT_POLICY.routingRules.blockLowSupportPincodeCancel).toBe(true);
  });
});
