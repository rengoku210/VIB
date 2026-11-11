import React, { useState } from 'react';
import {
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Tag,
  Layers,
  Globe,
  Sparkles,
  Loader2,
  ArrowRight,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { VALORANT_RANKS } from '../../data/rank-pricing';

interface AdminCreateListingSectionProps {
  onSuccess?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

const REGIONS = [
  'Asia Pacific (Mumbai)',
  'Asia Pacific (Singapore)',
  'Europe (EU)',
  'North America (NA)',
  'Philippines (PHP)',
  'Indonesia (ID)',
  'Korea (KR)',
  'Latin America (LATAM)',
  'Brazil (BR)',
];

const PRESET_SKINS = [
  'Kuronami Vandal',
  'Prime Vandal',
  'Reaver Vandal',
  'Araxys Vandal',
  'Champions 2024 Vandal',
  'Glitchpop Vandal',
  'Ion Phantom',
  'Oni Phantom',
  'Reaver Operator',
  'Elderflame Operator',
  'Sovereign Ghost',
  'Prime Axe',
  'Kuronami No Yaiba',
  'RGX 11z Pro Blade',
];

const PRESET_THUMBNAILS = [
  { label: 'Prime Vandal', url: '/assets/items/vandal-prime.png' },
  { label: 'Reaper Vandal', url: '/assets/items/vandal-reaper.png' },
  { label: 'RGX Vandal', url: '/assets/items/vandal-rgx.png' },
  { label: 'RGX Phantom', url: '/assets/items/phantom-rgx.png' },
  { label: 'Hero Artwork', url: '/assets/reference_parts/part_01.png' },
];

export const AdminCreateListingSection: React.FC<AdminCreateListingSectionProps> = ({
  onSuccess,
  isModal = false,
  onClose,
}) => {
  const { token, user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceINR, setPriceINR] = useState<number | ''>('');
  const [rank, setRank] = useState(VALORANT_RANKS[0]?.name || 'Unranked');
  const [peakRank, setPeakRank] = useState(VALORANT_RANKS[0]?.name || 'Unranked');
  const [level, setLevel] = useState<number>(1);
  const [region, setRegion] = useState('Asia Pacific (Mumbai)');
  const [guaranteeType, setGuaranteeType] = useState<'guaranteed' | 'escrow_protected'>('escrow_protected');
  const [sellerName, setSellerName] = useState('');
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [selectedThumbnail, setSelectedThumbnail] = useState('');
  const [customThumbnail, setCustomThumbnail] = useState('');
  const [selectedSkins, setSelectedSkins] = useState<string[]>([]);
  const [newSkinInput, setNewSkinInput] = useState('');
  const [knifeCount, setKnifeCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleSkin = (skin: string) => {
    if (selectedSkins.includes(skin)) {
      setSelectedSkins(selectedSkins.filter((s) => s !== skin));
    } else {
      setSelectedSkins([...selectedSkins, skin]);
    }
  };

  const addCustomSkin = () => {
    const trimmed = newSkinInput.trim();
    if (trimmed && !selectedSkins.includes(trimmed)) {
      setSelectedSkins([...selectedSkins, trimmed]);
      setNewSkinInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!token) {
      setErrorMessage('Staff authentication required. Please re-authenticate.');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Account listing title is required.');
      return;
    }

    if (!priceINR || Number(priceINR) <= 0) {
      setErrorMessage('A valid price in INR is required.');
      return;
    }

    setLoading(true);
    const finalImage = customThumbnail.trim() || selectedThumbnail;

    try {
      const res = await fetch('/api/admin/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price_inr: Number(priceINR),
          rank,
          peak_rank: peakRank || rank,
          level: Number(level) || 1,
          region,
          guarantee_type: guaranteeType,
          seller_name: sellerName.trim() || user?.name || 'VIB Official Vault',
          seller_role: 'admin',
          featured,
          skin_count: selectedSkins.length,
          knife_count: Number(knifeCount) || 0,
          images: finalImage ? [finalImage] : [],
          skins: selectedSkins,
          status,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setErrorMessage(data?.error || 'Failed to create marketplace listing.');
        setLoading(false);
        return;
      }

      setSuccessMessage(
        status === 'published'
          ? `Listing "${title}" is now live on the public marketplace!`
          : `Draft listing "${title}" saved successfully.`
      );

      // Reset form fields
      setTitle('');
      setDescription('');
      setPriceINR('');
      setSelectedSkins([]);
      setCustomThumbnail('');

      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000);
      }
    } catch {
      setErrorMessage('Network communication error while creating listing.');
    } finally {
      setLoading(false);
    }
  };

  const containerClasses = isModal
    ? 'p-6 space-y-6 max-h-[85vh] overflow-y-auto'
    : 'p-6 sm:p-8 rounded-3xl bg-[#0c081b] border border-purple-500/25 space-y-6 shadow-2xl';

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/70 border border-purple-500/40 text-[10px] font-mono text-purple-300 uppercase font-bold">
            <Plus className="w-3 h-3 text-purple-400" />
            <span>Admin Marketplace Creator</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-rajdhani text-white uppercase tracking-wider">
            Add Marketplace Account Listing
          </h2>
          <p className="text-xs text-gray-400 font-rajdhani">
            Directly configure, inspect inventory, and publish official Valorant accounts to the public marketplace.
          </p>
        </div>

        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <h3 className="text-xs font-mono text-purple-300 uppercase tracking-wider font-bold flex items-center gap-2">
            <Tag className="w-3.5 h-3.5" />
            <span>1. Listing Details &amp; Pricing</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 space-y-1.5">
              <label className="text-[11px] font-mono text-gray-300 uppercase">
                Listing Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Immortal 2 • Kuronami Vandal, Reaver & Prime Melee"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-purple-400 text-white text-xs font-sans placeholder:text-gray-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-[11px] font-mono text-gray-300 uppercase">
                Price (INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono">
                  ₹
                </span>
                <input
                  type="number"
                  required
                  min={100}
                  value={priceINR}
                  onChange={(e) => setPriceINR(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="3499"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-purple-400 text-white text-xs font-mono placeholder:text-gray-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-gray-300 uppercase">
              Description &amp; Transfer Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. First-owner clean account. Full email access provided upon purchase. Zero ban history, all agent contracts unlocked."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-purple-400 text-white text-xs font-sans placeholder:text-gray-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Section 2: Competitive Ranks & Regional Metadata */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h3 className="text-xs font-mono text-purple-300 uppercase tracking-wider font-bold flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            <span>2. Account Tier &amp; Server Region</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-gray-300 uppercase">
                Current Rank *
              </label>
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-purple-400 text-white text-xs font-sans focus:outline-none"
              >
                {VALORANT_RANKS.map((r) => (
                  <option key={r.id} value={r.name} className="bg-gray-900">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-gray-300 uppercase">
                Peak Rank *
              </label>
              <select
                value={peakRank}
                onChange={(e) => setPeakRank(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-purple-400 text-white text-xs font-sans focus:outline-none"
              >
                {VALORANT_RANKS.map((r) => (
                  <option key={`peak_${r.id}`} value={r.name} className="bg-gray-900">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-gray-300 uppercase">
                Account Level
              </label>
              <input
                type="number"
                min={0}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-purple-400 text-white text-xs font-mono focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-gray-300 uppercase">
                Region / Server *
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-purple-400 text-white text-xs font-sans focus:outline-none"
              >
                {REGIONS.map((reg) => (
                  <option key={reg} value={reg} className="bg-gray-900">
                    {reg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-gray-300 uppercase">
                Guarantee Type
              </label>
              <select
                value={guaranteeType}
                onChange={(e) => setGuaranteeType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-purple-400 text-white text-xs font-sans focus:outline-none"
              >
                <option value="escrow_protected" className="bg-gray-900">
                  Escrow Protected (Community)
                </option>
                <option value="guaranteed" className="bg-gray-900">
                  VIB Guaranteed (Official Verified)
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-gray-300 uppercase">
                Seller Display Name
              </label>
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="VIB Official Vault"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-purple-400 text-white text-xs font-sans focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-gray-300 uppercase">
                Knives / Melees Count
              </label>
              <input
                type="number"
                min={0}
                value={knifeCount}
                onChange={(e) => setKnifeCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-purple-400 text-white text-xs font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Weapon Skins & Inventory */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono text-purple-300 uppercase tracking-wider font-bold flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>3. Featured Weapon Skins ({selectedSkins.length} selected)</span>
            </h3>
            <span className="text-[11px] font-mono text-gray-400">Click to toggle skin tags</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_SKINS.map((skin) => {
              const active = selectedSkins.includes(skin);
              return (
                <button
                  key={skin}
                  type="button"
                  onClick={() => toggleSkin(skin)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-purple-600 text-white border border-purple-400 shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {active && <CheckCircle2 className="w-3.5 h-3.5 text-purple-200" />}
                  <span>{skin}</span>
                </button>
              );
            })}
          </div>

          {/* Add custom skin input */}
          <div className="flex items-center gap-2 max-w-md pt-1">
            <input
              type="text"
              value={newSkinInput}
              onChange={(e) => setNewSkinInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomSkin();
                }
              }}
              placeholder="Add other skin name (e.g. Singularity Vandal)"
              className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 focus:border-purple-400 text-white text-xs font-sans placeholder:text-gray-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={addCustomSkin}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-bold cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>

        {/* Section 4: Imagery & Thumbnails */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h3 className="text-xs font-mono text-purple-300 uppercase tracking-wider font-bold flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>4. Thumbnail &amp; Image Assets</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {PRESET_THUMBNAILS.map((thumb) => {
              const active = selectedThumbnail === thumb.url && !customThumbnail;
              return (
                <button
                  key={thumb.url}
                  type="button"
                  onClick={() => {
                    setSelectedThumbnail(thumb.url);
                    setCustomThumbnail('');
                  }}
                  className={`p-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                    active
                      ? 'bg-purple-950/60 border-purple-400 ring-2 ring-purple-500/50'
                      : 'bg-black/40 border-white/10 hover:border-white/30'
                  }`}
                >
                  <img
                    src={thumb.url}
                    alt={thumb.label}
                    className="w-full h-16 object-contain rounded-lg"
                  />
                  <span className="text-[10px] font-mono text-gray-300 truncate w-full">
                    {thumb.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-mono text-gray-300 uppercase">
              Or Custom Image URL
            </label>
            <input
              type="url"
              value={customThumbnail}
              onChange={(e) => setCustomThumbnail(e.target.value)}
              placeholder="https://example.com/valorant-account-screenshot.png"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-purple-400 text-white text-xs font-mono placeholder:text-gray-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Section 5: Visibility & Publication Status */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-black/40 border border-white/10">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white font-rajdhani uppercase tracking-wider block">
                Publication Mode
              </span>
              <p className="text-[11px] text-gray-400 font-sans">
                Published listings are visible immediately to all marketplace buyers. Drafts remain internal to staff.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatus('draft')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  status === 'draft'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Draft
              </button>
              <button
                type="button"
                onClick={() => setStatus('published')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  status === 'published'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Publish Immediately
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="w-4 h-4 rounded border-purple-400 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-xs text-gray-300 font-sans">
              Feature on Homepage Carousel &amp; Spotlight section
            </span>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-xs cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 min-h-[44px] rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-rajdhani font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(147,51,234,0.4)] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Listing...</span>
              </>
            ) : (
              <>
                <span>{status === 'published' ? 'Publish to Marketplace' : 'Save as Draft'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
