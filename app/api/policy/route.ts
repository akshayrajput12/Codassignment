import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { policies } from '@/server/db/schema';
import { DEFAULT_POLICY, PolicySchema } from '@/domain/policy/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allPolicies = await db.select().from(policies).orderBy(desc(policies.createdAt)).all();

    const activeRow = allPolicies.find((p) => p.isActive);
    const activePolicy = activeRow ? JSON.parse(activeRow.configJson) : DEFAULT_POLICY;

    return NextResponse.json({
      success: true,
      activePolicy,
      versions: allPolicies.map((p) => ({
        id: p.id,
        version: p.version,
        name: p.name,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching policy';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PolicySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Policy validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const newPolicy = parsed.data;
    const nowIso = new Date().toISOString();

    await db.insert(policies).values({
      id: newPolicy.id || `pol_${Date.now()}`,
      version: newPolicy.version || `v${Date.now()}`,
      name: newPolicy.name,
      configJson: JSON.stringify(newPolicy),
      isActive: false, // Created as draft
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return NextResponse.json({ success: true, policy: newPolicy }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error creating policy';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
