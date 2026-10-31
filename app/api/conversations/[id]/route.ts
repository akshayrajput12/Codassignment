import { NextRequest, NextResponse } from 'next/server';
import { getConversationByOrderId } from '@/server/services/conversation-service';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const data = await getConversationByOrderId(orderId);

    if (!data) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching conversation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
