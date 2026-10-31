'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowUpDown,
  Info
} from 'lucide-react';
import { formatINR, formatPercent } from '@/domain/economics/money';

interface OrderRow {
  id: string;
  orderDatetime: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  orderValue: number;
  items: string;
  numItems: number;
  customerPriorOrders: number;
  customerPriorRto: number;
  utmSource: string;
  courier: string;
  paymentMethod: string;
  outcome: string | null;
  decision: {
    id: string;
    action: string;
    workflowState: string;
    probability: number;
    riskBand: string;
    explanation: string;
    reasonCodes: string[];
    evidence: Record<string, unknown>;
    economics: {
      orderValue: number;
      deliveredContribution: number;
      rtoLoss: number;
      evShip: number;
      evPrepaid: number;
      evCancel: number;
      recommendedDiscount: number;
    };
  } | null;
}

export function OrdersClient({
  initialOrders,
  initialPagination,
}: {
  initialOrders: OrderRow[];
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [pagination, setPagination] = useState(initialPagination);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [actionFilter, setActionFilter] = useState(searchParams.get('action') || 'ALL');
  const [stateFilter, setStateFilter] = useState(searchParams.get('workflowState') || 'ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // New Order Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    id: `KT${Math.floor(100000 + Math.random() * 900000)}`,
    customerName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    orderValue: 649,
    items: 'Rice Water Shampoo Bar',
    customerPriorOrders: 0,
    customerPriorRto: 0,
    utmSource: 'meta_ads',
  });
  const [evaluating, setEvaluating] = useState(false);

  // Manual Override State
  const [overrideAction, setOverrideAction] = useState('SHIP_AS_IS');
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);

  const fetchOrders = async (newPage = page, newSearch = search, newAction = actionFilter, newState = stateFilter) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('page', newPage.toString());
      if (newSearch) q.set('search', newSearch);
      if (newAction !== 'ALL') q.set('action', newAction);
      if (newState !== 'ALL') q.set('workflowState', newState);

      const res = await fetch(`/api/orders?${q.toString()}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.orders);
        setPagination(json.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const qSearch = searchParams.get('search');
    const qAction = searchParams.get('action');
    const qState = searchParams.get('workflowState');

    if (qSearch || qAction || qState) {
      if (qSearch) setSearch(qSearch);
      if (qAction) setActionFilter(qAction);
      if (qState) setStateFilter(qState);
      fetchOrders(1, qSearch || search, qAction || actionFilter, qState || stateFilter);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders(1, search, actionFilter, stateFilter);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvaluating(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrderForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowNewModal(false);
        fetchOrders(1);
        // Open newly created order in drawer
        const detailRes = await fetch(`/api/orders/${newOrderForm.id}/decision`);
        const detailJson = await detailRes.json();
        if (detailJson.success) {
          setSelectedOrder(detailJson.order);
        }
      } else {
        alert(`Error: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleApplyOverride = async () => {
    if (!selectedOrder) return;
    if (!overrideReason.trim()) {
      alert('Please provide a written operational reason for this override.');
      return;
    }
    setOverriding(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: overrideAction, reason: overrideReason }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedOrder(json.order);
        fetchOrders(page);
        setOverrideReason('');
      } else {
        alert(json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOverriding(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'SHIP_AS_IS':
        return <span className="px-2 py-0.5 rounded-full bg-positive-soft text-positive border border-positive/20 text-[11px] font-medium">Ship as-is</span>;
      case 'SHIP_AFTER_CONFIRMATION':
        return <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 text-[11px] font-medium">Confirm first</span>;
      case 'NUDGE_TO_PREPAID':
        return <span className="px-2 py-0.5 rounded-full bg-info-soft text-info border border-info/20 text-[11px] font-medium">Prepaid nudge</span>;
      case 'HOLD_CANCEL':
        return <span className="px-2 py-0.5 rounded-full bg-negative-soft text-negative border border-negative/20 text-[11px] font-medium">Hold / cancel</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-surface-subtle text-text-muted text-[11px] font-medium">{action}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-3xl text-ink font-normal">Orders Inbox</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Evaluate, verify, and inspect explainable AI decisions across all Cash on Delivery orders.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-strong text-white text-xs font-medium rounded-control shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Evaluate New Order
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-card bg-surface border border-border shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by Order ID, customer, phone, city, or pincode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-canvas border border-border rounded-control focus:outline-none focus:border-accent text-ink placeholder:text-text-muted"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
              fetchOrders(1, search, e.target.value, stateFilter);
            }}
            className="text-xs bg-canvas border border-border rounded-control px-2.5 py-1.5 text-ink focus:outline-none"
          >
            <option value="ALL">All Actions</option>
            <option value="SHIP_AS_IS">Ship as-is</option>
            <option value="SHIP_AFTER_CONFIRMATION">Confirm first</option>
            <option value="NUDGE_TO_PREPAID">Prepaid nudge</option>
            <option value="HOLD_CANCEL">Hold / cancel</option>
          </select>

          {/* Workflow State Filter */}
          <select
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              setPage(1);
              fetchOrders(1, search, actionFilter, e.target.value);
            }}
            className="text-xs bg-canvas border border-border rounded-control px-2.5 py-1.5 text-ink focus:outline-none"
          >
            <option value="ALL">All States</option>
            <option value="READY_TO_SHIP">Ready to ship</option>
            <option value="AWAITING_CONFIRMATION">Awaiting confirmation</option>
            <option value="AWAITING_PREPAID">Awaiting prepaid</option>
            <option value="CONFIRMED_COD">Confirmed COD</option>
            <option value="PAID_PREPAID">Paid Prepaid</option>
            <option value="HELD_FOR_REVIEW">Held for review</option>
            <option value="TIMED_OUT">Timed out</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-text-muted font-medium">
                <th className="py-3 px-3.5">Order ID</th>
                <th className="py-3 px-3.5">Customer / City</th>
                <th className="py-3 px-3.5">Value</th>
                <th className="py-3 px-3.5">Customer Type</th>
                <th className="py-3 px-3.5">Est. Risk</th>
                <th className="py-3 px-3.5">Decision Action</th>
                <th className="py-3 px-3.5">Workflow State</th>
                <th className="py-3 px-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className="hover:bg-surface-subtle/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3.5 font-mono font-medium text-ink">{o.id}</td>
                  <td className="py-3 px-3.5">
                    <div className="font-medium text-ink">{o.customerName}</div>
                    <div className="text-[11px] text-text-muted">
                      {o.city || 'Unknown'}, {o.pincode || 'No Pin'}
                    </div>
                  </td>
                  <td className="py-3 px-3.5 font-mono font-medium text-ink">{formatINR(o.orderValue)}</td>
                  <td className="py-3 px-3.5">
                    {o.customerPriorOrders === 0 ? (
                      <span className="text-[11px] text-text-muted">First-time ({o.utmSource || 'direct'})</span>
                    ) : (
                      <span className="text-[11px] text-positive font-medium">
                        Repeat ({o.customerPriorOrders} orders, {o.customerPriorRto} RTO)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5">
                    <span className="font-mono tabular-nums font-medium">
                      {o.decision ? `${(o.decision.probability * 100).toFixed(1)}%` : '--'}
                    </span>
                  </td>
                  <td className="py-3 px-3.5">{getActionBadge(o.decision?.action || 'SHIP_AS_IS')}</td>
                  <td className="py-3 px-3.5">
                    <span className="text-[11px] text-text-secondary font-mono">
                      {o.decision?.workflowState || 'READY_TO_SHIP'}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    <span className="text-accent hover:text-accent-strong text-xs font-medium">
                      Inspect &rarr;
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between p-3.5 border-t border-border bg-surface-subtle text-xs text-text-muted">
          <div>
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.total, pagination.page * pagination.pageSize)} of {pagination.total} orders
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const prev = Math.max(1, page - 1);
                setPage(prev);
                fetchOrders(prev);
              }}
              disabled={page <= 1}
              className="p-1 rounded border border-border disabled:opacity-40 hover:bg-surface"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono">
              Page {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => {
                const next = Math.min(pagination.totalPages, page + 1);
                setPage(next);
                fetchOrders(next);
              }}
              disabled={page >= pagination.totalPages}
              className="p-1 rounded border border-border disabled:opacity-40 hover:bg-surface"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-surface h-full shadow-2xl border-l border-border flex flex-col animate-slideLeft">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface-subtle">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-ink">{selectedOrder.id}</span>
                  {getActionBadge(selectedOrder.decision?.action || 'SHIP_AS_IS')}
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  Placed on {selectedOrder.orderDatetime} via {selectedOrder.paymentMethod}
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-control text-text-muted hover:text-ink hover:bg-border/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Plain-English Reason Section */}
              <div className="p-4 rounded-control bg-accent-soft/40 border border-accent/20 space-y-2">
                <div className="flex items-center gap-1.5 text-accent-strong font-semibold uppercase tracking-wider text-[11px]">
                  <Sparkles className="w-4 h-4" />
                  Plain-English Decision Reason
                </div>
                <p className="text-ink text-sm font-medium leading-relaxed">
                  {selectedOrder.decision?.explanation}
                </p>
              </div>

              {/* Customer & Address Details */}
              <div className="p-4 rounded-control bg-surface-subtle border border-border space-y-2.5">
                <div className="font-semibold text-ink text-xs uppercase tracking-wider">
                  Customer & Shipping Information
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-text-muted">Customer Name:</span>
                    <div className="font-medium text-ink">{selectedOrder.customerName}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">Contact Phone:</span>
                    <div className="font-mono text-ink">{selectedOrder.phone}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-muted">Address:</span>
                    <div className="font-medium text-ink">{selectedOrder.address}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">City / State:</span>
                    <div className="text-ink">{selectedOrder.city}, {selectedOrder.state}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">Pincode:</span>
                    <div className="font-mono text-ink">{selectedOrder.pincode}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">Order Value:</span>
                    <div className="font-mono font-bold text-ink">{formatINR(selectedOrder.orderValue)}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">Items:</span>
                    <div className="text-ink">{selectedOrder.items}</div>
                  </div>
                </div>
              </div>

              {/* 4-Action Expected Value Comparison */}
              {selectedOrder.decision && (
                <div className="p-4 rounded-control bg-surface border border-border space-y-3">
                  <div className="font-semibold text-ink text-xs uppercase tracking-wider flex items-center justify-between">
                    <span>4-Action Expected Value (EV) Comparison</span>
                    <span className="font-mono text-[11px] text-text-muted">
                      Break-even Risk: ~64.8%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded bg-surface-subtle border border-border/80">
                      <div className="text-[10px] text-text-muted">EV Ship as-is</div>
                      <div className="font-mono font-bold text-ink mt-0.5">
                        {formatINR(selectedOrder.decision.economics.evShip)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded bg-info-soft/40 border border-info/20">
                      <div className="text-[10px] text-info">EV Prepaid Nudge</div>
                      <div className="font-mono font-bold text-info mt-0.5">
                        {formatINR(selectedOrder.decision.economics.evPrepaid)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded bg-negative-soft/40 border border-negative/20">
                      <div className="text-[10px] text-negative">EV Cancel</div>
                      <div className="font-mono font-bold text-negative mt-0.5">₹0</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Link to WhatsApp Simulator if eligible */}
              <div className="pt-2">
                <button
                  onClick={() => router.push(`/conversations?orderId=${selectedOrder.id}`)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-control bg-surface-subtle border border-border hover:bg-surface text-ink font-medium text-xs transition-colors"
                >
                  Open in WhatsApp Chat Simulator
                  <ExternalLink className="w-3.5 h-3.5 text-accent" />
                </button>
              </div>

              {/* Operations Manual Override */}
              <div className="p-4 rounded-control bg-surface-subtle border border-border space-y-3">
                <div className="font-semibold text-ink text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-warning" />
                  Operations Manual Override
                </div>
                <p className="text-[11px] text-text-secondary">
                  Manual overrides create an immutable audit record and update dispatch queue states.
                </p>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-text-muted block mb-1">Override Action:</label>
                    <select
                      value={overrideAction}
                      onChange={(e) => setOverrideAction(e.target.value)}
                      className="w-full p-2 text-xs bg-surface border border-border rounded-control text-ink"
                    >
                      <option value="SHIP_AS_IS">Force Ship as-is</option>
                      <option value="SHIP_AFTER_CONFIRMATION">Route to Confirmation</option>
                      <option value="NUDGE_TO_PREPAID">Nudge to Prepaid</option>
                      <option value="HOLD_CANCEL">Cancel / Hold Order</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-text-muted block mb-1">Required Operational Reason:</label>
                    <textarea
                      rows={2}
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g. Verified customer via manual phone call / landmark confirmed..."
                      className="w-full p-2 text-xs bg-surface border border-border rounded-control text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <button
                    onClick={handleApplyOverride}
                    disabled={overriding}
                    className="w-full py-2 bg-ink hover:bg-black text-white text-xs font-medium rounded-control transition-colors"
                  >
                    {overriding ? 'Applying...' : 'Log & Apply Override'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface rounded-card shadow-2xl border border-border p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-serif text-xl text-ink">Evaluate Fresh COD Order</h3>
                <p className="text-xs text-text-secondary">Simulates pre-shipment order intake from Shopify.</p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded text-text-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-muted block mb-1">Order ID</label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.id}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, id: e.target.value })}
                    className="w-full p-2 bg-canvas border border-border rounded-control font-mono"
                  />
                </div>

                <div>
                  <label className="text-text-muted block mb-1">Order Value (₹)</label>
                  <input
                    type="number"
                    required
                    value={newOrderForm.orderValue}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, orderValue: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-canvas border border-border rounded-control font-mono"
                  />
                </div>

                <div>
                  <label className="text-text-muted block mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.customerName}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, customerName: e.target.value })}
                    placeholder="e.g. Tanvi Das"
                    className="w-full p-2 bg-canvas border border-border rounded-control"
                  />
                </div>

                <div>
                  <label className="text-text-muted block mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.phone}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full p-2 bg-canvas border border-border rounded-control font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-text-muted block mb-1">Delivery Address</label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.address}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, address: e.target.value })}
                    placeholder="e.g. Shop 4, Link Chowk ke saamne, Near Metro"
                    className="w-full p-2 bg-canvas border border-border rounded-control"
                  />
                </div>

                <div>
                  <label className="text-text-muted block mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.city}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, city: e.target.value })}
                    placeholder="e.g. Chennai"
                    className="w-full p-2 bg-canvas border border-border rounded-control"
                  />
                </div>

                <div>
                  <label className="text-text-muted block mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.pincode}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, pincode: e.target.value })}
                    placeholder="600084"
                    className="w-full p-2 bg-canvas border border-border rounded-control font-mono"
                  />
                </div>

                <div>
                  <label className="text-text-muted block mb-1">Customer Prior Orders</label>
                  <input
                    type="number"
                    value={newOrderForm.customerPriorOrders}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, customerPriorOrders: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2 bg-canvas border border-border rounded-control font-mono"
                  />
                </div>

                <div>
                  <label className="text-text-muted block mb-1">UTM Source</label>
                  <select
                    value={newOrderForm.utmSource}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, utmSource: e.target.value })}
                    className="w-full p-2 bg-canvas border border-border rounded-control"
                  >
                    <option value="meta_ads">meta_ads (Instagram/FB)</option>
                    <option value="direct">direct</option>
                    <option value="google">google</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-border rounded-control text-text-secondary hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={evaluating}
                  className="px-4 py-2 bg-accent hover:bg-accent-strong text-white font-medium rounded-control transition-colors"
                >
                  {evaluating ? 'Evaluating with AI & Risk Model...' : 'Submit & Evaluate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
