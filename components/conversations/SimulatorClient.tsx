'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Send,
  Clock,
  CreditCard,
  CheckCheck,
  Check,
  Phone,
  MoreVertical,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { formatINR } from '@/domain/economics/money';

interface MessageItem {
  id: string;
  direction: 'OUTBOUND' | 'INBOUND';
  body: string;
  intent: string | null;
  createdAt: string;
}

interface ConversationData {
  conversation: {
    id: string;
    orderId: string;
    state: string;
    language: string;
    customerPhone: string;
    virtualNow: string;
    outreachSuppressed: boolean;
  };
  order: {
    id: string;
    customerName: string;
    phone: string;
    address: string;
    city: string;
    orderValue: number;
    items: string;
  };
  quote: {
    id: string;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    token: string;
    status: string;
    expiresAt: string;
  } | null;
  messages: MessageItem[];
}

export function SimulatorClient() {
  const searchParams = useSearchParams();
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    searchParams.get('orderId') || 'DEMO-CONFIRM-1'
  );

  const [data, setData] = useState<ConversationData | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [clockAdvancing, setClockAdvancing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversation = async (orderId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${orderId}`);
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

  useEffect(() => {
    fetchConversation(selectedOrderId);
  }, [selectedOrderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !data) return;

    setInputText('');
    try {
      const res = await fetch(`/api/conversations/${data.order.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdvanceClock = async (hours: number) => {
    if (!data) return;
    setClockAdvancing(true);
    try {
      const res = await fetch('/api/simulator/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.order.id, hours }),
      });
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClockAdvancing(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!data || !data.quote) return;
    setPaying(true);
    try {
      const res = await fetch('/api/mock-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: data.order.id,
          token: data.quote.token,
          amount: data.quote.finalAmount,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        alert(json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaying(false);
    }
  };

  const demoPresets = [
    { id: 'DEMO-CONFIRM-1', label: '1. Confirm First (Aarav, Delhi)' },
    { id: 'DEMO-NUDGE-1', label: '2. Nudge to Prepaid (Ananya, Chennai)' },
    { id: 'DEMO-SHIP-1', label: '3. Fast-Track Ship (Pooja, Mumbai)' },
    { id: 'DEMO-HOLD-1', label: '4. High Risk / Incomplete (Test Buyer)' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-3xl text-ink font-normal">WhatsApp Confirmation Simulator</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Interactive, deterministic message flow for &quot;Ship after confirmation&quot; and &quot;Nudge to prepaid&quot;.
          </p>
        </div>

        {/* Demo Order Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted font-medium">Select Order:</label>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="text-xs bg-surface border border-border rounded-control px-3 py-1.5 font-medium text-ink focus:outline-none"
          >
            {demoPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: WhatsApp Smartphone Shell (7 cols) */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-full max-w-md bg-[#e5ddd5] rounded-[32px] border-[10px] border-[#222222] shadow-2xl overflow-hidden flex flex-col h-[650px] relative">
            {/* Top Speaker & Camera Notch */}
            <div className="bg-[#222222] h-4 w-32 mx-auto rounded-b-xl z-20 flex items-center justify-center">
              <div className="w-10 h-1 bg-[#333333] rounded-full" />
            </div>

            {/* WhatsApp Green Top Bar */}
            <div className="bg-[#075e54] text-white px-4 py-2.5 flex items-center justify-between shadow-md z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                  🌿
                </div>
                <div>
                  <div className="font-semibold text-xs flex items-center gap-1">
                    <span>D2C Haircare Official</span>
                    <span className="text-[10px] text-emerald-300">&check;</span>
                  </div>
                  <div className="text-[10px] text-white/80">Business Account &bull; online</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-white/90">
                <Phone className="w-4 h-4 cursor-pointer" />
                <MoreVertical className="w-4 h-4 cursor-pointer" />
              </div>
            </div>

            {/* Conversation Status Banner */}
            {data && (
              <div className="bg-[#dcf8c6]/90 border-b border-black/5 px-3 py-1 text-[11px] text-[#075e54] font-mono flex items-center justify-between">
                <span>Status: {data.conversation.state}</span>
                <span>Virtual: {data.conversation.virtualNow.slice(11, 16)} UTC</span>
              </div>
            )}

            {/* Chat Bubbles Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5] bg-opacity-90">
              {/* Encryption Banner */}
              <div className="bg-[#ffeecd] text-[#554b38] text-[10px] p-2 rounded-lg text-center max-w-[90%] mx-auto shadow-2xs">
                🔒 Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them.
              </div>

              {data?.messages.map((m) => {
                const isOutbound = m.direction === 'OUTBOUND';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isOutbound ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-2.5 shadow-xs text-xs relative ${
                        isOutbound
                          ? 'bg-white text-ink rounded-tl-none'
                          : 'bg-[#dcf8c6] text-ink rounded-tr-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-text-muted">
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isOutbound && <CheckCheck className="w-3 h-3 text-[#34b7f1]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Reply Pills */}
            <div className="bg-surface/95 border-t border-border/60 p-2 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
              <button
                onClick={() => handleSendMessage('Yes, confirm dispatch')}
                className="px-2.5 py-1 rounded-full bg-positive-soft text-positive border border-positive/30 text-[10px] font-medium whitespace-nowrap hover:bg-positive/20"
              >
                &check; Yes, Confirm
              </button>
              <button
                onClick={() => handleSendMessage('Keep COD')}
                className="px-2.5 py-1 rounded-full bg-surface-subtle text-text-secondary border border-border text-[10px] font-medium whitespace-nowrap hover:bg-surface"
              >
                Keep COD
              </button>
              <button
                onClick={() => handleSendMessage('No, cancel order')}
                className="px-2.5 py-1 rounded-full bg-negative-soft text-negative border border-negative/30 text-[10px] font-medium whitespace-nowrap hover:bg-negative/20"
              >
                &times; Cancel Order
              </button>
              <button
                onClick={() => handleSendMessage('My flat number is 204')}
                className="px-2.5 py-1 rounded-full bg-info-soft text-info border border-info/30 text-[10px] font-medium whitespace-nowrap hover:bg-info/20"
              >
                Update Address
              </button>
              <button
                onClick={() => handleSendMessage('STOP')}
                className="px-2.5 py-1 rounded-full bg-surface-subtle text-text-muted border border-border text-[10px] font-medium whitespace-nowrap"
              >
                STOP (Opt out)
              </button>
            </div>

            {/* Chat Input Bar */}
            <div className="bg-[#f0f0f0] p-2 flex items-center gap-2 border-t border-border">
              <input
                type="text"
                placeholder="Type a customer reply..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-white text-xs rounded-full px-3.5 py-2 border border-border/80 focus:outline-none focus:border-positive text-ink placeholder:text-text-muted"
              />
              <button
                onClick={() => handleSendMessage()}
                className="w-8 h-8 rounded-full bg-[#128c7e] hover:bg-[#075e54] text-white flex items-center justify-center transition-colors shadow-sm"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Virtual Clock & Mock Payment Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Virtual Clock Panel */}
          <div className="rounded-card border border-border bg-surface p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-ink font-semibold text-sm">
              <Clock className="w-4 h-4 text-accent" />
              <span>Virtual Clock Time Travel</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Advance conversation time to verify the 6-hour reminder trigger and 24-hour timeout transition without waiting in real time.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => handleAdvanceClock(6)}
                disabled={clockAdvancing}
                className="p-2 rounded-control bg-surface-subtle border border-border hover:bg-surface text-ink text-xs font-medium text-center transition-colors"
              >
                +6h Reminder
              </button>
              <button
                onClick={() => handleAdvanceClock(12)}
                disabled={clockAdvancing}
                className="p-2 rounded-control bg-surface-subtle border border-border hover:bg-surface text-ink text-xs font-medium text-center transition-colors"
              >
                +12h Fast Forward
              </button>
              <button
                onClick={() => handleAdvanceClock(24)}
                disabled={clockAdvancing}
                className="p-2 rounded-control bg-negative-soft/60 border border-negative/30 hover:bg-negative-soft text-negative text-xs font-medium text-center transition-colors"
              >
                +24h Timeout
              </button>
            </div>
          </div>

          {/* Mock Payment Gateway Panel */}
          <div className="rounded-card border border-border bg-surface p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-ink font-semibold text-sm">
              <CreditCard className="w-4 h-4 text-info" />
              <span>Mock Payment Gateway Callback</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Simulates verified UPI / Razorpay payment gateway callback for &quot;Nudge to Prepaid&quot;.
            </p>

            {data?.quote ? (
              <div className="p-3.5 rounded-control bg-info-soft/30 border border-info/20 space-y-2 text-xs">
                <div className="flex justify-between items-center font-mono">
                  <span className="text-text-muted">Original COD Total:</span>
                  <span className="line-through text-text-muted">₹{data.quote.originalAmount}</span>
                </div>
                <div className="flex justify-between items-center font-mono font-medium text-info">
                  <span>Prepaid Discount Offer:</span>
                  <span>-₹{data.quote.discountAmount}</span>
                </div>
                <div className="flex justify-between items-center font-mono font-bold text-ink border-t border-info/20 pt-1 text-sm">
                  <span>Discounted Online Payable:</span>
                  <span className="text-positive">₹{data.quote.finalAmount}</span>
                </div>

                <div className="text-[11px] text-text-muted pt-1">
                  Quote Status: <span className="font-mono font-bold">{data.quote.status}</span>
                </div>

                {data.quote.status === 'ACTIVE' ? (
                  <button
                    onClick={handleSimulatePayment}
                    disabled={paying}
                    className="w-full mt-2 py-2 px-3 bg-positive hover:bg-emerald-700 text-white font-medium rounded-control text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCheck className="w-4 h-4" />
                    {paying ? 'Simulating Webhook...' : 'Simulate Customer Payment'}
                  </button>
                ) : data.quote.status === 'PAID' ? (
                  <div className="p-2 rounded bg-positive-soft border border-positive/30 text-positive text-center text-xs font-medium">
                    &check; Payment Verified & Order Dispatched as Prepaid
                  </div>
                ) : (
                  <div className="p-2 rounded bg-negative-soft border border-negative/30 text-negative text-center text-xs font-medium">
                    Quote Expired after 24h Window
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-surface-subtle rounded-control text-xs text-text-muted text-center">
                This order is not currently in a Prepaid Nudge state.
              </div>
            )}
          </div>

          {/* Edge Cases Explanation Card */}
          <div className="rounded-card border border-border bg-surface p-5 shadow-sm space-y-2.5 text-xs text-text-secondary">
            <div className="font-semibold text-ink text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-positive" />
              Verified Edge-Case Protection
            </div>
            <ul className="space-y-1.5 list-disc pl-4 text-[11px] text-text-secondary leading-relaxed">
              <li>
                <strong className="text-ink">Chat Payment Trap:</strong> Customer texting &quot;Paid&quot; does NOT mark paid. Payment transitions only on signed webhook callback.
              </li>
              <li>
                <strong className="text-ink">Unknown Replies:</strong> Ambiguous replies trigger 1 clarification; repeated unknowns route order to human ops review.
              </li>
              <li>
                <strong className="text-ink">Opt-out:</strong> Texting &quot;STOP&quot; immediately suppresses outreach without cancelling order.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
