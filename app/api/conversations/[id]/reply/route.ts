import { NextRequest, NextResponse } from 'next/server';
import { handleSimulatorReply } from '@/server/services/conversation-service';
import { z } from 'zod';

const ReplySchema = z.object({
  message: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await req.json();
    const parsed = ReplySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Message cannot be empty' },
        { status: 422 }
      );
    }

    const updated = await handleSimulatorReply(orderId, parsed.data.message);
    return NextResponse.json({ success: true, ...updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error processing reply';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
