import { NextRequest, NextResponse } from 'next/server';
import { PolicySchema, DEFAULT_POLICY } from '@/domain/policy/schema';
import { runSeptemberReplay } from '@/server/services/replay';
import { getActivePolicy } from '@/server/services/order-service';

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

    const draftPolicy = parsed.data;
    const activePolicy = await getActivePolicy();

    // Run replay for both current active and proposed draft policy
    const baselineReplay = runSeptemberReplay(activePolicy);
    const draftReplay = runSeptemberReplay(draftPolicy);

    const diff = {
      actions: {
        shipAsIs: draftReplay.actionCounts.shipAsIs - baselineReplay.actionCounts.shipAsIs,
        confirmFirst: draftReplay.actionCounts.confirmFirst - baselineReplay.actionCounts.confirmFirst,
        prepaidNudge: draftReplay.actionCounts.prepaidNudge - baselineReplay.actionCounts.prepaidNudge,
        holdCancel: draftReplay.actionCounts.holdCancel - baselineReplay.actionCounts.holdCancel,
      },
      netImpactDeltaRupees:
        draftReplay.modeledInterventionScenario.netIncrementalContributionRupees -
        baselineReplay.modeledInterventionScenario.netIncrementalContributionRupees,
    };

    return NextResponse.json({
      success: true,
      current: {
        actions: baselineReplay.actionCounts,
        financial: baselineReplay.modeledInterventionScenario,
      },
      preview: {
        actions: draftReplay.actionCounts,
        financial: draftReplay.modeledInterventionScenario,
      },
      diff,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error previewing policy impact';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
