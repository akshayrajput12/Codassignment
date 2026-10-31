import { NextRequest, NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/server/services/dashboard-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;

    const data = await getDashboardMetrics(date);
    return NextResponse.json({ success: true, ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Dashboard calculation error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
