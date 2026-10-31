'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Sliders,
  DollarSign,
  TrendingUp,
  Save,
  CheckCircle2,
  RefreshCw,
  Info
} from 'lucide-react';
import { Policy, DEFAULT_POLICY } from '@/domain/policy/schema';
import { formatINR } from '@/domain/economics/money';

interface PreviewDiff {
  actions: {
    shipAsIs: number;
    confirmFirst: number;
    prepaidNudge: number;
    holdCancel: number;
  };
  netImpactDeltaRupees: number;
}

export function PolicyClient({
  initialPolicy,
  versions,
}: {
  initialPolicy: Policy;
  versions: Array<{ id: string; version: string; name: string; isActive: boolean; createdAt: string }>;
}) {
  const [policy, setPolicy] = useState<Policy>(initialPolicy);
  const [versionList, setVersionList] = useState(versions);
  const [previewDiff, setPreviewDiff] = useState<PreviewDiff | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handlePreview = async () => {
    setPreviewing(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/policy/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      });
      const json = await res.json();
      if (json.success) {
        setPreviewDiff(json.diff);
      } else {
        alert(json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewing(false);
    }
  };

  const handleSaveAndActivate = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      const newVersionId = `v${Date.now().toString().slice(-4)}`;
      const updatedPolicy = {
        ...policy,
        id: `pol_${newVersionId}`,
        version: newVersionId,
        updatedAt: new Date().toISOString(),
      };

      const saveRes = await fetch('/api/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPolicy),
      });
      const saveJson = await saveRes.json();

      if (!saveJson.success) {
        alert(saveJson.error);
        return;
      }

      // Activate the newly saved version
      const actRes = await fetch(`/api/policy/${saveJson.policy.id}/activate`, { method: 'POST' });
      const actJson = await actRes.json();

      if (actJson.success) {
        setPolicy(actJson.activePolicy);
        setSuccessMsg(`Policy ${saveJson.policy.version} successfully activated!`);
        // Refresh version list
        const polListRes = await fetch('/api/policy');
        const polListJson = await polListRes.json();
        if (polListJson.success) {
          setVersionList(polListJson.versions);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-3xl text-ink font-normal">Non-Technical Policy Workbench</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure risk thresholds, discount caps, and unit economics without modifying code.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            disabled={previewing}
            className="px-3.5 py-2 bg-surface border border-border hover:bg-surface-subtle text-ink text-xs font-medium rounded-control shadow-sm transition-colors flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            {previewing ? 'Computing Replay...' : 'Preview Cohort Impact'}
          </button>
          <button
            onClick={handleSaveAndActivate}
            disabled={saving}
            className="px-3.5 py-2 bg-accent hover:bg-accent-strong text-white text-xs font-medium rounded-control shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Activating...' : 'Save & Activate Policy'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-control bg-positive-soft border border-positive/30 text-positive text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Real-Time Cohort Impact Preview Card */}
      {previewDiff && (
        <div className="p-5 rounded-card bg-surface border-2 border-accent/40 shadow-sm space-y-3 animate-scaleUp">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-ink font-semibold text-sm">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span>Preview Impact vs Active Policy (September 2026 Cohort)</span>
            </div>
            <span className="text-[11px] font-mono text-text-muted">Simulated on 329 orders</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 text-center">
            <div className="p-2.5 rounded bg-surface-subtle border border-border">
              <div className="text-[10px] text-text-muted">Ship as-is Delta</div>
              <div className="font-mono font-bold text-sm text-ink mt-0.5">
                {previewDiff.actions.shipAsIs > 0 ? `+${previewDiff.actions.shipAsIs}` : previewDiff.actions.shipAsIs}
              </div>
            </div>

            <div className="p-2.5 rounded bg-surface-subtle border border-border">
              <div className="text-[10px] text-text-muted">Confirm First Delta</div>
              <div className="font-mono font-bold text-sm text-accent mt-0.5">
                {previewDiff.actions.confirmFirst > 0 ? `+${previewDiff.actions.confirmFirst}` : previewDiff.actions.confirmFirst}
              </div>
            </div>

            <div className="p-2.5 rounded bg-surface-subtle border border-border">
              <div className="text-[10px] text-text-muted">Prepaid Nudge Delta</div>
              <div className="font-mono font-bold text-sm text-info mt-0.5">
                {previewDiff.actions.prepaidNudge > 0 ? `+${previewDiff.actions.prepaidNudge}` : previewDiff.actions.prepaidNudge}
              </div>
            </div>

            <div className="p-2.5 rounded bg-surface-subtle border border-border">
              <div className="text-[10px] text-text-muted">Hold / Cancel Delta</div>
              <div className="font-mono font-bold text-sm text-negative mt-0.5">
                {previewDiff.actions.holdCancel > 0 ? `+${previewDiff.actions.holdCancel}` : previewDiff.actions.holdCancel}
              </div>
            </div>

            <div className="p-2.5 rounded bg-accent-soft border border-accent/20 col-span-2 sm:col-span-1">
              <div className="text-[10px] text-accent-strong font-medium">Net ₹ Impact</div>
              <div className="font-mono font-bold text-sm text-accent-strong mt-0.5">
                {previewDiff.netImpactDeltaRupees >= 0
                  ? `+${formatINR(previewDiff.netImpactDeltaRupees)}`
                  : `-${formatINR(Math.abs(previewDiff.netImpactDeltaRupees))}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Risk Routing Rules */}
        <div className="rounded-card border border-border bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-ink font-semibold text-sm border-b border-border pb-2">
            <Sliders className="w-4 h-4 text-accent" />
            <span>Risk Routing Thresholds</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-ink">Ship as-is Risk Ceiling</span>
                <span className="font-mono text-text-muted">
                  {(policy.routingRules.shipCeiling * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.40"
                step="0.01"
                value={policy.routingRules.shipCeiling}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    routingRules: {
                      ...policy.routingRules,
                      shipCeiling: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full accent-accent"
              />
              <p className="text-[11px] text-text-muted mt-0.5">
                Orders with estimated return probability below this threshold fast-track to dispatch.
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-ink">WhatsApp Confirmation Ceiling</span>
                <span className="font-mono text-text-muted">
                  {(policy.routingRules.confirmCeiling * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.60"
                step="0.01"
                value={policy.routingRules.confirmCeiling}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    routingRules: {
                      ...policy.routingRules,
                      confirmCeiling: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full accent-accent"
              />
              <p className="text-[11px] text-text-muted mt-0.5">
                Orders between Ship Ceiling and this threshold route to WhatsApp confirmation or Prepaid Nudge.
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-ink">High-Risk Review / Break-even</span>
                <span className="font-mono text-text-muted">
                  {(policy.routingRules.highRiskHoldThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.80"
                step="0.01"
                value={policy.routingRules.highRiskHoldThreshold}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    routingRules: {
                      ...policy.routingRules,
                      highRiskHoldThreshold: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full accent-accent"
              />
            </div>

            {/* Auto-Cancellation Safeguard */}
            <div className="pt-2 border-t border-border">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.routingRules.autoCancelEnabled}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      routingRules: {
                        ...policy.routingRules,
                        autoCancelEnabled: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <span className="font-semibold text-ink text-xs">Authorize Automatic Cancellation</span>
              </label>

              {policy.routingRules.autoCancelEnabled ? (
                <div className="mt-2 p-2 rounded bg-negative-soft border border-negative/30 text-[11px] text-negative flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Warning: Auto-cancellation will cancel high-risk orders without manual staff review.</span>
                </div>
              ) : (
                <p className="text-[11px] text-text-muted mt-1">
                  Default: Auto-cancellation is disabled. High-risk orders are safely routed to Held for Review.
                </p>
              )}
            </div>

            {/* Customer Protections */}
            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={policy.routingRules.blockFirstOrderAutoCancel}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      routingRules: {
                        ...policy.routingRules,
                        blockFirstOrderAutoCancel: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-border text-accent"
                />
                <span className="text-text-secondary text-[11px]">
                  Block auto-cancel for first-time buyers (Protects Meta ad spend)
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={policy.routingRules.blockLowSupportPincodeCancel}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      routingRules: {
                        ...policy.routingRules,
                        blockLowSupportPincodeCancel: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-border text-accent"
                />
                <span className="text-text-secondary text-[11px]">
                  Block auto-cancel for sparse pincodes (N &lt; 5)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Unit Economics & Costs */}
        <div className="rounded-card border border-border bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-ink font-semibold text-sm border-b border-border pb-2">
            <DollarSign className="w-4 h-4 text-positive" />
            <span>Unit Economics & Cost Parameters</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-text-muted block mb-1">Delivered Gross Margin</label>
              <input
                type="number"
                step="0.01"
                value={policy.costConfig.grossMarginFraction}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    costConfig: {
                      ...policy.costConfig,
                      grossMarginFraction: parseFloat(e.target.value) || 0.62,
                    },
                  })
                }
                className="w-full p-2 bg-canvas border border-border rounded-control font-mono"
              />
            </div>

            <div>
              <label className="text-text-muted block mb-1">Forward Shipping (₹)</label>
              <input
                type="number"
                value={policy.costConfig.forwardShippingCost}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    costConfig: {
                      ...policy.costConfig,
                      forwardShippingCost: parseFloat(e.target.value) || 65,
                    },
                  })
                }
                className="w-full p-2 bg-canvas border border-border rounded-control font-mono"
              />
            </div>

            <div>
              <label className="text-text-muted block mb-1">Return Shipping (₹)</label>
              <input
                type="number"
                value={policy.costConfig.returnShippingCost}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    costConfig: {
                      ...policy.costConfig,
                      returnShippingCost: parseFloat(e.target.value) || 65,
                    },
                  })
                }
                className="w-full p-2 bg-canvas border border-border rounded-control font-mono"
              />
            </div>

            <div>
              <label className="text-text-muted block mb-1">Packaging & Handling (₹)</label>
              <input
                type="number"
                value={policy.costConfig.packagingCost}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    costConfig: {
                      ...policy.costConfig,
                      packagingCost: parseFloat(e.target.value) || 25,
                    },
                  })
                }
                className="w-full p-2 bg-canvas border border-border rounded-control font-mono"
              />
            </div>

            <div>
              <label className="text-text-muted block mb-1">Damaged Goods Rate</label>
              <input
                type="number"
                step="0.01"
                value={policy.costConfig.damageRate}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    costConfig: {
                      ...policy.costConfig,
                      damageRate: parseFloat(e.target.value) || 0.08,
                    },
                  })
                }
                className="w-full p-2 bg-canvas border border-border rounded-control font-mono"
              />
            </div>

            <div>
              <label className="text-text-muted block mb-1">Avg Product Cost (₹)</label>
              <input
                type="number"
                value={policy.costConfig.averageProductCost}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    costConfig: {
                      ...policy.costConfig,
                      averageProductCost: parseFloat(e.target.value) || 180,
                    },
                  })
                }
                className="w-full p-2 bg-canvas border border-border rounded-control font-mono"
              />
            </div>
          </div>

          {/* Section 3: Prepaid Nudge Config */}
          <div className="pt-3 border-t border-border space-y-3">
            <div className="font-semibold text-ink text-xs uppercase tracking-wider">
              Prepaid Nudge Offer Rules
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-text-muted block mb-1">Discount Amount (₹)</label>
                <input
                  type="number"
                  value={policy.nudgeConfig.discountAmountRupees}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      nudgeConfig: {
                        ...policy.nudgeConfig,
                        discountAmountRupees: parseInt(e.target.value, 10) || 30,
                      },
                    })
                  }
                  className="w-full p-2 bg-canvas border border-border rounded-control font-mono"
                />
              </div>

              <div>
                <label className="text-text-muted block mb-1">Min Order Value (₹)</label>
                <input
                  type="number"
                  value={policy.nudgeConfig.minOrderValue}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      nudgeConfig: {
                        ...policy.nudgeConfig,
                        minOrderValue: parseFloat(e.target.value) || 300,
                      },
                    })
                  }
                  className="w-full p-2 bg-canvas border border-border rounded-control font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Version History Table */}
      <div className="rounded-card border border-border bg-surface p-6 shadow-sm space-y-4">
        <div className="font-serif text-xl text-ink">Policy Version History & Audit Trail</div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-text-muted">
              <th className="py-2.5 px-3">Version</th>
              <th className="py-2.5 px-3">Policy Name</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Created Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {versionList.map((v) => (
              <tr key={v.id} className="hover:bg-surface-subtle/50 transition-colors">
                <td className="py-2.5 px-3 font-mono font-medium">{v.version}</td>
                <td className="py-2.5 px-3 font-medium text-ink">{v.name}</td>
                <td className="py-2.5 px-3">
                  {v.isActive ? (
                    <span className="px-2 py-0.5 rounded-full bg-positive-soft text-positive border border-positive/30 font-medium text-[10px]">
                      &check; ACTIVE
                    </span>
                  ) : (
                    <span className="text-text-muted text-[10px]">Archived</span>
                  )}
                </td>
                <td className="py-2.5 px-3 font-mono text-text-muted">{v.createdAt.slice(0, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
