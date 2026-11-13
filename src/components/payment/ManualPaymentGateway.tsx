import React, { useState, useRef, useEffect } from 'react';
import { resolveUploadUrl } from '../../utils/uploadUrl';
import { UpiQrCode } from './UpiQrCode';
import {
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  UploadCloud,
  ChevronRight,
  Info,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Zap,
  Headphones,
  ArrowRight,
  ArrowLeft,
  Megaphone,
  Repeat,
  Crown,
  Shield,
  FileImage,
  FileText,
  Home,
  Hourglass,
  ClipboardList,
  Hash,
  Coins,
  Calendar,
  Layers,
  Gauge,
  MessageCircle,
} from 'lucide-react';
import { Currency } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';

export interface PaymentGatewaySpec {
  label: string;
  value: string;
}

export interface ManualPaymentGatewayProps {
  orderId: string;
  itemTitle: string;
  itemCategory: string;
  itemDescription: string;
  itemPrice: number;
  currency?: Currency;
  specs?: PaymentGatewaySpec[];
  iconType?: 'megaphone' | 'repeat' | 'crown' | 'shield' | 'sparkles' | 'vp' | 'coins';
  itemImageUrl?: string;
  breadcrumbService?: string;
  onBack: () => void;
  backButtonLabel?: string;
  nextStepsText?: string;
  onTrackOrder?: () => void;
  onViewOrders?: () => void;
  upiId?: string;
  payeeName?: string;
  qrImageUrl?: string;
  instructions?: string[];
  supportWhatsapp?: string;
  onSubmitProof: (utr: string, screenshotData: string) => Promise<boolean>;
  onComplete?: () => void;
  issuedCode?: string | null;
  initialSubmitted?: boolean;
  initialSubmittedAt?: string | null;
  initialUtr?: string | null;
  orderStatus?: string | null;
  orderStatusEndpoint?: string;
  verificationStartAt?: string | number | null;
  approvedRedirectUrl?: string | null;
  continueButtonLabel?: string;
  onContinue?: () => void;
  onOrderStatusChange?: (order: any) => void;
  highTrafficDelayMs?: number;
}

function parseStartTimeMs(val?: string | number | null): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const numeric = Number(val);
  if (!Number.isNaN(numeric) && String(val).trim().match(/^\d+$/)) return numeric;
  const parsed = Date.parse(String(val));
  return Number.isNaN(parsed) ? null : parsed;
}

function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatSubmissionTimestamp(date: Date): string {
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}, ${time}`;
}

export const ManualPaymentGateway: React.FC<ManualPaymentGatewayProps> = ({
  orderId,
  itemTitle,
  itemCategory,
  itemDescription,
  itemPrice,
  currency = 'INR',
  specs,
  iconType = 'megaphone',
  itemImageUrl,
  breadcrumbService = 'Advertise',
  onBack,
  backButtonLabel = 'Back to Advertisement Plans',
  nextStepsText,
  onTrackOrder,
  onViewOrders,
  upiId = '',
  payeeName = 'VIB Digital Services Platform',
  qrImageUrl,
  instructions,
  supportWhatsapp = '+918099641606',
  onSubmitProof,
  onComplete,
  issuedCode,
  initialSubmitted = false,
  initialSubmittedAt = null,
  initialUtr = null,
  orderStatus = null,
  orderStatusEndpoint,
  verificationStartAt = null,
  approvedRedirectUrl = null,
  continueButtonLabel = 'Continue',
  onContinue,
  onOrderStatusChange,
  highTrafficDelayMs = 120000,
}) => {
  const verifyStorageKey = `vib_verify_start_${orderId}`;
  const [utr, setUtr] = useState(initialUtr || '');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedPayee, setCopiedPayee] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedOrderRef, setCopiedOrderRef] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(initialSubmitted);
  const [submittedAt, setSubmittedAt] = useState<string | null>(() => {
    const ms = parseStartTimeMs(initialSubmittedAt);
    return ms ? formatSubmissionTimestamp(new Date(ms)) : null;
  });
  const [liveStatus, setLiveStatus] = useState<string | null>(orderStatus);
  const [liveApprovedUrl, setLiveApprovedUrl] = useState<string | null>(approvedRedirectUrl);
  const [verificationStartMs, setVerificationStartMs] = useState<number | null>(() => {
    try {
      const stored = parseStartTimeMs(localStorage.getItem(verifyStorageKey));
      if (stored) return stored;
    } catch {}
    return parseStartTimeMs(verificationStartAt);
  });
  const [elapsedMs, setElapsedMs] = useState<number>(() => {
    try {
      const stored = parseStartTimeMs(localStorage.getItem(verifyStorageKey));
      if (stored) return Math.max(0, Date.now() - stored);
    } catch {}
    const parsed = parseStartTimeMs(verificationStartAt);
    return parsed ? Math.max(0, Date.now() - parsed) : 0;
  });

  useEffect(() => {
    if (orderStatus) setLiveStatus(orderStatus);
    if (approvedRedirectUrl) setLiveApprovedUrl(approvedRedirectUrl);
  }, [orderStatus, approvedRedirectUrl]);

  useEffect(() => {
    if (!initialSubmitted) return;
    setIsSuccess(true);
    if (initialUtr && !utr) {
      setUtr(initialUtr);
    }
    if (initialSubmittedAt && !submittedAt) {
      const ms = parseStartTimeMs(initialSubmittedAt);
      if (ms) setSubmittedAt(formatSubmissionTimestamp(new Date(ms)));
    }
    let resolvedStart: number | null = null;
    try {
      resolvedStart = parseStartTimeMs(localStorage.getItem(verifyStorageKey));
    } catch {}
    if (!resolvedStart) {
      resolvedStart = parseStartTimeMs(verificationStartAt) || Date.now();
      try {
        localStorage.setItem(verifyStorageKey, String(resolvedStart));
      } catch {}
    }
    setVerificationStartMs(resolvedStart);
    setElapsedMs(Math.max(0, Date.now() - resolvedStart));
  }, [initialSubmitted, initialSubmittedAt, initialUtr, verificationStartAt, verifyStorageKey]);

  const effectiveStatus = (liveStatus || '').toLowerCase();
  const isOrderApproved = Boolean(
    effectiveStatus === 'approved' ||
      effectiveStatus === 'details_submitted' ||
      effectiveStatus === 'live' ||
      effectiveStatus === 'completed'
  );

  useEffect(() => {
    if (!isSuccess || issuedCode || isOrderApproved) return;
    let start = verificationStartMs;
    if (!start) {
      try {
        start = parseStartTimeMs(localStorage.getItem(verifyStorageKey));
      } catch {}
    }
    if (!start) {
      start = Date.now();
      try {
        localStorage.setItem(verifyStorageKey, String(start));
      } catch {}
      setVerificationStartMs(start);
    }
    setElapsedMs(Math.max(0, Date.now() - start));
    const timer = window.setInterval(() => {
      let currentStart = start!;
      try {
        const storedNow = parseStartTimeMs(localStorage.getItem(verifyStorageKey));
        if (storedNow) currentStart = storedNow;
      } catch {}
      setElapsedMs(Math.max(0, Date.now() - currentStart));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isSuccess, issuedCode, isOrderApproved, verificationStartMs, verifyStorageKey]);

  useEffect(() => {
    if (!isSuccess || !orderStatusEndpoint || isOrderApproved || issuedCode) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(orderStatusEndpoint);
        const data = await res.json();
        const ord = data?.order;
        if (!active || !ord) return;
        if (ord.status) {
          setLiveStatus(ord.status);
        }
        const tok = ord.submission_token || ord.approval_token;
        if (ord.status === 'approved' && tok) {
          setLiveApprovedUrl(
            `/advertise/submit/${encodeURIComponent(orderId)}?token=${encodeURIComponent(tok)}`
          );
        }
        onOrderStatusChange?.(ord);
      } catch {}
    };
    const interval = window.setInterval(poll, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isSuccess, orderStatusEndpoint, isOrderApproved, issuedCode, orderId]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const priceFormatted = formatCurrencyPrice(itemPrice, (currency as Currency) || 'INR');

  // Default structural specs only when none provided
  const displaySpecs: PaymentGatewaySpec[] = specs || [
    { label: 'Order Reference', value: orderId },
    { label: 'Category', value: itemCategory },
    { label: 'Verification', value: 'Manual Staff Review' },
  ];

  // Default instructions matching mockup
  const displayInstructions = instructions || [
    `Scan the QR code or use the UPI ID to pay ${priceFormatted}.`,
    'Make sure the amount is correct before paying.',
    'Upload the payment screenshot (with transaction ID / UTR).',
    'Your order will be verified by our team (usually within 15-45 minutes).',
    "You'll receive an update via email and in your VIB account.",
  ];

  // Dynamic QR generator URL
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${encodeURIComponent(itemPrice.toString())}&cu=INR`;
  const qrSource =
    resolveUploadUrl(qrImageUrl) ||
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
      upiString
    )}`;

  const copyToClipboard = async (text: string, setter: (val: boolean) => void) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      try {
        const tmp = document.createElement('textarea');
        tmp.value = text;
        tmp.style.position = 'fixed';
        tmp.style.opacity = '0';
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      } catch {}
    }
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpe?g|webp)$/i)) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, or WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Screenshot exceeds maximum allowed size (10MB).');
      return;
    }

    setScreenshotName(file.name);
    setUploadProgress(0);
    const reader = new FileReader();
    reader.onprogress = (evt) => {
      if (evt.lengthComputable && evt.total > 0) {
        setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };
    reader.onload = () => {
      setScreenshotData(reader.result as string);
      setUploadProgress(null);
      setErrorMessage(null);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read payment screenshot file.');
      setUploadProgress(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const isFree = itemPrice === 0;
    if (!isFree) {
      if (!utr.trim()) {
        setErrorMessage('Please enter your 12-digit UPI Transaction ID / UTR number.');
        return;
      }
      if (!screenshotData) {
        setErrorMessage('Please upload a clear screenshot of your completed UPI payment.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const ok = await onSubmitProof(utr.trim(), screenshotData || '');
      if (ok) {
        const nowMs = Date.now();
        try {
          localStorage.setItem(verifyStorageKey, String(nowMs));
        } catch {}
        setVerificationStartMs(nowMs);
        setElapsedMs(0);
        setLiveStatus('submitted_for_verification');
        setSubmittedAt(formatSubmissionTimestamp(new Date(nowMs)));
        setIsSuccess(true);
        try {
          window.scrollTo(0, 0);
        } catch {}
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render 3D Hero Icon
  const renderItemIcon = () => {
    if (itemImageUrl) {
      return (
        <img
          src={itemImageUrl}
          alt={itemTitle}
          className="w-full h-full object-contain filter drop-shadow-[0_0_14px_rgba(168,85,247,0.65)] p-0.5 select-none"
        />
      );
    }

    const lowerTitle = (itemTitle || '').toLowerCase();
    const lowerCategory = (itemCategory || '').toLowerCase();
    const isVpItem =
      iconType === 'coins' ||
      iconType === 'vp' ||
      lowerTitle.includes('vp') ||
      lowerCategory.includes('vp') ||
      lowerTitle.includes('valorant points');

    if (isVpItem) {
      return (
        <img
          src="/assets/hires/vp_coins_stack.png"
          alt="Valorant Points Coins"
          className="w-full h-full object-contain filter drop-shadow-[0_0_16px_rgba(168,85,247,0.7)] p-0.5 select-none transition-transform hover:scale-105 duration-300"
        />
      );
    }

    switch (iconType) {
      case 'repeat':
        return <Repeat className="w-10 h-10 text-emerald-400" />;
      case 'crown':
        return <Crown className="w-10 h-10 text-amber-400" />;
      case 'shield':
        return <Shield className="w-10 h-10 text-cyan-400" />;
      case 'sparkles':
        return <Sparkles className="w-10 h-10 text-fuchsia-400" />;
      default:
        return <Megaphone className="w-10 h-10 text-purple-400" />;
    }
  };

  // Shared neon-bordered bottom trust banner matching Reference 2 layout
  const renderTrustFooter = (whatsappText: string) => (
    <div className="relative rounded-2xl bg-[#0c0618] bg-[radial-gradient(ellipse_at_bottom_left,rgba(147,51,234,0.28),transparent_55%),radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.22),transparent_55%)] border border-purple-500/55 px-5 py-5 sm:px-7 sm:py-6 shadow-[0_0_34px_rgba(168,85,247,0.28),inset_0_1px_0_rgba(216,180,254,0.3)] overflow-hidden">
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-0 lg:divide-x lg:divide-white/10">
        {/* Left: Brand Lockup */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-5 text-center sm:text-left lg:pr-6 shrink-0">
          <span className="inline-block pr-2.5 text-3xl sm:text-4xl font-black italic leading-none text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-indigo-400 font-rajdhani tracking-normal drop-shadow-[0_0_14px_rgba(168,85,247,0.65)] shrink-0">
            VIB
          </span>
          <div className="space-y-0.5 min-w-0">
            <div className="text-sm sm:text-base font-bold text-white tracking-wide sm:whitespace-nowrap">
              VIB Digital Services Platform
            </div>
            <div className="text-xs text-gray-300/90 italic sm:whitespace-nowrap">
              Your All-in-One Digital Services Platform.
            </div>
          </div>
        </div>

        {/* Center: 3 Service Guarantees */}
        <div className="grid grid-cols-3 gap-4 sm:gap-7 lg:px-7 shrink-0">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <ShieldCheck className="w-5 h-5 text-purple-300" />
            <span className="text-[11px] font-semibold text-gray-200 leading-tight">
              Secure<br />Payments
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Zap className="w-5 h-5 text-fuchsia-300" />
            <span className="text-[11px] font-semibold text-gray-200 leading-tight">
              Reliable<br />Process
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Headphones className="w-5 h-5 text-purple-300" />
            <span className="text-[11px] font-semibold text-gray-200 leading-tight">
              Dedicated<br />Support
            </span>
          </div>
        </div>

        {/* Right: Facing Any Issues + Wide Emerald WhatsApp CTA */}
        <div className="flex flex-col items-center lg:items-start gap-3 lg:pl-7 min-w-0 lg:max-w-[290px] w-full">
          <div className="text-center lg:text-left space-y-0.5">
            <div className="text-sm font-bold text-white">Facing any issues?</div>
            <div className="text-xs text-gray-300 leading-snug">
              Contact our 24/7 WhatsApp Chat Executive for quick assistance.
            </div>
          </div>
          <a
            href={`https://wa.me/${supportWhatsapp.replace(/\+/g, '')}?text=${encodeURIComponent(whatsappText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-5 py-2.5 min-h-[44px] rounded-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-bold text-xs shadow-[0_0_22px_rgba(16,185,129,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Chat on WhatsApp</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // SUCCESS / PAYMENT UNDER VERIFICATION VIEW
  // =========================================================================
  if (isSuccess) {
    const viewOrdersHandler = onViewOrders || onTrackOrder || onBack;
    const isAutoFulfilled = Boolean(issuedCode);
    const displayTimestamp = submittedAt || formatSubmissionTimestamp(new Date());
    const showHighTrafficNotice = !isAutoFulfilled && !isOrderApproved && elapsedMs >= highTrafficDelayMs;

    return (
      <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white pb-20 font-sans min-h-screen relative overflow-x-clip">
        <style>{`
          @keyframes vib-clock-hand {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes vib-orbit-ring {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            .vib-motion-spin { animation: none !important; }
          }
        `}</style>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(ellipse_65%_50%_at_50%_0%,rgba(147,51,234,0.22),transparent_75%)]"
        />

        <div className="relative max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 space-y-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 hover:text-purple-300 transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-purple-400" />
              <span>Home</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <button
              type="button"
              onClick={onBack}
              className="hover:text-purple-300 transition-colors cursor-pointer"
            >
              {breadcrumbService}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-gray-200 font-medium">
              {isAutoFulfilled ? 'Payment Verified' : 'Payment Verification'}
            </span>
          </nav>

          {/* Centerpiece Hero Status Header */}
          <div className="text-center space-y-4 pt-1 relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-4 h-24 flex items-center justify-center overflow-hidden"
            >
              <div className="w-[460px] h-14 bg-gradient-to-r from-transparent via-purple-600/25 to-transparent -rotate-6 blur-xl" />
            </div>

            <div className="relative w-24 h-20 mx-auto flex items-center justify-center">
              <div
                aria-hidden="true"
                className={`absolute inset-1 rounded-full blur-2xl ${
                  isAutoFulfilled ? 'bg-emerald-500/45' : 'bg-purple-500/50'
                }`}
              />
              {isAutoFulfilled || isOrderApproved ? (
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-900/40 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_28px_rgba(16,185,129,0.35)]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              ) : (
                <div
                  data-testid="payment-verification-animation"
                  className="relative w-24 h-20 flex items-center justify-center drop-shadow-[0_0_22px_rgba(168,85,247,0.7)]"
                >
                  <div className="w-14 h-16 -rotate-6 rounded-xl bg-gradient-to-br from-purple-400/35 via-fuchsia-500/25 to-indigo-900/60 border border-purple-300/65 flex flex-col justify-center gap-2 px-3 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                    <span className="h-1.5 w-7 rounded-full bg-purple-100/90 animate-pulse" />
                    <span className="h-1.5 w-5 rounded-full bg-purple-200/70 animate-pulse" />
                  </div>
                  <div className="absolute -bottom-1 right-0 w-12 h-12 rounded-full bg-[#1a0a36] border border-purple-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(192,132,252,0.85)]">
                    <svg
                      className="vib-motion-spin absolute inset-0 w-full h-full"
                      style={{ animation: 'vib-orbit-ring 2.6s linear infinite' }}
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id={`vibRing-${orderId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#e879f9" stopOpacity="1" />
                          <stop offset="60%" stopColor="#a855f7" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="24"
                        cy="24"
                        r="21"
                        fill="none"
                        stroke={`url(#vibRing-${orderId})`}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray="78 56"
                      />
                    </svg>
                    <svg className="w-6 h-6 text-fuchsia-200" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" opacity="0.7" />
                      <line
                        x1="12"
                        y1="12"
                        x2="12"
                        y2="6.5"
                        stroke="#f0abfc"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="vib-motion-spin"
                        style={{
                          transformOrigin: '12px 12px',
                          animation: 'vib-clock-hand 6s linear infinite',
                        }}
                      />
                      <circle cx="12" cy="12" r="1.4" fill="#f0abfc" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight font-rajdhani">
                {isAutoFulfilled ? (
                  <>
                    <span className="text-white">PAYMENT VERIFIED &amp; </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-purple-400">
                      CODE ISSUED
                    </span>
                  </>
                ) : isOrderApproved ? (
                  <>
                    <span className="text-white">PAYMENT </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300">
                      VERIFIED
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-white">PAYMENT UNDER </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400">
                      VERIFICATION
                    </span>
                  </>
                )}
              </h1>

              <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto leading-relaxed">
                {isAutoFulfilled ? (
                  <>
                    Your payment has been verified and your official Valorant Prepaid PIN is active below and saved in your Order Room.
                  </>
                ) : isOrderApproved ? (
                  <>
                    Payment Successfully verified, thank you for choosing VIB. Continue below to submit your profile showcase details.
                  </>
                ) : (
                  <>
                    Your payment details and transaction screenshot have been successfully submitted.
                    <br className="hidden sm:inline" /> Our team will review your payment and notify you once verification is complete.
                  </>
                )}
              </p>
            </div>

            <div className="pt-1">
              {isAutoFulfilled ? (
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-950/50 border border-emerald-500/45 text-emerald-300 text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(16,185,129,0.18)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Payment Verified &amp; Fulfilled</span>
                </span>
              ) : isOrderApproved ? (
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-950/50 border border-emerald-500/45 text-emerald-300 text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(16,185,129,0.18)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Payment Approved — Ready to Continue</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-950/45 border border-amber-500/45 text-amber-300 text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(245,158,11,0.16)]">
                  <Hourglass className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Awaiting Admin Verification</span>
                </span>
              )}
            </div>
          </div>

          {/* Card 1: Order Details Split Card */}
          <section className="rounded-2xl bg-[#0c081a]/95 border border-purple-500/25 overflow-hidden shadow-[0_0_35px_rgba(126,34,206,0.12)]">
            <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-600/25 border border-purple-500/40 flex items-center justify-center text-purple-300">
                <ClipboardList className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-wide">Order Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12">
              {/* Left Column: Selected Product / Service */}
              <div className="md:col-span-5 p-6 flex items-center gap-5 border-b md:border-b-0 md:border-r border-white/10 min-w-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600/35 via-fuchsia-700/25 to-indigo-900/40 border border-purple-400/40 shadow-[0_0_24px_rgba(168,85,247,0.28)] flex items-center justify-center shrink-0">
                  {renderItemIcon()}
                </div>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-white leading-snug break-words">
                    {itemTitle}
                  </h3>
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-purple-600/25 border border-purple-500/40 text-purple-200 text-[11px] font-medium">
                    {itemCategory}
                  </span>
                  {itemDescription && (
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                      {itemDescription}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: Reference, Amount, UTR, Submission Date & Status */}
              <div className="md:col-span-7 px-6 py-2 divide-y divide-white/[0.07] text-xs sm:text-sm min-w-0">
                <div className="py-3.5 flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2.5 text-gray-400 shrink-0">
                    <Hash className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Order Reference</span>
                  </span>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-white truncate">{orderId}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(orderId, setCopiedOrderRef)}
                      aria-label="Copy Order Reference"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      {copiedOrderRef ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </span>
                </div>

                <div className="py-3.5 flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2.5 text-gray-400 shrink-0">
                    <Coins className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Amount Submitted</span>
                  </span>
                  <span className="font-bold text-white text-base font-rajdhani">{priceFormatted}</span>
                </div>

                <div className="py-3.5 flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2.5 text-gray-400 shrink-0">
                    <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Submission Date</span>
                  </span>
                  <span className="text-gray-200 font-medium text-right">{displayTimestamp}</span>
                </div>

                {utr && (
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2.5 text-gray-400 shrink-0">
                      <CreditCard className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>UTR / Reference</span>
                    </span>
                    <span className="font-mono font-semibold text-gray-200 truncate">{utr}</span>
                  </div>
                )}

                <div className="py-3.5 flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2.5 text-gray-400 shrink-0">
                    <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Current Status</span>
                  </span>
                  {isAutoFulfilled ? (
                    <span className="px-3.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/45 text-emerald-300 text-xs font-semibold">
                      Payment Verified &amp; Issued
                    </span>
                  ) : isOrderApproved ? (
                    <span className="px-3.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/45 text-emerald-300 text-xs font-semibold">
                      Verified — Ready to Continue
                    </span>
                  ) : (
                    <span className="px-3.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/45 text-amber-300 text-xs font-semibold">
                      Awaiting Verification
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Issued PIN Box OR Approved Continue Box OR Timed High Traffic Notice */}
          {isAutoFulfilled && issuedCode ? (
            <section className="rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#0d1924] to-[#120b2a] border border-emerald-500/45 p-6 sm:p-7 shadow-[0_0_32px_rgba(16,185,129,0.16)] flex flex-col sm:flex-row items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
                <Zap className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-black font-rajdhani uppercase tracking-wide text-white">
                  OFFICIAL VALORANT <span className="text-emerald-400">PREPAID PIN</span>
                </h3>
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-black/50 border border-emerald-500/40 max-w-full">
                  <span className="font-mono font-black text-lg text-white tracking-wider select-all truncate">
                    {issuedCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(issuedCode, setCopiedPin)}
                    aria-label="Copy PIN Code"
                    className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 cursor-pointer shrink-0"
                  >
                    {copiedPin ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Open Valorant → VP icon → Prepaid Cards &amp; Codes to redeem. Also saved in your Order Room and Tax Invoice.
                </p>
              </div>
            </section>
          ) : isOrderApproved ? (
            <section className="rounded-2xl bg-gradient-to-r from-emerald-950/55 via-[#0b1822] to-[#120b2a] border border-emerald-500/45 p-6 sm:p-7 shadow-[0_0_32px_rgba(16,185,129,0.18)] flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PAYMENT APPROVED BY ADMIN</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-rajdhani uppercase tracking-wide text-white">
                  Payment Successfully verified, thank you for choosing VIB
                </h3>
                <p className="text-xs sm:text-sm text-gray-300">
                  {liveApprovedUrl || onContinue
                    ? 'Continue now to submit your profile details and inventory screenshot for publishing.'
                    : 'Your payment verification and campaign processing are complete.'}
                </p>
              </div>
              {(liveApprovedUrl || onContinue) && (
                <button
                  type="button"
                  onClick={() => {
                    if (onContinue) {
                      onContinue();
                    } else if (liveApprovedUrl) {
                      window.location.assign(liveApprovedUrl);
                    }
                  }}
                  className="shrink-0 min-h-[48px] px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm uppercase font-rajdhani tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>{continueButtonLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </section>
          ) : showHighTrafficNotice ? (
            <section
              data-testid="high-traffic-notice"
              className="relative rounded-2xl bg-gradient-to-r from-[#190a2d]/95 via-[#120822] to-[#1e0c36]/95 bg-[radial-gradient(ellipse_at_bottom_left,rgba(147,51,234,0.22),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(192,38,211,0.18),transparent_50%)] border border-purple-500/45 p-6 sm:p-7 shadow-[0_0_34px_rgba(168,85,247,0.22),inset_0_1px_0_rgba(216,180,254,0.2)] overflow-hidden"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 rounded-full bg-fuchsia-600/10 blur-2xl"
              />
              <div className="relative flex flex-col sm:flex-row items-center sm:items-center gap-5 sm:gap-7 text-center sm:text-left">
                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                  <div aria-hidden="true" className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl" />
                  <Gauge className="relative w-12 h-12 sm:w-14 sm:h-14 text-purple-200 drop-shadow-[0_0_16px_rgba(192,132,252,0.85)]" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl sm:text-2xl font-black font-rajdhani uppercase tracking-wide text-white">
                    EXPERIENCING{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400">
                      HIGH TRAFFIC
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    We are currently experiencing high traffic, which may result in additional processing time.
                  </p>
                  <p className="text-xs sm:text-sm text-fuchsia-200 font-semibold leading-relaxed">
                    Kindly sit back and relax. Our team will complete the payment verification process, and VIB will notify you once your payment has been approved.
                  </p>
                  <p className="text-xs text-gray-400 pt-1">
                    {nextStepsText || 'Thank you for your patience and for choosing VIB Digital Services.'}
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <section
              data-testid="active-verification-notice"
              className="relative rounded-2xl bg-gradient-to-r from-[#120b24] via-[#0e081c] to-[#170b2c] border border-purple-500/35 p-6 sm:p-7 shadow-[0_0_28px_rgba(147,51,234,0.16)] overflow-hidden"
            >
              <div className="relative flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-400/40 flex items-center justify-center shrink-0">
                    <Loader2 className="w-6 h-6 text-purple-300 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-black font-rajdhani uppercase tracking-wide text-white">
                      VERIFICATION IN <span className="text-purple-400">PROGRESS</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                      Our verification desk is currently checking your payment proof and transaction reference. You will receive an email update and status change here once reviewed.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 px-4 py-2 rounded-xl bg-black/40 border border-purple-500/30 font-mono text-xs text-purple-200">
                  Elapsed: {formatElapsedTime(elapsedMs)}
                </div>
              </div>
            </section>
          )}

          {/* Two Split Navigation Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={onBack}
              className="w-full min-h-[48px] px-6 py-3.5 rounded-xl bg-[#0b0817] hover:bg-[#140e29] border border-white/15 hover:border-white/30 text-gray-200 hover:text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>{backButtonLabel}</span>
            </button>

            <button
              type="button"
              onClick={viewOrdersHandler}
              className="w-full min-h-[48px] px-6 py-3.5 rounded-xl bg-[#0b0817] hover:bg-[#140e29] border border-purple-500/35 hover:border-purple-400/60 text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.12)]"
            >
              <FileText className="w-4 h-4 text-purple-300 shrink-0" />
              <span>View My Orders</span>
            </button>
          </div>

          {/* Bottom Neon Footer Trust Banner */}
          {renderTrustFooter(
            `Hi VIB Team, I have submitted payment for order ${orderId}`
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN CHECKOUT / PAYMENT VIEW (MATCHING MOCKUP IMAGE)
  // =========================================================================
  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white pb-20 font-sans min-h-screen">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
          <button onClick={onBack} className="hover:text-purple-300 transition-colors cursor-pointer">
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <button onClick={onBack} className="hover:text-purple-300 transition-colors cursor-pointer">
            {breadcrumbService}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-purple-400 font-semibold">Payment</span>
        </div>

        {/* Page Title & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-rajdhani">
            COMPLETE YOUR{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400">
              PAYMENT
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
            Make the payment using the QR code or UPI details below and submit the transaction screenshot to place your order.
          </p>
        </div>

        {/* 3-Step Progress Indicator */}
        <div className="py-2">
          <div className="flex items-center justify-between max-w-xl mx-auto relative">
            {/* Step 1: Order Details */}
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="w-10 h-10 rounded-full bg-purple-950/80 border-2 border-purple-500/50 flex items-center justify-center text-purple-300 shadow-md">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-white font-rajdhani uppercase">Order Details</div>
                <div className="text-[10px] text-gray-400 font-mono">Selected Plan</div>
              </div>
            </div>

            {/* Connecting Line 1-2 */}
            <div className="flex-1 h-0.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 mx-2 -mt-5" />

            {/* Step 2: Make Payment (Active) */}
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 border-2 border-fuchsia-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(217,70,239,0.5)]">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-fuchsia-300 font-rajdhani uppercase">Make Payment</div>
                <div className="text-[10px] text-gray-400 font-mono">Pay via UPI / QR</div>
              </div>
            </div>

            {/* Connecting Line 2-3 */}
            <div className="flex-1 h-0.5 bg-white/10 mx-2 -mt-5" />

            {/* Step 3: Verification */}
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-gray-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-gray-400 font-rajdhani uppercase">Verification</div>
                <div className="text-[10px] text-gray-500 font-mono">Admin Confirmation</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top 2-Card Row: Order Summary & Pay Now */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ================================================================= */}
          {/* CARD 1: ORDER SUMMARY                                             */}
          {/* ================================================================= */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0c0919] border border-purple-500/30 p-6 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
            <div className="space-y-5">
              {/* Card Header */}
              <div className="flex items-center gap-2.5 text-white border-b border-white/10 pb-4">
                <ShoppingCart className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold uppercase tracking-wider font-rajdhani">
                  Order Summary
                </h3>
              </div>

              {/* Package Badge & Title */}
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/20 flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-900/40 via-purple-950/60 to-black/80 border border-purple-500/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_18px_rgba(168,85,247,0.3)] p-1">
                  {renderItemIcon()}
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-white font-rajdhani uppercase leading-tight">
                    {itemTitle}
                  </h4>
                  <span className="inline-block px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-mono text-[10px] font-bold uppercase border border-purple-500/30">
                    {itemCategory}
                  </span>
                  <p className="text-xs text-gray-300 pt-1 leading-relaxed line-clamp-2">
                    {itemDescription}
                  </p>
                </div>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2.5 text-xs">
                {displaySpecs.map((spec, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-gray-400">{spec.label}</span>
                    <span className="font-semibold text-white font-rajdhani text-sm">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Payable Row */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/60 to-fuchsia-950/40 border border-purple-500/40 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                  Total Payable
                </div>
                <div className="text-xs text-gray-400">All taxes &amp; verification included</div>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white font-rajdhani tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-fuchsia-300">
                {priceFormatted}
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* CARD 2: PAY NOW                                                   */}
          {/* ================================================================= */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0c0919] border border-purple-500/30 p-6 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
            {/* Card Header */}
            <div className="flex items-center gap-2.5 text-white border-b border-white/10 pb-4">
              <CreditCard className="w-5 h-5 text-fuchsia-400" />
              <h3 className="text-base font-bold uppercase tracking-wider font-rajdhani">
                Pay Now
              </h3>
            </div>

            {/* QR Code and Payment Details Sub-grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left Column: Dynamic UPI QR Code (Auto-fills UPI ID, Payee & Exact Amount) */}
              <div className="md:col-span-6 flex flex-col items-center text-center">
                <UpiQrCode
                  upiId={upiId}
                  payeeName={payeeName}
                  amount={itemPrice}
                  orderId={orderId}
                  currency={currency}
                />
              </div>

              {/* Right Column: Copyable UPI Details */}
              <div className="md:col-span-6 space-y-3.5 text-xs">
                {/* UPI ID */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-gray-400 font-semibold">
                    Or Pay via UPI ID
                  </label>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-colors">
                    <span className="font-mono text-white text-xs truncate select-all">{upiId}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(upiId, setCopiedUpi)}
                      className="p-1 rounded text-purple-300 hover:text-white transition-colors cursor-pointer ml-2"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Payee Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-gray-400 font-semibold">
                    Payee Name
                  </label>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-colors">
                    <span className="font-bold text-gray-200 text-xs truncate">{payeeName}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payeeName, setCopiedPayee)}
                      className="p-1 rounded text-purple-300 hover:text-white transition-colors cursor-pointer ml-2"
                      title="Copy Payee Name"
                    >
                      {copiedPayee ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-gray-400 font-semibold">
                    Amount
                  </label>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-purple-500/40 bg-purple-950/20">
                    <span className="font-black text-white font-rajdhani text-base">{priceFormatted}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(itemPrice.toString(), setCopiedAmount)}
                      className="p-1 rounded text-purple-300 hover:text-white transition-colors cursor-pointer ml-2"
                      title="Copy Amount"
                    >
                      {copiedAmount ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Exact Amount Notice */}
                <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 flex items-start gap-2 text-[11px] text-purple-200 leading-relaxed">
                  <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Use the exact amount and complete the payment to avoid delay in verification.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom 2-Card Row: Screenshot Upload & Instructions */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* =============================================================== */}
            {/* CARD 3: UPLOAD PAYMENT SCREENSHOT *                             */}
            {/* =============================================================== */}
            <div className="lg:col-span-6 rounded-2xl bg-[#0c0919] border border-purple-500/30 p-6 flex flex-col justify-between space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-white border-b border-white/10 pb-4">
                <FileImage className="w-5 h-5 text-fuchsia-400" />
                <h3 className="text-base font-bold uppercase tracking-wider font-rajdhani">
                  Upload Payment Screenshot *
                </h3>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center space-y-2 flex flex-col items-center justify-center min-h-[170px] ${
                  screenshotData
                    ? 'border-emerald-500/50 bg-emerald-950/20'
                    : 'border-purple-500/30 bg-purple-950/20 hover:border-purple-400 hover:bg-purple-950/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {uploadProgress !== null ? (
                  <div className="space-y-2">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                    <span className="text-xs text-gray-300">Reading image file… {uploadProgress}%</span>
                  </div>
                ) : screenshotData ? (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-emerald-300">
                      Screenshot Uploaded: {screenshotName}
                    </div>
                    <div className="text-[11px] text-gray-400 underline hover:text-white">
                      Click to change image
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-white">
                      Click to upload or drag &amp; drop
                    </div>
                    <div className="text-[11px] text-gray-400">
                      PNG, JPG, JPEG, WEBP (Max 10MB)
                    </div>
                  </>
                )}
              </div>

              {/* UTR / Transaction ID Field */}
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-mono uppercase text-gray-400 font-semibold flex items-center justify-between">
                  <span>Transaction ID / UTR Reference *</span>
                  <span className="text-[10px] text-purple-400 font-normal">12-digit UPI reference</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 432198765432"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\s+/g, ''))}
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 font-mono text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* =============================================================== */}
            {/* CARD 4: PAYMENT INSTRUCTIONS                                    */}
            {/* =============================================================== */}
            <div className="lg:col-span-6 rounded-2xl bg-[#0c0919] border border-purple-500/30 p-6 flex flex-col justify-between space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-white border-b border-white/10 pb-4">
                <Info className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold uppercase tracking-wider font-rajdhani">
                  Payment Instructions
                </h3>
              </div>

              <div className="space-y-3.5 py-2">
                {displayInstructions.map((inst, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <span className="leading-relaxed">{inst}</span>
                  </div>
                ))}
              </div>

              {/* Order Reference Notice */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-gray-400">
                <span>Associated Order ID:</span>
                <span className="font-mono font-bold text-purple-300">{orderId}</span>
              </div>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold font-rajdhani uppercase tracking-wider text-gray-300 hover:text-white transition-all cursor-pointer min-h-[46px]"
            >
              ← {backButtonLabel === 'Back to Advertisement Plans' ? 'Back to Plans' : backButtonLabel}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs shadow-[0_0_25px_rgba(217,70,239,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[46px] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Payment Evidence…</span>
                </>
              ) : (
                <>
                  <span>Submit Payment for Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* =================================================================== */}
        {/* FOOTER TRUST CARD (MATCHING MOCKUP)                                 */}
        {/* =================================================================== */}
        {renderTrustFooter(
          `Hi VIB Team, I have a question about payment for order ${orderId}`
        )}
      </div>
    </div>
  );
};
