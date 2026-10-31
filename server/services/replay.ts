import path from 'path';
import fs from 'fs';
import { runDataAudit } from '@/scripts/analyze';
import { DEFAULT_POLICY, Policy } from '@/domain/policy/schema';
import { evaluateOrderDecision } from '@/domain/decisions/evaluate';
import {
  calculateRtoLoss,
  calculateDeliveredContribution,
  reconcileFinancialBridge,
} from '@/domain/economics/contribution';

export interface SeptemberReplayResult {
  cohortMonth: string;
  totalSeptemberOrders: number;
  deliveredCount: number;
  rtoCount: number;
  rtoRatePercent: number;
  actionCounts: {
    shipAsIs: number;
    confirmFirst: number;
    prepaidNudge: number;
    holdCancel: number;
  };
  retrospectiveDiagnostic: {
    wouldHoldOrCancelCount: number;
    actualRtoAvoidedCount: number;
    actualDeliveredForegoneCount: number;
    actualRtoCostAvoidedRupees: number;
    actualContributionForegoneRupees: number;
    netRetrospectiveRupees: number;
  };
  modeledInterventionScenario: {
    avoidedRtoCostRupees: number;
    foregoneGenuineRupees: number;
    otherPolicyEffectsRupees: number;
    netIncrementalContributionRupees: number;
  };
  perOrderReplay: Array<{
    orderId: string;
    orderValue: number;
    customerName: string;
    pincode: string;
    isFirstTime: boolean;
    utmSource: string;
    actualOutcome: string;
    recommendedAction: string;
    probability: number;
    riskBand: string;
    reason: string;
    evShip: number;
    evChosen: number;
    deltaEv: number;
  }>;
}

export function runSeptemberReplay(
  policy: Policy = DEFAULT_POLICY,
  csvFilePath?: string
): SeptemberReplayResult {
  const filePath = csvFilePath || path.resolve(process.cwd(), 'orders_sample.csv');
  const { resolvedOrders } = runDataAudit(filePath);

  // Pre-calculate pincode stats from pre-September (April-August) orders only to prevent leakage!
  const preSeptemberPincodes: Record<string, { total: number; rto: number }> = {};
  for (const row of resolvedOrders) {
    if (!row.order_datetime.startsWith('2026-09')) {
      const pin = (row.pincode || '').trim();
      if (pin) {
        if (!preSeptemberPincodes[pin]) preSeptemberPincodes[pin] = { total: 0, rto: 0 };
        preSeptemberPincodes[pin].total++;
        if (row.final_status.trim().toUpperCase() === 'RTO') {
          preSeptemberPincodes[pin].rto++;
        }
      }
    }
  }

  const septemberOrders = resolvedOrders.filter((r) => r.order_datetime.startsWith('2026-09'));

  const costConfig = policy.costConfig;
  const L = calculateRtoLoss(costConfig);

  let deliveredCount = 0;
  let rtoCount = 0;

  let countShip = 0;
  let countConfirm = 0;
  let countNudge = 0;
  let countHold = 0;

  // Retrospective actuals among would-hold/cancel
  let actualRtoAvoided = 0;
  let actualDeliveredForegone = 0;
  let actualContributionForegone = 0;

  // Modeled intervention totals
  let modeledAvoidedRto = 0;
  let modeledForegoneGenuine = 0;
  let modeledOtherEffects = 0;

  const perOrderReplay = [];

  for (const row of septemberOrders) {
    const outcome = row.final_status.trim().toUpperCase();
    if (outcome === 'DELIVERED') deliveredCount++;
    if (outcome === 'RTO') rtoCount++;

    const pin = (row.pincode || '').trim();
    const pinStats = preSeptemberPincodes[pin] || { total: 0, rto: 0 };
    const orderVal = parseFloat(row.order_value) || 0;
    const priorOrders = parseInt(row.customer_prior_orders || '0', 10);
    const priorRto = parseInt(row.customer_prior_rto || '0', 10);
    const G = calculateDeliveredContribution(orderVal, costConfig);

    const evalResult = evaluateOrderDecision(
      {
        id: row.order_id,
        orderDatetime: row.order_datetime,
        customerName: row.customer_name,
        phone: row.phone,
        address: row.address,
        city: row.city,
        state: row.state,
        pincode: pin,
        orderValue: orderVal,
        items: row.items,
        numItems: parseInt(row.num_items || '1', 10),
        customerPriorOrders: priorOrders,
        customerPriorRto: priorRto,
        utmSource: row.utm_source,
        courier: row.courier,
      },
      policy,
      pinStats
    );

    const action = evalResult.action;
    const p = evalResult.probability;
    const evShip = evalResult.economics.evShip;
    let evChosen = evShip;

    if (action === 'SHIP_AS_IS') {
      countShip++;
      evChosen = evShip;
    } else if (action === 'SHIP_AFTER_CONFIRMATION') {
      countConfirm++;
      // Expected modeled confirmation
      const avoidedRiskShare = p * 0.40;
      modeledAvoidedRto += avoidedRiskShare * L;
      const dropOff = (1 - p) * 0.03;
      modeledForegoneGenuine += dropOff * G;
      evChosen = evShip + (avoidedRiskShare * L) - (dropOff * G);
    } else if (action === 'NUDGE_TO_PREPAID') {
      countNudge++;
      const convRate = policy.nudgeConfig.assumedPrepaidConversionRate || 0.25;
      const prepaidRto = policy.nudgeConfig.assumedPrepaidRtoRate || 0.04;
      const discount = evalResult.economics.recommendedDiscount || 30;
      const deltaRto = Math.max(0, p - prepaidRto);

      modeledAvoidedRto += convRate * deltaRto * L;
      modeledOtherEffects -= convRate * discount;
      evChosen = evShip + convRate * (deltaRto * L - discount);
    } else if (action === 'HOLD_CANCEL') {
      countHold++;
      evChosen = 0; // cancellation contribution

      // Retrospective diagnostic against real outcome
      if (outcome === 'RTO') {
        actualRtoAvoided++;
      } else if (outcome === 'DELIVERED') {
        actualDeliveredForegone++;
        actualContributionForegone += G;
      }

      modeledAvoidedRto += p * L;
      modeledForegoneGenuine += (1 - p) * G;
    }

    perOrderReplay.push({
      orderId: row.order_id,
      orderValue: orderVal,
      customerName: row.customer_name,
      pincode: pin,
      isFirstTime: priorOrders === 0,
      utmSource: row.utm_source,
      actualOutcome: outcome,
      recommendedAction: action,
      probability: p,
      riskBand: evalResult.riskBand,
      reason: evalResult.explanation,
      evShip: Math.round(evShip),
      evChosen: Math.round(evChosen),
      deltaEv: Math.round(evChosen - evShip),
    });
  }

  const wouldHoldCount = countHold;
  const actualRtoCostAvoided = actualRtoAvoided * L;
  const netRetrospective = actualRtoCostAvoided - actualContributionForegone;

  const modeledBridge = reconcileFinancialBridge({
    baselineContribution: 0,
    avoidedRtoCost: Math.round(modeledAvoidedRto),
    foregoneGenuineContribution: Math.round(modeledForegoneGenuine),
    otherPolicyEffects: Math.round(modeledOtherEffects),
  });

  return {
    cohortMonth: 'September 2026',
    totalSeptemberOrders: septemberOrders.length,
    deliveredCount,
    rtoCount,
    rtoRatePercent: Number(((rtoCount / septemberOrders.length) * 100).toFixed(4)),
    actionCounts: {
      shipAsIs: countShip,
      confirmFirst: countConfirm,
      prepaidNudge: countNudge,
      holdCancel: countHold,
    },
    retrospectiveDiagnostic: {
      wouldHoldOrCancelCount: wouldHoldCount,
      actualRtoAvoidedCount: actualRtoAvoided,
      actualDeliveredForegoneCount: actualDeliveredForegone,
      actualRtoCostAvoidedRupees: Math.round(actualRtoCostAvoided),
      actualContributionForegoneRupees: Math.round(actualContributionForegone),
      netRetrospectiveRupees: Math.round(netRetrospective),
    },
    modeledInterventionScenario: {
      avoidedRtoCostRupees: modeledBridge.avoidedRtoCost,
      foregoneGenuineRupees: modeledBridge.foregoneGenuineContribution,
      otherPolicyEffectsRupees: modeledBridge.otherPolicyEffects,
      netIncrementalContributionRupees: modeledBridge.netImpact,
    },
    perOrderReplay,
  };
}
