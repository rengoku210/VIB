import React, { useState, useEffect } from 'react';
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Loader2,
  Save,
  MessageCircle,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminPaymentSettings: React.FC = () => {
  const { token, user } = useAuth();
  const isModerator = user?.role === 'moderator';
  const [settings, setSettings] = useState({
    upi_id: '',
    payee_name: '',
    qr_image_url: '',
    instructions: '',
    support_phone: '',
    is_active: 1,
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Orders verification list
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'SUBMITTED_FOR_VERIFICATION' | 'AWAITING_PAYMENT' | 'PAYMENT_VERIFIED' | 'PAYMENT_REJECTED'>('SUBMITTED_FOR_VERIFICATION');
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Rejection modal
  const [selectedRejectOrder, setSelectedRejectOrder] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [verifyingAction, setVerifyingAction] = useState<string | null>(null);

  // Copied helper
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchVerificationOrders();
  }, [token]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/payment/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.warn('Failed to fetch payment settings:', err);
    }
  };

  const fetchVerificationOrders = async () => {
    if (!token) return;
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.warn('Failed to fetch admin orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (isModerator) {
      alert('Access Denied: Least-privilege policy restricts payment settings modification to Administrators.');
      return;
    }
    setSavingSettings(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/admin/payment/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('Failed to update payment settings.');
      }
    } catch {
      alert('Network error while saving settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleVerifyPayment = async (orderId: string, action: 'approve' | 'reject', reason?: string) => {
    if (!token) return;
    setVerifyingAction(orderId);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/verify-payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          notes: action === 'approve' ? 'Payment confirmed by Administrator.' : reason,
          reason,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || `Payment ${action}d successfully!`);
        setSelectedRejectOrder(null);
        setRejectReason('');
        fetchVerificationOrders();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || `Failed to ${action} payment.`);
      }
    } catch {
      alert(`Network error while trying to ${action} payment.`);
    } finally {
      setVerifyingAction(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(id);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    return o.payment_status === statusFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* SECTION 1: MANUAL PAYMENT CONFIGURATION */}
      <div className="p-6 rounded-3xl bg-[#0e0e1a] border border-amber-500/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                Manual UPI QR &amp; Banking Configuration
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Customer-facing UPI VPA, QR generator, instructions &amp; support channels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">Status:</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
              LIVE GATEWAY DEFAULT
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase mb-1">
                Official Business UPI ID (VPA) *
              </label>
              <input
                type="text"
                required
                value={settings.upi_id}
                onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                placeholder="thevibofficial@okhdfcbank"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase mb-1">
                Payee / Business Display Name *
              </label>
              <input
                type="text"
                required
                value={settings.payee_name}
                onChange={(e) => setSettings({ ...settings, payee_name: e.target.value })}
                placeholder="VIB Digital Services"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-sm focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase mb-1">
                Support Phone / WhatsApp Contact
              </label>
              <input
                type="text"
                value={settings.support_phone || ''}
                onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                placeholder="+91 9181801766"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase mb-1">
                Custom Static QR Code Image URL (Optional)
              </label>
              <input
                type="url"
                value={settings.qr_image_url || ''}
                onChange={(e) => setSettings({ ...settings, qr_image_url: e.target.value })}
                placeholder="https://... (leave empty to use auto-generated UPI QR)"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-gray-300 uppercase mb-1">
                Payment Instructions for Customer
              </label>
              <textarea
                rows={4}
                value={settings.instructions || ''}
                onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
                placeholder="Scan QR with any UPI app and enter 12-digit UTR..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* QR Code Live Preview */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl shrink-0">
                <img
                  src={
                    settings.qr_image_url ||
                    `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.payee_name)}`
                    )}`
                  }
                  alt="QR Preview"
                  className="w-20 h-20 object-contain"
                />
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-white font-rajdhani text-sm">Customer QR Preview</div>
                <div className="text-gray-400 font-mono">{settings.upi_id || 'No UPI ID set'}</div>
                <div className="text-emerald-400 font-mono">Dynamic UPI intent enabled</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {isModerator ? (
                <div className="text-xs text-amber-400 font-mono bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                  Payment QR &amp; UPI configuration is view-only for Moderators.
                </div>
              ) : (
                <>
                  {saveSuccess && (
                    <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Settings Updated!</span>
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold font-rajdhani uppercase text-sm text-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-600/30 disabled:opacity-50"
                  >
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Payment Settings</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* SECTION 2: PAYMENT VERIFICATION QUEUE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-purple-400" />
              <span>Customer Payment Verification Desk ({filteredOrders.length})</span>
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Review submitted bank UTRs and approve orders to trigger automated VP code issuance
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter buttons */}
            {(['SUBMITTED_FOR_VERIFICATION', 'AWAITING_PAYMENT', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'all'] as const).map(
              (filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setStatusFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer ${
                    statusFilter === filterKey
                      ? 'bg-purple-600 text-white font-bold shadow'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {filterKey.replace(/_/g, ' ')}
                </button>
              )
            )}

            <button
              type="button"
              onClick={fetchVerificationOrders}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Verification Orders Table */}
        <div className="rounded-2xl bg-[#0c0d1c] border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-mono uppercase text-[11px]">
                  <th className="p-3.5">Order ID</th>
                  <th className="p-3.5">Customer &amp; Pack</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5">Bank UTR / Evidence</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 font-mono">
                      No orders found matching the filter "{statusFilter}".
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    let parsedDetails: any = {};
                    try {
                      parsedDetails = ord.details_json ? JSON.parse(ord.details_json) : {};
                    } catch {}

                    const isSubmitted = ord.payment_status === 'SUBMITTED_FOR_VERIFICATION';
                    const isVerified = ord.payment_status === 'PAYMENT_VERIFIED';
                    const isRejected = ord.payment_status === 'PAYMENT_REJECTED';

                    return (
                      <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Order ID */}
                        <td className="p-3.5 font-mono text-purple-300 font-bold">
                          #{ord.id}
                          <div className="text-[10px] text-gray-500 font-mono">
                            {new Date(ord.created_at).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Customer & Item */}
                        <td className="p-3.5">
                          <div className="font-bold text-white font-rajdhani text-sm">{ord.title}</div>
                          <div className="text-gray-400 font-mono text-[11px]">
                            {parsedDetails.riotId ? `Riot: ${parsedDetails.riotId}` : `User: ${ord.user_id}`}
                          </div>
                          {parsedDetails.email && (
                            <div className="text-gray-500 text-[10px]">{parsedDetails.email}</div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="p-3.5">
                          <span className="font-bold text-emerald-400 text-sm font-rajdhani">
                            ₹{ord.amount?.toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Payment Method */}
                        <td className="p-3.5 font-mono text-gray-300">
                          {ord.payment_method || 'UPI'}
                        </td>

                        {/* Bank UTR / Evidence */}
                        <td className="p-3.5">
                          {ord.payment_evidence_ref ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                                {ord.payment_evidence_ref}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(ord.payment_evidence_ref, ord.id)}
                                className="p-1 hover:text-white text-gray-400 cursor-pointer"
                                title="Copy UTR"
                              >
                                {copiedUtr === ord.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-500 font-mono italic">Not submitted</span>
                          )}

                          {ord.payment_evidence_image && (
                            <a
                              href={ord.payment_evidence_image}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 mt-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View Receipt</span>
                            </a>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              isVerified
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : isSubmitted
                                ? 'bg-sky-950 text-sky-300 border border-sky-500/30 animate-pulse'
                                : isRejected
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {ord.payment_status || 'AWAITING_PAYMENT'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isVerified && (
                              <button
                                type="button"
                                disabled={verifyingAction === ord.id}
                                onClick={() => handleVerifyPayment(ord.id, 'approve')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-rajdhani uppercase text-xs transition-all flex items-center gap-1 cursor-pointer shadow-md disabled:opacity-50"
                              >
                                {verifyingAction === ord.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Approve</span>
                              </button>
                            )}

                            {!isRejected && (
                              <button
                                type="button"
                                disabled={verifyingAction === ord.id}
                                onClick={() => {
                                  setSelectedRejectOrder(ord);
                                  setRejectReason('UTR reference was not found in corporate bank statement.');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold font-rajdhani uppercase text-xs transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* REJECTION REASON MODAL */}
      {selectedRejectOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-[#0e0e1a] border border-rose-500/40 p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-2 text-rose-400 font-bold font-rajdhani text-lg uppercase">
              <AlertCircle className="w-5 h-5" />
              <span>Reject Payment Verification</span>
            </div>

            <p className="text-xs text-gray-300">
              Rejecting payment for Order <strong>#{selectedRejectOrder.id}</strong> will notify the customer via email and dashboard notification.
            </p>

            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                Reason for Rejection *
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Transaction reference not found in bank ledger."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRejectOrder(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim()}
                onClick={() => handleVerifyPayment(selectedRejectOrder.id, 'reject', rejectReason.trim())}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-rajdhani uppercase cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
