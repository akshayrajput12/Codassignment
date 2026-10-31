import fs from 'fs';
import path from 'path';
import { db, initDb } from '@/server/db/client';
import { orders, outcomes, policies, decisions, conversations, messages, quotes } from '@/server/db/schema';
import { runDataAudit } from './analyze';
import { DEFAULT_POLICY } from '@/domain/policy/schema';
import { evaluateOrderDecision } from '@/domain/decisions/evaluate';
import { eq } from 'drizzle-orm';

export async function seedDatabase() {
  console.log('Seeding SQLite database...');
  initDb();

  // 1. Insert Default Policy
  const existingPolicy = await db.select().from(policies).where(eq(policies.id, DEFAULT_POLICY.id)).get();
  if (!existingPolicy) {
    await db.insert(policies).values({
      id: DEFAULT_POLICY.id,
      version: DEFAULT_POLICY.version,
      name: DEFAULT_POLICY.name,
      configJson: JSON.stringify(DEFAULT_POLICY),
      isActive: true,
      createdAt: DEFAULT_POLICY.createdAt,
      updatedAt: DEFAULT_POLICY.updatedAt,
    });
    console.log('Inserted default policy:', DEFAULT_POLICY.id);
  }

  // 2. Read and audit CSV
  const csvPath = path.resolve(process.cwd(), 'orders_sample.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('orders_sample.csv not found at:', csvPath);
    return;
  }

  const { resolvedOrders, uniqueRows } = runDataAudit(csvPath);

  // Pre-calculate pincode stats from historical resolved orders
  const pincodeStatsMap: Record<string, { total: number; rto: number }> = {};
  for (const row of resolvedOrders) {
    const pin = (row.pincode || '').trim();
    if (pin) {
      if (!pincodeStatsMap[pin]) pincodeStatsMap[pin] = { total: 0, rto: 0 };
      pincodeStatsMap[pin].total++;
      if (row.final_status.trim().toUpperCase() === 'RTO') {
        pincodeStatsMap[pin].rto++;
      }
    }
  }

  // Check if orders already populated
  const existingOrderCount = (await db.select().from(orders).all()).length;
  if (existingOrderCount < uniqueRows.length) {
    console.log(`Inserting ${uniqueRows.length} historical orders...`);

    // Insert orders and decisions in transaction / batches
    const batchSize = 100;
    for (let i = 0; i < uniqueRows.length; i += batchSize) {
      const batch = uniqueRows.slice(i, i + batchSize);

      for (const row of batch) {
        const orderId = row.order_id.trim();
        const pin = (row.pincode || '').trim();
        const stats = pincodeStatsMap[pin] || { total: 0, rto: 0 };
        const orderVal = parseFloat(row.order_value) || 0;
        const priorOrders = parseInt(row.customer_prior_orders || '0', 10);
        const priorRto = parseInt(row.customer_prior_rto || '0', 10);

        try {
          await db.insert(orders).values({
            id: orderId,
            orderDatetime: row.order_datetime.trim(),
            customerName: row.customer_name.trim(),
            phone: row.phone.trim(),
            address: row.address.trim(),
            city: row.city.trim(),
            state: row.state.trim(),
            pincode: pin,
            orderValue: orderVal,
            items: row.items.trim(),
            numItems: parseInt(row.num_items || '1', 10),
            customerPriorOrders: priorOrders,
            customerPriorRto: priorRto,
            utmSource: (row.utm_source || '').trim(),
            courier: (row.courier || '').trim(),
            paymentMethod: (row.payment_method || 'COD').trim(),
            createdAt: row.order_datetime.trim(),
          }).onConflictDoNothing();

          if (row.final_status) {
            await db.insert(outcomes).values({
              orderId,
              finalStatus: row.final_status.trim().toUpperCase(),
              knownAt: row.order_datetime.trim(),
            }).onConflictDoNothing();
          }

          // Compute and store baseline decision
          const evalRes = evaluateOrderDecision(
            {
              id: orderId,
              orderDatetime: row.order_datetime.trim(),
              customerName: row.customer_name.trim(),
              phone: row.phone.trim(),
              address: row.address.trim(),
              city: row.city.trim(),
              state: row.state.trim(),
              pincode: pin,
              orderValue: orderVal,
              items: row.items.trim(),
              numItems: parseInt(row.num_items || '1', 10),
              customerPriorOrders: priorOrders,
              customerPriorRto: priorRto,
              utmSource: (row.utm_source || '').trim(),
              courier: (row.courier || '').trim(),
            },
            DEFAULT_POLICY,
            stats
          );

          await db.insert(decisions).values({
            id: `dec_${orderId}`,
            orderId,
            action: evalRes.action,
            workflowState: evalRes.workflowState,
            probability: evalRes.probability,
            riskBand: evalRes.riskBand,
            explanation: evalRes.explanation,
            reasonCodesJson: JSON.stringify(evalRes.reasonCodes),
            evidenceJson: JSON.stringify(evalRes.evidence),
            economicsJson: JSON.stringify(evalRes.economics),
            policyVersion: evalRes.policyVersion,
            modelVersion: evalRes.modelVersion,
            assessmentSource: 'heuristic',
            createdAt: row.order_datetime.trim(),
          }).onConflictDoNothing();
        } catch {
          // ignore duplicate
        }
      }
    }
    console.log('Historical orders and decisions seeded.');
  }

  // 3. Insert Interactive Demo Orders for WhatsApp Simulator & Founder Walkthrough
  const demoOrders = [
    {
      id: 'DEMO-CONFIRM-1',
      orderDatetime: '2026-10-30 14:15',
      customerName: 'Aarav Sharma',
      phone: '9820123456',
      address: 'Shop No 4, Link Chowk ke saamne, Near Metro Pillar 12',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      orderValue: 649,
      items: 'Rice Water Hair Mask',
      numItems: 1,
      customerPriorOrders: 0,
      customerPriorRto: 0,
      utmSource: 'meta_ads',
      courier: 'Delhivery',
      paymentMethod: 'COD',
      action: 'SHIP_AFTER_CONFIRMATION',
      workflowState: 'AWAITING_CONFIRMATION',
      probability: 0.31,
      riskBand: 'MEDIUM',
      explanation: 'Ship after confirmation: First-time customer from Meta ads in a dense area. Customer confirmation required before warehouse dispatch.',
      initialMessage: 'Hi Aarav, please confirm order DEMO-CONFIRM-1 for ₹649 before we dispatch it. Delivery address: Shop No 4, Link Chowk ke saamne... Choose Confirm, Update address, or Cancel. Reply STOP to opt out.',
    },
    {
      id: 'DEMO-NUDGE-1',
      orderDatetime: '2026-10-30 15:30',
      customerName: 'Ananya Iyer',
      phone: '9840987654',
      address: 'Flat 302, Green Meadows, Anna Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600040',
      orderValue: 899,
      items: 'Satin Bonnet | Rosemary Hair Oil',
      numItems: 2,
      customerPriorOrders: 0,
      customerPriorRto: 0,
      utmSource: 'meta_ads',
      courier: 'BlueDart',
      paymentMethod: 'COD',
      action: 'NUDGE_TO_PREPAID',
      workflowState: 'AWAITING_PREPAID',
      probability: 0.28,
      riskBand: 'MEDIUM',
      explanation: 'Nudge to prepaid: Order value ₹899. Offering ₹30 discount to pay online yields ₹86 higher net unit contribution.',
      initialMessage: 'Want to pay online for order DEMO-NUDGE-1? Pay ₹869 instead of ₹899 and save ₹30. This demo link expires in 24 hours: https://codcompass.demo/pay/DEMO-NUDGE-1. Prefer COD? Choose Keep COD.',
      quote: {
        originalAmount: 899,
        discountAmount: 30,
        finalAmount: 869,
        token: 'mock_token_ananya_869',
      },
    },
    {
      id: 'DEMO-SHIP-1',
      orderDatetime: '2026-10-30 16:00',
      customerName: 'Pooja Mehta',
      phone: '9819112233',
      address: '14B, Sea Face Apts, Worli',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400018',
      orderValue: 1298,
      items: 'Complete Haircare Combo',
      numItems: 3,
      customerPriorOrders: 3,
      customerPriorRto: 0,
      utmSource: 'direct',
      courier: 'BlueDart',
      paymentMethod: 'COD',
      action: 'SHIP_AS_IS',
      workflowState: 'READY_TO_SHIP',
      probability: 0.12,
      riskBand: 'LOW',
      explanation: 'Ship as-is: Loyal repeat buyer with 3 prior deliveries and 0 returns in a top tier pincode.',
    },
    {
      id: 'DEMO-HOLD-1',
      orderDatetime: '2026-10-30 16:45',
      customerName: 'Test Buyer',
      phone: '9123456789',
      address: 'Gali No 2',
      city: 'Unknown City',
      state: 'Uttar Pradesh',
      pincode: '',
      orderValue: 449,
      items: 'Satin Pillowcase',
      numItems: 1,
      customerPriorOrders: 0,
      customerPriorRto: 0,
      utmSource: 'meta_ads',
      courier: 'Delhivery',
      paymentMethod: 'COD',
      action: 'HOLD_CANCEL',
      workflowState: 'HELD_FOR_REVIEW',
      probability: 0.50,
      riskBand: 'HIGH',
      explanation: 'Held for review: Critical postal pincode is missing and address is incomplete. Held for manual phone verification.',
    },
  ];

  for (const demo of demoOrders) {
    await db.insert(orders).values({
      id: demo.id,
      orderDatetime: demo.orderDatetime,
      customerName: demo.customerName,
      phone: demo.phone,
      address: demo.address,
      city: demo.city,
      state: demo.state,
      pincode: demo.pincode,
      orderValue: demo.orderValue,
      items: demo.items,
      numItems: demo.numItems,
      customerPriorOrders: demo.customerPriorOrders,
      customerPriorRto: demo.customerPriorRto,
      utmSource: demo.utmSource,
      courier: demo.courier,
      paymentMethod: demo.paymentMethod,
      createdAt: demo.orderDatetime,
    }).onConflictDoNothing();

    await db.insert(decisions).values({
      id: `dec_${demo.id}`,
      orderId: demo.id,
      action: demo.action,
      workflowState: demo.workflowState,
      probability: demo.probability,
      riskBand: demo.riskBand,
      explanation: demo.explanation,
      reasonCodesJson: JSON.stringify(['DEMO_FIXTURE']),
      evidenceJson: JSON.stringify({ isDemo: true }),
      economicsJson: JSON.stringify({
        orderValue: demo.orderValue,
        evShip: 250,
        evPrepaid: 320,
        recommendedDiscount: 30,
      }),
      policyVersion: 'v1.0.0',
      modelVersion: 'empirical-bayesian-v1',
      assessmentSource: 'demo_fixture',
      createdAt: demo.orderDatetime,
    }).onConflictDoNothing();

    // Setup interactive conversation for demo orders with messaging
    if (demo.initialMessage) {
      const convId = `conv_${demo.id}`;
      const expiresAt = new Date(new Date(demo.orderDatetime).getTime() + 24 * 60 * 60 * 1000).toISOString();

      await db.insert(conversations).values({
        id: convId,
        orderId: demo.id,
        state: demo.workflowState,
        language: 'en',
        customerPhone: demo.phone,
        virtualNow: demo.orderDatetime,
        outreachSuppressed: false,
        expiresAt,
        createdAt: demo.orderDatetime,
        updatedAt: demo.orderDatetime,
      }).onConflictDoNothing();

      await db.insert(messages).values({
        id: `msg_init_${demo.id}`,
        conversationId: convId,
        direction: 'OUTBOUND',
        body: demo.initialMessage,
        intent: 'INITIAL_INVITATION',
        createdAt: demo.orderDatetime,
      }).onConflictDoNothing();

      if (demo.quote) {
        await db.insert(quotes).values({
          id: `quote_${demo.id}`,
          orderId: demo.id,
          originalAmount: demo.quote.originalAmount,
          discountAmount: demo.quote.discountAmount,
          finalAmount: demo.quote.finalAmount,
          status: 'ACTIVE',
          token: demo.quote.token,
          expiresAt,
          createdAt: demo.orderDatetime,
        }).onConflictDoNothing();
      }
    }
  }

  console.log('Seeding completed successfully!');
}

// CLI execution
if (require.main === module || process.argv[1]?.includes('seed.ts')) {
  seedDatabase().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
