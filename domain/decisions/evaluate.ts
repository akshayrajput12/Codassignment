import { Policy, DEFAULT_POLICY } from '@/domain/policy/schema';
import { estimateOrderRisk } from '@/domain/risk/estimate';
import {
  calculateShipEv,
  calculatePrepaidEv,
  calculateCandidateDiscount,
  calculateBreakEvenRisk,
  calculateDeliveredContribution,
  calculateRtoLoss,
} from '@/domain/economics/contribution';

export type ActionType =
  | 'SHIP_AS_IS'
  | 'SHIP_AFTER_CONFIRMATION'
  | 'NUDGE_TO_PREPAID'
  | 'HOLD_CANCEL';

export type WorkflowStateType =
  | 'READY_TO_SHIP'
  | 'AWAITING_CONFIRMATION'
  | 'AWAITING_ADDRESS_CORRECTION'
  | 'AWAITING_PREPAID'
  | 'CONFIRMED_COD'
  | 'PAID_PREPAID'
  | 'HELD_FOR_REVIEW'
  | 'TIMED_OUT'
  | 'CANCELLED'
  | 'DISPATCHED';

export interface OrderInput {
  id: string;
  orderDatetime?: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  orderValue: number;
  items?: string;
  numItems?: number;
  customerPriorOrders?: number;
  customerPriorRto?: number;
  utmSource?: string;
  courier?: string;
}

export interface DecisionEvaluationResult {
  orderId: string;
  action: ActionType;
  workflowState: WorkflowStateType;
  probability: number;
  riskBand: 'LOW' | 'MEDIUM' | 'ELEVATED' | 'HIGH';
  breakEvenRisk: number;
  explanation: string;
  reasonCodes: string[];
  evidence: {
    isFirstTime: boolean;
    customerPriorOrders: number;
    customerPriorRto: number;
    pincodeSupport: number;
    isSparsePincode: boolean;
    missingFields: string[];
    utmSource: string;
  };
  economics: {
    orderValue: number;
    deliveredContribution: number;
    rtoLoss: number;
    evShip: number;
    evPrepaid: number;
    evCancel: number;
    recommendedDiscount: number;
  };
  policyVersion: string;
  modelVersion: string;
}

export function evaluateOrderDecision(
  order: OrderInput,
  policy: Policy = DEFAULT_POLICY,
  pincodeStats?: { total: number; rto: number }
): DecisionEvaluationResult {
  const missingFields: string[] = [];
  if (!order.address || order.address.trim() === '') missingFields.push('address');
  if (!order.city || order.city.trim() === '') missingFields.push('city');
  if (!order.pincode || order.pincode.trim() === '') missingFields.push('pincode');
  if (!order.phone || order.phone.trim() === '') missingFields.push('phone');

  const orderValue = Math.max(0, order.orderValue || 0);
  const priorOrders = Math.max(0, order.customerPriorOrders || 0);
  const priorRto = Math.max(0, order.customerPriorRto || 0);
  const isFirstTime = priorOrders === 0;

  // 1. Data Eligibility Check: Missing critical shipment info
  if (missingFields.length > 0) {
    const deliveredG = calculateDeliveredContribution(orderValue, policy.costConfig);
    const rtoL = calculateRtoLoss(policy.costConfig);
    return {
      orderId: order.id,
      action: 'HOLD_CANCEL',
      workflowState: 'HELD_FOR_REVIEW',
      probability: 0.50,
      riskBand: 'HIGH',
      breakEvenRisk: calculateBreakEvenRisk(orderValue, policy.costConfig),
      explanation: `Held for review: Missing critical shipment information (${missingFields.join(', ')}). Cannot dispatch without valid delivery details.`,
      reasonCodes: ['MISSING_CRITICAL_FIELDS', ...missingFields.map((f) => `MISSING_${f.toUpperCase()}`)],
      evidence: {
        isFirstTime,
        customerPriorOrders: priorOrders,
        customerPriorRto: priorRto,
        pincodeSupport: pincodeStats?.total || 0,
        isSparsePincode: (pincodeStats?.total || 0) < policy.routingRules.minPincodeSupportForAction,
        missingFields,
        utmSource: order.utmSource || 'unknown',
      },
      economics: {
        orderValue,
        deliveredContribution: deliveredG,
        rtoLoss: rtoL,
        evShip: calculateShipEv(orderValue, 0.50, policy.costConfig),
        evPrepaid: 0,
        evCancel: 0,
        recommendedDiscount: 0,
      },
      policyVersion: policy.version,
      modelVersion: 'empirical-bayesian-v1',
    };
  }

  // 2. Risk Estimation
  const riskResult = estimateOrderRisk({
    priorOrders,
    priorRto,
    pincode: order.pincode,
    pincodeStats,
    orderValue,
    utmSource: order.utmSource,
  });

  const p = riskResult.probability;
  const breakEvenRisk = calculateBreakEvenRisk(orderValue, policy.costConfig);
  const deliveredG = calculateDeliveredContribution(orderValue, policy.costConfig);
  const rtoL = calculateRtoLoss(policy.costConfig);
  const evShip = calculateShipEv(orderValue, p, policy.costConfig);

  const candidateDiscount = calculateCandidateDiscount(orderValue, {
    absoluteCap: policy.nudgeConfig.discountAmountRupees,
    percentageCap: policy.nudgeConfig.maxDiscountPercent,
    pCod: p,
    pPrepaid: policy.nudgeConfig.assumedPrepaidRtoRate,
    config: policy.costConfig,
  });

  const evPrepaid = calculatePrepaidEv(
    orderValue,
    policy.nudgeConfig.assumedPrepaidRtoRate,
    candidateDiscount,
    policy.costConfig
  );

  const reasonCodes: string[] = [];
  let action: ActionType = 'SHIP_AS_IS';
  let workflowState: WorkflowStateType = 'READY_TO_SHIP';
  let explanation = '';

  const { routingRules, nudgeConfig } = policy;

  // 3. Routing Rules Evaluation
  const isRepeatReturner = priorOrders >= 2 && priorRto === priorOrders;

  // Case A: High Risk above Break-even or highRiskHoldThreshold or Repeat RTO abuser
  if (p >= routingRules.highRiskHoldThreshold || p >= breakEvenRisk || isRepeatReturner) {
    // Check if auto-cancel is allowed
    const canAutoCancel =
      routingRules.autoCancelEnabled &&
      (!routingRules.blockFirstOrderAutoCancel || !isFirstTime) &&
      (!routingRules.blockLowSupportPincodeCancel || !riskResult.isSparsePincode);

    if (canAutoCancel) {
      action = 'HOLD_CANCEL';
      workflowState = 'CANCELLED';
      reasonCodes.push('HIGH_RISK_AUTO_CANCEL');
      explanation = `Cancelled: High predicted return risk (${Number(p * 100).toFixed(1)}%) exceeds economic break-even (${Number(breakEvenRisk * 100).toFixed(1)}%). Auto-cancellation authorized by policy.`;
    } else {
      action = 'HOLD_CANCEL';
      workflowState = 'HELD_FOR_REVIEW';
      reasonCodes.push('HIGH_RISK_MANUAL_REVIEW');
      explanation = `Held for review: High return risk (${Number(p * 100).toFixed(1)}% vs break-even ${Number(breakEvenRisk * 100).toFixed(1)}%). Auto-cancellation disabled; held for ops review.`;
    }
  }
  // Case B: Low Risk -> Ship As-Is
  else if (p <= routingRules.shipCeiling && !riskResult.isSparsePincode) {
    action = 'SHIP_AS_IS';
    workflowState = 'READY_TO_SHIP';
    reasonCodes.push('LOW_RISK_FAST_TRACK');
    explanation = `Ship as-is: Low predicted return risk (${Number(p * 100).toFixed(1)}%), established delivery area, and positive unit margin (₹${Math.round(deliveredG)}).`;
  }
  // Case C: Eligible for Prepaid Nudge
  // Order value >= minOrderValue, candidateDiscount >= 1, and EV_prepaid > EV_ship
  else if (
    orderValue >= nudgeConfig.minOrderValue &&
    candidateDiscount >= 1 &&
    evPrepaid > evShip &&
    p <= routingRules.confirmCeiling
  ) {
    action = 'NUDGE_TO_PREPAID';
    workflowState = 'AWAITING_PREPAID';
    reasonCodes.push('PREPAID_NUDGE_ELIGIBLE');
    const uplift = Math.round(evPrepaid - evShip);
    explanation = `Nudge to prepaid: Order value ₹${orderValue} with moderate risk (${Number(p * 100).toFixed(1)}%). Offering ₹${candidateDiscount} discount to pay online yields ₹${uplift} higher expected unit contribution.`;
  }
  // Case D: Moderate / Elevated Risk or Sparse Pincode -> Ship After Confirmation
  else {
    action = 'SHIP_AFTER_CONFIRMATION';
    workflowState = 'AWAITING_CONFIRMATION';
    reasonCodes.push('CONFIRMATION_REQUIRED');

    if (riskResult.isSparsePincode) {
      reasonCodes.push('SPARSE_PINCODE_HISTORY');
      explanation = `Ship after confirmation: Pincode ${order.pincode} has sparse delivery history (only ${riskResult.pincodeSupport} orders). Send WhatsApp confirmation before dispatching.`;
    } else if (isFirstTime) {
      reasonCodes.push('FIRST_TIME_META_BUYER');
      explanation = `Ship after confirmation: First-time customer with moderate risk (${Number(p * 100).toFixed(1)}%). Verifying customer intent via WhatsApp to protect marketing ad spend.`;
    } else {
      reasonCodes.push('MODERATE_RISK_VERIFICATION');
      explanation = `Ship after confirmation: Moderate return risk (${Number(p * 100).toFixed(1)}%). Customer confirmation required before warehouse pick and pack.`;
    }
  }

  return {
    orderId: order.id,
    action,
    workflowState,
    probability: p,
    riskBand: riskResult.band,
    breakEvenRisk,
    explanation,
    reasonCodes,
    evidence: {
      isFirstTime,
      customerPriorOrders: priorOrders,
      customerPriorRto: priorRto,
      pincodeSupport: riskResult.pincodeSupport,
      isSparsePincode: riskResult.isSparsePincode,
      missingFields: [],
      utmSource: order.utmSource || 'direct',
    },
    economics: {
      orderValue,
      deliveredContribution: deliveredG,
      rtoLoss: rtoL,
      evShip,
      evPrepaid,
      evCancel: 0,
      recommendedDiscount: candidateDiscount,
    },
    policyVersion: policy.version,
    modelVersion: 'empirical-bayesian-v1',
  };
}
