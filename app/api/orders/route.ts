import { NextRequest, NextResponse } from 'next/server';
import { listOrders, createAndEvaluateOrder } from '@/server/services/order-service';
import { z } from 'zod';

const CreateOrderSchema = z.object({
  id: z.string().min(1),
  customerName: z.string().min(1),
  phone: z.string().min(10),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(6),
  orderValue: z.number().positive(),
  items: z.string().optional(),
  numItems: z.number().int().positive().optional(),
  customerPriorOrders: z.number().int().min(0).optional(),
  customerPriorRto: z.number().int().min(0).optional(),
  utmSource: z.string().optional(),
  courier: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
    const search = searchParams.get('search') || undefined;
    const action = searchParams.get('action') || undefined;
    const workflowState = searchParams.get('workflowState') || undefined;
    const datePrefix = searchParams.get('datePrefix') || undefined;

    const data = await listOrders({
      page,
      pageSize,
      search,
      action,
      workflowState,
      datePrefix,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch orders';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    const decision = await createAndEvaluateOrder(parsed.data);
    return NextResponse.json({ success: true, decision }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Evaluation error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
