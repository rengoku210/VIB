import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  CalendarClock,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldCheck,
  Eye,
  Download,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type EmiStatus = 'pending_approval' | 'active' | 'completed' | 'rejected' | 'cancelled';
type PaymentStatus = 'pending' | 'late' | 'paid' | 'pending_verification';

interface EmiApplication {
  id: string;
  productTitle: string;
  totalAmount: number;
  initialPayment: number;
  amountFinanced: number;
  tenureMonths: number;
  interestRatePct: number;
  emiAmount: number;
  status: EmiStatus;
  rejectionReason: string | null;
  nextDueDate: string | null;
  installmentsPaid: number;
  totalInstallments: number;
  outstandingBalance: number;
  createdAt: string;
  startDate: string | null;
  serviceType?: 'vp' | 'account';
  region?: string | null;
  paymentFrequency?: 'weekly' | 'monthly';
  totalPayable?: number;
  agreementRef?: string | null;
  agreementHtml?: string | null;
  customerDetails?: any;
}

interface EmiPayment {
  id: string;
  installmentNo: number;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  paidAt: string | null;
  utr: string | null;
  paymentMethod: string | null;
}

interface EmiDetail {
  application: EmiApplication;
  payments: EmiPayment[];
}

const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

const readFileAsDataUrl = (file: File, onProgress: (pct: number) => void): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

const formatInr = (n: number): string =>
  Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const formatDate = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD';

/* ------------------------------------------------------------------ */
/* Status chips                                                        */
/* ------------------------------------------------------------------ */

const emiStatusChip = (status: EmiStatus) => {
  const base = 'px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ';
  switch (status) {
    case 'active':
      return `${base}bg-emerald-950 text-emerald-300 border-emerald-500/40`;
    case 'completed':
      return `${base}bg-sky-950 text-sky-300 border-sky-500/40`;
    case 'pending_approval':
      return `${base}bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse`;
    case 'rejected':
      return `${base}bg-rose-950 text-rose-300 border-rose-500/40`;
    case 'cancelled':
      return `${base}bg-white/10 text-gray-400 border-white/20`;
    default:
      return `${base}bg-white/10 text-gray-400 border-white/20`;
  }
};

const paymentStatusChip = (status: PaymentStatus) => {
  const base = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ';
  switch (status) {
    case 'paid':
      return `${base}bg-emerald-950 text-emerald-300 border-emerald-500/40`;
    case 'late':
      return `${base}bg-rose-950 text-rose-300 border-rose-500/40`;
    case 'pending_verification':
      return `${base}bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse`;
    default:
      return `${base}bg-white/10 text-gray-400 border-white/20`;
  }
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface EmiSectionProps {
  onBrowsePlans?: () => void;
}

const EmiSection: React.FC<EmiSectionProps> = ({ onBrowsePlans }) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('vib_auth_token') : null;

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<EmiApplication[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  // Detail expansion
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<EmiDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  // Last successful payment confirmation persists across detail refetches so the
  // user still sees feedback after fetchDetail() refreshes the schedule.
  const [lastPayFeedback, setLastPayFeedback] = useState<string | null>(null);

  // Pay modal
  const [payTarget, setPayTarget] = useState<{ application: EmiApplication; payment: EmiPayment } | null>(null);
  const [utr, setUtr] = useState('');
  const [evidence, setEvidence] = useState<{ dataUrl: string; file: File; progress: number } | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const evidenceInputRef = useRef<HTMLInputElement>(null);

  /* ------------------------- data fetching ------------------------- */

  const fetchApplications = async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch('/api/user/emi', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setListError(err?.error || 'Failed to load EMI plans.');
        return;
      }
      const data = await res.json();
      setApplications(data.applications || []);
    } catch {
      setListError('Network error while loading EMI plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchDetail = async (appId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/user/emi/${encodeURIComponent(appId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setDetailError(err?.error || 'Failed to load plan details.');
        return;
      }
      const data = await res.json();
      setDetail({ application: data.application, payments: data.payments || [] });
    } catch {
      setDetailError('Network error while loading plan details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleExpand = (appId: string) => {
    if (expandedId === appId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(appId);
    fetchDetail(appId);
  };

  /* --------------------------- payment modal ------------------------ */

  const openPayModal = (application: EmiApplication, payment: EmiPayment) => {
    setPayTarget({ application, payment });
    setUtr('');
    setEvidence(null);
    setPayError(null);
    // A fresh payment attempt supersedes any previous confirmation.
    setLastPayFeedback(null);
  };

  const handleEvidenceSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPayError(null);

    if (!file.type.startsWith('image/')) {
      setPayError('Payment evidence must be an image (screenshot of UPI payment).');
      return;
    }
    if (file.size > MAX_EVIDENCE_BYTES) {
      setPayError('Payment evidence exceeds the 5MB limit.');
      return;
    }

    setEvidence({ dataUrl: '', file, progress: 0 });
    readFileAsDataUrl(file, (pct) => {
      setEvidence((prev) => (prev && prev.file === file ? { ...prev, progress: pct } : prev));
    })
      .then((dataUrl) => {
        setEvidence((prev) => (prev && prev.file === file ? { ...prev, dataUrl, progress: 100 } : prev));
      })
      .catch(() => {
        setPayError('Failed to read the evidence image.');
        setEvidence(null);
      });
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    setPayError(null);

    const utrValue = utr.trim();
    if (!/^\d{12}$/.test(utrValue)) {
      setPayError('UTR must be exactly 12 digits.');
      return;
    }
    if (!evidence?.dataUrl) {
      setPayError('Please attach a screenshot as payment evidence.');
      return;
    }

    setPaying(true);
    try {
      const res = await fetch(`/api/emi/${encodeURIComponent(payTarget.application.id)}/pay-installment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          installmentId: payTarget.payment.id,
          utr: utrValue,
          evidenceImage: evidence.dataUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayError(data.error || `Payment submission failed (HTTP ${res.status}).`);
        return;
      }

      setPayTarget(null);
      setLastPayFeedback(`Payment for installment #${payTarget.payment.installmentNo} submitted. Staff will verify your UTR.`);
      if (expandedId) fetchDetail(expandedId);
      fetchApplications();
      window.setTimeout(() => setLastPayFeedback(null), 5000);
    } catch {
      setPayError('Network error while submitting payment.');
    } finally {
      setPaying(false);
    }
  };

  /* ------------------------------ render --------------------------- */

  const renderPlanCard = (app: EmiApplication) => {
    const isExpanded = expandedId === app.id;
    const progressPct =
      app.totalInstallments > 0
        ? Math.min(100, Math.round(((app.installmentsPaid || 0) / app.totalInstallments) * 100))
        : 0;

    return (
      <div key={app.id} className="rounded-2xl bg-[#0c0d1c] border border-white/10 overflow-hidden">
        <div className="p-5 space-y-4">
          {/* Completed banner */}
          {app.status === 'completed' && (
            <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center gap-2.5 text-emerald-200 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-bold font-rajdhani uppercase tracking-wider">Plan completed</span>
            </div>
          )}

          {/* Rejected note */}
          {app.status === 'rejected' && app.rejectionReason && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 flex items-start gap-2.5 text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="font-mono">{app.rejectionReason}</span>
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white font-rajdhani text-base">{app.productTitle}</span>
                  {app.serviceType && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-purple-950/70 text-purple-300 border border-purple-500/40">
                      {app.serviceType === 'vp' ? 'VP Plan' : 'Profile Plan'}
                    </span>
                  )}
                  {app.paymentFrequency && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-950/70 text-amber-300 border border-amber-500/40">
                      {app.paymentFrequency}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                  {app.id} • Started {formatDate(app.startDate || app.createdAt)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className={emiStatusChip(app.status)}>{app.status.replace(/_/g, ' ')}</span>
              <div className="text-lg font-black font-rajdhani text-fuchsia-300">
                ₹{formatInr(app.emiAmount)}
                <span className="text-[10px] text-gray-500 font-mono ml-1 uppercase">
                  {app.paymentFrequency === 'weekly' ? '/wk' : '/mo'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleExpand(app.id)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold font-rajdhani uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>{isExpanded ? 'Hide Plan' : 'View Plan'}</span>
              </button>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] font-mono uppercase text-gray-500">Schedule</div>
              <div className="text-sm font-bold text-white mt-1">
                {app.totalInstallments || app.tenureMonths}{' '}
                {app.paymentFrequency === 'weekly' ? 'weeks' : 'months'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] font-mono uppercase text-gray-500">Payments Received</div>
              <div className="text-sm font-bold text-emerald-300 mt-1">
                {app.installmentsPaid || 0} / {app.totalInstallments || app.tenureMonths}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] font-mono uppercase text-gray-500">Outstanding</div>
              <div className="text-sm font-bold text-amber-300 mt-1">₹{formatInr(app.outstandingBalance)}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] font-mono uppercase text-gray-500">Next Due</div>
              <div className="text-sm font-bold text-white mt-1">
                {app.nextDueDate ? formatDate(app.nextDueDate) : '—'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 col-span-2 md:col-span-1">
              <div className="text-[10px] font-mono uppercase text-gray-500">Verification / Status</div>
              <div className="text-xs font-bold text-purple-300 mt-1 uppercase">
                {app.status === 'pending_approval'
                  ? 'Awaiting KYC Review'
                  : app.status === 'active'
                    ? 'Verified & Active'
                    : app.status.replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5">
              <span>Repayment Progress</span>
              <span>
                <strong className="text-white">{app.installmentsPaid}</strong> / {app.totalInstallments} installments
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  app.status === 'completed' ? 'bg-sky-500' : 'bg-gradient-to-r from-purple-600 to-fuchsia-500'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="border-t border-white/10 bg-black/20 p-5 space-y-4">
            {detailLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                <span className="text-xs font-mono uppercase tracking-wider">Loading schedule…</span>
              </div>
            ) : detailError ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{detailError}</span>
              </div>
            ) : detail ? (
              <>
                {lastPayFeedback && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{lastPayFeedback}</span>
                  </div>
                )}

                {/* Agreement Download & Legal Reference */}
                {(app.agreementHtml || app.agreementRef) && (
                  <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
                      <div>
                        <div className="font-bold text-white text-xs font-mono">
                          Agreement: {app.agreementRef || 'VIB-FPP-2026'}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          Official electronic contract binding this payment plan
                        </div>
                      </div>
                    </div>
                    {app.agreementHtml && (
                      <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const w = window.open('', '_blank');
                            if (w) {
                              w.document.write(app.agreementHtml!);
                              w.document.close();
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold font-rajdhani uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Agreement</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob([app.agreementHtml!], { type: 'text/html;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${app.agreementRef || app.id}-Agreement.html`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-rajdhani uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Agreement</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {detail.payments.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-500">
                    No installments generated yet. The schedule is created once the plan is approved.
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-white/5 text-gray-400 uppercase tracking-wider border-b border-white/10 font-rajdhani font-bold">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Due Date</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Paid At</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(() => {
                            const payableId = detail.payments.find(
                              (p) => p.status === 'pending' || p.status === 'late',
                            )?.id;
                            return detail.payments.map((pay) => {
                            const isLate = pay.status === 'late';
                            const isPayable = pay.id === payableId;
                            return (
                              <tr key={pay.id} className="hover:bg-white/[0.02]">
                                <td className="p-3 font-bold text-white">
                                  {pay.installmentNo}
                                </td>
                                <td className={`p-3 ${isLate ? 'text-rose-300 font-bold' : 'text-gray-300'}`}>
                                  {formatDate(pay.dueDate)}
                                  {isLate && (
                                    <span className="ml-1.5 text-[9px] uppercase text-rose-400 font-bold">Late</span>
                                  )}
                                </td>
                                <td className="p-3 font-bold text-fuchsia-300">
                                  ₹{formatInr(pay.amount)}
                                </td>
                                <td className="p-3">
                                  <span className={paymentStatusChip(pay.status)}>
                                    {pay.status.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="p-3 text-gray-400">
                                  {pay.paidAt ? formatDate(pay.paidAt) : '—'}
                                </td>
                                <td className="p-3 text-right">
                                  {isPayable ? (
                                    <button
                                      type="button"
                                      onClick={() => openPayModal(detail.application, pay)}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-rajdhani uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
                                    >
                                      <IndianRupee className="w-3.5 h-3.5" />
                                      <span>Pay</span>
                                    </button>
                                  ) : (
                                    <span className="text-gray-600 text-[11px]">—</span>
                                  )}
                                </td>
                               </tr>
                             );
                          });
                          })()}
                         </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#120d26] via-[#0d091e] to-[#070510] border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              Flexible Payment Plans Workspace
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Track your applications, KYC status, installment schedules, and signed agreements
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onBrowsePlans && (
            <button
              type="button"
              onClick={onBrowsePlans}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-rajdhani uppercase text-xs tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-900/40"
            >
              Browse Flexible Plans
            </button>
          )}
          <button
            type="button"
            onClick={fetchApplications}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Refresh Flexible Payment Plans"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* My Flexible Payment Plans */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-400" />
            <span>My EMI Plans ({applications.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="p-12 rounded-2xl bg-[#0c0d1c] border border-white/10 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-xs font-mono uppercase tracking-wider">Loading EMI plans…</p>
          </div>
        ) : listError ? (
          <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{listError}</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#0c0d1c] border border-white/10 text-gray-400 space-y-3">
            <CreditCard className="w-12 h-12 mx-auto text-gray-600" />
            <p className="text-sm font-semibold text-white font-rajdhani uppercase">No EMI plans yet</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Apply for EMI above to split your purchase into manageable monthly installments.
            </p>
          </div>
        ) : (
          <div className="space-y-4">{applications.map((app) => renderPlanCard(app))}</div>
        )}
      </div>

      {/* Pay modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-[#0c0d1c] border border-emerald-500/30 p-6 space-y-4 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-emerald-300 font-bold font-rajdhani text-lg uppercase">
                <IndianRupee className="w-5 h-5 text-emerald-400" />
                <span>Pay Installment #{payTarget.payment.installmentNo}</span>
              </div>
              <button
                type="button"
                onClick={() => setPayTarget(null)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className={`p-3.5 rounded-xl border ${
                payTarget.payment.status === 'late'
                  ? 'bg-rose-950/40 border-rose-500/40'
                  : 'bg-white/5 border-white/10'
              }`}>
                <div className="text-[10px] font-mono uppercase text-gray-500">Amount</div>
                <div className={`text-xl font-black font-rajdhani mt-1 ${
                  payTarget.payment.status === 'late' ? 'text-rose-300' : 'text-emerald-300'
                }`}>
                  ₹{formatInr(payTarget.payment.amount)}
                </div>
              </div>
              <div className={`p-3.5 rounded-xl border ${
                payTarget.payment.status === 'late'
                  ? 'bg-rose-950/40 border-rose-500/40'
                  : 'bg-white/5 border-white/10'
              }`}>
                <div className="text-[10px] font-mono uppercase text-gray-500">Due Date</div>
                <div className={`text-lg font-black font-rajdhani mt-1 ${
                  payTarget.payment.status === 'late' ? 'text-rose-300' : 'text-white'
                }`}>
                  {formatDate(payTarget.payment.dueDate)}
                </div>
                {payTarget.payment.status === 'late' && (
                  <div className="text-[10px] uppercase font-bold text-rose-400 mt-1 tracking-wider">
                    Overdue — pay now
                  </div>
                )}
              </div>
            </div>

            {payError && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">
                  UTR Reference (12 digits) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 402137896541"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm tracking-widest font-mono focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">
                  Payment Screenshot *
                </label>
                <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-950/20 p-4">
                  {evidence ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                          {evidence.dataUrl ? (
                            <img src={evidence.dataUrl} alt="Payment evidence" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-xs text-white font-mono truncate">{evidence.file.name}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${evidence.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-emerald-300 font-mono w-9 text-right">
                              {evidence.progress}%
                            </span>
                          </div>
                          {evidence.dataUrl && (
                            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Ready • {(evidence.file.size / 1024 / 1024).toFixed(2)}MB</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEvidence(null)}
                          className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-300 cursor-pointer transition-all shrink-0"
                          aria-label="Remove evidence"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => evidenceInputRef.current?.click()}
                      className="w-full py-6 flex flex-col items-center gap-2 text-emerald-300/80 hover:text-emerald-200 transition-colors cursor-pointer"
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-xs font-mono uppercase tracking-wider">Upload UPI Screenshot</span>
                      <span className="text-[10px] text-gray-500">image only • max 5MB</span>
                    </button>
                  )}
                  <input
                    ref={evidenceInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleEvidenceSelected}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPayTarget(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-rajdhani uppercase cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 disabled:opacity-50"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting…</span>
                    </>
                  ) : (
                    <>
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Submit Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmiSection;
