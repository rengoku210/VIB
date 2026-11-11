import React, { useState, useRef } from 'react';
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
  Megaphone,
  Repeat,
  Crown,
  Shield,
  FileImage,
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
  iconType?: 'megaphone' | 'repeat' | 'crown' | 'shield' | 'sparkles';
  breadcrumbService?: string;
  onBack: () => void;
  backButtonLabel?: string;
  nextStepsText?: string;
  onTrackOrder?: () => void;
  upiId?: string;
  payeeName?: string;
  qrImageUrl?: string;
  instructions?: string[];
  supportWhatsapp?: string;
  onSubmitProof: (utr: string, screenshotData: string) => Promise<boolean>;
  onComplete?: () => void;
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
  breadcrumbService = 'Advertise',
  onBack,
  backButtonLabel = 'Back to Advertisement Plans',
  nextStepsText,
  onTrackOrder,
  upiId = 'thevibofficial@okhdfcbank',
  payeeName = 'VIB Digital Services Platform',
  qrImageUrl,
  instructions,
  supportWhatsapp = '+918099641606',
  onSubmitProof,
  onComplete,
}) => {
  const [utr, setUtr] = useState('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedPayee, setCopiedPayee] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const priceFormatted = formatCurrencyPrice(itemPrice, (currency as Currency) || 'INR');

  // Default specs if none provided
  const displaySpecs: PaymentGatewaySpec[] = specs || [
    { label: 'Duration', value: '24 Hours' },
    { label: 'Reach', value: '50K+ Community' },
    { label: 'Placement', value: 'Instagram Story' },
    { label: 'Processing', value: 'After Payment Verification' },
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
    qrImageUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
      upiString
    )}`;

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
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
        setIsSuccess(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render 3D Hero Icon
  const renderItemIcon = () => {
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

  // =========================================================================
  // SUCCESS / CONFIRMATION VIEW
  // =========================================================================
  if (isSuccess) {
    return (
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
        <div className="max-w-2xl mx-auto rounded-3xl bg-[#0d091e] border border-purple-500/40 p-6 sm:p-10 text-center space-y-6 shadow-[0_0_50px_rgba(168,85,247,0.25)] relative overflow-hidden">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-[11px] font-mono font-bold text-purple-300 uppercase">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Status: SUBMITTED_FOR_VERIFICATION</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-rajdhani uppercase tracking-wide">
              Payment Evidence Submitted!
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-lg mx-auto leading-relaxed">
              Your payment evidence has been securely registered with Order ID{' '}
              <strong className="font-mono text-purple-300">{orderId}</strong>. Our finance desk is reviewing your transaction screenshot.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs space-y-2.5 max-w-md mx-auto">
            <div className="flex justify-between items-center text-gray-400">
              <span>Order ID:</span>
              <span className="font-mono font-bold text-white">{orderId}</span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>Package:</span>
              <span className="font-bold text-purple-300">{itemTitle}</span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>Amount Paid:</span>
              <span className="font-black text-white text-sm font-rajdhani">{priceFormatted}</span>
            </div>
            {utr && (
              <div className="flex justify-between items-center text-gray-400">
                <span>UTR / Reference:</span>
                <span className="font-mono text-emerald-300">{utr}</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 text-left">
            <strong className="text-white block pb-1">What Happens Next?</strong>
            <p className="text-gray-300 leading-relaxed">
              {nextStepsText || (
                <>
                  Once approved, you will receive an official confirmation email at your registered address with a secure
                  link: <em>&ldquo;Continue to Submit Advertisement Details&rdquo;</em> where you can upload your inventory
                  screenshot and social handle.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onTrackOrder && (
              <button
                type="button"
                onClick={onTrackOrder}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                Track Live Order
              </button>
            )}
            <button
              type="button"
              onClick={onBack}
              className={`px-6 py-3 rounded-xl font-bold font-rajdhani uppercase tracking-wider text-xs transition-all cursor-pointer ${
                onTrackOrder
                  ? 'bg-white/10 hover:bg-white/15 border border-white/15 text-gray-200'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30'
              }`}
            >
              {backButtonLabel}
            </button>
            <a
              href={`https://wa.me/${supportWhatsapp.replace(/\+/g, '')}?text=Hi%20VIB%20Team%2C%20I%20have%20submitted%20payment%20for%20order%20${encodeURIComponent(orderId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Chat on WhatsApp</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
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
                <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0 shadow-inner">
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
              {/* Left Column: QR Code */}
              <div className="md:col-span-6 flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-white rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.3)] relative group">
                  <img
                    src={qrSource}
                    alt="VIB Official UPI QR Code"
                    className="w-48 h-48 object-contain rounded-xl"
                  />
                  {/* Center VIB Logo Badge Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-lg bg-[#0b0818] border-2 border-purple-500 flex items-center justify-center shadow-lg">
                      <span className="font-rajdhani font-black text-xs text-white tracking-widest">VIB</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs font-semibold text-gray-300">
                  Scan &amp; Pay with any UPI App
                </div>

                {/* UPI Brand Badges */}
                <div className="flex items-center justify-center gap-2 pt-0.5">
                  <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-[10px] font-mono text-blue-300 font-bold">
                    GPay
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-[10px] font-mono text-purple-300 font-bold">
                    PhonePe
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-500/40 text-[10px] font-mono text-sky-300 font-bold">
                    Paytm
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-[10px] font-mono text-amber-300 font-bold">
                    BHIM
                  </span>
                </div>
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
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#120a26] via-[#0e071e] to-[#090515] border border-purple-500/30 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl">
          {/* Left Brand */}
          <div className="space-y-1 text-center lg:text-left">
            <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 font-rajdhani uppercase tracking-wider">
              VIB Digital Services Platform
            </div>
            <div className="text-xs text-gray-400">
              Your All-in-One Digital Services Platform.
            </div>
          </div>

          {/* Middle 3 Trust Badges */}
          <div className="flex items-center gap-6 sm:gap-8">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <span className="text-[11px] font-semibold text-gray-200">Secure Payments</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <Zap className="w-5 h-5 text-fuchsia-400" />
              <span className="text-[11px] font-semibold text-gray-200">Verified Process</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <Headphones className="w-5 h-5 text-cyan-400" />
              <span className="text-[11px] font-semibold text-gray-200">Dedicated Support</span>
            </div>
          </div>

          {/* Right WhatsApp Support */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center lg:text-right">
            <div>
              <div className="text-xs font-bold text-white font-rajdhani">Facing any issues?</div>
              <div className="text-[11px] text-gray-400">Contact our 24/7 WhatsApp Chat Executive.</div>
            </div>
            <a
              href={`https://wa.me/${supportWhatsapp.replace(/\+/g, '')}?text=Hi%20VIB%20Team%2C%20I%20have%20a%20question%20about%20payment%20for%20order%20${encodeURIComponent(orderId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer flex-shrink-0"
            >
              <span>Chat on WhatsApp</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
