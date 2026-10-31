import { describe, it, expect } from 'vitest';
import {
  handleCustomerReply,
  getInitialMessageTemplate,
  advanceVirtualClock,
  ConversationContext,
} from '@/domain/conversations/machine';

describe('Phase 4: WhatsApp Conversation State Machine', () => {
  const initialContext: ConversationContext = {
    conversationId: 'conv_test_1',
    orderId: 'KT_TEST_1',
    customerName: 'Aarav Sharma',
    customerPhone: '9820123456',
    address: 'Station Road, Opp Hanuman Mandir',
    orderValue: 649,
    state: 'AWAITING_CONFIRMATION',
    language: 'en',
    virtualNow: '2026-10-30T10:00:00.000Z',
    outreachSuppressed: false,
    unknownReplyCount: 0,
    quote: null,
  };

  it('generates clear templates in English, Hindi, and Hinglish', () => {
    const en = getInitialMessageTemplate('CONFIRMATION', 'en', initialContext);
    const hi = getInitialMessageTemplate('CONFIRMATION', 'hi', initialContext);
    const hinglish = getInitialMessageTemplate('CONFIRMATION', 'hinglish', initialContext);

    expect(en).toContain('please confirm order');
    expect(hi).toContain('पुष्टि करें');
    expect(hinglish).toContain('confirm kar dein');
  });

  it('confirms order when customer replies yes/confirm', () => {
    const result = handleCustomerReply(initialContext, 'Yes, confirm dispatch');

    expect(result.nextState).toBe('CONFIRMED_COD');
    expect(result.replyMessage).toContain('Thank you for confirming');
  });

  it('cancels order when customer replies no/cancel', () => {
    const result = handleCustomerReply(initialContext, 'No, please cancel it');

    expect(result.nextState).toBe('CANCELLED');
    expect(result.replyMessage).toContain('cancelled as requested');
  });

  it('never marks order paid when customer sends text claiming payment done', () => {
    const prepaidContext: ConversationContext = {
      ...initialContext,
      state: 'AWAITING_PREPAID',
      quote: {
        id: 'q_1',
        originalAmount: 649,
        discountAmount: 30,
        finalAmount: 619,
        token: 'valid_token_1',
        status: 'ACTIVE',
        expiresAt: '2026-10-31T10:00:00.000Z',
      },
    };

    const result = handleCustomerReply(prepaidContext, 'Payment done maine pay kar diya');

    expect(result.nextState).toBe('AWAITING_PREPAID'); // Remains awaiting verified gateway webhook
    expect(result.replyMessage).toContain('Payment verification pending');
  });

  it('suppresses future outreach when customer replies STOP', () => {
    const result = handleCustomerReply(initialContext, 'STOP');

    expect(result.outreachSuppressed).toBe(true);
    expect(result.replyMessage).toContain('unsubscribed');
  });

  it('times out and holds for review after 24 hours of inactivity', () => {
    const clockResult = advanceVirtualClock(initialContext, 24);

    expect(clockResult.nextState).toBe('TIMED_OUT');
    expect(clockResult.jobsProcessed).toContain('EXPIRY_24H');
  });
});
