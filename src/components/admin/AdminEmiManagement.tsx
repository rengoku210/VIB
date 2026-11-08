import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Eye,
  Users,
  IndianRupee,
  Loader2,
  AlertTriangle,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type TabFilter = 'all' | 'pending_approval' | 'active' | 'completed' | 'rejected';

type ApplicationStatus = 'pending_approval' | 'active' | 'completed' | 'rejected' | 'cancelled';

type PaymentStatus = 'pending' | 'pending_verification' | 'paid' | 'late';

/** Row shape returned by GET /api/admin/emi/list (camelCase). */
interface AdminEmiRow {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_phone: string;
  product_title: string;
  total_amount: number;
  initial_payment: number;
  amount_financed: number;
  tenure_months: number;
  interest_rate_pct: number;
  emi_amount: number;
  total_installments: number;
  installments_paid: number;
  status: ApplicationStatus;
  rejection_reason: string | null;
  created_at: string;
  next_due_date: string | null;
  outstanding: number | null;
}

/**
 * Application shape returned by GET /api/admin/emi/:id — the API serves the
 * raw DB row (snake_case). We accept both casing defensively.
 */
interface AdminEmiApplication {
  id: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  user_phone?: string;
  product_title: string;
  total_amount?: number;
  initial_payment?: number;
  amount_financed?: number;
  tenure_months?: number;
  interest_rate_pct?: number;
  emi_amount?: number;
  total_installments?: number;
  installments_paid?: number;
  status?: ApplicationStatus;
  rejection_reason?: string | null;
  created_at?: string;
  next_due_date?: string | null;
  start_date?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  [key: string]: unknown;
}

/** Installment row shape from GET /api/admin/emi/:id (raw DB row). */
interface AdminEmiPayment {
  id: string;
  application_id?: string;
  installment_no: number;
  amount: number;
  due_date: string;
  paid_at?: string | null;
  payment_method?: string | null;
  utr?: string | null;
  evidence_image?: string | null;
  status: PaymentStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatINR = (value: number | null | undefined): string =>
  `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatDate = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const applicationStatusChip = (status: string) => {
  const base = 'px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ';
  switch (status) {
    case 'active':
      return `${base}bg-emerald-950 text-emerald-300 border-emerald-500/40`;
    case 'completed':
      return `${base}bg-sky-950 text-sky-300 border-sky-500/40`;
    case 'rejected':
      return `${base}bg-rose-950 text-rose-300 border-rose-500/40`;
    case 'cancelled':
      return `${base}bg-white/10 text-gray-400 border-white/20`;
    case 'pending_approval':
      return `${base}bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse`;
    default:
      return `${base}bg-white/10 text-gray-400 border-white/20`;
  }
};

const paymentStatusChip = (status: string) => {
  const base = 'px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ';
  switch (status) {
    case 'paid':
      return `${base}bg-emerald-950 text-emerald-300 border-emerald-500/40`;
    case 'pending_verification':
      return `${base}bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse`;
    case 'late':
      return `${base}bg-rose-950 text-rose-300 border-rose-500/40`;
    case 'pending':
      return `${base}bg-white/10 text-gray-400 border-white/20`;
    default:
      return `${base}bg-white/10 text-gray-400 border-white/20`;
  }
};

/** Read a snake_case or camelCase field from a row. */
const pick = <T,>(row: Record<string, unknown>, snake: string, camel: string): T | undefined =>
  (row[snake] as T | undefined) ?? (row[camel] as T | undefined);

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const AdminEmiManagement: React.FC = () => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('vib_auth_token') : null;

  const [rows, setRows] = useState<AdminEmiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  // Detail modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminEmiApplication | null>(null);
  const [payments, setPayments] = useState<AdminEmiPayment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Application review actions
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Payment verification actions (per installment)
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);
  const [paymentReason, setPaymentReason] = useState('');
  const [paymentBusyId, setPaymentBusyId] = useState<string | null>(null);
  const [paymentActionError, setPaymentActionError] = useState<string | null>(null);

  // Evidence zoom lightbox
  const [zoomEvidence, setZoomEvidence] = useState<string | null>(null);

  /* ------------------------- data fetching ------------------------- */

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const statusParam = activeTab === 'all' ? '' : activeTab;
      const res = await fetch(`/api/admin/emi/list${statusParam ? `?status=${encodeURIComponent(statusParam)}` : ''}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setLoadError(err?.error || `Failed to load EMI applications (HTTP ${res.status}).`);
        return;
      }
      const data = await res.json();
      setRows(data.applications || []);
    } catch {
      setLoadError('Network error while loading EMI applications.');
    } finally {
      setLoading(false);
    }
  }, [token, activeTab]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setPayments([]);
    setDetailError(null);
    setRejectMode(false);
    setRejectReason('');
    setActionError(null);
    setRejectPaymentId(null);
    setPaymentReason('');
    setPaymentActionError(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/emi/${encodeURIComponent(id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setDetailError(err?.error || 'Failed to load EMI application details.');
        return;
      }
      const data = await res.json();
      setDetail(data.application || null);
      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch {
      setDetailError('Network error while loading EMI application details.');
    } finally {
      setDetailLoading(false);
    }
  };

  /* ----------------------- application actions ---------------------- */

  const handleApplicationAction = async (status: 'active' | 'rejected' | 'cancelled') => {
    if (!detail) return;
    setActionError(null);
    setActionSuccess(null);

    if (status === 'rejected') {
      const reason = rejectReason.trim();
      if (reason.length < 5) {
        setActionError('A rejection reason of at least 5 characters is required.');
        return;
      }
    }

    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/emi/${encodeURIComponent(detail.id)}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status,
          reason: status === 'rejected' ? rejectReason.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || `Failed to ${status} application (HTTP ${res.status}).`);
        return;
      }

      setActionSuccess(status === 'active' ? 'EMI application approved and schedule generated.' : status === 'rejected' ? 'EMI application rejected.' : 'EMI application cancelled.');
      await fetchApplications();
      await openDetail(detail.id);
      window.setTimeout(() => setActionSuccess(null), 5000);
    } catch {
      setActionError('Network error while updating application status.');
    } finally {
      setActionBusy(false);
    }
  };

  /* ------------------------ payment verification -------------------- */

  const handlePaymentVerify = async (paymentId: string, approved: boolean) => {
    setPaymentActionError(null);
    setPaymentBusyId(paymentId);
    try {
      const body: { approved: boolean; reason?: string } = { approved };
      if (!approved && paymentReason.trim()) {
        body.reason = paymentReason.trim();
      }
      const res = await fetch(`/api/admin/emi/payments/${encodeURIComponent(paymentId)}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPaymentActionError(data.error || `Failed to verify installment (HTTP ${res.status}).`);
        return;
      }

      // Refresh the detail so installments reflect the new state.
      await openDetail(selectedId || '');
      await fetchApplications();
      setRejectPaymentId(null);
      setPaymentReason('');
    } catch {
      setPaymentActionError('Network error while verifying installment.');
    } finally {
      setPaymentBusyId(null);
    }
  };

  /* ----------------------------- render ---------------------------- */

  const counts = {
    all: rows.length,
    pending_approval: rows.filter((r) => r.status === 'pending_approval').length,
    active: rows.filter((r) => r.status === 'active').length,
    completed: rows.filter((r) => r.status === 'completed').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
  };

  const visibleRows = activeTab === 'all' ? rows : rows.filter((r) => r.status === activeTab);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending_approval', label: 'Pending Approval' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const renderEvidenceThumb = (payment: AdminEmiPayment) => {
    const evidence = pick<string>(payment as unknown as Record<string, unknown>, 'evidence_image', 'evidenceImage');
    if (!evidence) {
      return (
        <div className="h-14 w-20 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-600">
          <XCircle className="w-4 h-4" />
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setZoomEvidence(evidence)}
        className="relative h-14 w-20 rounded-lg overflow-hidden border border-white/15 cursor-pointer group bg-black/40 shrink-0"
        title="Click to zoom evidence image"
      >
        <img
          src={evidence}
          alt={`Installment evidence ${payment.installment_no}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
          <Eye className="w-3.5 h-3.5" />
        </div>
      </button>
    );
  };

  const renderPaymentRow = (payment: AdminEmiPayment) => {
    const utr = pick<string>(payment as unknown as Record<string, unknown>, 'utr', 'utr');
    const evidence = pick<string>(payment as unknown as Record<string, unknown>, 'evidence_image', 'evidenceImage');
    const isVerifying = paymentBusyId === payment.id;

    return (
      <div
        key={payment.id}
        className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-1 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold shrink-0">
              #{payment.installment_no}
            </span>
            <span className="text-[11px] font-mono text-gray-400 truncate">
              Due {formatDate(payment.due_date)}
            </span>
          </div>
          <span className="font-bold text-white font-rajdhani text-sm ml-auto">{formatINR(payment.amount)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={paymentStatusChip(payment.status)}>{payment.status}</span>
          {utr && (
            <span className="text-[10px] font-mono text-gray-400 truncate max-w-[200px]" title={utr}>
              UTR: <strong className="text-white">{utr}</strong>
            </span>
          )}
          {payment.paid_at && (
            <span className="text-[10px] font-mono text-gray-500">
              Paid {formatDate(payment.paid_at)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {renderEvidenceThumb(payment)}
          <div className="flex-1 min-w-0 space-y-1">
            {evidence && (
              <a
                href={evidence}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-amber-300 hover:text-amber-200 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open evidence</span>
              </a>
            )}
            {payment.payment_method && (
              <div className="text-[10px] font-mono text-gray-500">
                Method: <span className="text-gray-300">{payment.payment_method}</span>
              </div>
            )}
            {payment.status === 'pending_verification' && (
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  disabled={Boolean(paymentBusyId)}
                  onClick={() => handlePaymentVerify(payment.id, true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold font-rajdhani uppercase flex items-center gap-1 cursor-pointer transition-all"
                >
                  {isVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  <span>Verify</span>
                </button>
                {rejectPaymentId === payment.id ? (
                  <button
                    type="button"
                    disabled={Boolean(paymentBusyId)}
                    onClick={() => handlePaymentVerify(payment.id, false)}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[10px] font-bold font-rajdhani uppercase flex items-center gap-1 cursor-pointer transition-all"
                  >
                    {isVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                    <span>Confirm Reject</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(paymentBusyId)}
                    onClick={() => {
                      setRejectPaymentId(payment.id);
                      setPaymentReason('');
                      setPaymentActionError(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold font-rajdhani uppercase flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-3 h-3" />
                    <span>Reject</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {rejectPaymentId === payment.id && (
          <div className="flex gap-2 items-start pt-1">
            <textarea
              rows={2}
              value={paymentReason}
              onChange={(e) => setPaymentReason(e.target.value)}
              placeholder="Reason for rejecting this proof (optional)"
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-[11px] focus:ring-2 focus:ring-rose-400 outline-none resize-none placeholder-gray-500"
            />
            <button
              type="button"
              onClick={() => {
                setRejectPaymentId(null);
                setPaymentReason('');
                setPaymentActionError(null);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 text-[10px] font-bold font-rajdhani uppercase cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#1a1205] via-[#141006] to-[#0a0a14] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              EMI Management Console
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Review financing applications and verify installment payments
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchApplications}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
          title="Refresh applications"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter tabs with counts */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-400'
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 rounded-2xl bg-[#0c0d1c] border border-white/10 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-xs font-mono uppercase tracking-wider">Loading applications…</p>
        </div>
      ) : loadError ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0c0d1c] border border-white/10 text-gray-400 space-y-3">
          <CalendarClock className="w-12 h-12 mx-auto text-gray-600" />
          <p className="text-sm font-semibold text-white font-rajdhani uppercase">No applications</p>
          <p className="text-xs text-gray-500">
            {activeTab === 'all' ? 'No EMI applications exist yet.' : `No ${activeTab.replace('_', ' ')} EMI applications.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleRows.map((row) => {
            const progress = row.total_installments > 0 ? Math.min(100, Math.round((row.installments_paid / row.total_installments) * 100)) : 0;
            return (
              <div
                key={row.id}
                className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/10 hover:border-amber-500/30 transition-all space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-white font-rajdhani text-base truncate">
                      {row.product_title}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5 truncate">
                      <Users className="inline w-3 h-3 mr-1 -mt-0.5" />
                      {row.user_name || 'Customer'} {row.user_email ? `• ${row.user_email}` : ''}
                    </div>
                  </div>
                  <span className={applicationStatusChip(row.status)}>{row.status.replace('_', ' ')}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white/5 p-3 rounded-xl">
                  <div className="text-gray-500">
                    Financed: <strong className="text-amber-300">{formatINR(row.amount_financed)}</strong>
                  </div>
                  <div className="text-gray-500">
                    EMI: <strong className="text-white">{formatINR(row.emi_amount)}</strong>
                  </div>
                  <div className="text-gray-500">
                    Tenure: <strong className="text-white">{row.tenure_months} mo</strong>
                  </div>
                  <div className="text-gray-500">
                    Paid: <strong className="text-emerald-300">{row.installments_paid}/{row.total_installments}</strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
                    <span>Repayment Progress</span>
                    <span className="text-amber-300 font-bold">{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {row.rejection_reason && (
                  <div className="text-[11px] text-rose-300 font-mono bg-rose-950/40 border border-rose-500/30 rounded-lg p-2.5">
                    <span className="uppercase text-rose-400 font-bold">Rejected: </span>
                    {row.rejection_reason}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => openDetail(row.id)}
                  className="w-full px-4 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 text-amber-200 text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Review Application</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-2xl bg-[#0c0d1c] border border-amber-500/30 p-6 space-y-5 shadow-2xl text-white max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold font-rajdhani text-lg uppercase">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <span>EMI Application {detail ? `#${detail.id}` : ''}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action feedback stays above the detail panel so confirmations remain visible. */}
            {actionError && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            {actionSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}
            {paymentActionError && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{paymentActionError}</span>
              </div>
            )}

            {detailLoading ? (
              <div className="py-12 flex items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                <span className="text-xs font-mono uppercase tracking-wider">Loading details…</span>
              </div>
            ) : detailError ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{detailError}</span>
              </div>
            ) : detail ? (
              <>
                {/* Applicant + plan summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 sm:col-span-2">
                    <div className="text-[10px] font-mono uppercase text-gray-500">Applicant</div>
                    <div className="text-white font-bold text-base mt-1">{detail.user_name || 'Customer'}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                      {detail.user_email || '—'} {detail.user_phone ? `• ${detail.user_phone}` : ''}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] font-mono uppercase text-gray-500">Status</div>
                    <div className="mt-1.5">
                      <span className={applicationStatusChip(detail.status || '')}>{(detail.status || 'unknown').replace('_', ' ')}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1.5">
                      Applied {formatDate(detail.created_at)}
                    </div>
                  </div>
                </div>

                {/* Financial details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-[11px] font-mono">
                  <div className="p-3 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-gray-500 uppercase text-[9px] tracking-wider">Product</div>
                    <div className="text-white font-bold mt-1 truncate" title={detail.product_title}>{detail.product_title}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-gray-500 uppercase text-[9px] tracking-wider">Total</div>
                    <div className="text-amber-300 font-bold mt-1">{formatINR(detail.total_amount)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-gray-500 uppercase text-[9px] tracking-wider">Down Pmt</div>
                    <div className="text-white font-bold mt-1">{formatINR(detail.initial_payment)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-gray-500 uppercase text-[9px] tracking-wider">Financed</div>
                    <div className="text-white font-bold mt-1">{formatINR(detail.amount_financed)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-gray-500 uppercase text-[9px] tracking-wider">Rate</div>
                    <div className="text-white font-bold mt-1">{Number(detail.interest_rate_pct || 0).toFixed(1)}% p.a.</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-gray-500 uppercase text-[9px] tracking-wider">EMI / Tenure</div>
                    <div className="text-amber-300 font-bold mt-1">
                      {formatINR(detail.emi_amount)} <span className="text-gray-400 font-normal">× {detail.total_installments} mo</span>
                    </div>
                  </div>
                </div>

                {/* Installment schedule */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold font-rajdhani uppercase tracking-wider text-white mb-3">
                    <CalendarClock className="w-4 h-4 text-amber-400" />
                    <span>Installment Schedule ({payments.length})</span>
                  </div>
                  {payments.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-gray-500">
                      {detail.status === 'pending_approval'
                        ? 'The installment schedule is generated once the application is approved.'
                        : 'No installments exist for this application.'}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {payments.map((payment) => renderPaymentRow(payment))}
                    </div>
                  )}
                </div>

                {/* Reject application reason area */}
                {rejectMode ? (
                  <div className="space-y-2.5 p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
                    <label className="block text-xs font-mono text-rose-300 uppercase tracking-wider">
                      Reason for Rejection * (min 5 characters)
                    </label>
                    <textarea
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Insufficient income proof; please provide salary slips."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:ring-2 focus:ring-rose-400 outline-none resize-none"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectMode(false);
                          setRejectReason('');
                          setActionError(null);
                        }}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => handleApplicationAction('rejected')}
                        className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-rajdhani uppercase cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {actionBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Confirm Rejection</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2 pt-1 border-t border-white/10">
                    {detail.status === 'pending_approval' && (
                      <>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => {
                            setRejectMode(true);
                            setActionError(null);
                            setActionSuccess(null);
                          }}
                          className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold font-rajdhani uppercase cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => handleApplicationAction('active')}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-rajdhani uppercase cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 disabled:opacity-50"
                        >
                          {actionBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Approve Plan</span>
                        </button>
                      </>
                    )}
                    {detail.status === 'active' && (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => handleApplicationAction('cancelled')}
                        className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold font-rajdhani uppercase cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {actionBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Cancel Plan</span>
                      </button>
                    )}
                    {detail.status !== 'pending_approval' && detail.status !== 'active' && (
                      <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-gray-500" />
                        <span>
                          Reviewed {formatDate(detail.reviewed_at)}
                          {detail.rejection_reason ? ` • ${detail.rejection_reason}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Evidence zoom lightbox */}
      {zoomEvidence && (
        <div
          onClick={() => setZoomEvidence(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[88vh] bg-[#0c0d1c] border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col cursor-default"
          >
            <div className="flex items-center justify-between p-3.5 border-b border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-gray-200">EMI Payment Evidence</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={zoomEvidence}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black text-xs font-rajdhani font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Image</span>
                </a>
                <button
                  type="button"
                  onClick={() => setZoomEvidence(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                  aria-label="Close Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[75vh] overflow-auto flex items-center justify-center bg-black/50">
              <img
                src={zoomEvidence}
                alt="EMI Payment Evidence Zoom"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl mx-auto shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmiManagement;
