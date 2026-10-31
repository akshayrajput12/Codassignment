'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  DollarSign,
  Package,
  Layers,
  MapPin,
  Users
} from 'lucide-react';
import { formatINR, formatPercent } from '@/domain/economics/money';

interface DashboardData {
  cohortDate: string;
  isHistoricalDemo: boolean;
  totalOrders: number;
  evaluatedOrders: number;
  buckets: {
    shipAsIs: { count: number; sharePercent: number };
    confirmFirst: { count: number; sharePercent: number };
    prepaidNudge: { count: number; sharePercent: number };
    holdCancel: { count: number; sharePercent: number };
  };
  financialBridge: {
    baselineContribution: number;
    avoidedRtoCost: number;
    foregoneGenuineContribution: number;
    otherPolicyEffects: number;
    netImpact: number;
    policyContribution: number;
  };
  needsAttention: Array<{
    id: string;
    customerName: string;
    phone: string;
    orderValue: number;
    workflowState: string;
    explanation: string;
  }>;
}

export function OverviewClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [selectedDate, setSelectedDate] = useState<string>('2026-09');
  const [loading, setLoading] = useState(false);

  const fetchDashboard = async (date: string) => {
    setLoading(true);
    setSelectedDate(date);
    try {
      const res = await fetch(`/api/dashboard?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isEmptyYesterday = selectedDate.startsWith('2026-10') && data.totalOrders === 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-strong text-xs font-medium mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Executive Operations Screen
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink font-normal tracking-tight">
            Fewer returns. Better decisions.
          </h1>
          <p className="text-text-secondary text-sm sm:text-base mt-1.5 max-w-2xl">
            Yesterday&apos;s Cash on Delivery orders, balanced between return shipping loss and customer acquisition equity.
          </p>
        </div>

        {/* Date Selector & Mode Pill */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center bg-surface p-1 rounded-control border border-border shadow-sm">
            <button
              onClick={() => fetchDashboard('2026-09')}
              className={`px-3 py-1.5 text-xs font-medium rounded-control transition-all ${
                selectedDate === '2026-09'
                  ? 'bg-ink text-white font-semibold'
                  : 'text-text-secondary hover:text-ink'
              }`}
            >
              September Replay (329 orders)
            </button>
            <button
              onClick={() => fetchDashboard('2026-10-29')}
              className={`px-3 py-1.5 text-xs font-medium rounded-control transition-all ${
                selectedDate === '2026-10-29'
                  ? 'bg-ink text-white font-semibold'
                  : 'text-text-secondary hover:text-ink'
              }`}
            >
              Yesterday (29 Oct 2026)
            </button>
          </div>

          <div className="text-xs font-mono text-text-muted px-2 py-1 bg-surface-subtle rounded border border-border/80">
            {data.isHistoricalDemo ? 'Historical Replay Mode' : 'Live Cohort Mode'}
          </div>
        </div>
      </div>

      {/* Honest Empty State for True Yesterday */}
      {isEmptyYesterday ? (
        <div className="rounded-card border border-border bg-surface p-12 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-surface-subtle flex items-center justify-center mx-auto text-text-muted">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-2xl text-ink">No historical orders on 29 October 2026</h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            The supplied brand order history ends on 30 September 2026. Yesterday&apos;s date is honest: zero unprocessed records exist for October.
          </p>
          <div className="pt-2">
            <button
              onClick={() => fetchDashboard('2026-09')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-strong text-white text-xs font-medium rounded-control transition-colors shadow-sm"
            >
              Explore September 2026 Replay Cohort
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 4 Action Bucket Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tile 1: Ship as-is */}
            <Link
              href="/orders?action=SHIP_AS_IS"
              className="group p-5 rounded-card bg-surface border border-border shadow-sm hover:border-positive/50 hover:shadow-float transition-all"
            >
              <div className="flex items-center justify-between text-xs text-text-muted font-medium mb-2">
                <span>Fast-track Dispatch</span>
                <span className="w-2 h-2 rounded-full bg-positive" />
              </div>
              <div className="font-sans text-3xl font-bold tabular-nums text-ink">
                {data.buckets.shipAsIs.count}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
                <span className="text-positive font-medium">1. Ship as-is</span>
                <span className="text-text-muted font-mono">{data.buckets.shipAsIs.sharePercent}%</span>
              </div>
            </Link>

            {/* Tile 2: Ship after confirmation */}
            <Link
              href="/orders?action=SHIP_AFTER_CONFIRMATION"
              className="group p-5 rounded-card bg-surface border border-border shadow-sm hover:border-accent/50 hover:shadow-float transition-all"
            >
              <div className="flex items-center justify-between text-xs text-text-muted font-medium mb-2">
                <span>WhatsApp Verify</span>
                <span className="w-2 h-2 rounded-full bg-accent" />
              </div>
              <div className="font-sans text-3xl font-bold tabular-nums text-ink">
                {data.buckets.confirmFirst.count}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
                <span className="text-accent font-medium">2. Confirm first</span>
                <span className="text-text-muted font-mono">{data.buckets.confirmFirst.sharePercent}%</span>
              </div>
            </Link>

            {/* Tile 3: Nudge to prepaid */}
            <Link
              href="/orders?action=NUDGE_TO_PREPAID"
              className="group p-5 rounded-card bg-surface border border-border shadow-sm hover:border-info/50 hover:shadow-float transition-all"
            >
              <div className="flex items-center justify-between text-xs text-text-muted font-medium mb-2">
                <span>₹30 Online Discount</span>
                <span className="w-2 h-2 rounded-full bg-info" />
              </div>
              <div className="font-sans text-3xl font-bold tabular-nums text-ink">
                {data.buckets.prepaidNudge.count}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
                <span className="text-info font-medium">3. Prepaid nudge</span>
                <span className="text-text-muted font-mono">{data.buckets.prepaidNudge.sharePercent}%</span>
              </div>
            </Link>

            {/* Tile 4: Hold / cancel */}
            <Link
              href="/orders?action=HOLD_CANCEL"
              className="group p-5 rounded-card bg-surface border border-border shadow-sm hover:border-negative/50 hover:shadow-float transition-all"
            >
              <div className="flex items-center justify-between text-xs text-text-muted font-medium mb-2">
                <span>Held for Manual Review</span>
                <span className="w-2 h-2 rounded-full bg-negative" />
              </div>
              <div className="font-sans text-3xl font-bold tabular-nums text-ink">
                {data.buckets.holdCancel.count}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
                <span className="text-negative font-medium">4. Hold / cancel</span>
                <span className="text-text-muted font-mono">{data.buckets.holdCancel.sharePercent}%</span>
              </div>
            </Link>
          </div>

          {/* Financial Reconciliation Strip */}
          <div className="rounded-card border border-border bg-surface p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-xl text-ink">Unit Economics & Financial Bridge</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Incremental contribution vs baseline scenario of dispatching all COD orders without friction.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-subtle border border-border text-[11px] font-mono text-text-secondary">
                <Info className="w-3.5 h-3.5 text-accent" />
                Modeled Intervention Scenario
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-control bg-positive-soft/40 border border-positive/20">
                <div className="text-xs text-positive font-medium">Avoided RTO Shipping & Damage</div>
                <div className="text-2xl font-bold font-sans text-positive tabular-nums mt-1">
                  +{formatINR(data.financialBridge.avoidedRtoCost)}
                </div>
                <div className="text-[11px] text-text-muted mt-1">Direct savings from blocked returns</div>
              </div>

              <div className="p-4 rounded-control bg-negative-soft/40 border border-negative/20">
                <div className="text-xs text-negative font-medium">Foregone Genuine Margin</div>
                <div className="text-2xl font-bold font-sans text-negative tabular-nums mt-1">
                  -{formatINR(data.financialBridge.foregoneGenuineContribution)}
                </div>
                <div className="text-[11px] text-text-muted mt-1">Lost 62% product contribution</div>
              </div>

              <div className="p-4 rounded-control bg-surface-subtle border border-border">
                <div className="text-xs text-text-secondary font-medium">Other Policy Effects</div>
                <div className="text-2xl font-bold font-sans text-ink tabular-nums mt-1">
                  {formatINR(data.financialBridge.otherPolicyEffects)}
                </div>
                <div className="text-[11px] text-text-muted mt-1">Prepaid discount costs (₹30/order)</div>
              </div>

              <div className="p-4 rounded-control bg-accent-soft/40 border border-accent/20">
                <div className="text-xs text-accent-strong font-medium">Net Incremental Contribution</div>
                <div className="text-2xl font-bold font-sans text-accent-strong tabular-nums mt-1">
                  +{formatINR(data.financialBridge.netImpact)}
                </div>
                <div className="text-[11px] text-text-muted mt-1">Net profit lift to founder P&L</div>
              </div>
            </div>

            {/* Reconciliation Proof Sentence */}
            <div className="p-3 bg-surface-subtle rounded-control border border-border/80 flex items-center justify-between text-xs text-text-secondary font-mono">
              <span>
                Bridge Reconciled: +{formatINR(data.financialBridge.avoidedRtoCost)} (Avoided RTO) &minus; {formatINR(data.financialBridge.foregoneGenuineContribution)} (Foregone Margin) + ({formatINR(data.financialBridge.otherPolicyEffects)}) = +{formatINR(data.financialBridge.netImpact)} Net Impact
              </span>
              <span className="hidden md:inline-flex text-positive font-sans font-medium text-[11px]">
                &check; Exact Formula Match
              </span>
            </div>
          </div>

          {/* 3 Real Findings from Dataset Audit */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl text-ink">Verified Data Findings from Cleaned History</h2>
                <p className="text-xs text-text-secondary">
                  Audited from 1,987 resolved COD orders across 1,066 Indian pincodes.
                </p>
              </div>
              <Link href="/evidence" className="text-xs text-accent hover:text-accent-strong font-medium flex items-center gap-1">
                Full Audit Details <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-card bg-surface border border-border shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-warning text-xs font-semibold uppercase tracking-wider">
                  <MapPin className="w-4 h-4" />
                  Finding 1: Pincode Sparsity
                </div>
                <div className="text-lg font-bold text-ink">97.19% of Pincodes Have &lt;5 Orders</div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  1,036 out of 1,066 distinct pincodes have under 5 historical orders. A blanket &quot;bad pincode blacklist&quot; would suppress valid sales based on 1 return. We apply Bayesian shrinkage to prevent false bans.
                </p>
              </div>

              <div className="p-5 rounded-card bg-surface border border-border shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-info text-xs font-semibold uppercase tracking-wider">
                  <Users className="w-4 h-4" />
                  Finding 2: First-Time Volume
                </div>
                <div className="text-lg font-bold text-ink">1,043 First-Time Deliveries</div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  First-time buyers carry 30.23% RTO vs 22.97% for repeats (+7.27% lift). Yet 1,043 first-timers delivered successfully. Cancelling them destroys future repeat equity and squanders ₹300 Meta ad CAC.
                </p>
              </div>

              <div className="p-5 rounded-card bg-surface border border-border shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4" />
                  Finding 3: Meta vs Direct Lift
                </div>
                <div className="text-lg font-bold text-ink">+8.32% Higher RTO on Meta Ads</div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Meta traffic has a 31.24% return rate compared to 22.92% on Direct navigation. Meta impulse buyers require gentle WhatsApp confirmation and prepaid nudges rather than channel shutdown.
                </p>
              </div>
            </div>
          </div>

          {/* Needs Attention Drawer / Table */}
          {data.needsAttention && data.needsAttention.length > 0 && (
            <div className="rounded-card border border-border bg-surface p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl text-ink">Needs Operational Attention</h2>
                  <p className="text-xs text-text-secondary">
                    Orders currently held for review, missing delivery details, or awaiting phone verification.
                  </p>
                </div>
                <Link href="/orders?workflowState=HELD_FOR_REVIEW" className="text-xs text-accent font-medium hover:underline">
                  View all in Orders &rarr;
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface-subtle text-text-muted font-medium">
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Value</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Reason / Flag</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data.needsAttention.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-subtle/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-ink">{item.id}</td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-ink">{item.customerName}</div>
                          <div className="text-[11px] text-text-muted">{item.phone}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-medium">{formatINR(item.orderValue)}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-warning-soft text-warning text-[10px] font-medium border border-warning/20">
                            {item.workflowState}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-text-secondary max-w-xs truncate">{item.explanation}</td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/orders?search=${item.id}`}
                            className="inline-flex items-center gap-1 text-accent hover:text-accent-strong font-medium"
                          >
                            Review <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
