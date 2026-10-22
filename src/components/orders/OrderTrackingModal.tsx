import React, { useState, useEffect, useRef } from 'react';
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
  QrCode,
  Download,
  UploadCloud,
  Trash2,
  Phone,
  Mail,
  Zap,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { downloadBrandedQrCard } from '../../utils/qrDownload';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  onOpenOrderRoom?: (orderId: string) => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  orderId: initialOrderId,
  onOpenOrderRoom,
}) => {
  const { token, user } = useAuth();
  const [searchOrderId, setSearchOrderId] = useState(initialOrderId || '');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evidence submission state
  const [utrRef, setUtrRef] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceSuccess, setEvidenceSuccess] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual delivery contact update state
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  // Copy state
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [zoomScreenshot, setZoomScreenshot] = useState<string | null>(null);

  // Payment settings state for QR generation
  const [paymentSettings, setPaymentSettings] = useState({
    upi_id: 'thevibofficial@okhdfcbank',
    payee_name: 'VIB Digital Services',
  });

  useEffect(() => {
    fetch('/api/payment/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.upi_id) setPaymentSettings(data);
      })
      .catch(() => {});
  }, []);

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
      const ord = data.order;
      setOrder(ord);

      // Hydrate delivery contact fields
      if (ord) {
        const d = ord.details || {};
        setContactPhone(d.contactPhone || d.phone || user?.phone || '');
        setContactEmail(d.email || ord.user_email || user?.email || '');
        setDeliveryNotes(d.deliveryNotes || '');
      }
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

  const handleFileSelect = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEvidenceError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setEvidenceError('Selected screenshot exceeds 10MB limit. Please upload a smaller image.');
      return;
    }

    setEvidenceError(null);
    setScreenshotFile(file);
    setScreenshotName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      setScreenshotPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setScreenshotName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrRef.trim() || !order) return;
    setIsSubmittingEvidence(true);
    setEvidenceError(null);

    const screenshotData = screenshotPreview || screenshotUrl.trim() || undefined;

    try {
      const res = await fetch(`/api/orders/${order.id}/payment-evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ref: utrRef.trim(),
          screenshot: screenshotData,
          phone: contactPhone.trim() || undefined,
          email: contactEmail.trim() || undefined,
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setEvidenceError(errData?.error || 'Failed to submit payment evidence.');
        return;
      }

      setEvidenceSuccess(true);
      fetchOrderTracking(order.id);
      setTimeout(() => setEvidenceSuccess(false), 3000);
    } catch {
      setEvidenceError('Network error while submitting evidence.');
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  const handleSubmitDeliveryContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || (!contactPhone.trim() && !contactEmail.trim())) return;
    setIsSubmittingContact(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/delivery-contact`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          phone: contactPhone.trim(),
          email: contactEmail.trim(),
          notes: deliveryNotes.trim(),
        })
      });

      if (res.ok) {
        setContactSuccess(true);
        fetchOrderTracking(order.id);
        setTimeout(() => setContactSuccess(false), 3000);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Failed to update delivery contact information.');
      }
    } catch {
      alert('Network error while saving delivery contact.');
    } finally {
      setIsSubmittingContact(false);
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

  // UPI QR parameters with automatic amount filling
  const orderAmount = order?.amount || 0;
  const upiAmountStr = Number(orderAmount).toFixed(2);
  const upiUri = `upi://pay?pa=${paymentSettings.upi_id}&pn=${encodeURIComponent(
    paymentSettings.payee_name
  )}&am=${upiAmountStr}&cu=INR&tn=${encodeURIComponent(`VIB Order #${order?.id || ''}`)}`;
  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;

  const handleDownloadQr = async () => {
    if (!order) return;
    setIsDownloadingQr(true);
    try {
      await downloadBrandedQrCard({
        orderId: order.id,
        amount: order.amount,
        upiId: paymentSettings.upi_id,
        payeeName: paymentSettings.payee_name,
        qrUrl: dynamicQrUrl,
      });
    } catch (err) {
      console.error('Failed to download QR card:', err);
      window.open(dynamicQrUrl, '_blank');
    } finally {
      setIsDownloadingQr(false);
    }
  };

  if (!isOpen) return null;

  const isPaymentVerified = order?.payment_status === 'PAYMENT_VERIFIED' || order?.status === 'completed';
  const isAutomaticDelivery = Boolean(order?.issued_code);
  const isManualDelivery = isPaymentVerified && !isAutomaticDelivery;

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
                Live Order Tracking &amp; Delivery Desk
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                Persistent escrow ledger, automated VP codes &amp; manual middleman handoff
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
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
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
                  <span
                    className={`font-mono font-bold uppercase ${
                      order.payment_status === 'PAYMENT_VERIFIED'
                        ? 'text-emerald-400'
                        : order.payment_status === 'SUBMITTED_FOR_VERIFICATION'
                        ? 'text-sky-400'
                        : order.payment_status === 'PAYMENT_REJECTED'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {order.payment_status || 'AWAITING_PAYMENT'}
                  </span>
                </div>

                {/* Fulfillment Status */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/40 border border-white/10">
                  <span className="text-gray-400 font-mono">Fulfillment:</span>
                  <span
                    className={`font-mono font-bold uppercase ${
                      order.fulfillment_status === 'COMPLETED'
                        ? 'text-emerald-400'
                        : order.fulfillment_status === 'FULFILLMENT_PENDING'
                        ? 'text-rose-400'
                        : 'text-purple-400'
                    }`}
                  >
                    {order.fulfillment_status || 'PENDING'}
                  </span>
                </div>
              </div>

              {/* Attached Evidence Preview if already submitted */}
              {order.payment_evidence_ref && (
                <div className="p-3 rounded-lg bg-black/30 border border-white/10 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 font-mono">Submitted UTR: </span>
                    <span className="font-mono text-purple-300 font-bold">{order.payment_evidence_ref}</span>
                  </div>

                  {order.payment_evidence_image && (
                    <button
                      type="button"
                      onClick={() => setZoomScreenshot(order.payment_evidence_image)}
                      className="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>View Screenshot</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 1. AUTOMATIC DELIVERY CONFIRMED (Official VP Code Display) */}
            {order.issued_code && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-[#07241a] to-emerald-950/40 border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.25)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-bold font-rajdhani text-sm uppercase tracking-wider">
                      Payment Verified • Official Valorant Prepaid Code Delivered
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

                <p className="text-[11px] text-emerald-300/90 font-rajdhani">
                  ✓ An official confirmation email with this PIN has also been sent to your registered email address.
                </p>

                {/* In-game redemption instructions */}
                <div className="p-3.5 rounded-xl bg-black/40 text-xs text-gray-300 space-y-1.5 font-rajdhani">
                  <div className="font-bold text-emerald-300 uppercase tracking-wide">Redemption Instructions:</div>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300/90 text-xs leading-relaxed font-sans">
                    <li>Launch <strong>VALORANT</strong> and log in to your Riot account.</li>
                    <li>Click the <strong>V (Valorant Points) icon</strong> in the top right of the in-game store.</li>
                    <li>Select <strong>Prepaid Cards &amp; Codes</strong> as your payment option.</li>
                    <li>Paste your code above and click <strong>Submit</strong>. Your VP will credit immediately!</li>
                  </ol>
                </div>
              </div>
            )}

            {/* 2. MANUAL DELIVERY CONFIRMED (Accounts, Rentals, Coaching, Regional, Derank) */}
            {isManualDelivery && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/50 via-[#130f24] to-indigo-950/40 border-2 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.2)] space-y-4">
                <div className="flex items-center gap-2 text-purple-300">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-purple-400" />
                  <span className="font-bold font-rajdhani text-sm uppercase tracking-wider">
                    Payment Verified • Manual Escrow Delivery Active
                  </span>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed font-rajdhani">
                  Your payment of <strong>₹{order.amount?.toLocaleString('en-IN')}</strong> has been officially confirmed by VIB Administration.
                  Our middleman coordinator has initiated your manual dispatch protocol. Please confirm or update your preferred WhatsApp number and email address below.
                </p>

                {/* Delivery Contact Entry & Confirmation Form */}
                <form onSubmit={handleSubmitDeliveryContact} className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-3">
                  <div className="text-xs font-chakra font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Your Contact Details for Manual Handoff</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">
                        Phone / WhatsApp Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white font-mono text-xs focus:ring-2 focus:ring-purple-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">
                        Delivery Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="your-email@gmail.com"
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white font-mono text-xs focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1">
                      Availability / Preferred Time / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="e.g. Available after 7 PM, ping on WhatsApp first"
                      className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-xs focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSubmittingContact || (!contactPhone.trim() && !contactEmail.trim())}
                      className="w-full sm:w-auto px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold font-rajdhani uppercase text-xs text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                    >
                      {isSubmittingContact ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Save &amp; Confirm Contact</span>
                    </button>

                    {contactSuccess && (
                      <span className="text-xs text-emerald-400 font-mono animate-in fade-in">
                        ✓ Contact details saved to order room!
                      </span>
                    )}

                    {onOpenOrderRoom && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenOrderRoom(order.id);
                        }}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-purple-200 hover:text-white font-bold font-rajdhani uppercase text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                        <span>Open Order Room</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* STOCK SHORTAGE NOTICE */}
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

            {/* PAYMENT QR & EVIDENCE SUBMISSION (if awaiting payment or rejected) */}
            {(order.payment_status === 'AWAITING_PAYMENT' || order.payment_status === 'PAYMENT_REJECTED') && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-amber-500/30 space-y-4">
                <div className="flex items-center gap-2 text-amber-300 font-bold font-rajdhani text-sm uppercase">
                  <QrCode className="w-4 h-4" />
                  <span>Scan QR Code or Submit Payment Verification</span>
                </div>

                {/* QR Code with Auto-filled Amount */}
                <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="p-2 bg-white rounded-xl shadow-lg">
                      <img
                        src={dynamicQrUrl}
                        alt="Payment QR"
                        className="w-32 h-32 object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      disabled={isDownloadingQr}
                      className="w-full py-1.5 px-2 rounded-lg bg-purple-600/30 hover:bg-purple-600/60 border border-purple-500/40 text-purple-200 text-[10px] font-bold font-rajdhani uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm hover:text-white"
                    >
                      {isDownloadingQr ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-purple-300" />}
                      <span>{isDownloadingQr ? 'Saving...' : 'Download QR'}</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="text-xs text-gray-400 font-rajdhani">Official Merchant VPA:</div>
                    <span className="font-mono font-bold text-xs text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30 inline-block">
                      {paymentSettings.upi_id}
                    </span>
                    <div className="text-xs text-gray-400 font-rajdhani">
                      Payee: <strong className="text-white">{paymentSettings.payee_name}</strong>
                    </div>

                    <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 space-y-0.5 mt-1">
                      <div className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span>Pre-filled Amount:</span>
                      </div>
                      <div className="text-base font-black text-emerald-300 font-rajdhani">
                        ₹{order.amount?.toLocaleString('en-IN')}.00
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence Submission Form */}
                <form onSubmit={handleSubmitEvidence} className="space-y-3 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-[11px] font-mono text-gray-300 uppercase mb-1">
                      Bank Transaction UTR / UPI Ref * (12 Digits)
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

                  {/* Drag-and-drop or select Screenshot */}
                  <div>
                    <label className="block text-[11px] font-mono text-gray-300 uppercase mb-1">
                      Payment Screenshot *
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    {!screenshotPreview ? (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFileSelect(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 ${
                          isDraggingFile
                            ? 'border-purple-400 bg-purple-950/40 text-purple-200'
                            : 'border-white/15 hover:border-purple-500/50 bg-black/40 hover:bg-black/60 text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <UploadCloud className="w-5 h-5 text-purple-400" />
                        <div className="font-chakra text-xs">
                          Click to select or drag &amp; drop payment screenshot
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          PNG, JPG, JPEG, WEBP (Max 10MB)
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={screenshotPreview}
                            alt="Screenshot Preview"
                            className="w-10 h-10 object-cover rounded-lg border border-purple-500/40 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-mono font-bold text-white truncate max-w-[200px]">
                              {screenshotName || 'payment_proof.png'}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-rajdhani flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>Ready to upload</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 border border-rose-500/30 text-rose-300 hover:text-white transition-colors cursor-pointer"
                          title="Remove image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {evidenceError && (
                    <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{evidenceError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingEvidence || !utrRef.trim()}
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold font-rajdhani uppercase text-sm text-black transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 shadow-lg"
                  >
                    {isSubmittingEvidence ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Submit Payment Proof for Verification</span>
                  </button>

                  {evidenceSuccess && (
                    <div className="p-2 text-center text-xs text-emerald-400 font-mono animate-in fade-in">
                      ✓ Evidence submitted! Status updated to SUBMITTED_FOR_VERIFICATION.
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* ORDER TIMELINE HISTORY */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm font-rajdhani uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Escrow Lifecycle &amp; Audit Timeline</span>
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

        {/* Screenshot Fullscreen Zoom Modal */}
        {zoomScreenshot && (
          <div
            onClick={() => setZoomScreenshot(null)}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          >
            <div className="relative max-w-3xl max-h-[85vh] p-2 bg-[#0c0d1c] border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
              <button
                type="button"
                onClick={() => setZoomScreenshot(null)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={zoomScreenshot}
                alt="Payment Receipt Zoom"
                className="max-h-[80vh] w-auto object-contain rounded-xl mx-auto"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
