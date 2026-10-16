import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Send,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Loader2,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  orderId: initialOrderId,
}) => {
  const { token } = useAuth();
  const [searchOrderId, setSearchOrderId] = useState(initialOrderId || '');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evidence submission state
  const [utrRef, setUtrRef] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceSuccess, setEvidenceSuccess] = useState(false);

  // Copy state
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    if (initialOrderId && isOpen) {
      setSearchOrderId(initialOrderId);
      fetchOrderTracking(initialOrderId);
    }
  }, [initialOrderId, isOpen]);

  const fetchOrderTracking = async (id: string) => {
    if (!id || !id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(id.trim())}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setError(err?.error || 'Order reference not found. Please check your reference ID.');
        setOrder(null);
        return;
      }
      const data = await res.json();
      setOrder(data.order);
    } catch {
      setError('Network communication failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrderTracking(searchOrderId);
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrRef.trim() || !order) return;
    setIsSubmittingEvidence(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/payment-evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ref: utrRef.trim(),
          screenshot: screenshotUrl.trim() || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        alert(errData?.error || 'Failed to submit payment evidence.');
        return;
      }

      setEvidenceSuccess(true);
      fetchOrderTracking(order.id);
      setTimeout(() => setEvidenceSuccess(false), 3000);
    } catch {
      alert('Network error while submitting evidence.');
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  const handleCopy = (text: string, type: 'code' | 'ref') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="track-order-heading"
        className="relative w-full max-w-2xl rounded-2xl bg-[#0c0d1c] border border-purple-500/30 p-6 sm:p-8 shadow-2xl my-8 text-white space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 id="track-order-heading" className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                Live Order Tracking
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                Persistent escrow ledger & genuine VP code delivery verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tracking modal"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Order Ref Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={searchOrderId}
            onChange={(e) => setSearchOrderId(e.target.value)}
            placeholder="Enter Order Reference (e.g. ord_abc123 or VIB-...)"
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={loading || !searchOrderId.trim()}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold font-rajdhani uppercase text-sm text-white transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Lookup</span>
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loaded Order Information */}
        {order && (
          <div className="space-y-6">
            {/* Top Summary Card */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg font-rajdhani text-white">{order.title}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(order.id, 'ref')}
                      className="text-[11px] font-mono text-gray-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer bg-white/5 px-2 py-0.5 rounded"
                      title="Copy Order ID"
                    >
                      <span>#{order.id}</span>
                      {copiedRef ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">
                    Placed: {new Date(order.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="sm:text-right">
                  <div className="text-xl font-black text-fuchsia-400 font-rajdhani">
                    ₹{order.amount?.toLocaleString('en-IN')} {order.currency || 'INR'}
                  </div>
                  <div className="text-xs text-gray-400 uppercase font-mono">{order.type} Order</div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 text-xs">
                {/* Payment Status */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/40 border border-white/10">
                  <span className="text-gray-400 font-mono">Payment:</span>
                  <span className={`font-mono font-bold uppercase ${
                    order.payment_status === 'PAYMENT_VERIFIED'
                      ? 'text-emerald-400'
                      : order.payment_status === 'SUBMITTED_FOR_VERIFICATION'
                      ? 'text-sky-400'
                      : order.payment_status === 'PAYMENT_REJECTED'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}>
                    {order.payment_status || 'AWAITING_PAYMENT'}
                  </span>
                </div>

                {/* Fulfillment Status */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/40 border border-white/10">
                  <span className="text-gray-400 font-mono">Fulfillment:</span>
                  <span className={`font-mono font-bold uppercase ${
                    order.fulfillment_status === 'COMPLETED'
                      ? 'text-emerald-400'
                      : order.fulfillment_status === 'FULFILLMENT_PENDING'
                      ? 'text-rose-400'
                      : 'text-purple-400'
                  }`}>
                    {order.fulfillment_status || 'PENDING'}
                  </span>
                </div>
              </div>
            </div>

            {/* FULFILLED INDIAN VP CODE DISPLAY (if genuine code issued) */}
            {order.issued_code && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-[#07241a] to-emerald-950/40 border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.25)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-bold font-rajdhani text-sm uppercase tracking-wider">
                      Official Valorant Points Prepaid Code Issued
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-300/80">
                    {order.code_issued_at ? new Date(order.code_issued_at).toLocaleTimeString() : 'Verified'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-black/60 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="font-mono text-xl sm:text-2xl font-black text-white tracking-widest break-all select-all">
                    {order.issued_code}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(order.issued_code, 'code')}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-rajdhani uppercase text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shrink-0"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Copied PIN!' : 'Copy Code'}</span>
                  </button>
                </div>

                {/* In-game redemption instructions */}
                <div className="p-3.5 rounded-xl bg-black/40 text-xs text-gray-300 space-y-1.5 font-rajdhani">
                  <div className="font-bold text-emerald-300 uppercase tracking-wide">Redemption Instructions:</div>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300/90 text-xs leading-relaxed font-sans">
                    <li>Launch <strong>VALORANT</strong> and log in to your Riot account.</li>
                    <li>Click the <strong>V (Valorant Points) icon</strong> in the top right of the in-game store.</li>
                    <li>Select <strong>Prepaid Cards & Codes</strong> as your payment option.</li>
                    <li>Paste your code above and click <strong>Submit</strong>. Your VP will credit immediately!</li>
                  </ol>
                </div>
              </div>
            )}

            {/* STOCK OUT NOTICE IF FULFILLMENT IS PENDING */}
            {order.fulfillment_status === 'FULFILLMENT_PENDING' && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold font-rajdhani text-sm uppercase">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Inventory Restocking In Progress</span>
                </div>
                <p className="text-gray-300">
                  Your payment has been successfully approved! Our automated code inventory for this pack is temporarily being replenished. Your genuine code will be dispatched to your email as soon as the batch restocks, or our manager will deliver directly on WhatsApp.
                </p>
              </div>
            )}

            {/* PAYMENT EVIDENCE SUBMISSION (if awaiting payment or payment was rejected) */}
            {(order.payment_status === 'AWAITING_PAYMENT' || order.payment_status === 'PAYMENT_REJECTED') && (
              <form onSubmit={handleSubmitEvidence} className="p-5 rounded-2xl bg-white/[0.02] border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold font-rajdhani text-sm uppercase">
                  <QrCode className="w-4 h-4" />
                  <span>Submit Payment Verification Reference</span>
                </div>
                <p className="text-xs text-gray-400">
                  Transferred via UPI? Enter your 12-digit Bank Transaction / UTR Reference number below so our accounting desk can verify your receipt.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-gray-300 uppercase mb-1">
                      Bank Transaction UTR / UPI Ref *
                    </label>
                    <input
                      type="text"
                      required
                      value={utrRef}
                      onChange={(e) => setUtrRef(e.target.value)}
                      placeholder="e.g. 428190184712"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-gray-300 uppercase mb-1">
                      Payment Screenshot URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={screenshotUrl}
                      onChange={(e) => setScreenshotUrl(e.target.value)}
                      placeholder="https://... (screenshot link)"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingEvidence || !utrRef.trim()}
                  className="w-full min-h-[44px] py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold font-rajdhani uppercase text-sm text-black transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isSubmittingEvidence ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit for Verification</span>
                </button>

                {evidenceSuccess && (
                  <div className="p-2 text-center text-xs text-emerald-400 font-mono">
                    Evidence submitted! Status updated to SUBMITTED_FOR_VERIFICATION.
                  </div>
                )}
              </form>
            )}

            {/* ORDER TIMELINE HISTORY */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm font-rajdhani uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Escrow Lifecycle & Audit Timeline</span>
              </h4>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                {Array.isArray(order.timeline) && order.timeline.length > 0 ? (
                  order.timeline.map((event: any, idx: number) => (
                    <div key={idx} className="relative space-y-0.5">
                      <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-[#0c0d1c]" />
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white uppercase">{event.status}</span>
                        <span className="text-[10px] font-mono text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                        {event.actor && (
                          <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.2 rounded">
                            {event.actor}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 font-rajdhani">{event.note}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 font-mono">Order timeline initialized.</div>
                )}
              </div>
            </div>

            {/* Direct WhatsApp Contact CTA */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-bold text-sm font-rajdhani text-white flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Need Urgent Human Assistance?</span>
                </div>
                <div className="text-xs text-gray-400">
                  Connect directly with our 24/7 Operations Desk on WhatsApp (+91 9181801766).
                </div>
              </div>

              <a
                href={order.whatsappSupportUrl || `https://wa.me/919181801766?text=Order%20${order.id}`}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-rajdhani uppercase text-xs flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
              >
                <span>WhatsApp Desk</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
