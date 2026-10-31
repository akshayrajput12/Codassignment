import { NextRequest, NextResponse } from 'next/server';
import { processMockPaymentCallback } from '@/server/services/conversation-service';
import { z } from 'zod';

const MockPaymentCallbackSchema = z.object({
  orderId: z.string().min(1),
  token: z.string().min(1),
  amount: z.number().positive().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = MockPaymentCallbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment webhook payload', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const result = await processMockPaymentCallback(parsed.data.orderId, parsed.data.token);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error processing mock payment callback';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
