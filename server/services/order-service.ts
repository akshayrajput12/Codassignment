import { db } from '@/server/db/client';
import { orders, decisions, outcomes, policies, events } from '@/server/db/schema';
import { eq, desc, like, and, or, sql } from 'drizzle-orm';
import { evaluateOrderDecision, OrderInput } from '@/domain/decisions/evaluate';
import { DEFAULT_POLICY, Policy } from '@/domain/policy/schema';

export async function getActivePolicy(): Promise<Policy> {
  const activeRow = await db.select().from(policies).where(eq(policies.isActive, true)).get();
  if (activeRow) {
    try {
      return JSON.parse(activeRow.configJson);
    } catch {
      return DEFAULT_POLICY;
    }
  }
  return DEFAULT_POLICY;
}

export async function listOrders(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  workflowState?: string;
  datePrefix?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize || 25));
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (params.search) {
    const q = `%${params.search}%`;
    conditions.push(
      or(
        like(orders.id, q),
        like(orders.customerName, q),
        like(orders.phone, q),
        like(orders.city, q),
        like(orders.pincode, q)
      )
    );
  }

  if (params.datePrefix) {
    conditions.push(like(orders.orderDatetime, `${params.datePrefix}%`));
  }

  if (params.action && params.action !== 'ALL') {
    conditions.push(eq(decisions.action, params.action));
  }

  if (params.workflowState && params.workflowState !== 'ALL') {
    conditions.push(eq(decisions.workflowState, params.workflowState));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      order: orders,
      decision: decisions,
      outcome: outcomes,
    })
    .from(orders)
    .leftJoin(decisions, eq(orders.id, decisions.orderId))
    .leftJoin(outcomes, eq(orders.id, outcomes.orderId))
    .where(whereClause)
    .orderBy(desc(orders.orderDatetime))
    .limit(pageSize)
    .offset(offset)
    .all();

  const totalCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .leftJoin(decisions, eq(orders.id, decisions.orderId))
    .where(whereClause)
    .get();

  const total = totalCountResult?.count || 0;

  return {
    orders: rows.map((r) => ({
      ...r.order,
      decision: r.decision
        ? {
            ...r.decision,
            reasonCodes: JSON.parse(r.decision.reasonCodesJson || '[]'),
            evidence: JSON.parse(r.decision.evidenceJson || '{}'),
            economics: JSON.parse(r.decision.economicsJson || '{}'),
          }
        : null,
      outcome: r.outcome?.finalStatus || null,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getOrderDetail(orderId: string) {
  const row = await db
    .select({
      order: orders,
      decision: decisions,
      outcome: outcomes,
    })
    .from(orders)
    .leftJoin(decisions, eq(orders.id, decisions.orderId))
    .leftJoin(outcomes, eq(orders.id, outcomes.orderId))
    .where(eq(orders.id, orderId))
    .get();

  if (!row) return null;

  return {
    ...row.order,
    decision: row.decision
      ? {
          ...row.decision,
          reasonCodes: JSON.parse(row.decision.reasonCodesJson || '[]'),
          evidence: JSON.parse(row.decision.evidenceJson || '{}'),
          economics: JSON.parse(row.decision.economicsJson || '{}'),
        }
      : null,
    outcome: row.outcome?.finalStatus || null,
  };
}

export async function createAndEvaluateOrder(input: OrderInput) {
  const policy = await getActivePolicy();

  // Look up pincode stats
  let pincodeStats: { total: number; rto: number } | undefined;
  if (input.pincode) {
    const historicalInPin = await db
      .select({
        total: sql<number>`count(*)`,
        rto: sql<number>`sum(case when outcomes.final_status = 'RTO' then 1 else 0 end)`,
      })
      .from(orders)
      .leftJoin(outcomes, eq(orders.id, outcomes.orderId))
      .where(eq(orders.pincode, input.pincode.trim()))
      .get();

    if (historicalInPin) {
      pincodeStats = {
        total: historicalInPin.total || 0,
        rto: historicalInPin.rto || 0,
      };
    }
  }

  const evalResult = evaluateOrderDecision(input, policy, pincodeStats);

  const orderDatetime = input.orderDatetime || new Date().toISOString().replace('T', ' ').slice(0, 16);

  await db
    .insert(orders)
    .values({
      id: input.id,
      orderDatetime,
      customerName: input.customerName,
      phone: input.phone,
      address: input.address,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      orderValue: input.orderValue,
      items: input.items || 'Standard Item',
      numItems: input.numItems || 1,
      customerPriorOrders: input.customerPriorOrders || 0,
      customerPriorRto: input.customerPriorRto || 0,
      utmSource: input.utmSource || 'direct',
      courier: input.courier || 'Delhivery',
      paymentMethod: 'COD',
      createdAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: orders.id,
      set: {
        customerName: input.customerName,
        phone: input.phone,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        orderValue: input.orderValue,
      },
    });

  const decId = `dec_${input.id}_${Date.now()}`;
  await db
    .insert(decisions)
    .values({
      id: decId,
      orderId: input.id,
      action: evalResult.action,
      workflowState: evalResult.workflowState,
      probability: evalResult.probability,
      riskBand: evalResult.riskBand,
      explanation: evalResult.explanation,
      reasonCodesJson: JSON.stringify(evalResult.reasonCodes),
      evidenceJson: JSON.stringify(evalResult.evidence),
      economicsJson: JSON.stringify(evalResult.economics),
      policyVersion: evalResult.policyVersion,
      modelVersion: evalResult.modelVersion,
      assessmentSource: 'evaluated_live',
      createdAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: decisions.id,
      set: {
        action: evalResult.action,
        workflowState: evalResult.workflowState,
        probability: evalResult.probability,
        riskBand: evalResult.riskBand,
        explanation: evalResult.explanation,
        reasonCodesJson: JSON.stringify(evalResult.reasonCodes),
        evidenceJson: JSON.stringify(evalResult.evidence),
        economicsJson: JSON.stringify(evalResult.economics),
      },
    });

  return evalResult;
}

export async function overrideOrderDecision(orderId: string, overrideAction: string, reason: string) {
  const current = await getOrderDetail(orderId);
  if (!current) throw new Error('Order not found');

  let newWorkflowState = 'READY_TO_SHIP';
  if (overrideAction === 'HOLD_CANCEL') newWorkflowState = 'CANCELLED';
  if (overrideAction === 'SHIP_AFTER_CONFIRMATION') newWorkflowState = 'AWAITING_CONFIRMATION';
  if (overrideAction === 'NUDGE_TO_PREPAID') newWorkflowState = 'AWAITING_PREPAID';

  const newExplanation = `Manual Override by Operations: Changed to ${overrideAction}. Reason: ${reason}`;

  await db
    .update(decisions)
    .set({
      action: overrideAction,
      workflowState: newWorkflowState,
      explanation: newExplanation,
    })
    .where(eq(decisions.orderId, orderId));

  await db.insert(events).values({
    id: `evt_ovr_${orderId}_${Date.now()}`,
    eventType: 'MANUAL_OVERRIDE',
    aggregateId: orderId,
    payloadJson: JSON.stringify({
      previousAction: current.decision?.action,
      newAction: overrideAction,
      reason,
      timestamp: new Date().toISOString(),
    }),
    createdAt: new Date().toISOString(),
  });

  return getOrderDetail(orderId);
}
