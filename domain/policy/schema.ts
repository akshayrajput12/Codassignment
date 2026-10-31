import { z } from 'zod';

export const CostConfigSchema = z.object({
  grossMarginFraction: z.number().min(0.01).max(1.0).default(0.62),
  forwardShippingCost: z.number().min(0).default(65),
  returnShippingCost: z.number().min(0).default(65),
  packagingCost: z.number().min(0).default(25),
  damageRate: z.number().min(0).max(1.0).default(0.08),
  averageProductCost: z.number().min(0).default(180),
  shippingIncludedInMargin: z.boolean().default(false),
  prepaidGatewayFeeFraction: z.number().min(0).max(0.1).default(0),
  messagingCostPerOrder: z.number().min(0).default(0),
});

export const RoutingRulesSchema = z.object({
  shipCeiling: z.number().min(0).max(1.0).default(0.20),
  confirmCeiling: z.number().min(0).max(1.0).default(0.40),
  highRiskHoldThreshold: z.number().min(0).max(1.0).default(0.65),
  autoCancelEnabled: z.boolean().default(false),
  requireManualReviewForHold: z.boolean().default(true),
  blockFirstOrderAutoCancel: z.boolean().default(true),
  blockLowSupportPincodeCancel: z.boolean().default(true),
  minPincodeSupportForAction: z.number().int().min(1).default(5),
}).refine((data) => data.shipCeiling <= data.confirmCeiling, {
  message: "shipCeiling must be less than or equal to confirmCeiling",
  path: ["confirmCeiling"],
}).refine((data) => data.confirmCeiling <= data.highRiskHoldThreshold, {
  message: "confirmCeiling must be less than or equal to highRiskHoldThreshold",
  path: ["highRiskHoldThreshold"],
});

export const NudgeConfigSchema = z.object({
  discountAmountRupees: z.number().int().min(0).max(200).default(30),
  maxDiscountPercent: z.number().min(0).max(0.50).default(0.10),
  minOrderValue: z.number().min(0).default(300),
  expiryHours: z.number().int().min(1).max(72).default(24),
  assumedPrepaidConversionRate: z.number().min(0).max(1.0).default(0.25),
  assumedPrepaidRtoRate: z.number().min(0).max(0.50).default(0.04),
});

export const ConfirmationConfigSchema = z.object({
  reminderAfterHours: z.number().int().min(1).max(24).default(6),
  timeoutHours: z.number().int().min(1).max(72).default(24),
  timeoutAction: z.enum(['HOLD_FOR_REVIEW', 'CANCEL']).default('HOLD_FOR_REVIEW'),
});

export const PolicySchema = z.object({
  id: z.string().default('default-v1'),
  version: z.string().default('v1.0.0'),
  name: z.string().min(1).default('Balanced Protection Policy'),
  description: z.string().default('Protects genuine customers and marketing CAC while mitigating high-risk returns.'),
  routingRules: RoutingRulesSchema,
  costConfig: CostConfigSchema,
  nudgeConfig: NudgeConfigSchema,
  confirmationConfig: ConfirmationConfigSchema,
  isActive: z.boolean().default(true),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Policy = z.infer<typeof PolicySchema>;
export type RoutingRules = z.infer<typeof RoutingRulesSchema>;
export type CostConfig = z.infer<typeof CostConfigSchema>;
export type NudgeConfig = z.infer<typeof NudgeConfigSchema>;
export type ConfirmationConfig = z.infer<typeof ConfirmationConfigSchema>;

export const DEFAULT_POLICY: Policy = PolicySchema.parse({
  id: 'default-v1',
  version: 'v1.0.0',
  name: 'Balanced Protection Policy',
  description: 'Default balanced policy: auto-cancel disabled, ₹30 prepaid discount pilot, WhatsApp confirmation for moderate risk and sparse pincodes.',
  routingRules: {
    shipCeiling: 0.20,
    confirmCeiling: 0.40,
    highRiskHoldThreshold: 0.65,
    autoCancelEnabled: false,
    requireManualReviewForHold: true,
    blockFirstOrderAutoCancel: true,
    blockLowSupportPincodeCancel: true,
    minPincodeSupportForAction: 5,
  },
  costConfig: {
    grossMarginFraction: 0.62,
    forwardShippingCost: 65,
    returnShippingCost: 65,
    packagingCost: 25,
    damageRate: 0.08,
    averageProductCost: 180,
    shippingIncludedInMargin: false,
    prepaidGatewayFeeFraction: 0,
    messagingCostPerOrder: 0,
  },
  nudgeConfig: {
    discountAmountRupees: 30,
    maxDiscountPercent: 0.10,
    minOrderValue: 300,
    expiryHours: 24,
    assumedPrepaidConversionRate: 0.25,
    assumedPrepaidRtoRate: 0.04,
  },
  confirmationConfig: {
    reminderAfterHours: 6,
    timeoutHours: 24,
    timeoutAction: 'HOLD_FOR_REVIEW',
  },
  isActive: true,
  createdAt: '2026-10-31T00:00:00.000Z',
  updatedAt: '2026-10-31T00:00:00.000Z',
});
