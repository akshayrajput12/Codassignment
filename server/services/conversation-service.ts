import { db } from '@/server/db/client';
import { conversations, messages, quotes, orders, decisions, events } from '@/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  handleCustomerReply,
  advanceVirtualClock,
  ConversationContext,
  WorkflowStateType,
} from '@/domain/conversations/machine';

export async function getConversationByOrderId(orderId: string) {
  const conv = await db.select().from(conversations).where(eq(conversations.orderId, orderId)).get();
  if (!conv) return null;

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  const quote = await db.select().from(quotes).where(eq(quotes.orderId, orderId)).get();

  const msgList = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(messages.createdAt)
    .all();

  return {
    conversation: conv,
    order,
    quote,
    messages: msgList,
  };
}

export async function handleSimulatorReply(orderId: string, replyText: string) {
  const data = await getConversationByOrderId(orderId);
  if (!data || !data.order) throw new Error('Conversation or order not found');

  const { conversation, order, quote, messages: prevMsgs } = data;

  let unknownCount = 0;
  for (let i = prevMsgs.length - 1; i >= 0; i--) {
    if (prevMsgs[i].direction === 'INBOUND' && prevMsgs[i].intent?.startsWith('UNKNOWN')) {
      unknownCount++;
    } else {
      break;
    }
  }

  const ctx: ConversationContext = {
    conversationId: conversation.id,
    orderId: order.id,
    customerName: order.customerName,
    customerPhone: order.phone,
    address: order.address,
    orderValue: order.orderValue,
    state: conversation.state as WorkflowStateType,
    language: conversation.language as 'en' | 'hi' | 'hinglish',
    virtualNow: conversation.virtualNow,
    outreachSuppressed: conversation.outreachSuppressed,
    unknownReplyCount: unknownCount,
    quote: quote
      ? {
          id: quote.id,
          originalAmount: quote.originalAmount,
          discountAmount: quote.discountAmount,
          finalAmount: quote.finalAmount,
          token: quote.token,
          status: quote.status as 'ACTIVE' | 'EXPIRED' | 'PAID' | 'CANCELLED',
          expiresAt: quote.expiresAt,
        }
      : null,
  };

  const replyResult = handleCustomerReply(ctx, replyText);

  const nowIso = new Date().toISOString();

  // 1. Record inbound message
  await db.insert(messages).values({
    id: `msg_in_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    conversationId: conversation.id,
    direction: 'INBOUND',
    body: replyText,
    intent: replyResult.intent,
    createdAt: nowIso,
  });

  // 2. Record outbound system reply
  await db.insert(messages).values({
    id: `msg_out_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    conversationId: conversation.id,
    direction: 'OUTBOUND',
    body: replyResult.replyMessage,
    intent: `SYS_REPLY_${replyResult.intent}`,
    createdAt: new Date(Date.now() + 100).toISOString(),
  });

  // 3. Update conversation state
  await db
    .update(conversations)
    .set({
      state: replyResult.nextState,
      outreachSuppressed: replyResult.outreachSuppressed ?? conversation.outreachSuppressed,
      updatedAt: nowIso,
    })
    .where(eq(conversations.id, conversation.id));

  // 4. Synchronize order decision workflow state
  await db
    .update(decisions)
    .set({
      workflowState: replyResult.nextState,
    })
    .where(eq(decisions.orderId, orderId));

  // If address was updated, record in order
  if (replyResult.updatedAddress) {
    await db
      .update(orders)
      .set({ address: `${order.address} (Updated: ${replyResult.updatedAddress})` })
      .where(eq(orders.id, orderId));
  }

  return getConversationByOrderId(orderId);
}

export async function advanceSimulatorClock(orderId: string, hours: number) {
  const data = await getConversationByOrderId(orderId);
  if (!data || !data.order) throw new Error('Conversation not found');

  const { conversation, order, quote } = data;

  const ctx: ConversationContext = {
    conversationId: conversation.id,
    orderId: order.id,
    customerName: order.customerName,
    customerPhone: order.phone,
    address: order.address,
    orderValue: order.orderValue,
    state: conversation.state as WorkflowStateType,
    language: conversation.language as 'en' | 'hi' | 'hinglish',
    virtualNow: conversation.virtualNow,
    outreachSuppressed: conversation.outreachSuppressed,
    unknownReplyCount: 0,
    quote: quote
      ? {
          id: quote.id,
          originalAmount: quote.originalAmount,
          discountAmount: quote.discountAmount,
          finalAmount: quote.finalAmount,
          token: quote.token,
          status: quote.status as 'ACTIVE' | 'EXPIRED' | 'PAID' | 'CANCELLED',
          expiresAt: quote.expiresAt,
        }
      : null,
  };

  const advanceRes = advanceVirtualClock(ctx, hours);

  // Update conversation virtualNow and nextState
  await db
    .update(conversations)
    .set({
      virtualNow: advanceRes.virtualNow,
      state: advanceRes.nextState,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(conversations.id, conversation.id));

  await db
    .update(decisions)
    .set({ workflowState: advanceRes.nextState })
    .where(eq(decisions.orderId, orderId));

  // Insert generated messages
  for (const msg of advanceRes.newMessages) {
    await db.insert(messages).values({
      id: `msg_sys_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      conversationId: conversation.id,
      direction: 'OUTBOUND',
      body: msg,
      intent: 'SCHEDULED_TRIGGER',
      createdAt: advanceRes.virtualNow,
    });
  }

  // If 24h expired, expire quote
  if (advanceRes.nextState === 'TIMED_OUT' && quote) {
    await db
      .update(quotes)
      .set({ status: 'EXPIRED' })
      .where(eq(quotes.id, quote.id));
  }

  return getConversationByOrderId(orderId);
}

export async function processMockPaymentCallback(orderId: string, token: string) {
  const quote = await db.select().from(quotes).where(eq(quotes.orderId, orderId)).get();
  if (!quote) throw new Error('Quote not found for order');

  if (quote.token !== token) {
    throw new Error('Invalid verification token');
  }

  if (quote.status === 'EXPIRED') {
    throw new Error('Payment quote has expired');
  }

  if (quote.status === 'PAID') {
    return { alreadyPaid: true, quote };
  }

  const nowIso = new Date().toISOString();

  // Mark quote paid
  await db
    .update(quotes)
    .set({ status: 'PAID' })
    .where(eq(quotes.id, quote.id));

  // Update conversation state to PAID_PREPAID
  const conv = await db.select().from(conversations).where(eq(conversations.orderId, orderId)).get();
  if (conv) {
    await db
      .update(conversations)
      .set({ state: 'PAID_PREPAID', updatedAt: nowIso })
      .where(eq(conversations.id, conv.id));

    await db.insert(messages).values({
      id: `msg_paid_${Date.now()}`,
      conversationId: conv.id,
      direction: 'OUTBOUND',
      body: `Payment verified! We received ₹${quote.finalAmount} online. Order ${orderId} is confirmed as Prepaid with ₹${quote.discountAmount} discount applied. It has been prioritized for dispatch.`,
      intent: 'PAYMENT_VERIFIED',
      createdAt: nowIso,
    });
  }

  // Update order decision
  await db
    .update(decisions)
    .set({ workflowState: 'PAID_PREPAID' })
    .where(eq(decisions.orderId, orderId));

  // Record payment event
  await db.insert(events).values({
    id: `evt_pay_${orderId}_${Date.now()}`,
    eventType: 'PAYMENT_VERIFIED',
    aggregateId: orderId,
    payloadJson: JSON.stringify({
      orderId,
      amount: quote.finalAmount,
      discount: quote.discountAmount,
      token,
      timestamp: nowIso,
    }),
    createdAt: nowIso,
  });

  return getConversationByOrderId(orderId);
}
