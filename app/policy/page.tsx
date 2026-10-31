import { db } from '@/server/db/client';
import { policies } from '@/server/db/schema';
import { DEFAULT_POLICY } from '@/domain/policy/schema';
import { desc } from 'drizzle-orm';
import { PolicyClient } from '@/components/policy/PolicyClient';

export const dynamic = 'force-dynamic';

export default async function PolicyPage() {
  const allPolicies = await db.select().from(policies).orderBy(desc(policies.createdAt)).all();

  const activeRow = allPolicies.find((p) => p.isActive);
  const activePolicy = activeRow ? JSON.parse(activeRow.configJson) : DEFAULT_POLICY;

  const versionList = allPolicies.map((p) => ({
    id: p.id,
    version: p.version,
    name: p.name,
    isActive: p.isActive,
    createdAt: p.createdAt,
  }));

  return <PolicyClient initialPolicy={activePolicy} versions={versionList} />;
}
