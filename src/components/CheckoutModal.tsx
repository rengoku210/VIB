import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Zap,
  AlertCircle,
  Copy,
  ArrowRight,
  Loader2,
  Check,
  QrCode,
  Clock,
  Send,
  MessageCircle,
  ExternalLink,
  Download,
  UploadCloud,
  FileImage,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { VPPackage, Currency } from '../types';
import { VP_PACKAGES } from '../data/packages';
import { useAuth } from '../context/AuthContext';
import { verifyRiotIdOnServer, RiotVerificationResponse } from '../lib/riot';
import { downloadBrandedQrCard } from '../utils/qrDownload';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg?: VPPackage;
  customItem?: { title: string; priceINR: number; productId?: string; id?: string };
  currency: Currency;
  onTrackOrder?: (orderId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  pkg,
  customItem,
  currency,
  onTrackOrder,
}) => {
  const { user, token, openAuthModal } = useAuth();
  const [riotId, setRiotId] = useState(() => user?.riot_id?.split('#')[0] || '');
  const [tagline, setTagline] = useState(() => user?.riot_id?.split('#')[1] || '');
  const [email, setEmail] = useState(() => user?.email || '');
  const [contactPhone, setContactPhone] = useState('');
  const [discordTag, setDiscordTag] = useState('');
  const [rentalDuration, setRentalDuration] = useState<'24h' | '48h' | '72h' | '7d'>('24h');
  const [rentalTermsAccepted, setRentalTermsAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    riotId?: string;
    tagline?: string;
    email?: string;
    contactPhone?: string;
    discordTag?: string;
    rentalTerms?: string;
  }>({});
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');

  // Modal Stages: 'form' -> 'payment_qr' -> 'submitted'
  const [modalStage, setModalStage] = useState<'form' | 'submitting_order' | 'payment_qr' | 'submitted'>('form');

  // Active Order info after creation
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  // UTR and Payment Screenshot submission state
  const [utrRef, setUtrRef] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payment settings from server
  const [paymentSettings, setPaymentSettings] = useState<{
    upi_id: string;
    payee_name: string;
    qr_image_url: string;
    instructions: string;
  }>({
    upi_id: 'thevibofficial@okhdfcbank',
    payee_name: 'VIB Digital Services',
    qr_image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=thevibofficial@okhdfcbank&pn=VIB%20Digital%20Services',
    instructions: 'Scan QR with any UPI app (GPay, PhonePe, Paytm, BHIM) or transfer to UPI ID.',
  });

  // Riot ID live verification state
  const [riotVerification, setRiotVerification] = useState<RiotVerificationResponse | null>(null);
  const [isVerifyingRiot, setIsVerifyingRiot] = useState(false);
  const [riotError, setRiotError] = useState<string | null>(null);

  // Copy states
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedOrderRef, setCopiedOrderRef] = useState(false);

  // Fetch payment settings
  useEffect(() => {
    if (isOpen) {
      fetch('/api/payment/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.upi_id) {
            setPaymentSettings(data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Sync user info when modal opens (VIB-03: clear seller/prior details on logout/anonymous)
  useEffect(() => {
    if (isOpen) {
      if (user) {
        if (user.riot_id) {
          const parts = user.riot_id.split('#');
          setRiotId(parts[0] || '');
          setTagline(parts[1] || '');
        } else {
          setRiotId('');
          setTagline('');
        }
        setEmail(user.email || '');
      } else {
        // Explicitly clear all private user state for anonymous sessions
        setRiotId('');
        setTagline('');
        setEmail('');
        setContactPhone('');
        setDiscordTag('');
        setRiotVerification(null);
        setRiotError(null);
      }
      setFieldErrors({});
    }
  }, [user, isOpen]);

  // Live debounced Riot ID verification
  useEffect(() => {
    if (!isOpen) return;
    const cleanName = riotId.trim();
    const cleanTag = tagline.trim();

    if (!cleanName || !cleanTag) {
      setRiotVerification(null);
      setRiotError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsVerifyingRiot(true);
      setRiotError(null);
      const res = await verifyRiotIdOnServer(cleanName, cleanTag);
      setIsVerifyingRiot(false);
      setRiotVerification(res);
      if (!res.exists) {
        setRiotError(res.error || 'Valorant account does not exist or has an invalid tag.');
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [riotId, tagline, isOpen]);

  // Close on Escape key press and lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activePkg = pkg || VP_PACKAGES[0];
  const currentPriceINR = customItem ? customItem.priceINR : activePkg.priceINR;
  const currentTitle = customItem ? customItem.title : `${activePkg.vpLabel} (${activePkg.agentName} Edition)`;
  const lowerTitle = currentTitle.toLowerCase();

  const isValuation = currentPriceINR === 0 || lowerTitle.includes('valuation') || lowerTitle.includes('appraisal');
  const isRegional = lowerTitle.includes('php') || lowerTitle.includes('regional') || lowerTitle.includes('philippines');
  const isRental = lowerTitle.includes('rental');
  const isCoaching = lowerTitle.includes('coaching');
  const isDerank = lowerTitle.includes('derank');
  const isRankup = (lowerTitle.includes('rank') || lowerTitle.includes('progression')) && !isDerank;

  const priceText =
    currency === 'USD'
      ? `$${(currentPriceINR / 83).toFixed(2)}`
      : currency === 'EUR'
      ? `€${(currentPriceINR / 90).toFixed(2)}`
      : `₹${currentPriceINR.toLocaleString('en-IN')}`;

  // Form submission: Validate required fields and create genuine order
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setRiotError(null);

    // Client-side field-level validation (VIB-04 & VIB-05)
    const errors: typeof fieldErrors = {};
    if (!riotId.trim()) errors.riotId = 'Valorant Game Name is required (e.g. PhoenixAim)';
    if (!tagline.trim()) errors.tagline = 'Riot Tagline is required (e.g. IND1)';
    if (!email.trim() || !email.includes('@')) errors.email = 'A valid receipt email address is required';
    if (isRegional && !contactPhone.trim()) errors.contactPhone = 'WhatsApp phone number is required for manual regional delivery';
    if (isCoaching && !discordTag.trim()) errors.discordTag = 'Discord username is required for coaching coordination';
    if (isRental && !rentalTermsAccepted) errors.rentalTerms = 'You must accept the Rental Escrow Terms and fair play pledge';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!token) {
      alert('Please log in or register before checking out so your order is secured to your account.');
      openAuthModal('login');
      return;
    }

    // Verify Riot ID with backend before placing order
    setIsVerifyingRiot(true);
    setRiotError(null);
    const check = await verifyRiotIdOnServer(riotId.trim(), tagline.trim());
    setIsVerifyingRiot(false);
    setRiotVerification(check);

    if (!check.exists) {
      setRiotError(check.error || 'Please provide a legitimate and existing Valorant Riot ID before ordering.');
      return;
    }

    setModalStage('submitting_order');

    try {
      const isCartCheckout = currentTitle.startsWith('Cart Checkout:');
      const packageId = !customItem && pkg ? pkg.id : undefined;
      const resolvedProductId = customItem ? (customItem.productId || customItem.id) : pkg?.id;
      const orderType = isValuation
        ? 'valuation'
        : isCartCheckout
        ? 'cart'
        : isRental
        ? 'rental'
        : isCoaching
        ? 'coaching'
        : isDerank
        ? 'derank'
        : isRankup
        ? 'rankup'
        : isRegional
        ? 'regional_vp'
        : currentTitle.includes('VP')
        ? 'vp'
        : 'profile';

      const res = await fetch('/api/user/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          package_id: packageId,
          product_id: resolvedProductId,
          title: currentTitle,
          amount: isValuation ? 0 : currentPriceINR,
          currency,
          type: orderType,
          paymentMethod: isValuation
            ? 'Free Valuation / Appraisal'
            : paymentMethod === 'upi'
            ? 'UPI Manual QR Verification'
            : paymentMethod === 'card'
            ? 'Card Escrow'
            : 'Net Banking Escrow',
          details: {
            riotId: `${check.gameName || riotId}#${check.tagLine || tagline}`,
            email: email.trim(),
            contactPhone: contactPhone.trim() || undefined,
            discordTag: discordTag.trim() || undefined,
            rentalDuration: isRental ? rentalDuration : undefined,
            category: orderType,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setRiotError(errData?.error || 'Order placement failed. Please verify your details.');
        setModalStage('form');
        return;
      }

      const data = await res.json();
      setCreatedOrder(data.order);

      if (isValuation) {
        setModalStage('submitted');
      } else {
        setModalStage('payment_qr');
      }
    } catch {
      setRiotError('Network communication failure. Please retry.');
      setModalStage('form');
    }
  };

  // Handle File Selection for Payment Screenshot (drag-and-drop or file browser)
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

  // Submit UTR / Payment Evidence
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrRef.trim() || !createdOrder) return;
    setIsSubmittingEvidence(true);
    setEvidenceError(null);

    const screenshotData = screenshotPreview || screenshotUrl.trim() || undefined;

    try {
      const res = await fetch(`/api/orders/${createdOrder.id}/payment-evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ref: utrRef.trim(),
          screenshot: screenshotData,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setEvidenceError(errData?.error || 'Failed to submit payment verification reference.');
        setIsSubmittingEvidence(false);
        return;
      }

      const result = await res.json();
      setCreatedOrder(result.order || createdOrder);
      setModalStage('submitted');
    } catch {
      setEvidenceError('Network error while submitting payment verification.');
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(paymentSettings.upi_id);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyOrderRef = () => {
    if (createdOrder?.id) {
      navigator.clipboard.writeText(createdOrder.id);
      setCopiedOrderRef(true);
      setTimeout(() => setCopiedOrderRef(false), 2000);
    }
  };

  const handleReset = () => {
    setModalStage('form');
    setCreatedOrder(null);
    setUtrRef('');
    setScreenshotUrl('');
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setScreenshotName(null);
    setEvidenceError(null);
    onClose();
  };

  const handleOpenLiveTracking = () => {
    const orderIdToTrack = createdOrder?.id;
    handleReset();
    if (onTrackOrder && orderIdToTrack) {
      onTrackOrder(orderIdToTrack);
    }
  };

  // Authoritative final amount and auto-filled UPI QR URI
  const finalAmount = createdOrder?.amount || currentPriceINR;
  const upiAmountStr = Number(finalAmount).toFixed(2);
  const upiUri = `upi://pay?pa=${paymentSettings.upi_id}&pn=${encodeURIComponent(
    paymentSettings.payee_name
  )}&am=${upiAmountStr}&cu=INR&tn=${encodeURIComponent(`VIB Order #${createdOrder?.id || ''}`)}`;

  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;

  const handleDownloadQr = async () => {
    setIsDownloadingQr(true);
    try {
      await downloadBrandedQrCard({
        orderId: createdOrder?.id || 'PENDING',
        amount: finalAmount,
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

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleReset();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all overflow-y-auto"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="relative w-full max-w-lg rounded-2xl bg-[#0b1018] border border-white/15 p-6 sm:p-8 shadow-2xl overflow-hidden my-6"
        style={{
          boxShadow: `0 0 50px ${activePkg.theme.accentGlow}`,
        }}
      >
        {/* Top Accent Line */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5 z-20"
          style={{ backgroundColor: activePkg.theme.primaryColor }}
        />

        {/* Ambient Character Artwork */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 rounded-2xl select-none">
          <div
            className="absolute -top-12 -left-12 w-80 h-80 rounded-full blur-[100px] opacity-30 pointer-events-none"
            style={{ backgroundColor: activePkg.theme.primaryColor }}
          />
          <img
            src={activePkg.characterAsset}
            alt={activePkg.agentName}
            className="absolute -bottom-10 -left-6 sm:-left-2 h-[85%] sm:h-[95%] max-w-[50%] sm:max-w-[42%] object-contain object-bottom filter brightness-125 contrast-110 drop-shadow-[0_0_25px_rgba(0,0,0,0.85)] opacity-25 sm:opacity-35 transition-all pointer-events-none"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0b1018]/85 to-[#0b1018] z-[1] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1018] via-transparent to-transparent z-[1] pointer-events-none" />
        </div>

        {/* Close Button */}
        <button
          id="close-checkout-modal"
          type="button"
          onClick={handleReset}
          aria-label="Close checkout modal"
          className="absolute top-4 right-4 z-20 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STAGE 1: ORDER DETAILS FORM */}
        {modalStage === 'form' && (
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
                style={{
                  backgroundColor: `${activePkg.theme.primaryColor}20`,
                  borderColor: activePkg.theme.primaryColor,
                }}
              >
                <Zap className="w-5 h-5" style={{ color: activePkg.theme.primaryColor }} />
              </div>
              <div>
                <h3 id="checkout-title" className="font-chakra font-bold text-xl text-white">
                  Order {currentTitle}
                </h3>
                <p className="text-xs font-rajdhani text-gray-400">
                  {isValuation
                    ? 'Official Account Valuation • Verified Market Appraisal Desk'
                    : isRegional
                    ? 'Manual Regional Provisioning • Official WhatsApp Operations Desk (15-30 Mins)'
                    : isRental
                    ? 'Escrow Middleman Rental • Security Pledge & Timed Account Access'
                    : isCoaching
                    ? '1-on-1 Discord Coaching • Session Scheduling & VOD Review'
                    : isDerank
                    ? 'Manual Derank Service • Middleman Supervised Safe MMR Reset'
                    : isRankup
                    ? 'Rank Progression Assistance • Duo-Queue Middleman Escrow'
                    : 'Secured Official Dispatch • Automated Code Delivery & Escrow'}
                </p>
              </div>
            </div>

            {/* Selected Package Banner */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between mb-5 relative z-10 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center p-1 relative shrink-0 overflow-hidden border"
                  style={{
                    backgroundColor: `${activePkg.theme.primaryColor}15`,
                    borderColor: `${activePkg.theme.primaryColor}40`,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-xl blur-md opacity-30 pointer-events-none"
                    style={{ backgroundColor: activePkg.theme.primaryColor }}
                  />
                  <img
                    src={activePkg.characterAsset}
                    alt={activePkg.agentName}
                    className="w-full h-full object-contain filter brightness-125 contrast-115 drop-shadow-[0_0_8px_rgba(0,0,0,0.9)] relative z-10"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="font-chakra font-bold text-sm text-white">
                    {currentTitle}
                  </div>
                  <div className="text-xs font-rajdhani text-gray-400">
                    {isRegional
                      ? 'Manual WhatsApp Dispatch (15-30 Mins)'
                      : isValuation
                      ? 'Complimentary Appraisal Service'
                      : 'Supports Riot Accounts (India / SEA / Global)'}
                  </div>
                </div>
              </div>
              <div
                className="font-rajdhani font-bold text-xl shrink-0"
                style={{ color: activePkg.theme.primaryColor }}
              >
                {isValuation ? 'FREE' : priceText}
              </div>
            </div>

            {/* Checkout Form */}
            <form onSubmit={handleProceedToPayment} className="space-y-4">
              {/* Riot ID & Tag */}
              <div>
                <label className="block text-xs font-chakra tracking-wider text-gray-300 uppercase mb-1.5">
                  Riot ID &amp; Tagline *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    id="input-riot-name"
                    type="text"
                    required
                    placeholder="e.g. PhoenixAim"
                    value={riotId}
                    onChange={(e) => {
                      setRiotId(e.target.value);
                      if (fieldErrors.riotId) setFieldErrors((prev) => ({ ...prev, riotId: undefined }));
                    }}
                    className={`col-span-2 px-3.5 py-2.5 rounded-lg bg-black/50 border text-white placeholder-gray-500 text-base sm:text-sm font-chakra focus:outline-none focus:ring-1 ${
                      fieldErrors.riotId ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-400' : 'border-white/15 focus:border-purple-400 focus:ring-purple-400'
                    }`}
                  />
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-gray-500 font-mono">#</span>
                    <input
                      id="input-riot-tag"
                      type="text"
                      required
                      placeholder="IND1"
                      value={tagline}
                      onChange={(e) => {
                        setTagline(e.target.value);
                        if (fieldErrors.tagline) setFieldErrors((prev) => ({ ...prev, tagline: undefined }));
                      }}
                      className={`w-full pl-7 pr-3 py-2.5 rounded-lg bg-black/50 border text-white placeholder-gray-500 text-base sm:text-sm font-chakra focus:outline-none focus:ring-1 ${
                        fieldErrors.tagline ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-400' : 'border-white/15 focus:border-purple-400 focus:ring-purple-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Inline Field Errors for Riot ID */}
                {(fieldErrors.riotId || fieldErrors.tagline) && (
                  <p className="text-xs text-rose-400 mt-1 font-mono flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.riotId || fieldErrors.tagline}</span>
                  </p>
                )}

                {/* Live Valorant Network Verification Feedback */}
                <div className="mt-2 min-h-[22px]">
                  {isVerifyingRiot ? (
                    <div className="flex items-center gap-1.5 text-xs text-purple-300 font-mono animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      <span>Checking Valorant servers...</span>
                    </div>
                  ) : riotError ? (
                    <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{riotError}</span>
                    </div>
                  ) : riotVerification?.exists ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                      <span>
                        Legitimate Valorant ID Verified ({riotVerification.riotId} • {riotVerification.region?.toUpperCase() || 'GLOBAL'})
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400 block font-chakra">
                      Enter your official Riot Username and Tag (e.g. TenZ#0001 or Player#IND1).
                    </span>
                  )}
                </div>
              </div>

              {/* Category-Specific Field: Regional VP WhatsApp Number */}
              {isRegional && (
                <div>
                  <label className="block text-xs font-chakra tracking-wider text-gray-300 uppercase mb-1.5">
                    WhatsApp Phone Number (For Regional Delivery) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={contactPhone}
                    onChange={(e) => {
                      setContactPhone(e.target.value);
                      if (fieldErrors.contactPhone) setFieldErrors((prev) => ({ ...prev, contactPhone: undefined }));
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-black/50 border text-white placeholder-gray-500 text-base sm:text-sm font-chakra focus:outline-none focus:ring-1 ${
                      fieldErrors.contactPhone ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-400' : 'border-white/15 focus:border-purple-400 focus:ring-purple-400'
                    }`}
                  />
                  {fieldErrors.contactPhone && (
                    <p className="text-xs text-rose-400 mt-1 font-mono flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.contactPhone}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-amber-300/90 font-rajdhani mt-1">
                    * Regional VP packs are provisioned directly on your account via our WhatsApp Desk within 15-30 minutes. Never automated Indian codes.
                  </p>
                </div>
              )}

              {/* Category-Specific Field: Coaching Discord Username */}
              {isCoaching && (
                <div>
                  <label className="block text-xs font-chakra tracking-wider text-gray-300 uppercase mb-1.5">
                    Discord Username / Tag *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. phoenix_aim or Phoenix#1234"
                    value={discordTag}
                    onChange={(e) => {
                      setDiscordTag(e.target.value);
                      if (fieldErrors.discordTag) setFieldErrors((prev) => ({ ...prev, discordTag: undefined }));
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-black/50 border text-white placeholder-gray-500 text-base sm:text-sm font-chakra focus:outline-none focus:ring-1 ${
                      fieldErrors.discordTag ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-400' : 'border-white/15 focus:border-purple-400 focus:ring-purple-400'
                    }`}
                  />
                  {fieldErrors.discordTag && (
                    <p className="text-xs text-rose-400 mt-1 font-mono flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.discordTag}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-purple-300 font-rajdhani mt-1">
                    Your assigned Radiant coach will connect via Discord for voice session scheduling and VOD analysis.
                  </p>
                </div>
              )}

              {/* Category-Specific Field: Rentals (Duration & Security Pledge) */}
              {isRental && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-chakra tracking-wider text-gray-300 uppercase mb-1.5">
                      Rental Access Duration *
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: '24h', label: '24 Hours' },
                        { id: '48h', label: '48 Hours' },
                        { id: '72h', label: '3 Days' },
                        { id: '7d', label: '7 Days' },
                      ].map((dur) => (
                        <button
                          key={dur.id}
                          type="button"
                          onClick={() => setRentalDuration(dur.id as any)}
                          className={`py-2 px-2 text-xs font-chakra font-bold rounded-lg border text-center transition-all cursor-pointer ${
                            rentalDuration === dur.id
                              ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/30'
                              : 'bg-black/40 text-gray-400 border-white/10 hover:border-white/30'
                          }`}
                        >
                          {dur.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1.5 text-xs">
                    <div className="font-bold text-white font-chakra flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>Rental Escrow Security Pledge</span>
                    </div>
                    <p className="text-[11px] text-gray-300 font-rajdhani leading-relaxed">
                      By renting, you agree to play fairly without 3rd-party software or toxicity. Account credentials will be revoked automatically when rental duration expires.
                    </p>
                    <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rentalTermsAccepted}
                        onChange={(e) => {
                          setRentalTermsAccepted(e.target.checked);
                          if (fieldErrors.rentalTerms) setFieldErrors((prev) => ({ ...prev, rentalTerms: undefined }));
                        }}
                        className="mt-0.5 rounded border-purple-400 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-[11px] text-purple-200">
                        I agree to the VIB Fair Play Pledge and understand credentials are timed under official middleman escrow.
                      </span>
                    </label>
                    {fieldErrors.rentalTerms && (
                      <p className="text-xs text-rose-400 mt-1 font-mono flex items-center gap-1 animate-in fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.rentalTerms}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Category-Specific Notice: Derank Consultation */}
              {isDerank && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1 text-xs">
                  <div className="font-bold text-amber-200 font-chakra flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Safe MMR Derank Protocol</span>
                  </div>
                  <p className="text-[11px] text-gray-300 font-rajdhani leading-relaxed">
                    Our Radiant specialist performs manual 5-stack deranking with 0% teammate toxicity or AFK penalty risk. Live match coordination will take place in your private Order Room chat.
                  </p>
                </div>
              )}

              {/* Email / Delivery Notification */}
              <div>
                <label className="block text-xs font-chakra tracking-wider text-gray-300 uppercase mb-1.5">
                  Delivery Receipt Email *
                </label>
                <input
                  id="input-delivery-email"
                  type="email"
                  required
                  placeholder="yourname@domain.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-lg bg-black/50 border text-white placeholder-gray-500 text-base sm:text-sm font-chakra focus:outline-none focus:ring-1 ${
                    fieldErrors.email ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-400' : 'border-white/15 focus:border-purple-400 focus:ring-purple-400'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-rose-400 mt-1 font-mono flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Payment Methods (Only shown for paid services, bypassed for free valuation) */}
              {!isValuation ? (
                <div>
                  <label className="block text-xs font-chakra tracking-wider text-gray-300 uppercase mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'upi', label: 'UPI / QR', sub: 'Manual Review' },
                      { id: 'card', label: 'Card Escrow', sub: 'Escrow Desk' },
                      { id: 'netbanking', label: 'NetBank', sub: 'Direct Bank' },
                    ].map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id as 'upi' | 'card' | 'netbanking')}
                        className={`min-h-[44px] p-2.5 rounded-lg border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                          paymentMethod === method.id
                            ? 'bg-white/15 border-white text-white shadow'
                            : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <div className="font-chakra font-bold text-xs">{method.label}</div>
                        <div className="text-[9px] font-rajdhani text-gray-400">{method.sub}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-300/90 font-rajdhani mt-1.5">
                    * Note: Instant manual UPI QR transfer with 12-digit UTR verification is the primary payment protocol.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Complimentary Valuation Service • No Payment Required</span>
                </div>
              )}

              {/* Security guarantee */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>VIB Escrow Desk • Secure Verified Payment &amp; Identity Protection</span>
              </div>

              {/* Submit CTA */}
              <button
                id="btn-confirm-payment"
                type="submit"
                className="w-full py-3.5 rounded-xl font-chakra font-bold text-base text-black flex items-center justify-center gap-2 transition-all duration-200 transform active:scale-98 shadow-lg cursor-pointer hover:brightness-110 mt-2"
                style={{
                  background: activePkg.theme.ctaGradient,
                  boxShadow: `0 0 20px ${activePkg.theme.accentGlow}`,
                }}
              >
                <span>{isValuation ? 'Submit Free Valuation Request' : `Proceed to Pay ${priceText}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* LOADING STATE: DISPATCHING ORDER */}
        {modalStage === 'submitting_order' && (
          <div className="py-12 flex flex-col items-center text-center space-y-4 relative z-10">
            <Loader2
              className="w-12 h-12 animate-spin"
              style={{ color: activePkg.theme.primaryColor }}
            />
            <h4 className="font-chakra font-bold text-lg text-white">
              Initializing Secure Escrow Order...
            </h4>
            <p className="text-xs font-rajdhani text-gray-400 max-w-xs">
              Verifying Riot ID #{tagline || 'IND1'} and reserving inventory slot...
            </p>
          </div>
        )}

        {/* STAGE 2: MANUAL UPI PAYMENT QR & UTR SUBMISSION */}
        {modalStage === 'payment_qr' && createdOrder && (
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-chakra font-bold text-xl text-white">
                  Scan &amp; Pay via UPI
                </h3>
                <p className="text-xs font-rajdhani text-gray-400">
                  Order Reference: <span className="font-mono text-purple-300 font-bold">#{createdOrder.id}</span>
                </p>
              </div>
            </div>

            {/* QR Code and Bank Display */}
            <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="p-2 bg-white rounded-xl shadow-lg">
                  <img
                    src={dynamicQrUrl}
                    alt="VIB Payment QR"
                    className="w-36 h-36 object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={isDownloadingQr}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/60 border border-purple-500/40 text-purple-200 text-[11px] font-bold font-rajdhani uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm hover:text-white"
                >
                  {isDownloadingQr ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3 text-purple-300" />
                  )}
                  <span>{isDownloadingQr ? 'Downloading...' : 'Download QR Card'}</span>
                </button>
              </div>

              <div className="space-y-2 flex-1">
                <div className="text-xs text-gray-400 font-rajdhani">Official Merchant VPA:</div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="font-mono font-bold text-sm text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded border border-purple-500/30">
                    {paymentSettings.upi_id}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-xs text-gray-400 font-rajdhani">
                  Payee: <strong className="text-white">{paymentSettings.payee_name}</strong>
                </div>

                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 space-y-0.5">
                  <div className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>Auto-Fills on Scan / Download</span>
                  </div>
                  <div className="text-base font-black text-emerald-300 font-rajdhani">
                    Exact Amount: ₹{finalAmount.toLocaleString('en-IN')}.00
                  </div>
                </div>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs font-rajdhani text-gray-300 space-y-1">
              <div className="font-bold text-purple-300 uppercase tracking-wide">Payment Steps:</div>
              <ol className="list-decimal list-inside space-y-0.5 text-gray-400 text-[11px] leading-relaxed">
                <li>Scan QR above (or download card to upload in GPay/PhonePe/Paytm).</li>
                <li>The exact amount (<strong>₹{finalAmount.toLocaleString('en-IN')}</strong>) is automatically filled in your app.</li>
                <li>Complete payment &amp; note the 12-digit <strong>UTR / Bank Ref Number</strong>.</li>
                <li>Upload your payment screenshot below and submit for instant verification.</li>
              </ol>
            </div>

            {/* UTR & Screenshot Submission Form */}
            <form onSubmit={handleSubmitEvidence} className="space-y-3">
              <div>
                <label className="block text-xs font-chakra tracking-wider text-gray-200 uppercase mb-1">
                  Bank Reference Number / UTR (12 Digits) *
                </label>
                <input
                  type="text"
                  required
                  value={utrRef}
                  onChange={(e) => setUtrRef(e.target.value)}
                  placeholder="e.g. 428190184712"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-white/15 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                />
              </div>

              {/* Upload Payment Screenshot Area */}
              <div>
                <label className="block text-xs font-chakra tracking-wider text-gray-200 uppercase mb-1">
                  Upload Payment Screenshot *
                </label>

                {/* Hidden File Input */}
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
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                      isDraggingFile
                        ? 'border-purple-400 bg-purple-950/40 text-purple-200'
                        : 'border-white/15 hover:border-purple-500/50 bg-black/40 hover:bg-black/60 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <UploadCloud className="w-6 h-6 text-purple-400" />
                    <div className="font-chakra text-xs font-semibold">
                      Click to Browse or Drag &amp; Drop Screenshot
                    </div>
                    <div className="text-[10px] font-rajdhani text-gray-500">
                      Supports PNG, JPG, JPEG, WEBP (Max 10MB)
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={screenshotPreview}
                        alt="Screenshot Preview"
                        className="w-12 h-12 object-cover rounded-lg border border-purple-500/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-bold text-white truncate max-w-[200px]">
                          {screenshotName || 'payment_proof.png'}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-rajdhani flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>Image ready for verification</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-2 rounded-lg bg-rose-950/50 hover:bg-rose-900 border border-rose-500/30 text-rose-300 hover:text-white transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Optional URL link alternative */}
              {!screenshotPreview && (
                <div>
                  <label className="block text-[11px] font-rajdhani text-gray-400 mb-0.5">
                    Or paste screenshot URL (Optional):
                  </label>
                  <input
                    type="url"
                    value={screenshotUrl}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    placeholder="https://... (image link)"
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-purple-400"
                  />
                </div>
              )}

              {evidenceError && (
                <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{evidenceError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingEvidence || !utrRef.trim()}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-chakra font-bold text-sm text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-purple-600/30 mt-2"
              >
                {isSubmittingEvidence ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Proof &amp; Verification...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Payment Proof for Verification</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STAGE 3: SUBMITTED FOR VERIFICATION SCREEN */}
        {modalStage === 'submitted' && createdOrder && (
          <div className="py-6 flex flex-col items-center text-center space-y-4 relative z-10">
            <div className="w-14 h-14 rounded-full bg-sky-500/20 border border-sky-500 text-sky-400 flex items-center justify-center">
              {isValuation ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : <Clock className="w-8 h-8 animate-pulse" />}
            </div>

            <div>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-bold mb-2 border ${
                isValuation
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                  : 'bg-sky-950 text-sky-300 border-sky-500/30'
              }`}>
                {isValuation ? 'STATUS: APPRAISAL INQUIRY RECEIVED' : 'STATUS: SUBMITTED FOR VERIFICATION'}
              </div>
              <h4 className="font-chakra font-bold text-2xl text-white">
                {isValuation ? 'Valuation Request Logged!' : 'Payment Proof Received!'}
              </h4>
              <p className="text-xs font-rajdhani text-gray-300 max-w-sm mx-auto mt-1">
                {isValuation
                  ? 'Your account appraisal inquiry has been registered. Our valuation desk will analyze your skin inventory and MMR tier.'
                  : 'Your order is safely locked in VIB escrow. Our accounting desk is cross-checking your bank reference with live statements.'}
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="w-full p-4 rounded-xl bg-black/60 border border-white/10 text-left font-rajdhani space-y-2 text-xs">
              <div className="flex justify-between items-center text-gray-400">
                <span>{isValuation ? 'Appraisal Reference:' : 'Order Reference:'}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-white font-bold">#{createdOrder.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyOrderRef}
                    className="p-1 hover:text-white text-gray-400 cursor-pointer"
                    title="Copy Reference ID"
                  >
                    {copiedOrderRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between text-gray-400">
                <span>Item / Service:</span>
                <span className="text-white font-medium">{currentTitle}</span>
              </div>

              {!isValuation && utrRef && (
                <div className="flex justify-between text-gray-400">
                  <span>Submitted UTR:</span>
                  <span className="font-mono text-purple-300 font-bold">{utrRef}</span>
                </div>
              )}

              {screenshotPreview && (
                <div className="flex justify-between items-center text-gray-400">
                  <span>Payment Screenshot:</span>
                  <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Uploaded &amp; Linked to Admin Ledger</span>
                  </span>
                </div>
              )}

              <div className="flex justify-between text-gray-400">
                <span>Total Amount:</span>
                <span className="font-bold text-emerald-400">{isValuation ? 'FREE (₹0)' : `₹${currentPriceINR.toLocaleString('en-IN')}`}</span>
              </div>

              <div className="pt-2 border-t border-white/10 text-[11px] text-gray-400 leading-relaxed font-sans">
                <strong>What happens next?</strong><br />
                {isValuation ? (
                  <>• Connect with our appraisal desk on WhatsApp with your reference <strong>#{createdOrder.id}</strong> to receive your valuation report and cashout estimate.</>
                ) : isRental ? (
                  <>• <strong>Skin Rentals:</strong> Account login credentials and temporary password will be dispatched directly to your private Order Room under official escrow. Our middleman will coordinate two-factor authentication (OTP) in the order room chat.</>
                ) : isDerank ? (
                  <>• <strong>Safe Derank Consultation:</strong> Your assigned derank specialist will connect in your private Order Room chat. You can coordinate your schedule, target MMR bracket, and party queue preferences directly.</>
                ) : isCoaching || isRankup ? (
                  <>• <strong>Coaching &amp; Rank Consultation:</strong> A Radiant-tier coach/specialist has been assigned. Connect in your order room or on Discord to confirm match timing and voice review session.</>
                ) : isRegional ? (
                  <>• <strong>Regional VP Packs (PHP/Other):</strong> Dispatched via our dedicated regional operations desk within 15-30 minutes on WhatsApp.</>
                ) : (
                  <>• <strong>Indian VP Packs:</strong> Once approved, your genuine Valorant Prepaid PIN code will automatically appear on your live tracking page and be emailed to <span className="text-white">{email}</span>.</>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-2 pt-2">
              {!isValuation && (
                <button
                  type="button"
                  onClick={handleOpenLiveTracking}
                  className="w-full min-h-[44px] py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-chakra font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  <span>Track Live Order &amp; Code Delivery</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/919181801766?text=${encodeURIComponent(
                    isValuation
                      ? `Hello VIB Valuation Desk, I submitted free appraisal request #${createdOrder.id} for Riot ID ${riotId}#${tagline}. Please review my account value.`
                      : `Hello VIB Team, I have submitted payment for Order #${createdOrder.id} (UTR: ${utrRef}). Please verify.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[44px] py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-chakra font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{isValuation ? 'Open Valuation Desk' : 'WhatsApp Desk'}</span>
                </a>

                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-[44px] py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white font-chakra font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
