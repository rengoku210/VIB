import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Mail,
  Instagram,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Loader2,
  Trash2,
  ExternalLink,
  Info,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Megaphone,
  BookOpen,
  Bell,
  HelpCircle,
  Headphones,
  Award,
  Users,
  Zap,
  Image as ImageIcon,
} from 'lucide-react';

export interface AdvertisementSubmissionPageProps {
  orderId?: string;
  token?: string;
  onNavigateHome: () => void;
  onNavigatePlans: () => void;
}

interface UploadedImageItem {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
}

const VALORANT_RANKS = [
  'Select Current Rank',
  'Iron 1',
  'Iron 2',
  'Iron 3',
  'Bronze 1',
  'Bronze 2',
  'Bronze 3',
  'Silver 1',
  'Silver 2',
  'Silver 3',
  'Gold 1',
  'Gold 2',
  'Gold 3',
  'Platinum 1',
  'Platinum 2',
  'Platinum 3',
  'Diamond 1',
  'Diamond 2',
  'Diamond 3',
  'Ascendant 1',
  'Ascendant 2',
  'Ascendant 3',
  'Immortal 1',
  'Immortal 2',
  'Immortal 3',
  'Radiant',
  'Unranked / Other',
];

// Client-side image compression: keeps images crisp (1920px max dimension, quality 0.85)
// and limits memory and bandwidth overhead for site optimization.
function compressImage(file: File, maxDim = 1920, quality = 0.85): Promise<{ dataUrl: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: e.target?.result as string, size: file.size });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
        const approxSize = Math.round((base64Length * 3) / 4);
        resolve({ dataUrl, size: approxSize });
      };
      img.onerror = () => reject(new Error('Failed to load image for optimization'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export const AdvertisementSubmissionPage: React.FC<AdvertisementSubmissionPageProps> = ({
  orderId: propOrderId,
  token: propToken,
  onNavigateHome,
  onNavigatePlans,
}) => {
  // Query param fallback
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const activeOrderId = propOrderId || searchParams.get('orderId') || '';
  const activeToken = propToken || searchParams.get('token') || '';

  // Order verification state
  const [order, setOrder] = useState<any | null>(null);
  const [verifyLoading, setVerifyLoading] = useState<boolean>(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Form Fields
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [whatsappContactEnabled, setWhatsappContactEnabled] = useState<boolean>(true);
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [instagramUsername, setInstagramUsername] = useState<string>('');
  const [currentRank, setCurrentRank] = useState<string>('');
  const [premiumSkins, setPremiumSkins] = useState<string>('');
  const [otherValuableItems, setOtherValuableItems] = useState<string>('');

  // Multi-image upload state (capped at 3 max, 5MB limit per file)
  const [images, setImages] = useState<UploadedImageItem[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Verify order on mount or parameter change
  useEffect(() => {
    if (!activeOrderId || !activeToken) {
      setVerifyLoading(false);
      setVerifyError('Missing order ID or verification token. Please open the link from your payment confirmation email.');
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);

    fetch(`/api/advertisement/orders/verify?orderId=${encodeURIComponent(activeOrderId)}&token=${encodeURIComponent(activeToken)}`)
      .then((res) => res.json())
      .then((data) => {
        setVerifyLoading(false);
        if (data.eligible && data.order) {
          const ord = data.order;
          setOrder(ord);

          // Prepopulate fields from existing order if present
          if (ord.selling_price) setSellingPrice(ord.selling_price);
          if (ord.customer_phone) setWhatsappNumber(ord.customer_phone);
          if (ord.whatsapp_contact_enabled !== undefined && ord.whatsapp_contact_enabled !== null) {
            setWhatsappContactEnabled(Boolean(ord.whatsapp_contact_enabled));
          }
          if (ord.customer_email) setEmailAddress(ord.customer_email);
          if (ord.instagram_username) setInstagramUsername(ord.instagram_username);
          if (ord.current_rank) setCurrentRank(ord.current_rank);
          if (ord.premium_skins) setPremiumSkins(ord.premium_skins);
          if (ord.other_valuable_items) setOtherValuableItems(ord.other_valuable_items);

          // Existing screenshots if any
          if (ord.inventory_screenshots_json) {
            try {
              const parsed: string[] = JSON.parse(ord.inventory_screenshots_json);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setImages(
                  parsed.map((url, i) => ({
                    id: `existing_${i}`,
                    name: `Screenshot #${i + 1}`,
                    size: 0,
                    dataUrl: url,
                  }))
                );
              }
            } catch {}
          } else if (ord.inventory_screenshot) {
            setImages([
              {
                id: 'existing_0',
                name: 'Inventory Screenshot',
                size: 0,
                dataUrl: ord.inventory_screenshot,
              },
            ]);
          }
        } else {
          setVerifyError(data.message || 'Unable to verify advertisement order. Please check the link from your email.');
        }
      })
      .catch((err) => {
        setVerifyLoading(false);
        setVerifyError('Unable to connect to the server to verify your order link.');
      });
  }, [activeOrderId, activeToken]);

  // Handle image files selection (capped at 3 images max, 5MB max per image)
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setImageError(null);

    const availableSlots = 3 - images.length;
    if (availableSlots <= 0) {
      setImageError('Maximum 3 images allowed. Please remove an existing image first to upload another.');
      return;
    }

    const filesToProcess = Array.from(fileList).slice(0, availableSlots);
    if (fileList.length > availableSlots) {
      setImageError(`Only ${availableSlots} more image${availableSlots > 1 ? 's' : ''} can be added (3 images max).`);
    }

    setIsProcessingImage(true);
    const newItems: UploadedImageItem[] = [];

    for (const file of filesToProcess) {
      if (!file.type.match(/^image\/(png|jpe?g|webp)$/i)) {
        setImageError(`File "${file.name}" is not a supported format. Please upload JPG, PNG, or WebP.`);
        continue;
      }
      // 5MB Cap per file
      if (file.size > 5 * 1024 * 1024) {
        setImageError(`File "${file.name}" (${formatBytes(file.size)}) exceeds the 5MB size limit. Please upload an optimized image.`);
        continue;
      }

      try {
        const { dataUrl, size } = await compressImage(file);
        newItems.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size,
          dataUrl,
        });
      } catch (e) {
        setImageError(`Failed to process image "${file.name}".`);
      }
    }

    setImages((prev) => [...prev, ...newItems].slice(0, 3));
    setIsProcessingImage(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (idToRemove: string) => {
    setImages((prev) => prev.filter((img) => img.id !== idToRemove));
    setImageError(null);
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validation
    const cleanPrice = sellingPrice.trim().replace(/,/g, '');
    if (!cleanPrice) {
      setSubmitError('Please enter the selling price you want to keep.');
      return;
    }

    const cleanPhone = whatsappNumber.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      setSubmitError('Please enter a valid WhatsApp phone number.');
      return;
    }

    const cleanEmail = emailAddress.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setSubmitError('Please enter a valid email address.');
      return;
    }

    // Instagram username is MANDATORY (per explicit user instruction)
    const cleanInstagram = instagramUsername.trim().replace(/^@/, '');
    if (!cleanInstagram) {
      setSubmitError('Instagram Username is mandatory. Please provide your Instagram username.');
      return;
    }

    if (!currentRank || currentRank === 'Select Current Rank') {
      setSubmitError('Please select your current Valorant rank.');
      return;
    }

    if (!premiumSkins.trim()) {
      setSubmitError('Please list the premium skins and exclusive items in your profile.');
      return;
    }

    if (images.length === 0) {
      setSubmitError('Please upload at least 1 inventory screenshot (up to 3 images max).');
      return;
    }

    setIsSubmitting(true);

    try {
      const fullPhone = `${countryCode} ${cleanPhone}`.trim();
      const res = await fetch(`/api/advertisement/orders/${encodeURIComponent(activeOrderId)}/submit-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: activeToken,
          customerEmail: cleanEmail,
          customerPhone: fullPhone,
          whatsappContactEnabled,
          instagramUsername: cleanInstagram,
          sellingPrice: cleanPrice,
          currentRank,
          premiumSkins: premiumSkins.trim(),
          otherValuableItems: otherValuableItems.trim(),
          inventoryScreenshots: images.map((img) => img.dataUrl),
          inventoryScreenshot: images[0]?.dataUrl,
        }),
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (res.ok && data.success) {
        setSubmitSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSubmitError(data.error || 'Failed to submit promotion details. Please verify your entries.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError('A network error occurred while submitting your details. Please try again.');
    }
  };

  // 1. Loading State
  if (verifyLoading) {
    return (
      <div className="min-h-screen bg-[#07050f] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md p-8 rounded-2xl bg-[#0c0919] border border-purple-500/30 shadow-2xl">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
          <h3 className="text-xl font-bold font-rajdhani uppercase tracking-wider text-white">
            Verifying Your Payment &amp; Order
          </h3>
          <p className="text-xs text-gray-400">
            Please wait while our secure operations gateway checks your promotion authorization...
          </p>
        </div>
      </div>
    );
  }

  // 2. Verification Error State
  if (verifyError || !order) {
    return (
      <div className="min-h-screen bg-[#07050f] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-5 max-w-lg p-8 rounded-2xl bg-[#0c0919] border border-rose-500/40 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black font-rajdhani uppercase text-white tracking-wider">
              Verification Notice
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              {verifyError || 'This advertisement order could not be loaded.'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200">
            If you recently transferred payment, your order may still be under review by the VIB admin team. You will receive an automated confirmation email once verified.
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={onNavigatePlans}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani tracking-wider cursor-pointer min-h-[44px]"
            >
              Browse All Plans
            </button>
            <button
              onClick={onNavigateHome}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold text-xs uppercase font-rajdhani tracking-wider cursor-pointer min-h-[44px]"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Success Screen State
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#07050f] text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center space-y-6 p-8 sm:p-10 rounded-2xl bg-[#0c0919] border border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
              SUBMISSION VERIFIED &amp; QUEUED
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani tracking-wide">
              PROMOTION DETAILS RECEIVED!
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
              Thank you, <strong className="text-white">{order.customer_name || 'Customer'}</strong>. Your complete profile information, screenshots, and Instagram tag have been dispatched to the VIB operations desk.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#140f28] border border-purple-500/30 text-left grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-mono text-gray-400 uppercase block">Order Reference</span>
              <strong className="text-white font-mono">{order.id}</strong>
            </div>
            <div>
              <span className="text-[10px] font-mono text-gray-400 uppercase block">Purchased Plan</span>
              <strong className="text-purple-300 font-rajdhani">{order.plan_name}</strong>
            </div>
            <div>
              <span className="text-[10px] font-mono text-gray-400 uppercase block">Target Handle</span>
              <strong className="text-pink-400 font-mono">@{instagramUsername.replace(/^@/, '')}</strong>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 text-left space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Next Steps in Your Campaign:</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Our marketing team will format your high-resolution graphic showcase, verify your weapon skin collection, and schedule publication on official VIB channels according to your plan.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={onNavigatePlans}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani tracking-wider cursor-pointer min-h-[44px]"
            >
              View More Advertisement Plans
            </button>
            <button
              onClick={onNavigateHome}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold text-xs uppercase font-rajdhani tracking-wider cursor-pointer min-h-[44px]"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Main Submission Form Screen (Matching media_1794124761648_aa384d7c.jpg pixel-for-pixel)
  return (
    <div className="min-h-screen bg-[#07050f] text-white">
      {/* Top Breadcrumb Header Bar */}
      <div className="border-b border-white/5 bg-[#0a0714]/80 backdrop-blur-md">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-2 text-xs text-gray-400 font-medium">
          <button
            onClick={onNavigateHome}
            className="hover:text-purple-300 transition-colors cursor-pointer"
          >
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <button
            onClick={onNavigatePlans}
            className="hover:text-purple-300 transition-colors cursor-pointer"
          >
            Promote
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-purple-300 font-semibold">Submit Promotion Details</span>
        </div>
      </div>

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#140b2e] via-[#0f0923] to-[#1c0e3f] border border-purple-500/30 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4 sm:gap-5 max-w-3xl">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 p-0.5 shadow-[0_0_25px_rgba(168,85,247,0.5)] flex-shrink-0">
                <div className="w-full h-full bg-[#0d0722] rounded-[14px] flex items-center justify-center text-purple-300">
                  <Megaphone className="w-7 h-7 sm:w-8 sm:h-8 text-fuchsia-400 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase text-white font-rajdhani tracking-wide">
                  SUBMIT YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-300 to-indigo-300">PROMOTION DETAILS</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  Your payment has been verified! Please provide the complete details of your digital profile so we can create and publish your promotion as per your purchased plan.
                </p>
              </div>
            </div>

            {/* Decorative 3D Futuristic Card Graphic */}
            <div className="hidden lg:flex items-center gap-3 bg-[#181135]/60 border border-purple-500/30 rounded-xl p-3 shadow-inner">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-6 h-6 text-yellow-300" />
              </div>
              <div className="text-left text-xs pr-3">
                <span className="block font-bold text-white font-rajdhani uppercase tracking-wider">Fast Turnaround</span>
                <span className="text-[11px] text-purple-300 font-mono">Operations Queue: ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Form Layout matching media_1794124761648_aa384d7c.jpg */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Profile & Promotion Information Form (8 cols)                */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-[#0c0919] border border-purple-500/30 space-y-6 shadow-2xl">
              {/* Card Title */}
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <FileText className="w-5 h-5 text-fuchsia-400" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold uppercase text-white font-rajdhani tracking-wider">
                    Profile &amp; Promotion Information
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Fields marked with <span className="text-rose-400 font-bold">*</span> are mandatory.
                  </p>
                </div>
              </div>

              {submitError && (
                <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="block font-bold">Please correct the following:</strong>
                    <span>{submitError}</span>
                  </div>
                </div>
              )}

              {/* Field 1: Price You Want to Keep * */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-200">
                  Price You Want to Keep <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-purple-400 font-bold text-sm select-none">
                    ₹
                  </span>
                  <input
                    type="text"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    required
                    placeholder="Enter your selling price (e.g., 2,999)"
                    className="w-full bg-[#0a0714] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all min-h-[44px]"
                  />
                </div>
              </div>

              {/* Field 2: WhatsApp Number * */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-200">
                  WhatsApp Number <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4 sm:col-span-3">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full bg-[#0a0714] border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-purple-400 min-h-[44px] cursor-pointer"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+971">+971 (AE)</option>
                      <option value="+65">+65 (SG)</option>
                    </select>
                  </div>
                  <div className="col-span-8 sm:col-span-9">
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      required
                      placeholder="Enter WhatsApp number"
                      className="w-full bg-[#0a0714] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Field 3: Let Buyers Contact You on WhatsApp? * (Toggle + Callout) */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#140f28] border border-purple-500/25 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[#25D366] flex-shrink-0 mt-0.5">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-xs font-bold text-white">
                        Let Buyers Contact You on WhatsApp? <span className="text-rose-400">*</span>
                      </span>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Enable this option to display your WhatsApp number with your promotion, allowing interested buyers to contact you directly.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Pills */}
                  <div className="flex items-center gap-1.5 bg-[#0a0714] p-1 rounded-xl border border-white/10 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => setWhatsappContactEnabled(true)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
                        whatsappContactEnabled
                          ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Enabled</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWhatsappContactEnabled(false)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
                        !whatsappContactEnabled
                          ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>Disabled</span>
                    </button>
                  </div>
                </div>

                {/* Note Callout */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#0a0714]/80 border border-purple-500/20 text-[11px] text-purple-200 leading-relaxed">
                  <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Note:</strong> If disabled, your WhatsApp number will remain private and only your Instagram ID will be displayed as the contact option. Keeping WhatsApp contact enabled generally receives higher buyer inquiries, as most customers find it more convenient.
                  </span>
                </div>
              </div>

              {/* Field 4: Row with Email Address & Instagram Username (MANDATORY) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-200">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 select-none" />
                    <input
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      required
                      placeholder="Enter your email address"
                      className="w-full bg-[#0a0714] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-200">
                      Instagram Username <span className="text-rose-400">*</span>
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-pink-400 font-bold text-xs select-none">
                      @
                    </span>
                    <input
                      type="text"
                      value={instagramUsername}
                      onChange={(e) => setInstagramUsername(e.target.value)}
                      required
                      placeholder="e.g., your_instagram"
                      className="w-full bg-[#0a0714] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all min-h-[44px]"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 block">
                    Required for tag and buyer communication. Keep DMs open.
                  </span>
                </div>
              </div>

              {/* Field 5: Current Rank * */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-200">
                  Current Rank <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={currentRank}
                    onChange={(e) => setCurrentRank(e.target.value)}
                    required
                    className="w-full bg-[#0a0714] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-400 min-h-[44px] cursor-pointer appearance-none"
                  >
                    {VALORANT_RANKS.map((r) => (
                      <option key={r} value={r === 'Select Current Rank' ? '' : r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="w-4 h-4 text-gray-400 absolute right-4 top-3.5 rotate-90 pointer-events-none" />
                </div>
              </div>

              {/* Field 6: Premium Skins / Collections * */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-200">
                    Premium Skins / Collections <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-gray-400">
                    {premiumSkins.length} / 3000
                  </span>
                </div>

                {/* Guidance Box inside field */}
                <div className="p-3.5 rounded-xl bg-[#140f28] border border-purple-500/25 space-y-1.5 text-xs text-gray-300">
                  <div className="font-semibold text-purple-300">
                    List all premium, exclusive and valuable skins in your profile:
                  </div>
                  <ul className="text-[11px] text-gray-400 space-y-0.5 list-disc list-inside">
                    <li>Enter one skin per line.</li>
                    <li>Mention the skin name along with its variant/level (if applicable).</li>
                    <li>
                      <em>Example:</em>
                      <span className="block font-mono text-purple-200 mt-0.5 pl-3">
                        Reaver Vandal<br />
                        Prime Phantom<br />
                        Champions 2023 Knife<br />
                        Kuronami Vandal
                      </span>
                    </li>
                  </ul>
                </div>

                <textarea
                  rows={5}
                  maxLength={3000}
                  value={premiumSkins}
                  onChange={(e) => setPremiumSkins(e.target.value)}
                  required
                  placeholder="Enter your premium skins, one per line..."
                  className="w-full bg-[#0a0714] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all font-mono leading-relaxed"
                />
              </div>

              {/* Field 7: Other Valuable Items (Optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-200">
                    Other Valuable Items <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <span className="text-[10px] font-mono text-gray-400">
                    {otherValuableItems.length} / 1500
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Mention other notable items such as Battle Pass, rare cards, buddies, titles, collection completion, etc.
                </p>
                <textarea
                  rows={3}
                  maxLength={1500}
                  value={otherValuableItems}
                  onChange={(e) => setOtherValuableItems(e.target.value)}
                  placeholder="e.g. 150 Radianite Points, Arcane Sheriff Card, Riot Gun Buddy, Episode 1 Immortal Gun Buddy"
                  className="w-full bg-[#0a0714] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all font-mono text-xs"
                />
              </div>

              {/* Field 8: Main Profile / Inventory Image * (Multi-image, capped at 3 max, 5MB limit) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-200">
                    Main Profile / Inventory Image <span className="text-rose-400">*</span>
                  </label>
                  <span className={`text-[11px] font-mono font-bold ${
                    images.length >= 3 ? 'text-amber-400' : 'text-purple-300'
                  }`}>
                    {images.length} / 3 images uploaded
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Dropzone (7 cols) */}
                  <div
                    onClick={() => {
                      if (images.length < 3) fileInputRef.current?.click();
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFilesSelected(e.dataTransfer.files);
                    }}
                    className={`md:col-span-7 border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                      images.length >= 3
                        ? 'border-white/10 bg-[#0a0714]/50 cursor-not-allowed opacity-60'
                        : 'border-white/20 hover:border-purple-500/60 bg-[#0a0714] cursor-pointer'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={(e) => handleFilesSelected(e.target.files)}
                      className="hidden"
                      disabled={images.length >= 3}
                    />

                    {isProcessingImage ? (
                      <div className="space-y-2 py-3">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                        <span className="text-xs text-purple-300 font-mono block">
                          Optimizing image for site performance...
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 py-1">
                        <div className="w-10 h-10 rounded-full bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
                          <UploadCloud className="w-5 h-5 text-fuchsia-400" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-xs font-bold text-white font-rajdhani uppercase">
                            Upload Full Inventory Screenshot
                          </span>
                          <span className="text-[11px] text-gray-400 block">
                            Drag &amp; drop or click to browse
                          </span>
                        </div>
                        <span className="text-[10px] text-purple-300/80 font-mono block">
                          JPG, PNG, WEBP (Max 5MB each, up to 3 images)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Image Guidelines (5 cols) */}
                  <div className="md:col-span-5 p-4 rounded-xl bg-[#140f28] border border-purple-500/25 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold font-rajdhani uppercase text-purple-300">
                      <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span>Image Guidelines</span>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-gray-300">
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>Upload clear and complete inventory / profile screenshots.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>Ensure all major skins and items are visible.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>Use a high-quality image (JPG/PNG/WEBP, Max 5MB).</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>Up to 3 screenshots allowed for multi-weapon showcases.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {imageError && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{imageError}</span>
                  </div>
                )}

                {/* Uploaded Images List / Grid */}
                {images.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-mono uppercase text-gray-400 block font-bold">
                      Attached Screenshots ({images.length} of 3):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {images.map((img, index) => (
                        <div
                          key={img.id}
                          className="relative group rounded-xl bg-[#140f28] border border-purple-500/30 p-2.5 flex items-center gap-2.5 overflow-hidden shadow-md"
                        >
                          <img
                            src={img.dataUrl}
                            alt={`Preview ${index + 1}`}
                            className="w-12 h-12 object-cover rounded-lg border border-white/10 flex-shrink-0 bg-black/40"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="block text-xs font-bold text-white truncate font-mono">
                              {img.name}
                            </span>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              {img.size > 0 ? formatBytes(img.size) : 'Ready'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white transition-colors cursor-pointer"
                            title="Remove image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onNavigatePlans}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 font-bold font-rajdhani uppercase text-xs tracking-wider transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Orders</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-indigo-500 text-white font-bold font-rajdhani uppercase text-xs tracking-wider transition-all shadow-[0_0_25px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 cursor-pointer min-h-[44px] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Promotion Details...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Promotion Details</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: 5 Informative Cards (4 cols)                                */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 space-y-5">
            {/* Card 1: Payment Verified */}
            <div className="p-5 rounded-2xl bg-[#0c0919] border border-purple-500/30 space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase text-white font-rajdhani tracking-wider">
                    Payment Verified
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Your payment has been successfully verified.
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">Purchased Plan</span>
                  <span className="font-bold text-purple-300 font-rajdhani text-right max-w-[60%] truncate">
                    {order.plan_name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">Amount Paid</span>
                  <span className="font-bold text-white font-rajdhani">
                    ₹{Number(order.plan_price).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">Order Reference</span>
                  <span className="font-mono text-purple-200 text-[11px]">
                    {order.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Promotion Instructions */}
            <div className="p-5 rounded-2xl bg-[#0c0919] border border-purple-500/30 space-y-3.5 shadow-xl">
              <div className="flex items-center gap-2.5 text-white font-bold font-rajdhani uppercase text-sm">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Promotion Instructions</span>
              </div>
              <ul className="space-y-2 text-xs text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Provide accurate and complete details of your profile.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>List only premium, exclusive and valuable skins.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Enter each skin on a new line.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Upload one clear and full inventory screenshot.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Ensure your contact details (WhatsApp, Email, Instagram) are correct and active.</span>
                </li>
              </ul>
            </div>

            {/* Card 3: Important Reminder (Glowing Amber Border) */}
            <div className="p-5 rounded-2xl bg-[#1a1208] border border-amber-500/40 space-y-2.5 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <div className="flex items-center gap-2.5 text-amber-300 font-bold font-rajdhani uppercase text-sm">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Important Reminder</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Customers must remind us when their WhatsApp status promotion is due. Since we manage multiple profiles, we may not be able to identify each customer&apos;s profile or remember every posting schedule without a reminder.
              </p>
            </div>

            {/* Card 4: What Happens Next? */}
            <div className="p-5 rounded-2xl bg-[#0c0919] border border-purple-500/30 space-y-3.5 shadow-xl">
              <div className="flex items-center gap-2.5 text-white font-bold font-rajdhani uppercase text-sm">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>What Happens Next?</span>
              </div>
              <div className="space-y-3 text-xs text-gray-300">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-purple-600/30 border border-purple-400/40 text-purple-300 font-mono font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Our team will review your submitted details and inventory.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-purple-600/30 border border-purple-400/40 text-purple-300 font-mono font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <span>We will prepare your promotion (listing, edits and scheduled posting) as per your purchased plan.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-purple-600/30 border border-purple-400/40 text-purple-300 font-mono font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Your profile will be published on the selected VIB platforms (e.g., WhatsApp Status / Channel / Website) shortly.</span>
                </div>
              </div>
            </div>

            {/* Card 5: Need Assistance? */}
            <div className="p-5 rounded-2xl bg-[#0c0919] border border-purple-500/30 space-y-3 shadow-xl">
              <div className="flex items-center gap-2.5 text-white font-bold font-rajdhani uppercase text-sm">
                <Headphones className="w-4 h-4 text-fuchsia-400" />
                <span>Need Assistance?</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Contact our VIB support executive for any questions or help regarding your promotion.
              </p>
              <a
                href={`https://wa.me/918099641606?text=Hi%20VIB%20Team%2C%20I%20need%20assistance%20with%20my%20promotion%20submission%20for%20order%20${order.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs uppercase font-rajdhani tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] shadow-[0_0_20px_rgba(37,211,102,0.3)]"
              >
                <Phone className="w-4 h-4" />
                <span>Chat on WhatsApp →</span>
              </a>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOOTER STRIP: VIB Digital Services Platform (Matching screenshot footer)  */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-gradient-to-r from-[#120a28] via-[#0d071e] to-[#170c33] border border-purple-500/30 p-6 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-2xl">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black font-rajdhani text-white tracking-wider">
                VIB
              </span>
              <span className="text-xs sm:text-sm font-bold text-purple-300 font-rajdhani uppercase tracking-wider">
                Digital Services Platform
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Promote your profile through VIB to reach potential buyers, increase visibility, and generate genuine interest.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 text-center">
            <div className="space-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
                <Users className="w-4 h-4" />
              </div>
              <span className="block text-xs font-bold text-white font-rajdhani">25,000+</span>
              <span className="text-[10px] text-gray-400 block">Users Facilitated</span>
            </div>

            <div className="space-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="block text-xs font-bold text-white font-rajdhani">Trusted &amp;</span>
              <span className="text-[10px] text-gray-400 block">Professional</span>
            </div>

            <div className="space-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-fuchsia-400 mx-auto">
                <Zap className="w-4 h-4" />
              </div>
              <span className="block text-xs font-bold text-white font-rajdhani">Wider</span>
              <span className="text-[10px] text-gray-400 block">Reach</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
