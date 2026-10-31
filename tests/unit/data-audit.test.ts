import { describe, it, expect } from 'vitest';
import path from 'path';
import { runDataAudit } from '@/scripts/analyze';

describe('Phase 1: Dataset Audit & Reconciliation', () => {
  const csvPath = path.resolve(process.cwd(), 'orders_sample.csv');

  it('reconciles raw, deduplicated, and resolved order counts', () => {
    const { dataQualityReport } = runDataAudit(csvPath);

    expect(dataQualityReport.rawRowCount).toBe(2018);
    expect(dataQualityReport.exactDuplicateCount).toBe(30);
    expect(dataQualityReport.uniqueRowCount).toBe(1988);
    expect(dataQualityReport.inTransitCount).toBe(1);
    expect(dataQualityReport.resolvedCount).toBe(1987);
    expect(dataQualityReport.deliveredCount).toBe(1422);
    expect(dataQualityReport.rtoCount).toBe(565);
    expect(dataQualityReport.rtoRatePercent).toBeCloseTo(28.4348, 3);
  });

  it('reconciles first-time vs repeat buyer cohorts', () => {
    const { dataQualityReport } = runDataAudit(csvPath);

    const firstTime = dataQualityReport.cohorts.firstTimeBuyers;
    expect(firstTime.total).toBe(1495);
    expect(firstTime.rto).toBe(452);
    expect(firstTime.delivered).toBe(1043);
    expect(firstTime.rtoRatePercent).toBeCloseTo(30.2341, 3);

    const repeat = dataQualityReport.cohorts.repeatBuyers;
    expect(repeat.total).toBe(492);
    expect(repeat.rto).toBe(113);
    expect(repeat.delivered).toBe(379);
    expect(repeat.rtoRatePercent).toBeCloseTo(22.9675, 3);
  });

  it('reconciles September 2026 test cohort and pincode sparsity', () => {
    const { dataQualityReport } = runDataAudit(csvPath);

    const sep = dataQualityReport.cohorts.september2026;
    expect(sep.total).toBe(329);
    expect(sep.rto).toBe(86);
    expect(sep.delivered).toBe(243);
    expect(sep.rtoRatePercent).toBeCloseTo(26.1398, 3);

    const hygiene = dataQualityReport.dataHygiene;
    expect(hygiene.distinctPincodes).toBe(1066);
    expect(hygiene.pincodesWithFewerThan5Orders).toBe(1036);
    expect(hygiene.pincodesWithFewerThan5Percent).toBeCloseTo(97.19, 1);
  });
});
