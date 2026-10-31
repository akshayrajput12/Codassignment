import { NextRequest, NextResponse } from 'next/server';
import { getOrderDetail } from '@/server/services/order-service';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const order = await getOrderDetail(orderId);

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching order decision';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
