import { describe, it, expect } from 'vitest';
import { evaluateOrderDecision } from '@/domain/decisions/evaluate';
import { DEFAULT_POLICY } from '@/domain/policy/schema';

describe('Phase 3: Decision Engine Evaluation & Explanations', () => {
  it('evaluates low-risk order to SHIP_AS_IS', () => {
    const decision = evaluateOrderDecision(
      {
        id: 'KT_TEST_1',
        customerName: 'Priya Sharma',
        phone: '9876543210',
        address: 'Flat 402, Sunshine Apts, Worli',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400018',
        orderValue: 649,
        customerPriorOrders: 3,
        customerPriorRto: 0,
      },
      DEFAULT_POLICY,
      { total: 50, rto: 5 } // high support, 10% RTO
    );

    expect(decision.action).toBe('SHIP_AS_IS');
    expect(decision.workflowState).toBe('READY_TO_SHIP');
    expect(decision.explanation).toContain('Ship as-is');
    expect(decision.reasonCodes).toContain('LOW_RISK_FAST_TRACK');
  });

  it('evaluates moderate-risk high-ticket order to NUDGE_TO_PREPAID', () => {
    const decision = evaluateOrderDecision(
      {
        id: 'KT_TEST_2',
        customerName: 'Rahul Verma',
        phone: '9876543211',
        address: 'B-12, Sector 15',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        orderValue: 899,
        customerPriorOrders: 0,
        customerPriorRto: 0,
        utmSource: 'meta_ads',
      },
      DEFAULT_POLICY,
      { total: 20, rto: 5 } // moderate support
    );

    expect(decision.action).toBe('NUDGE_TO_PREPAID');
    expect(decision.workflowState).toBe('AWAITING_PREPAID');
    expect(decision.economics.recommendedDiscount).toBe(30);
    expect(decision.explanation).toContain('Nudge to prepaid');
  });

  it('evaluates order with missing city/pincode to HOLD_CANCEL (HELD_FOR_REVIEW)', () => {
    const decision = evaluateOrderDecision({
      id: 'KT_TEST_3',
      customerName: 'Unknown Buyer',
      phone: '9876543212',
      address: '',
      city: '',
      state: 'Delhi',
      pincode: '',
      orderValue: 499,
    });

    expect(decision.action).toBe('HOLD_CANCEL');
    expect(decision.workflowState).toBe('HELD_FOR_REVIEW');
    expect(decision.explanation).toContain('Missing critical shipment information');
  });

  it('holds high-risk order for review without auto-cancelling when autoCancelEnabled is false', () => {
    const decision = evaluateOrderDecision(
      {
        id: 'KT_TEST_4',
        customerName: 'Repeat Returner',
        phone: '9876543213',
        address: 'Chowk area',
        city: 'Kanpur',
        state: 'Uttar Pradesh',
        pincode: '208001',
        orderValue: 500,
        customerPriorOrders: 2,
        customerPriorRto: 2, // 100% prior RTO
      },
      DEFAULT_POLICY,
      { total: 10, rto: 8 } // 80% RTO area
    );

    expect(decision.action).toBe('HOLD_CANCEL');
    expect(decision.workflowState).toBe('HELD_FOR_REVIEW');
    expect(decision.explanation).toContain('Auto-cancellation disabled; held for ops review');
  });
});
