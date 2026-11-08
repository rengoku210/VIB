import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type KycStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

interface KycDocument {
  label: string;
  filename: string;
}

interface KycSubmission {
  id: string;
  fullName: string;
  dob: string;
  address: string;
  idType: string;
  idNumber: string;
  status: string;
  rejectionReason: string | null;
  documents: KycDocument[];
  submittedAt: string | null;
  reviewedAt: string | null;
}

interface KycGetResponse {
  submission: KycSubmission | null;
  kycStatus: KycStatus;
}

interface DocUpload {
  id: string;
  file: File;
  label: string;
  dataUrl: string | null;
  progress: number;
  status: 'reading' | 'ready' | 'error';
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

const ID_TYPES = ['Aadhaar Card', 'PAN Card', 'Passport', 'Driving License'];

const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5MB per file
const MAX_TOTAL_BYTES = 12 * 1024 * 1024; // ~12MB aggregate
const MAX_DOCS = 4;

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

const formatDate = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const KycSection: React.FC = () => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('vib_auth_token') : null;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus>('unverified');
  const [submission, setSubmission] = useState<KycSubmission | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [uploads, setUploads] = useState<DocUpload[]>([]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  /* ------------------------- data fetching ------------------------- */

  const fetchKyc = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/user/kyc', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setLoadError(err?.error || 'Failed to load KYC status.');
        return;
      }
      const data: KycGetResponse = await res.json();
      setKycStatus(data.kycStatus || 'unverified');
      setSubmission(data.submission || null);
      // Prefill the form when resubmitting after a rejection.
      if (data.submission) {
        setFullName(data.submission.fullName || '');
        setDob(data.submission.dob || '');
        setAddress(data.submission.address || '');
        setIdType(data.submission.idType || '');
        setIdNumber(data.submission.idNumber || '');
      }
    } catch {
      setLoadError('Network error while loading KYC status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKyc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ------------------------- document upload ----------------------- */

  const isReadableDocType = (file: File): boolean =>
    file.type.startsWith('image/') || file.type === 'application/pdf';

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    e.target.value = '';
    if (files.length === 0) return;

    setSubmitError(null);

    const slotsLeft = MAX_DOCS - uploads.length;
    if (slotsLeft <= 0) {
      setSubmitError(`You can attach up to ${MAX_DOCS} documents.`);
      return;
    }

    const currentTotalBytes = uploads.reduce((sum, u) => sum + u.file.size, 0);
    let addedBytes = 0;

    const nextUploads: DocUpload[] = [...uploads];

    for (const file of files.slice(0, slotsLeft)) {
      if (!isReadableDocType(file)) {
        setSubmitError(`"${file.name}" is not supported. Use an image or PDF.`);
        continue;
      }
      if (file.size > MAX_DOC_BYTES) {
        setSubmitError(`"${file.name}" exceeds the 5MB per-file limit.`);
        continue;
      }
      if (currentTotalBytes + addedBytes + file.size > MAX_TOTAL_BYTES) {
        setSubmitError('Total document size exceeds the ~12MB limit.');
        break;
      }

      const doc: DocUpload = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        label: `Document ${nextUploads.length + 1}`,
        dataUrl: null,
        progress: 0,
        status: 'reading',
      };
      nextUploads.push(doc);
      addedBytes += file.size;

      readFileAsDataUrl(file, (pct) => {
        setUploads((prev) =>
          prev.map((u) => (u.id === doc.id ? { ...u, progress: pct } : u)),
        );
      })
        .then((dataUrl) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === doc.id ? { ...u, dataUrl, progress: 100, status: 'ready' } : u,
            ),
          );
        })
        .catch(() => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === doc.id
                ? { ...u, status: 'error', error: 'Failed to read this file.' }
                : u,
            ),
          );
        });
    }

    setUploads(nextUploads);
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const updateUploadLabel = (id: string, label: string) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, label } : u)));
  };

  /* --------------------------- submission -------------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    const name = fullName.trim();
    const idTypeStr = idType.trim();
    const idNumberStr = idNumber.trim();

    if (name.length < 2) {
      setSubmitError('Full name is required (at least 2 characters).');
      return;
    }
    if (!dob) {
      setSubmitError('Date of birth is required.');
      return;
    }
    if (!address.trim()) {
      setSubmitError('Address is required.');
      return;
    }
    if (!idTypeStr) {
      setSubmitError('Please select an ID type.');
      return;
    }
    if (!idNumberStr) {
      setSubmitError('ID number is required.');
      return;
    }

    const readyDocs = uploads.filter((u) => u.status === 'ready' && u.dataUrl);
    if (readyDocs.length < 1) {
      setSubmitError('Please attach at least one document (image or PDF).');
      return;
    }
    const brokenUpload = uploads.find((u) => u.status === 'error');
    if (brokenUpload) {
      setSubmitError(`"${brokenUpload.file.name}" could not be read. Remove it and retry.`);
      return;
    }
    const readingUpload = uploads.find((u) => u.status === 'reading');
    if (readingUpload) {
      setSubmitError('Some documents are still being read. Please wait a moment.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName: name,
          dob,
          address: address.trim(),
          idType: idTypeStr,
          idNumber: idNumberStr,
          documents: readyDocs.map((u) => ({
            label: u.label.trim() || 'Document',
            dataUrl: u.dataUrl as string,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || `Submission failed (HTTP ${res.status}).`);
        return;
      }

      // Brief success confirmation, then flip to the pending state.
      setSubmitSuccess(true);
      setKycStatus('pending');
      setSubmission((prev) =>
        prev
          ? { ...prev, status: 'pending' }
          : {
              id: data.submission?.id || '',
              fullName: name,
              dob,
              address: address.trim(),
              idType: idTypeStr,
              idNumber: idNumberStr,
              status: 'pending',
              rejectionReason: null,
              documents: [],
              submittedAt: new Date().toISOString(),
              reviewedAt: null,
            },
      );
      setUploads([]);
      setFullName('');
      setDob('');
      setAddress('');
      setIdType('');
      setIdNumber('');
      window.setTimeout(() => setSubmitSuccess(false), 4500);
    } catch {
      setSubmitError('Network error while submitting KYC verification.');
    } finally {
      setSubmitting(false);
    }
  };

  const showForm = kycStatus === 'unverified' || kycStatus === 'rejected';

  /* ------------------------------ render --------------------------- */

  const renderStatusBanner = () => {
    if (kycStatus === 'pending') {
      return (
        <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 font-bold font-rajdhani uppercase tracking-wider text-amber-200">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Under Review</span>
            </div>
            <p className="text-xs text-amber-200/70 mt-1 font-mono">
              Your identity documents are being reviewed by the VIB verification desk. You will be notified once the review completes.
            </p>
          </div>
          {submission?.submittedAt && (
            <div className="text-xs text-amber-300/80 font-mono text-left sm:text-right shrink-0">
              <div>Submitted</div>
              <div className="font-bold">{formatDate(submission.submittedAt)}</div>
            </div>
          )}
        </div>
      );
    }

    if (kycStatus === 'approved') {
      return (
        <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 font-bold font-rajdhani uppercase tracking-wider text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Identity Verified</span>
            </div>
            <p className="text-xs text-emerald-200/70 mt-1 font-mono">
              Your KYC verification is approved. Your account is fully trusted for high-value transactions.
            </p>
          </div>
          {submission?.reviewedAt && (
            <div className="text-xs text-emerald-300/80 font-mono text-right shrink-0">
              <div>Reviewed</div>
              <div className="font-bold">{formatDate(submission.reviewedAt)}</div>
            </div>
          )}
        </div>
      );
    }

    if (kycStatus === 'rejected') {
      return (
        <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 font-bold font-rajdhani uppercase tracking-wider text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Verification Rejected</span>
            </div>
            <p className="text-xs text-rose-200/80 mt-1 font-mono">
              {submission?.rejectionReason || 'Your KYC submission was not approved. Please review and resubmit.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-rose-900/40 flex items-center gap-1.5 shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Resubmit</span>
          </button>
        </div>
      );
    }

    // unverified
    return (
      <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-500/40 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 font-bold font-rajdhani uppercase tracking-wider text-purple-200">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Identity Verification Required</span>
          </div>
          <p className="text-xs text-purple-200/70 mt-1 font-mono">
            Verify your identity to unlock full account privileges, raised transaction limits, and escrow protection.
          </p>
        </div>
        <button
          type="button"
          onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-600/40 flex items-center gap-1.5 shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Get Verified</span>
        </button>
      </div>
    );
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
              KYC Identity Verification
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Secure identity verification for your VIB account
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchKyc}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
          title="Refresh KYC status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="p-12 rounded-2xl bg-[#0c0d1c] border border-white/10 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-xs font-mono uppercase tracking-wider">Loading KYC status…</p>
        </div>
      ) : loadError ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : (
        <>
          {/* Transient success confirmation stays mounted above whatever status view is active. */}
          {submitSuccess && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Submission received! Your documents are now under review.</span>
            </div>
          )}

          {renderStatusBanner()}

          {/* Approved summary */}
          {kycStatus === 'approved' && submission && (
            <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/10 space-y-4">
              <h3 className="text-sm font-bold font-rajdhani uppercase tracking-wider text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Verification Summary</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-gray-500 uppercase tracking-wider text-[10px]">Full Name</div>
                  <div className="text-white font-bold mt-1 text-sm">{submission.fullName}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-gray-500 uppercase tracking-wider text-[10px]">ID Type</div>
                  <div className="text-purple-300 font-bold mt-1 text-sm">{submission.idType}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-gray-500 uppercase tracking-wider text-[10px]">Reviewed On</div>
                  <div className="text-white font-bold mt-1 text-sm">{formatDate(submission.reviewedAt || submission.submittedAt)}</div>
                </div>
              </div>
            </div>
          )}

          {/* KYC form */}
          {showForm && (
            <div ref={formRef} className="p-6 rounded-2xl bg-[#0c0d1c] border border-purple-500/20 space-y-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-black font-rajdhani text-white uppercase tracking-wider">
                  {kycStatus === 'rejected' ? 'Resubmit Verification' : 'Submit Identity Verification'}
                </h3>
              </div>

              {submitError && (
                <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none [color-scheme:dark]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">
                      Residential Address *
                    </label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full residential address"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">
                      ID Type *
                    </label>
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#111425] border border-white/15 text-white text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                    >
                      <option value="">Select ID type…</option>
                      {ID_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">
                      ID Number *
                    </label>
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="e.g. XXXX XXXX XXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                    />
                  </div>
                </div>

                {/* Document upload area */}
                <div className="rounded-xl border border-dashed border-purple-500/40 bg-purple-950/20 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold font-rajdhani uppercase tracking-wider text-purple-200">
                        <FileText className="w-4 h-4 text-purple-400" />
                        <span>Identity Documents</span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                        Up to {MAX_DOCS} files • image or PDF • 5MB per file • ~12MB total
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploads.length >= MAX_DOCS}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-rajdhani uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-600/30 shrink-0"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Attach Files</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleFilesSelected}
                      className="hidden"
                    />
                  </div>

                  {uploads.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-500">
                      No documents attached yet. Upload a clear photo or scan of your ID.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {uploads.map((doc, idx) => (
                        <div
                          key={doc.id}
                          className="flex items-start gap-3 p-3 rounded-xl bg-black/40 border border-white/10"
                        >
                          {/* Thumbnail / type icon */}
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            {doc.status === 'ready' && doc.dataUrl ? (
                              doc.file.type === 'application/pdf' ? (
                                <FileText className="w-6 h-6 text-rose-300" />
                              ) : (
                                <img
                                  src={doc.dataUrl}
                                  alt={doc.label}
                                  className="w-full h-full object-cover"
                                />
                              )
                            ) : (
                              <FileText className="w-6 h-6 text-gray-500" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={doc.label}
                                onChange={(e) => updateUploadLabel(doc.id, e.target.value)}
                                className="w-full max-w-[220px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:ring-1 focus:ring-purple-400 outline-none"
                                placeholder="Document label"
                              />
                              <span className="text-[10px] text-gray-500 font-mono truncate">
                                {doc.file.name}
                              </span>
                            </div>

                            {doc.status === 'reading' && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-purple-500 transition-all"
                                    style={{ width: `${doc.progress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-purple-300 font-mono w-9 text-right">
                                  {doc.progress}%
                                </span>
                              </div>
                            )}

                            {doc.status === 'error' && (
                              <p className="text-[11px] text-rose-400 font-mono">{doc.error}</p>
                            )}

                            {doc.status === 'ready' && (
                              <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Ready • {(doc.file.size / 1024 / 1024).toFixed(2)}MB</span>
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeUpload(doc.id)}
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-300 cursor-pointer transition-all shrink-0"
                            title="Remove file"
                            aria-label={`Remove ${doc.label}`}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submitting || uploads.some((u) => u.status !== 'ready')}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold font-rajdhani uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting…</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Submit for Verification</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default KycSection;
