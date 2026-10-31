import { getDashboardMetrics } from '@/server/services/dashboard-service';
import { OverviewClient } from '@/components/overview/OverviewClient';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  // Fetch default September 2026 cohort metrics
  const initialData = await getDashboardMetrics('2026-09');

  return <OverviewClient initialData={initialData} />;
}
