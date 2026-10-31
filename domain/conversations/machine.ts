import { WorkflowStateType } from '@/domain/decisions/evaluate';

export type { WorkflowStateType };

export interface QuoteInfo {
  id: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  token: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PAID' | 'CANCELLED';
  expiresAt: string;
}

export interface ConversationContext {
  conversationId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  orderValue: number;
  state: WorkflowStateType;
  language: 'en' | 'hi' | 'hinglish';
  virtualNow: string; // ISO timestamp
  outreachSuppressed: boolean;
  unknownReplyCount: number;
  quote: QuoteInfo | null;
}

export interface ReplyResult {
  nextState: WorkflowStateType;
  replyMessage: string;
  outreachSuppressed?: boolean;
  intent: string;
  updatedAddress?: string;
  unknownReplyCount: number;
}

export function getInitialMessageTemplate(
  type: 'CONFIRMATION' | 'PREPAID_NUDGE' | 'REMINDER_6H',
  language: 'en' | 'hi' | 'hinglish',
  ctx: ConversationContext
): string {
  const firstName = ctx.customerName.split(' ')[0] || 'Customer';
  const orderId = ctx.orderId;
  const amount = `₹${ctx.orderValue}`;
  const maskedAddress = ctx.address.length > 35 ? `${ctx.address.slice(0, 32)}...` : ctx.address;

  if (type === 'CONFIRMATION') {
    if (language === 'hi') {
      return `नमस्ते ${firstName}, आपका ऑर्डर ${orderId}, ${amount}, भेजने से पहले कृपया पुष्टि करें। क्या डिलीवरी पता सही है? "${maskedAddress}"। पुष्टि करें, पता बदलें या रद्द करें चुनें। संदेश बंद करने के लिए STOP लिखें।`;
    }
    if (language === 'hinglish') {
      return `Hi ${firstName}, aapka order ${orderId}, ${amount}, dispatch karne se pehle confirm kar dein. Delivery address sahi hai? "${maskedAddress}". Confirm, Address update, ya Cancel choose karein. Messages band karne ke liye STOP reply karein.`;
    }
    return `Hi ${firstName}, please confirm order ${orderId} for ${amount} before we dispatch it. Is the delivery address correct? "${maskedAddress}". Choose Confirm, Update address, or Cancel. Reply STOP to opt out.`;
  }

  if (type === 'PREPAID_NUDGE') {
    const discount = ctx.quote ? `₹${ctx.quote.discountAmount}` : '₹30';
    const finalAmount = ctx.quote ? `₹${ctx.quote.finalAmount}` : `₹${ctx.orderValue - 30}`;
    const mockPaymentUrl = `https://codcompass.demo/pay/${orderId}`;

    if (language === 'hi') {
      return `क्या आप ऑर्डर ${orderId} के लिए ऑनलाइन भुगतान करना चाहते हैं? ${amount} के बजाय ${finalAmount} का भुगतान करें और ${discount} बचाएं। यह लिंक 24 घंटे के लिए वैध है: ${mockPaymentUrl}। कैश ऑन डिलीवरी चाहते हैं? 'Keep COD' चुनें।`;
    }
    if (language === 'hinglish') {
      return `Order ${orderId} ke liye online pay karna chahte hain? ${amount} ki jagah sirf ${finalAmount} pay karein aur ${discount} bachayein. Yeh link 24 hours ke liye valid hai: ${mockPaymentUrl}. COD prefer karte hain? 'Keep COD' select karein.`;
    }
    return `Want to pay online for order ${orderId}? Pay ${finalAmount} instead of ${amount} and save ${discount}. This demo link expires in 24 hours: ${mockPaymentUrl}. Prefer COD? Choose Keep COD. Paying online is optional.`;
  }

  // 6-hour reminder
  if (language === 'hi') {
    return `रिमाइंडर: नमस्ते ${firstName}, आपका ऑर्डर ${orderId} अभी भी पुष्टि की प्रतीक्षा कर रहा है। कृपया उत्तर दें।`;
  }
  if (language === 'hinglish') {
    return `Reminder: Hi ${firstName}, aapka order ${orderId} dispatch ke liye confirmation ka wait kar raha hai. Please reply karein.`;
  }
  return `Reminder: Hi ${firstName}, order ${orderId} is awaiting your confirmation before dispatch. Reply Confirm to dispatch or Cancel to cancel.`;
}

export function handleCustomerReply(
  ctx: ConversationContext,
  incomingText: string
): ReplyResult {
  const text = incomingText.trim().toLowerCase();

  // 1. Opt-out check
  if (text === 'stop' || text === 'unsubscribe') {
    return {
      nextState: ctx.state,
      replyMessage: 'You have unsubscribed from automated WhatsApp updates. Your preferences have been saved.',
      outreachSuppressed: true,
      intent: 'OPT_OUT',
      unknownReplyCount: ctx.unknownReplyCount,
    };
  }

  // 2. Cancellation check
  if (
    text.includes('cancel') ||
    text === 'no' ||
    text === 'nahi' ||
    text === 'mat bhejo' ||
    text.includes('nahi chahiye') ||
    text === 'रद्द करें'
  ) {
    return {
      nextState: 'CANCELLED',
      replyMessage: `Order ${ctx.orderId} has been cancelled as requested. You will not be charged. Thank you.`,
      intent: 'CANCEL_ORDER',
      unknownReplyCount: 0,
    };
  }

  // 3. Keep COD preference check
  if (text.includes('keep cod') || text.includes('cod hi') || text.includes('cash on delivery')) {
    return {
      nextState: 'CONFIRMED_COD',
      replyMessage: `Got it! Order ${ctx.orderId} will remain Cash on Delivery (COD) for ₹${ctx.orderValue} and is now scheduled for warehouse dispatch.`,
      intent: 'PREFER_COD',
      unknownReplyCount: 0,
    };
  }

  // 4. "Payment Done" text trap: DO NOT mark paid via text claim
  if (
    text.includes('payment done') ||
    text.includes('paid') ||
    text.includes('pay kar diya') ||
    text.includes('bhej diya') ||
    text.includes('upi done')
  ) {
    return {
      nextState: ctx.state, // Remains awaiting webhook
      replyMessage: `Payment verification pending. Our automated gateway is waiting for bank confirmation for order ${ctx.orderId}. Once confirmed by the gateway webhook, your order will automatically be marked Paid.`,
      intent: 'UNVERIFIED_PAYMENT_CLAIM',
      unknownReplyCount: ctx.unknownReplyCount,
    };
  }

  // 5. Positive Confirmation check
  if (
    text === 'yes' ||
    text === 'confirm' ||
    text === 'haan' ||
    text === 'ha' ||
    text === 'ji haan' ||
    text.includes('yes, confirm') ||
    text.includes('sahi hai') ||
    text === 'पुष्टि करें'
  ) {
    if (ctx.state === 'AWAITING_PREPAID') {
      return {
        nextState: 'AWAITING_PREPAID',
        replyMessage: `Would you like to Pay Online and save ₹30, or Keep COD? Please click "Pay Online" or "Keep COD".`,
        intent: 'AMBIGUOUS_PREPAID_CONFIRM',
        unknownReplyCount: ctx.unknownReplyCount,
      };
    }

    return {
      nextState: 'CONFIRMED_COD',
      replyMessage: `Thank you for confirming! Your order ${ctx.orderId} is confirmed and scheduled for dispatch. Tracking details will be shared upon handover to the courier.`,
      intent: 'CONFIRM_DISPATCH',
      unknownReplyCount: 0,
    };
  }

  // 6. Address update check
  if (
    text.includes('address') ||
    text.includes('flat') ||
    text.includes('house') ||
    text.includes('pata') ||
    text.includes('gali')
  ) {
    return {
      nextState: 'AWAITING_ADDRESS_CORRECTION',
      replyMessage: `We have recorded your address update request: "${incomingText}". Our operations team is verifying the postal details before dispatch.`,
      intent: 'ADDRESS_CORRECTION',
      updatedAddress: incomingText,
      unknownReplyCount: 0,
    };
  }

  // 7. Unknown reply handler
  const currentUnknown = ctx.unknownReplyCount + 1;
  if (currentUnknown >= 2) {
    return {
      nextState: 'HELD_FOR_REVIEW',
      replyMessage: `We could not understand your reply. An operations specialist has been assigned to assist you manually with order ${ctx.orderId}.`,
      intent: 'UNKNOWN_REPEATED',
      unknownReplyCount: currentUnknown,
    };
  }

  return {
    nextState: ctx.state,
    replyMessage: `We didn't quite catch that. Please reply with "Confirm" to dispatch your order, "Keep COD", or "Cancel" to cancel.`,
    intent: 'UNKNOWN_FIRST',
    unknownReplyCount: currentUnknown,
  };
}

export interface ClockAdvanceResult {
  nextState: WorkflowStateType;
  virtualNow: string;
  jobsProcessed: string[];
  newMessages: string[];
}

export function advanceVirtualClock(
  ctx: ConversationContext,
  hoursToAdvance: number
): ClockAdvanceResult {
  const currentMs = new Date(ctx.virtualNow).getTime();
  const nextMs = currentMs + hoursToAdvance * 60 * 60 * 1000;
  const virtualNow = new Date(nextMs).toISOString();

  const jobsProcessed: string[] = [];
  const newMessages: string[] = [];
  let nextState = ctx.state;

  // Check 6-hour reminder
  if (hoursToAdvance >= 6 && hoursToAdvance < 24) {
    if (ctx.state === 'AWAITING_CONFIRMATION' || ctx.state === 'AWAITING_PREPAID') {
      jobsProcessed.push('REMINDER_6H');
      newMessages.push(getInitialMessageTemplate('REMINDER_6H', ctx.language, ctx));
    }
  }

  // Check 24-hour expiry
  if (hoursToAdvance >= 24) {
    if (ctx.state === 'AWAITING_CONFIRMATION' || ctx.state === 'AWAITING_PREPAID') {
      jobsProcessed.push('EXPIRY_24H');
      nextState = 'TIMED_OUT';
      newMessages.push(
        `24-hour window expired. Order ${ctx.orderId} has been paused and held for manual review by our operations team.`
      );
    }
  }

  return {
    nextState,
    virtualNow,
    jobsProcessed,
    newMessages,
  };
}
