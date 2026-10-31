import { NextRequest, NextResponse } from 'next/server';
import { overrideOrderDecision } from '@/server/services/order-service';
import { z } from 'zod';

const OverrideSchema = z.object({
  action: z.enum(['SHIP_AS_IS', 'SHIP_AFTER_CONFIRMATION', 'NUDGE_TO_PREPAID', 'HOLD_CANCEL']),
  reason: z.string().min(3),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await req.json();
    const parsed = OverrideSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const updated = await overrideOrderDecision(orderId, parsed.data.action, parsed.data.reason);
    return NextResponse.json({ success: true, order: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error overriding decision';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
