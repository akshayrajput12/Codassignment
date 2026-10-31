export interface CostConfig {
  grossMarginFraction: number; // e.g. 0.62
  forwardShippingCost: number; // ₹65
  returnShippingCost: number; // ₹65
  packagingCost: number; // ₹25
  damageRate: number; // 0.08
  averageProductCost: number; // ₹180
  shippingIncludedInMargin?: boolean; // default false
  prepaidGatewayFeeFraction?: number; // e.g. 0.015 (optional)
  messagingCostPerOrder?: number; // e.g. ₹0.50 (optional)
}

export const DEFAULT_COST_CONFIG: CostConfig = {
  grossMarginFraction: 0.62,
  forwardShippingCost: 65,
  returnShippingCost: 65,
  packagingCost: 25,
  damageRate: 0.08,
  averageProductCost: 180,
  shippingIncludedInMargin: false,
  prepaidGatewayFeeFraction: 0,
  messagingCostPerOrder: 0,
};

/**
 * Expected direct financial loss of an RTO:
 * L = forwardShipping + returnShipping + packaging + (damageRate * averageProductCost)
 * Default = 65 + 65 + 25 + (0.08 * 180) = ₹169.40
 */
export function calculateRtoLoss(config: CostConfig = DEFAULT_COST_CONFIG): number {
  const expectedDamage = config.damageRate * config.averageProductCost;
  return config.forwardShippingCost + config.returnShippingCost + config.packagingCost + expectedDamage;
}

/**
 * Delivered gross contribution G(v) before customer acquisition:
 * Default: G(v) = grossMargin * v - forwardShipping - packaging
 * If shipping is assumed already inside margin: G(v) = grossMargin * v
 */
export function calculateDeliveredContribution(
  orderValue: number,
  config: CostConfig = DEFAULT_COST_CONFIG
): number {
  const grossProductMargin = config.grossMarginFraction * orderValue;
  if (config.shippingIncludedInMargin) {
    return grossProductMargin;
  }
  return grossProductMargin - config.forwardShippingCost - config.packagingCost;
}

/**
 * Expected Value of shipping an eligible COD order:
 * EV_ship(v, p) = (1 - p) * G(v) - p * L
 */
export function calculateShipEv(
  orderValue: number,
  pRisk: number,
  config: CostConfig = DEFAULT_COST_CONFIG
): number {
  const G = calculateDeliveredContribution(orderValue, config);
  const L = calculateRtoLoss(config);
  return (1 - pRisk) * G - pRisk * L;
}

/**
 * Break-even risk threshold where EV_ship == 0:
 * (1 - p) * G - p * L = 0 => p_break = G / (G + L)
 */
export function calculateBreakEvenRisk(
  orderValue: number,
  config: CostConfig = DEFAULT_COST_CONFIG
): number {
  const G = calculateDeliveredContribution(orderValue, config);
  const L = calculateRtoLoss(config);
  if (G + L <= 0) return 0;
  return G / (G + L);
}

/**
 * Expected Value of a successfully converted Prepaid order:
 * EV_prepaid = (1 - pPrepaid) * [G(v) - discount] - pPrepaid * L - extraFees
 */
export function calculatePrepaidEv(
  orderValue: number,
  pPrepaid: number = 0.04,
  discount: number = 30,
  config: CostConfig = DEFAULT_COST_CONFIG
): number {
  const G = calculateDeliveredContribution(orderValue, config);
  const L = calculateRtoLoss(config);
  const gatewayFee = (config.prepaidGatewayFeeFraction || 0) * (orderValue - discount);
  const deliveredNetContribution = G - discount;
  return (1 - pPrepaid) * deliveredNetContribution - pPrepaid * L - gatewayFee;
}

/**
 * Expected uplift per successfully converted order:
 * EV_prepaid - EV_ship
 */
export function calculatePrepaidUplift(
  orderValue: number,
  pCod: number = 0.28,
  pPrepaid: number = 0.04,
  discount: number = 30,
  config: CostConfig = DEFAULT_COST_CONFIG
): number {
  const evPrepaid = calculatePrepaidEv(orderValue, pPrepaid, discount, config);
  const evShip = calculateShipEv(orderValue, pCod, config);
  return evPrepaid - evShip;
}

/**
 * Calculate safe discount offer:
 * Minimum of ₹30, absoluteCap, percentageCap * orderValue, and EV break-even cap.
 */
export function calculateCandidateDiscount(
  orderValue: number,
  options: {
    absoluteCap?: number;
    percentageCap?: number;
    pCod?: number;
    pPrepaid?: number;
    config?: CostConfig;
  } = {}
): number {
  const {
    absoluteCap = 30,
    percentageCap = 0.10,
    pCod = 0.28,
    pPrepaid = 0.04,
    config = DEFAULT_COST_CONFIG,
  } = options;

  const G = calculateDeliveredContribution(orderValue, config);
  const L = calculateRtoLoss(config);

  // Maximum theoretical discount where prepaid is still better than COD:
  // EV_prepaid(d) >= EV_cod
  // (1 - pP)(G - d) - pP * L >= (1 - pCOD)G - pCOD * L
  // d <= (pCOD - pP)(G + L) / (1 - pP)
  const deltaP = Math.max(0, pCod - pPrepaid);
  const safeCeiling = (1 - pPrepaid) > 0 ? (deltaP * (G + L)) / (1 - pPrepaid) : 0;

  const pctLimit = percentageCap * orderValue;
  const rawDiscount = Math.min(30, absoluteCap, pctLimit, Math.max(0, safeCeiling));

  const finalDiscount = Math.floor(rawDiscount);
  return finalDiscount >= 1 ? finalDiscount : 0;
}

export interface FinancialBridgeInput {
  baselineContribution: number;
  avoidedRtoCost: number;
  foregoneGenuineContribution: number;
  otherPolicyEffects: number;
}

export interface FinancialBridgeResult {
  baselineContribution: number;
  avoidedRtoCost: number;
  foregoneGenuineContribution: number;
  otherPolicyEffects: number;
  netImpact: number;
  policyContribution: number;
}

/**
 * Reconciles the financial bridge:
 * net = avoidedRtoCost - foregoneGenuineContribution + otherPolicyEffects
 * policyContribution = baselineContribution + net
 */
export function reconcileFinancialBridge(input: FinancialBridgeInput): FinancialBridgeResult {
  const netImpact = input.avoidedRtoCost - input.foregoneGenuineContribution + input.otherPolicyEffects;
  const policyContribution = input.baselineContribution + netImpact;

  return {
    ...input,
    netImpact,
    policyContribution,
  };
}
