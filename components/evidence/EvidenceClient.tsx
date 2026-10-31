'use client';

import React from 'react';
import {
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  MapPin,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { formatINR } from '@/domain/economics/money';

export function EvidenceClient({
  dataQuality,
  findings,
  replaySummary,
}: {
  dataQuality: any;
  findings: any[];
  replaySummary: any;
}) {
  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-3xl text-ink font-normal">Evidence & Data Audit</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Transparent data lineage, cleaning audit, cohort distributions, and frozen-policy replay exports.
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2">
          <a
            href="/api/exports/replay-csv"
            download
            className="px-3 py-2 bg-surface border border-border hover:bg-surface-subtle text-ink text-xs font-medium rounded-control shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            Download September Replay (CSV)
          </a>
          <a
            href="/api/exports/data-quality-json"
            download
            className="px-3 py-2 bg-accent hover:bg-accent-strong text-white text-xs font-medium rounded-control shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Data Quality Report (JSON)
          </a>
        </div>
      </div>

      {/* Reconciliation Pipeline Metrics */}
      <div className="p-6 rounded-card border border-border bg-surface shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" />
            <h2 className="font-serif text-xl text-ink">Reproducible Dataset Cleaning Pipeline</h2>
          </div>
          <span className="font-mono text-[11px] text-text-muted">
            SHA256: {dataQuality.sha256?.slice(0, 16)}...
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="p-3 rounded bg-surface-subtle border border-border">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">1. Raw CSV Rows</div>
            <div className="font-mono font-bold text-lg text-ink mt-1">{dataQuality.rawRowCount}</div>
            <div className="text-[10px] text-text-muted">Initial file rows</div>
          </div>

          <div className="p-3 rounded bg-negative-soft/40 border border-negative/20">
            <div className="text-[10px] text-negative uppercase tracking-wider">2. Exact Duplicates</div>
            <div className="font-mono font-bold text-lg text-negative mt-1">-{dataQuality.exactDuplicateCount}</div>
            <div className="text-[10px] text-text-muted">Identical row strings</div>
          </div>

          <div className="p-3 rounded bg-surface-subtle border border-border">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">3. Unique Rows</div>
            <div className="font-mono font-bold text-lg text-ink mt-1">{dataQuality.uniqueRowCount}</div>
            <div className="text-[10px] text-text-muted">Cleaned unique records</div>
          </div>

          <div className="p-3 rounded bg-warning-soft/40 border border-warning/20">
            <div className="text-[10px] text-warning uppercase tracking-wider">4. In-Transit Rows</div>
            <div className="font-mono font-bold text-lg text-warning mt-1">{dataQuality.inTransitCount}</div>
            <div className="text-[10px] text-text-muted">Unresolved delivery</div>
          </div>

          <div className="p-3 rounded bg-positive-soft/40 border border-positive/20">
            <div className="text-[10px] text-positive uppercase tracking-wider">5. Delivered</div>
            <div className="font-mono font-bold text-lg text-positive mt-1">{dataQuality.deliveredCount}</div>
            <div className="text-[10px] text-text-muted">71.57% delivery rate</div>
          </div>

          <div className="p-3 rounded bg-negative-soft/40 border border-negative/20">
            <div className="text-[10px] text-negative uppercase tracking-wider">6. Verified RTO</div>
            <div className="font-mono font-bold text-lg text-negative mt-1">{dataQuality.rtoCount}</div>
            <div className="text-[10px] text-text-muted">{dataQuality.rtoRatePercent}% RTO rate</div>
          </div>
        </div>
      </div>

      {/* Cohort Comparison Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cohort 1: First-Time vs Repeat */}
        <div className="p-6 rounded-card border border-border bg-surface shadow-sm space-y-4">
          <div className="font-serif text-lg text-ink">Buyer Cohort Performance</div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="py-2">Cohort</th>
                <th className="py-2">Total Orders</th>
                <th className="py-2">Delivered</th>
                <th className="py-2">RTO</th>
                <th className="py-2 text-right">RTO Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr>
                <td className="py-2.5 font-medium text-ink">First-Time Buyers</td>
                <td className="py-2.5 font-mono">{dataQuality.cohorts.firstTimeBuyers.total}</td>
                <td className="py-2.5 font-mono text-positive">{dataQuality.cohorts.firstTimeBuyers.delivered}</td>
                <td className="py-2.5 font-mono text-negative">{dataQuality.cohorts.firstTimeBuyers.rto}</td>
                <td className="py-2.5 font-mono font-bold text-right text-accent">
                  {dataQuality.cohorts.firstTimeBuyers.rtoRatePercent}%
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-ink">Repeat Customers</td>
                <td className="py-2.5 font-mono">{dataQuality.cohorts.repeatBuyers.total}</td>
                <td className="py-2.5 font-mono text-positive">{dataQuality.cohorts.repeatBuyers.delivered}</td>
                <td className="py-2.5 font-mono text-negative">{dataQuality.cohorts.repeatBuyers.rto}</td>
                <td className="py-2.5 font-mono font-bold text-right text-positive">
                  {dataQuality.cohorts.repeatBuyers.rtoRatePercent}%
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] text-text-secondary leading-relaxed border-t border-border pt-2">
            <strong>Key Insight:</strong> First-time buyers have 7.27% higher return probability, but delivered 1,043 successful shipments. Wholesale cancellation of first-time orders would eliminate 73% of company revenue.
          </p>
        </div>

        {/* Cohort 2: Marketing Channel Disparity */}
        <div className="p-6 rounded-card border border-border bg-surface shadow-sm space-y-4">
          <div className="font-serif text-lg text-ink">Marketing Channel Disparity</div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="py-2">Channel</th>
                <th className="py-2">Total Orders</th>
                <th className="py-2">RTO Orders</th>
                <th className="py-2 text-right">RTO Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr>
                <td className="py-2.5 font-medium text-ink">Meta Ads (IG / FB)</td>
                <td className="py-2.5 font-mono">{dataQuality.cohorts.metaAds.total}</td>
                <td className="py-2.5 font-mono text-negative">{dataQuality.cohorts.metaAds.rto}</td>
                <td className="py-2.5 font-mono font-bold text-right text-negative">
                  {dataQuality.cohorts.metaAds.rtoRatePercent}%
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-ink">Direct Brand Navigation</td>
                <td className="py-2.5 font-mono">{dataQuality.cohorts.direct.total}</td>
                <td className="py-2.5 font-mono text-negative">{dataQuality.cohorts.direct.rto}</td>
                <td className="py-2.5 font-mono font-bold text-right text-positive">
                  {dataQuality.cohorts.direct.rtoRatePercent}%
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] text-text-secondary leading-relaxed border-t border-border pt-2">
            <strong>Key Insight:</strong> Meta ads exhibit +8.32% higher RTO. Instead of cutting growth ad spend, we apply pre-dispatch WhatsApp verification and prepaid nudges specifically to Meta traffic.
          </p>
        </div>
      </div>

      {/* Data Hygiene Anomaly Audit Table */}
      <div className="p-6 rounded-card border border-border bg-surface shadow-sm space-y-4">
        <div className="font-serif text-xl text-ink">Data Hygiene & Schema Anomaly Audit</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded bg-surface-subtle border border-border">
            <span className="text-text-muted block">Missing City Name:</span>
            <span className="font-mono font-bold text-base text-ink">{dataQuality.dataHygiene.missingCity} orders</span>
          </div>
          <div className="p-3 rounded bg-surface-subtle border border-border">
            <span className="text-text-muted block">Missing Pincode:</span>
            <span className="font-mono font-bold text-base text-ink">{dataQuality.dataHygiene.missingPincode} orders</span>
          </div>
          <div className="p-3 rounded bg-surface-subtle border border-border">
            <span className="text-text-muted block">Prior RTO &gt; Prior Orders:</span>
            <span className="font-mono font-bold text-base text-warning">{dataQuality.dataHygiene.priorRtoExceedsPriorOrders} anomalies</span>
          </div>
          <div className="p-3 rounded bg-surface-subtle border border-border">
            <span className="text-text-muted block">Nonpositive Order Value:</span>
            <span className="font-mono font-bold text-base text-negative">{dataQuality.dataHygiene.nonpositiveOrderValue} orders</span>
          </div>
        </div>
      </div>
    </div>
  );
}
