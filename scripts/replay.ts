import path from 'path';
import fs from 'fs';
import { runSeptemberReplay } from '@/server/services/replay';
import { DEFAULT_POLICY } from '@/domain/policy/schema';
import Papa from 'papaparse';

async function main() {
  console.log('Running September 2026 frozen-policy replay...');

  const result = runSeptemberReplay(DEFAULT_POLICY);

  const artifactsDir = path.resolve(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // 1. Write JSON summary
  fs.writeFileSync(
    path.join(artifactsDir, 'september-replay.json'),
    JSON.stringify(result, null, 2),
    'utf-8'
  );

  // 2. Write CSV export
  const csvContent = Papa.unparse(result.perOrderReplay);
  fs.writeFileSync(
    path.join(artifactsDir, 'september-replay.csv'),
    csvContent,
    'utf-8'
  );

  console.log('--- SEPTEMBER 2026 REPLAY COMPLETE ---');
  console.log(`Total September orders: ${result.totalSeptemberOrders} (Delivered: ${result.deliveredCount}, RTO: ${result.rtoCount})`);
  console.log(`Observed RTO rate: ${result.rtoRatePercent}%`);
  console.log('Policy Action Distribution:');
  console.log(`  1. Ship as-is: ${result.actionCounts.shipAsIs}`);
  console.log(`  2. Confirm first: ${result.actionCounts.confirmFirst}`);
  console.log(`  3. Prepaid nudge: ${result.actionCounts.prepaidNudge}`);
  console.log(`  4. Hold / cancel: ${result.actionCounts.holdCancel}`);
  console.log('Modeled Financial Impact:');
  console.log(`  Avoided RTO cost: +₹${result.modeledInterventionScenario.avoidedRtoCostRupees}`);
  console.log(`  Foregone genuine contribution: -₹${result.modeledInterventionScenario.foregoneGenuineRupees}`);
  console.log(`  Other policy effects (discounts): ₹${result.modeledInterventionScenario.otherPolicyEffectsRupees}`);
  console.log(`  Net Incremental Impact: +₹${result.modeledInterventionScenario.netIncrementalContributionRupees}`);
  console.log('Saved artifacts to:');
  console.log('  /artifacts/september-replay.json');
  console.log('  /artifacts/september-replay.csv');
}

main().catch((err) => {
  console.error('Replay failed:', err);
  process.exit(1);
});
