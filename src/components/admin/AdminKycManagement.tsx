import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Eye,
  CheckCircle2,
  XCircle,
  Users,
  FileText,
  Loader2,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type TabFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface AdminKycRow {
  id: string;
  user_id: string;
  full_name: string;
  id_type: string;
  id_number: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  user_email: string;
  user_name: string;
  user_phone: string;
  documents_count: number;
  rejection_reason: string | null;
}

interface AdminKycDoc {
  label: string;
  filename: string;
}

interface AdminKycDetail {
  id: string;
  user_id: string;
  full_name: string;
  dob: string | null;
  address: string | null;
  id_type: string;
  id_number: string;
  status: string;
  rejection_reason: string | null;
  admin_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  documents: AdminKycDoc[];
  user_email: string;
  user_name: string;
  user_phone: string;
}

/* ------------------------------------------------------------------ */
/* Secure document URL hook                                            */
/* ------------------------------------------------------------------ */

function useSecureDocUrl(filename: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const token = localStorage.getItem('vib_auth_token');

    setLoading(true);
    setError(null);
    setUrl(null);

    fetch(`/api/admin/kyc/docs/${encodeURIComponent(filename)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load document');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filename]);

  return { url, loading, error };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatDate = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusChip = (status: string) => {
  const base = 'px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ';
  switch (status) {
    case 'approved':
      return `${base}bg-emerald-950 text-emerald-300 border-emerald-500/40`;
    case 'rejected':
      return `${base}bg-rose-950 text-rose-300 border-rose-500/40`;
    case 'pending':
      return `${base}bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse`;
    default:
      return `${base}bg-white/10 text-gray-400 border-white/20`;
  }
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const AdminKycManagement: React.FC = () => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('vib_auth_token') : null;

  const [rows, setRows] = useState<AdminKycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  // Detail modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminKycDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Review actions
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  /* ------------------------- data fetching ------------------------- */

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/kyc/list', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setLoadError(err?.error || `Failed to load KYC submissions (HTTP ${res.status}).`);
        return;
      }
      const data = await res.json();
      setRows(data.submissions || []);
    } catch {
      setLoadError('Network error while loading KYC submissions.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailError(null);
    setRejectMode(false);
    setRejectReason('');
    setActionError(null);
    setActionSuccess(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/kyc/${encodeURIComponent(id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setDetailError(err?.error || 'Failed to load submission details.');
        return;
      }
      const data = await res.json();
      setDetail(data.submission);
    } catch {
      setDetailError('Network error while loading submission details.');
    } finally {
      setDetailLoading(false);
    }
  };

  /* ---------------------------- actions ---------------------------- */

  const handleReviewAction = async (status: 'approved' | 'rejected') => {
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
      const res = await fetch(`/api/admin/kyc/${encodeURIComponent(detail.id)}/status`, {
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
        setActionError(data.error || `Failed to ${status} submission (HTTP ${res.status}).`);
        return;
      }

      setActionSuccess(status === 'approved' ? 'Submission approved successfully.' : 'Submission rejected.');
      // Refresh the list & close after a brief success display.
      await fetchSubmissions();
      window.setTimeout(() => {
        setSelectedId(null);
        setDetail(null);
      }, 900);
    } catch {
      setActionError('Network error while updating submission status.');
    } finally {
      setActionBusy(false);
    }
  };

  /* ----------------------------- render ---------------------------- */

  const counts = {
    all: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    approved: rows.filter((r) => r.status === 'approved').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
  };

  const visibleRows = activeTab === 'all' ? rows : rows.filter((r) => r.status === activeTab);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const renderDocPreview = (doc: AdminKycDoc) => {
    const isPdf = doc.filename.toLowerCase().endsWith('.pdf');
    return <SecureDocPreview key={doc.filename} doc={doc} isPdf={isPdf} />;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#120d26] via-[#0d091e] to-[#070510] border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
              KYC Review Console
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Verify customer identity submissions and manage compliance
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchSubmissions}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
          title="Refresh submissions"
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
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
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
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-xs font-mono uppercase tracking-wider">Loading submissions…</p>
        </div>
      ) : loadError ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0c0d1c] border border-white/10 text-gray-400 space-y-3">
          <Users className="w-12 h-12 mx-auto text-gray-600" />
          <p className="text-sm font-semibold text-white font-rajdhani uppercase">No submissions</p>
          <p className="text-xs text-gray-500">
            {activeTab === 'all' ? 'No KYC submissions exist yet.' : `No ${activeTab} KYC submissions.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleRows.map((row) => (
            <div
              key={row.id}
              className="p-5 rounded-2xl bg-[#0c0d1c] border border-white/10 hover:border-purple-500/30 transition-all space-y-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-white font-rajdhani text-base truncate">
                    {row.full_name}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono mt-0.5 truncate">
                    {row.user_email || '—'} {row.user_phone ? `• ${row.user_phone}` : ''}
                  </div>
                </div>
                <span className={statusChip(row.status)}>{row.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white/5 p-3 rounded-xl">
                <div className="text-gray-500">
                  ID Type: <strong className="text-purple-300">{row.id_type}</strong>
                </div>
                <div className="text-gray-500">
                  Submitted: <strong className="text-white">{formatDate(row.submitted_at)}</strong>
                </div>
                <div className="text-gray-500 truncate">
                  ID No: <strong className="text-white">{row.id_number}</strong>
                </div>
                <div className="text-gray-500">
                  Docs: <strong className="text-white">{row.documents_count}</strong>
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
                className="w-full px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-200 text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>Review Submission</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-2xl bg-[#0c0d1c] border border-purple-500/30 p-6 space-y-5 shadow-2xl text-white max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-purple-300 font-bold font-rajdhani text-lg uppercase">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <span>KYC Submission {detail ? `#${detail.id}` : ''}</span>
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

            {detailLoading ? (
              <div className="py-12 flex items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                <span className="text-xs font-mono uppercase tracking-wider">Loading details…</span>
              </div>
            ) : detailError ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{detailError}</span>
              </div>
            ) : detail ? (
              <>
                {/* User info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 sm:col-span-2">
                    <div className="text-[10px] font-mono uppercase text-gray-500">Applicant</div>
                    <div className="text-white font-bold text-base mt-1">{detail.full_name}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                      {detail.user_email} {detail.user_phone ? `• ${detail.user_phone}` : ''}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] font-mono uppercase text-gray-500">Status</div>
                    <div className="mt-1.5">
                      <span className={statusChip(detail.status)}>{detail.status}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1.5">
                      Submitted {formatDate(detail.submitted_at)}
                    </div>
                  </div>
                </div>

                {/* Read-only form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-gray-500 uppercase tracking-wider text-[10px]">ID Type</div>
                    <div className="text-white font-bold mt-1">{detail.id_type}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-gray-500 uppercase tracking-wider text-[10px]">ID Number</div>
                    <div className="text-white font-bold mt-1">{detail.id_number}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-gray-500 uppercase tracking-wider text-[10px]">Date of Birth</div>
                    <div className="text-white font-bold mt-1">{detail.dob ? formatDate(detail.dob) : '—'}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-gray-500 uppercase tracking-wider text-[10px]">Submitted At</div>
                    <div className="text-white font-bold mt-1">{formatDate(detail.submitted_at)}</div>
                  </div>
                  <div className="sm:col-span-2 p-3.5 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-gray-500 uppercase tracking-wider text-[10px]">Address</div>
                    <div className="text-white mt-1 text-xs">{detail.address || '—'}</div>
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold font-rajdhani uppercase tracking-wider text-white mb-3">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Documents ({detail.documents.length})</span>
                  </div>
                  {detail.documents.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-gray-500">
                      No documents attached to this submission.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {detail.documents.map((doc) => renderDocPreview(doc))}
                    </div>
                  )}
                </div>

                {/* Action feedback */}
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

                {/* Reject reason area */}
                {rejectMode ? (
                  <div className="space-y-2.5 p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
                    <label className="block text-xs font-mono text-rose-300 uppercase tracking-wider">
                      Reason for Rejection * (min 5 characters)
                    </label>
                    <textarea
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Document is blurry; please upload a clearer copy."
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
                        onClick={() => handleReviewAction('rejected')}
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
                    {detail.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => {
                            setRejectMode(true);
                            setActionError(null);
                          }}
                          className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold font-rajdhani uppercase cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => handleReviewAction('approved')}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-rajdhani uppercase cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 disabled:opacity-50"
                        >
                          {actionBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Approve</span>
                        </button>
                      </>
                    )}
                    {detail.status !== 'pending' && (
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
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Secure document preview (needs its own component for the hook)      */
/* ------------------------------------------------------------------ */

interface SecureDocPreviewProps {
  doc: AdminKycDoc;
  isPdf: boolean;
}

const SecureDocPreview: React.FC<SecureDocPreviewProps> = ({ doc, isPdf }) => {
  const { url, loading, error } = useSecureDocUrl(doc.filename);

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden bg-black/30">
      <div className="p-2.5 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="text-[11px] font-mono text-white truncate">{doc.label}</span>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono uppercase text-purple-300 hover:text-purple-200 flex items-center gap-1 shrink-0"
          >
            <Eye className="w-3 h-3" />
            <span>Open</span>
          </a>
        )}
      </div>
      <div className="h-40 bg-white/5 flex items-center justify-center overflow-hidden">
        {loading ? (
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        ) : error ? (
          <div className="text-[11px] text-rose-400 font-mono flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : url ? (
          isPdf ? (
            <iframe src={url} title={doc.label} className="w-full h-full" />
          ) : (
            <img src={url} alt={doc.label} className="w-full h-full object-contain" />
          )
        ) : null}
      </div>
    </div>
  );
};

export default AdminKycManagement;
