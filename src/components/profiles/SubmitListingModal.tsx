import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  ShieldCheck,
  Check,
  AlertCircle,
  Tag,
  DollarSign,
  Award,
  Plus,
  Loader2,
  Trash2,
  Search,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SkinSelectorModal } from '../skins/SkinSelectorModal';
import { verifyRiotIdOnServer } from '../../lib/riot';

const ranks = [
  'Radiant',
  'Immortal 3',
  'Immortal 2',
  'Immortal 1',
  'Ascendant 3',
  'Ascendant 2',
  'Ascendant 1',
  'Diamond 3',
  'Diamond 2',
  'Diamond 1',
  'Platinum 3',
  'Platinum 2',
  'Platinum 1',
  'Gold 3',
  'Gold 2',
  'Gold 1',
  'Silver 3',
  'Silver 2',
  'Silver 1',
  'Bronze 3',
  'Bronze 2',
  'Bronze 1',
  'Iron 3',
  'Iron 2',
  'Iron 1',
  'Unranked',
];

const regions = [
  'AP / Mumbai',
  'AP / Singapore',
  'North America (NA)',
  'Europe (EU)',
  'Brazil (BR)',
  'Latin America (LATAM)',
  'Korea (KR)',
];

interface SubmitListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialListing?: any;
}

export const SubmitListingModal: React.FC<SubmitListingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialListing,
}) => {
  const { user, token } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceINR, setPriceINR] = useState<number | ''>('');
  const [rank, setRank] = useState('Diamond 1');
  const [peakRank, setPeakRank] = useState('Diamond 3');
  const [level, setLevel] = useState<number | ''>(120);
  const [region, setRegion] = useState('AP / Mumbai');
  const [knifeCount, setKnifeCount] = useState<number | ''>(2);
  const [selectedSkins, setSelectedSkins] = useState<string[]>([]);
  const [vipPlan, setVipPlan] = useState<'none' | 'silver' | 'gold' | 'platinum'>('none');
  const [images, setImages] = useState<string[]>([]);
  const [customImageUrl, setCustomImageUrl] = useState('');

  // Riot ID In-Game Account Information Autofill
  const [riotIdInput, setRiotIdInput] = useState('');
  const [isVerifyingRiot, setIsVerifyingRiot] = useState(false);
  const [riotVerifiedAccount, setRiotVerifiedAccount] = useState<any | null>(null);

  const [showSkinSelector, setShowSkinSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initialize or reset form state on open / initialListing change
  useEffect(() => {
    if (!isOpen) return;

    if (initialListing) {
      setTitle(initialListing.title || '');
      setDescription(initialListing.description || '');
      setPriceINR(initialListing.price_inr !== undefined ? Number(initialListing.price_inr) : '');
      setRank(initialListing.rank || 'Diamond 1');
      setPeakRank(initialListing.peak_rank || initialListing.rank || 'Diamond 3');
      setLevel(initialListing.level !== undefined ? initialListing.level : 120);
      setRegion(initialListing.region || 'AP / Mumbai');
      setKnifeCount(initialListing.knife_count !== undefined ? initialListing.knife_count : 0);

      let parsedSkins: string[] = [];
      try {
        parsedSkins = Array.isArray(initialListing.skins)
          ? initialListing.skins
          : (initialListing.skins_json ? JSON.parse(initialListing.skins_json) : []);
      } catch {}
      setSelectedSkins(parsedSkins);

      setVipPlan(initialListing.vip_plan || 'none');
      let parsedImages: string[] = [];
      try {
        parsedImages = Array.isArray(initialListing.images)
          ? initialListing.images
          : (initialListing.images_json ? JSON.parse(initialListing.images_json) : []);
      } catch {}
      setImages(parsedImages);
      setCustomImageUrl('');
      setRiotIdInput('');
      setRiotVerifiedAccount(null);
    } else {
      setTitle('');
      setDescription('');
      setPriceINR('');
      setRank('Diamond 1');
      setPeakRank('Diamond 3');
      setLevel(120);
      setRegion('AP / Mumbai');
      setKnifeCount(2);
      setSelectedSkins([]);
      setVipPlan('none');
      setImages([]);
      setCustomImageUrl('');
      setRiotIdInput(user?.riot_id || '');
      setRiotVerifiedAccount(null);
    }
    setError(null);
    setSuccessMsg(null);
  }, [isOpen, initialListing, user]);

  if (!isOpen) return null;

  // Handle Riot ID Account Verification & Auto-fill
  const handleVerifyRiotAccount = async () => {
    if (!riotIdInput.trim()) return;
    setIsVerifyingRiot(true);
    setError(null);
    try {
      const res = await verifyRiotIdOnServer(riotIdInput.trim());
      if (res.exists) {
        setRiotVerifiedAccount(res);
        if (res.accountLevel) setLevel(res.accountLevel);
        if (res.region) {
          const r = res.region.toLowerCase();
          if (r === 'ap') setRegion('AP / Mumbai');
          else if (r === 'na') setRegion('North America (NA)');
          else if (r === 'eu') setRegion('Europe (EU)');
        }
        if (res.cardSmall && images.length === 0) {
          setImages([res.cardSmall]);
        }
      } else {
        setError(res.error || 'Valorant account not found on official Riot servers.');
      }
    } catch {
      setError('Failed to query Valorant verification service.');
    } finally {
      setIsVerifyingRiot(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    const maxFiles = 6;
    const remainingSlots = maxFiles - images.length;

    if (remainingSlots <= 0) {
      setError(`Maximum ${maxFiles} screenshots allowed per listing.`);
      return;
    }

    const filesToProcess: File[] = (Array.from(files) as File[]).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files (PNG, JPG, WebP) are supported.');
        continue;
      }
      if (file.size > 3 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds 3MB limit.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddImageUrl = () => {
    if (!customImageUrl.trim()) return;
    if (images.length >= 6) {
      setError('Maximum 6 screenshots allowed per listing.');
      return;
    }
    setImages((prev) => [...prev, customImageUrl.trim()]);
    setCustomImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (submitForReview: boolean) => {
    if (!title.trim()) {
      setError('Listing title is required.');
      return;
    }
    if (!priceINR || Number(priceINR) <= 0) {
      setError('Please provide a valid asking price in INR.');
      return;
    }
    if (!token) {
      setError('You must be signed in to submit an account listing.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const isEditing = Boolean(initialListing?.id);
    const url = isEditing ? `/api/user/listings/${initialListing.id}` : '/api/user/listings';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price_inr: Number(priceINR),
          rank,
          peak_rank: peakRank,
          level: Number(level) || 1,
          region,
          skin_count: selectedSkins.length,
          knife_count: Number(knifeCount) || 0,
          vip_plan: vipPlan,
          images: images.length > 0
            ? images
            : (initialListing?.images && initialListing.images.length > 0
                ? initialListing.images
                : ['/assets/hires/profiles/card1_omen.jpg']),
          skins: selectedSkins,
          submitForReview
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || 'Failed to submit listing.');
        return;
      }

      setSuccessMsg(
        isEditing
          ? (submitForReview ? 'Listing updated and submitted for review!' : 'Listing changes saved successfully!')
          : (submitForReview
              ? 'Listing submitted successfully! Our compliance desk will review and publish it.'
              : 'Listing draft saved successfully.')
      );

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch {
      setError('Network communication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSkin = (skinName: string) => {
    setSelectedSkins((prev) => prev.filter((s) => s !== skinName));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-listing-heading"
        className="relative w-full max-w-2xl rounded-2xl bg-[#0a0c16] border border-purple-500/30 p-6 sm:p-8 shadow-2xl my-8 text-white space-y-6"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              {initialListing ? <Edit3 className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
            </div>
            <div>
              <h3 id="submit-listing-heading" className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                {initialListing ? 'Edit Valorant Account Listing' : 'Sell Your Valorant Account'}
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                {initialListing ? `Updating Listing #${initialListing.id}` : 'Official VIB Escrow Middleman Marketplace listing portal'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close submit listing modal"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Optional Riot ID In-Game Profile Auto-Sync */}
        <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono uppercase text-purple-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Auto-Fill from Valorant In-Game Profile (Optional)</span>
            </label>
            {riotVerifiedAccount?.exists && (
              <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Verified ({riotVerifiedAccount.riotId})</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={riotIdInput}
              onChange={(e) => setRiotIdInput(e.target.value)}
              placeholder="Enter Riot ID (e.g. TenZ#0001 or Player#IND1)..."
              className="flex-1 min-h-[40px] px-3.5 py-2 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-xs focus:ring-2 focus:ring-purple-400"
            />
            <button
              type="button"
              disabled={isVerifyingRiot || !riotIdInput.trim()}
              onClick={handleVerifyRiotAccount}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-rajdhani uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isVerifyingRiot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Sync Info</span>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 font-rajdhani">
            * Automatically fetches official account level, region, and official banner card directly from the Valorant API.
          </p>
        </div>

        {/* Listing Form Fields */}
        <div className="space-y-4 text-xs font-rajdhani">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-mono text-gray-300 uppercase mb-1">
              Listing Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Immortal 2 • Kuronami Vandal + Reaver Karambit"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-sans text-xs focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Ranks & Level Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-gray-300 uppercase mb-1">
                Current Rank *
              </label>
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:ring-2 focus:ring-purple-400"
              >
                {ranks.map((r) => (
                  <option key={r} value={r} className="bg-[#0b1018]">{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-300 uppercase mb-1">
                Peak Rank
              </label>
              <select
                value={peakRank}
                onChange={(e) => setPeakRank(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:ring-2 focus:ring-purple-400"
              >
                {ranks.map((r) => (
                  <option key={r} value={r} className="bg-[#0b1018]">{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-300 uppercase mb-1">
                Account Level
              </label>
              <input
                type="number"
                min="1"
                value={level}
                onChange={(e) => setLevel(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="120"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          {/* Region, Price & Knives Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-gray-300 uppercase mb-1">
                Server Region *
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:ring-2 focus:ring-purple-400"
              >
                {regions.map((reg) => (
                  <option key={reg} value={reg} className="bg-[#0b1018]">{reg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-300 uppercase mb-1">
                Asking Price (INR) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={priceINR}
                onChange={(e) => setPriceINR(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="4999"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-300 uppercase mb-1">
                Knife / Melee Count
              </label>
              <input
                type="number"
                min="0"
                value={knifeCount}
                onChange={(e) => setKnifeCount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          {/* Skin Inventory Selection Section */}
          <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-xs uppercase tracking-wide">
                  Skin Inventory ({selectedSkins.length} Included)
                </div>
                <div className="text-[11px] text-gray-400 font-sans">
                  Select premium Valorant weapon skins from our official verified catalog.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSkinSelector(true)}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/60 border border-purple-500/40 text-purple-200 text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Select Skins</span>
              </button>
            </div>

            {selectedSkins.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {selectedSkins.map((skin) => (
                  <span
                    key={skin}
                    className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-[11px] font-mono text-purple-200 flex items-center gap-1.5"
                  >
                    <span>{skin}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkin(skin)}
                      className="text-gray-400 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-gray-500 italic py-1 font-sans">
                No skins added yet. Click &quot;Select Skins&quot; to pick from catalog.
              </div>
            )}
          </div>

          {/* Account Evidence & Screenshots Upload */}
          <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-purple-400" />
                  <span>Account Media & Screenshots ({images.length}/6)</span>
                </div>
                <div className="text-[11px] text-gray-400 font-sans">
                  Upload screenshot evidence of rank, skins inventory, and career stats. First image will be used as primary thumbnail.
                </div>
              </div>
            </div>

            {/* Dropzone & File Input */}
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-900/30 text-purple-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-purple-400" />
                <span>Upload Screenshots (Max 3MB each)</span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Direct URL input alternative */}
              <div className="flex gap-1.5 sm:w-1/2">
                <input
                  type="url"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  placeholder="Or paste screenshot URL..."
                  className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-sans text-xs focus:ring-2 focus:ring-purple-400"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  disabled={!customImageUrl.trim()}
                  className="px-3 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Uploaded Thumbnails Preview Grid */}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video rounded-lg overflow-hidden border border-white/15 bg-black/60 group"
                  >
                    <img
                      src={img}
                      alt={`Uploaded proof ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/hires/profiles/card1_exact.jpg';
                      }}
                    />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-black text-[9px] font-black uppercase font-mono">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-gray-500 italic py-0.5 font-sans">
                No screenshots attached yet. Attach at least 1 image for faster compliance review.
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono text-gray-300 uppercase mb-1">
              Account Description / Features
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Battlepass completed EP 7 & 8, all agents unlocked, prime match verified, low ping AP servers."
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-sans text-xs focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Promotional VIP Plan Choice */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
            <div className="font-bold text-white text-xs uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Promotional VIP Plan (Optional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <label className={`p-2.5 rounded-lg border cursor-pointer flex flex-col justify-between ${vipPlan === 'none' ? 'bg-purple-950/40 border-purple-500' : 'bg-black/30 border-white/5'}`}>
                <input type="radio" name="vipPlan" checked={vipPlan === 'none'} onChange={() => setVipPlan('none')} className="sr-only" />
                <span className="font-bold text-gray-200">Standard</span>
                <span className="text-[10px] text-gray-400 font-mono">Free • Normal Queue</span>
              </label>

              <label className={`p-2.5 rounded-lg border cursor-pointer flex flex-col justify-between ${vipPlan === 'silver' ? 'bg-purple-950/40 border-purple-500' : 'bg-black/30 border-white/5'}`}>
                <input type="radio" name="vipPlan" checked={vipPlan === 'silver'} onChange={() => setVipPlan('silver')} className="sr-only" />
                <span className="font-bold text-gray-200">Silver VIP</span>
                <span className="text-[10px] text-amber-300 font-mono">₹499 • 7 Days Featured</span>
              </label>

              <label className={`p-2.5 rounded-lg border cursor-pointer flex flex-col justify-between ${vipPlan === 'gold' ? 'bg-purple-950/40 border-purple-500' : 'bg-black/30 border-white/5'}`}>
                <input type="radio" name="vipPlan" checked={vipPlan === 'gold'} onChange={() => setVipPlan('gold')} className="sr-only" />
                <span className="font-bold text-gray-200">Gold High-Impact</span>
                <span className="text-[10px] text-amber-300 font-mono">₹899 • 14 Days Top</span>
              </label>

              <label className={`p-2.5 rounded-lg border cursor-pointer flex flex-col justify-between ${vipPlan === 'platinum' ? 'bg-purple-950/40 border-purple-500' : 'bg-black/30 border-white/5'}`}>
                <input type="radio" name="vipPlan" checked={vipPlan === 'platinum'} onChange={() => setVipPlan('platinum')} className="sr-only" />
                <span className="font-bold text-gray-200">Spotlight Pro</span>
                <span className="text-[10px] text-amber-300 font-mono">₹1,499 • 30 Days Home</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Escrow middleman protection included</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold font-rajdhani uppercase text-xs transition-colors cursor-pointer"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="flex-1 sm:flex-none min-h-[44px] px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold font-rajdhani uppercase text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Submit for Verification</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Skin Selector Modal */}
      <SkinSelectorModal
        isOpen={showSkinSelector}
        onClose={() => setShowSkinSelector(false)}
        selectedSkins={selectedSkins}
        onConfirmSelection={(skins) => setSelectedSkins(skins)}
      />
    </div>
  );
};
