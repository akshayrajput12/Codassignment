import { NextRequest, NextResponse } from 'next/server';
import { advanceSimulatorClock } from '@/server/services/conversation-service';
import { z } from 'zod';

const ClockSchema = z.object({
  orderId: z.string().min(1),
  hours: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ClockSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid clock parameters', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const updated = await advanceSimulatorClock(parsed.data.orderId, parsed.data.hours);
    return NextResponse.json({ success: true, ...updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error advancing virtual clock';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
