import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { policies, events } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  _req: NextRequest,
  { params }: { params: { version: string } }
) {
  try {
    const policyIdOrVersion = params.version;

    // Check if policy exists
    const target = await db
      .select()
      .from(policies)
      .where(eq(policies.id, policyIdOrVersion))
      .get() ||
      await db
      .select()
      .from(policies)
      .where(eq(policies.version, policyIdOrVersion))
      .get();

    if (!target) {
      return NextResponse.json({ success: false, error: 'Policy version not found' }, { status: 404 });
    }

    // Deactivate all policies
    await db.update(policies).set({ isActive: false });

    // Activate selected policy
    await db.update(policies).set({ isActive: true }).where(eq(policies.id, target.id));

    // Record audit event
    await db.insert(events).values({
      id: `evt_pol_act_${Date.now()}`,
      eventType: 'POLICY_ACTIVATED',
      aggregateId: target.id,
      payloadJson: JSON.stringify({
        policyId: target.id,
        version: target.version,
        timestamp: new Date().toISOString(),
      }),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Policy ${target.version} is now active`,
      activePolicy: JSON.parse(target.configJson),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error activating policy';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
