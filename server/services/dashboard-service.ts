import { db } from '@/server/db/client';
import { orders, decisions, outcomes } from '@/server/db/schema';
import { eq, like } from 'drizzle-orm';
import { getActivePolicy } from './order-service';
import {
  calculateRtoLoss,
  calculateDeliveredContribution,
  reconcileFinancialBridge,
} from '@/domain/economics/contribution';

export interface DashboardMetrics {
  cohortDate: string;
  isHistoricalDemo: boolean;
  totalOrders: number;
  evaluatedOrders: number;
  buckets: {
    shipAsIs: { count: number; sharePercent: number };
    confirmFirst: { count: number; sharePercent: number };
    prepaidNudge: { count: number; sharePercent: number };
    holdCancel: { count: number; sharePercent: number };
  };
  financialBridge: {
    baselineContribution: number;
    avoidedRtoCost: number;
    foregoneGenuineContribution: number;
    otherPolicyEffects: number;
    netImpact: number;
    policyContribution: number;
  };
  needsAttention: Array<{
    id: string;
    customerName: string;
    phone: string;
    orderValue: number;
    workflowState: string;
    explanation: string;
  }>;
}

export async function getDashboardMetrics(dateParam?: string): Promise<DashboardMetrics> {
  const policy = await getActivePolicy();
  const costConfig = policy.costConfig;
  const L = calculateRtoLoss(costConfig);

  // If no date requested or user selects yesterday (29 Oct 2026)
  // Check if orders exist for that date
  const targetPrefix = dateParam || '2026-09'; // Default to populated September cohort for demo
  const isYesterday = targetPrefix === '2026-10-29' || targetPrefix === '2026-10-30';

  const rows = await db
    .select({
      order: orders,
      decision: decisions,
      outcome: outcomes,
    })
    .from(orders)
    .leftJoin(decisions, eq(orders.id, decisions.orderId))
    .leftJoin(outcomes, eq(orders.id, outcomes.orderId))
    .where(like(orders.orderDatetime, `${targetPrefix}%`))
    .all();

  const totalOrders = rows.length;

  // Empty state for actual yesterday
  if (totalOrders === 0) {
    return {
      cohortDate: targetPrefix,
      isHistoricalDemo: false,
      totalOrders: 0,
      evaluatedOrders: 0,
      buckets: {
        shipAsIs: { count: 0, sharePercent: 0 },
        confirmFirst: { count: 0, sharePercent: 0 },
        prepaidNudge: { count: 0, sharePercent: 0 },
        holdCancel: { count: 0, sharePercent: 0 },
      },
      financialBridge: {
        baselineContribution: 0,
        avoidedRtoCost: 0,
        foregoneGenuineContribution: 0,
        otherPolicyEffects: 0,
        netImpact: 0,
        policyContribution: 0,
      },
      needsAttention: [],
    };
  }

  let countShip = 0;
  let countConfirm = 0;
  let countNudge = 0;
  let countHold = 0;

  let baselineContribution = 0;
  let avoidedRtoCost = 0;
  let foregoneGenuineContribution = 0;
  let otherPolicyEffects = 0;

  const needsAttentionList: DashboardMetrics['needsAttention'] = [];

  for (const row of rows) {
    const val = row.order.orderValue;
    const G = calculateDeliveredContribution(val, costConfig);
    const action = row.decision?.action || 'SHIP_AS_IS';
    const state = row.decision?.workflowState || 'READY_TO_SHIP';
    const p = row.decision?.probability || 0.28;
    const outcome = row.outcome?.finalStatus;

    // Baseline: ship everything under COD
    // Expected baseline contribution: (1 - p)*G - p*L
    const expectedBaseEv = (1 - p) * G - p * L;
    baselineContribution += expectedBaseEv;

    if (action === 'SHIP_AS_IS') {
      countShip++;
      // No change from baseline
    } else if (action === 'SHIP_AFTER_CONFIRMATION') {
      countConfirm++;
      // Modeled confirmation effect:
      // Assumed 80% genuine response rate, filtering out uncommitted/fake orders
      const avoidedRiskShare = p * 0.40; // 40% of risky orders avoided through friction
      const avoidedLoss = avoidedRiskShare * L;
      avoidedRtoCost += avoidedLoss;

      // Small 3% genuine drop-off from confirmation friction
      const dropOffGenuine = (1 - p) * 0.03;
      foregoneGenuineContribution += dropOffGenuine * G;
    } else if (action === 'NUDGE_TO_PREPAID') {
      countNudge++;
      const discount = 30;
      const convRate = policy.nudgeConfig.assumedPrepaidConversionRate || 0.25;
      const prepaidRto = policy.nudgeConfig.assumedPrepaidRtoRate || 0.04;

      // Converted portion saves (p - prepaidRto)*L, costs discount
      const convertedCount = convRate;
      const rtoDiff = Math.max(0, p - prepaidRto);
      avoidedRtoCost += convertedCount * rtoDiff * L;
      otherPolicyEffects -= convertedCount * discount; // discount cost
    } else if (action === 'HOLD_CANCEL') {
      countHold++;
      // If cancelled/held, we avoid all RTO risk for this order
      avoidedRtoCost += p * L;
      // But we forego the genuine delivery margin
      foregoneGenuineContribution += (1 - p) * G;
    }

    // Flag needs attention
    if (state === 'HELD_FOR_REVIEW' || state === 'AWAITING_ADDRESS_CORRECTION' || state === 'TIMED_OUT') {
      if (needsAttentionList.length < 10) {
        needsAttentionList.push({
          id: row.order.id,
          customerName: row.order.customerName,
          phone: row.order.phone,
          orderValue: row.order.orderValue,
          workflowState: state,
          explanation: row.decision?.explanation || 'Held for manual review',
        });
      }
    }
  }

  const evaluated = countShip + countConfirm + countNudge + countHold;
  const share = (c: number) => (evaluated > 0 ? Number(((c / evaluated) * 100).toFixed(1)) : 0);

  const bridge = reconcileFinancialBridge({
    baselineContribution: Math.round(baselineContribution),
    avoidedRtoCost: Math.round(avoidedRtoCost),
    foregoneGenuineContribution: Math.round(foregoneGenuineContribution),
    otherPolicyEffects: Math.round(otherPolicyEffects),
  });

  return {
    cohortDate: targetPrefix,
    isHistoricalDemo: !isYesterday,
    totalOrders,
    evaluatedOrders: evaluated,
    buckets: {
      shipAsIs: { count: countShip, sharePercent: share(countShip) },
      confirmFirst: { count: countConfirm, sharePercent: share(countConfirm) },
      prepaidNudge: { count: countNudge, sharePercent: share(countNudge) },
      holdCancel: { count: countHold, sharePercent: share(countHold) },
    },
    financialBridge: bridge,
    needsAttention: needsAttentionList,
  };
}
