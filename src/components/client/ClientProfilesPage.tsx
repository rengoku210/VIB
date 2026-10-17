import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Check,
  Users,
  Headphones,
  Crown,
  ArrowRight,
  Heart,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Disc as Discord,
  Youtube,
  Send,
  Star,
  MessageSquare,
  Sparkles,
  CreditCard,
  Flame,
  Award,
  Search,
  X,
  Plus,
} from 'lucide-react';
import { Currency, CartItem } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from './Header';
import { soundFx } from '../../utils/audio';
import { SubmitListingModal } from '../profiles/SubmitListingModal';

interface ClientProfilesPageProps {
  currency: Currency;
  onNavigate: (page: ClientPage, id?: string) => void;
  onAddToCart: (item: CartItem) => void;
  onOpenCheckout: (title: string, priceINR: number, productId?: string) => void;
  searchQuery?: string;
}

export const ClientProfilesPage: React.FC<ClientProfilesPageProps> = ({
  currency,
  onNavigate,
  onAddToCart,
  onOpenCheckout,
  searchQuery = '',
}) => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedMarketplace, setSelectedMarketplace] = useState<'guaranteed' | 'public'>('guaranteed');
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [publishedListings, setPublishedListings] = useState<any[]>([]);
  const [showSubmitListingModal, setShowSubmitListingModal] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const fetchPublishedListings = () => {
    fetch('/api/listings?limit=50')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.listings)) {
          setPublishedListings(data.listings);
        }
      })
      .catch((err) => console.warn('Could not fetch public listings:', err));
  };

  React.useEffect(() => {
    fetchPublishedListings();
    fetch('/api/products?category=profile')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.products)) {
          setDbProducts(data.products);
        }
      })
      .catch((err) => console.warn('Could not fetch catalog products:', err));
  }, []);

  React.useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const toggleFav = (id: string) => {
    soundFx.playClickSound();
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    soundFx.playClickSound();
    if (carouselRef.current) {
      const scrollAmount = 320;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Map real persistent database listings to UI cards
  const mapListingToCard = (item: any) => {
    let images: string[] = [];
    try {
      images = Array.isArray(item.images) ? item.images : (item.images_json ? JSON.parse(item.images_json) : []);
    } catch {}
    let skins: any[] = [];
    try {
      skins = Array.isArray(item.skins) ? item.skins : (item.skins_json ? JSON.parse(item.skins_json) : []);
    } catch {}

    const rankStr = item.rank || 'Diamond';
    const rankFirstWord = rankStr.toLowerCase().split(' ')[0];

    const rankGlowMap: Record<string, string> = {
      radiant: 'border-[#fbbf24]/50 shadow-[0_0_10px_rgba(251,191,36,0.4)]',
      immortal: 'border-[#f43f5e]/50 shadow-[0_0_10px_rgba(244,63,94,0.4)]',
      ascendant: 'border-[#10b981]/50 shadow-[0_0_10px_rgba(16,185,129,0.4)]',
      diamond: 'border-[#38bdf8]/50 shadow-[0_0_10px_rgba(56,189,248,0.4)]',
      platinum: 'border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.4)]',
      gold: 'border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.4)]',
      silver: 'border-slate-400/50 shadow-[0_0_10px_rgba(148,163,184,0.4)]',
      bronze: 'border-amber-700/50 shadow-[0_0_10px_rgba(180,83,9,0.4)]',
      iron: 'border-zinc-500/50 shadow-[0_0_10px_rgba(113,113,122,0.4)]',
    };

    const isGuaranteed = item.guarantee_type === 'lifetime_guaranteed';
    const badge = isGuaranteed
      ? 'LIFETIME GUARANTEED'
      : (item.vip_plan && item.vip_plan !== 'none'
          ? `${item.vip_plan.toUpperCase()} VIP LISTING`
          : 'COMMUNITY ESCROW');

    const avatarImg = images.length > 0 && images[0]
      ? images[0]
      : (rankFirstWord === 'immortal'
          ? '/assets/hires/profiles/card1_exact.jpg'
          : rankFirstWord === 'ascendant'
          ? '/assets/hires/profiles/card2_exact.jpg'
          : rankFirstWord === 'radiant'
          ? '/assets/hires/profiles/card3_exact.jpg'
          : '/assets/hires/profiles/card4_exact.jpg');

    const weaponPreviews = skins.slice(0, 3).map((skinName: any) => {
      const sName = typeof skinName === 'string' ? skinName.toLowerCase() : (skinName?.name?.toLowerCase() || '');
      let img = '/assets/items/vandal-prime.png';
      let border = 'border-amber-500/40';
      if (sName.includes('rgx') || sName.includes('blade')) {
        img = '/assets/items/vandal-rgx.png';
        border = 'border-emerald-500/40';
      } else if (sName.includes('reap') || sName.includes('reaver') || sName.includes('singularity') || sName.includes('kuronami')) {
        img = '/assets/items/vandal-reaper.png';
        border = 'border-purple-500/40';
      } else if (sName.includes('phantom') || sName.includes('oni') || sName.includes('ion')) {
        img = '/assets/items/phantom-rgx.png';
        border = 'border-cyan-500/40';
      }
      return { img, border, name: typeof skinName === 'string' ? skinName : skinName?.name || 'Weapon Skin' };
    });

    if (weaponPreviews.length === 0) {
      weaponPreviews.push(
        { img: '/assets/items/vandal-prime.png', border: 'border-amber-500/40', name: 'Prime Vandal' },
        { img: '/assets/items/vandal-rgx.png', border: 'border-emerald-500/40', name: 'RGX Vandal' },
        { img: '/assets/items/phantom-rgx.png', border: 'border-cyan-500/40', name: 'RGX Phantom' },
      );
    }

    return {
      id: item.id,
      badge,
      isGuaranteed,
      title: item.title,
      sub: `Level ${item.level || 1} • ${item.skin_count || (skins.length > 0 ? skins.length : 12)}+ Skins`,
      rankName: rankStr,
      rankIcon: `/assets/hires/ranks/${rankFirstWord}.png`,
      slot1RankGlow: rankGlowMap[rankFirstWord] || 'border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]',
      priceINR: Number(item.price_inr),
      originalPriceINR: Math.round(Number(item.price_inr) * 1.3),
      avatarImg,
      weapons: weaponPreviews,
      sellerName: item.seller_name || 'VIB Verified',
    };
  };

  const currentRawList = publishedListings.filter((item) => {
    if (selectedMarketplace === 'guaranteed') {
      return item.guarantee_type === 'lifetime_guaranteed';
    }
    return item.guarantee_type !== 'lifetime_guaranteed';
  });

  const mappedList = currentRawList.map(mapListingToCard);

  const filteredProfiles = mappedList.filter((p) => {
    if (!localSearch.trim()) return true;
    const q = localSearch.toLowerCase().trim();
    return (
      p.title.toLowerCase().includes(q) ||
      p.sub.toLowerCase().includes(q) ||
      p.rankName.toLowerCase().includes(q) ||
      p.badge.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white space-y-8 sm:space-y-10 pb-16">
      {/* Breadcrumb Navigation matching Reference 1 */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-3">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-purple-400 transition-colors cursor-pointer text-gray-400"
          >
            Home
          </button>
          <span className="text-gray-600">&gt;</span>
          <span className="text-purple-400 font-medium">Digital Profiles</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (Matching Reference 1) */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-2 w-full">
        <div className="relative rounded-2xl overflow-hidden min-h-[340px] sm:min-h-[480px] flex items-center bg-[#070510] shadow-2xl">
          {/* Full-bleed Part 19 (Agent at Glowing Battle Station) — same centered-card treatment as home hero */}
          <img
            src="/assets/reference_parts/part_19.png"
            alt="VIB Digital Profiles Artwork"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
            style={{ objectPosition: 'center 35%' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05040a] via-[#05040a]/55 to-[#05040a]/10 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05040a] via-[#05040a]/25 to-transparent z-[1]" />

          <div className="relative z-10 p-6 sm:p-10 max-w-xl space-y-4">
            {/* Main Headline (2 lines matching reference exactly) */}
            <div className="space-y-0.5">
              <h1 className="text-4xl sm:text-5xl lg:text-[46px] xl:text-[52px] font-black uppercase tracking-tight text-white leading-tight font-rajdhani">
                EXPLORE
              </h1>
              <div className="text-4xl sm:text-5xl lg:text-[46px] xl:text-[52px] font-black uppercase tracking-tight leading-tight font-rajdhani text-transparent bg-clip-text bg-gradient-to-r from-[#f3e8ff] via-[#d946ef] to-[#a855f7] drop-shadow-[0_0_25px_rgba(217,70,239,0.5)]">
                DIGITAL PROFILES
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-gray-300 text-xs sm:text-sm md:text-base leading-relaxed max-w-xl mx-auto">
              Find your next competitive identity. Choose a marketplace below to start browsing verified profiles or community listings.
            </p>

            {/* 4 Trust Micro Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <div className="px-3.5 py-1.5 rounded-full bg-[#120f24]/90 border border-purple-500/25 text-xs text-gray-200 flex items-center gap-2 shadow-md">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium">Safe & Secure</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#120f24]/90 border border-purple-500/25 text-xs text-gray-200 flex items-center gap-2 shadow-md">
                <Check className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium">Verified Process</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#120f24]/90 border border-purple-500/25 text-xs text-gray-200 flex items-center gap-2 shadow-md">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium">Active Community</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#120f24]/90 border border-purple-500/25 text-xs text-gray-200 flex items-center gap-2 shadow-md">
                <Headphones className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium">Dedicated Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CHOOSE A MARKETPLACE (Matching Reference 1) */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Section Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.22em] text-[#e879f9] uppercase font-semibold">
            <MessageSquare className="w-3.5 h-3.5 text-[#e879f9]" />
            <span>CHOOSE A MARKETPLACE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-rajdhani">
            Where would you like to browse?
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            We offer two separate marketplaces. Choose the one that fits your needs.
          </p>
        </div>

        {/* 2 Large Marketplace Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* ------------------------------------------------------------- */}
          {/* Card A: Lifetime Guaranteed Profiles (Gold Border & Theme)    */}
          {/* ------------------------------------------------------------- */}
          <div className="flex flex-col space-y-2">
            <div
              role="button"
              tabIndex={0}
              aria-pressed={selectedMarketplace === 'guaranteed'}
              aria-label="Select Lifetime Guaranteed Profiles marketplace"
              onClick={() => {
                soundFx.playClickSound();
                setSelectedMarketplace('guaranteed');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  soundFx.playClickSound();
                  setSelectedMarketplace('guaranteed');
                }
              }}
              className={`relative overflow-hidden p-6 sm:p-7 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between group min-h-[250px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                selectedMarketplace === 'guaranteed'
                  ? 'bg-gradient-to-br from-[#1b1625] via-[#130f1c] to-[#0d0914] border-amber-500/80 shadow-[0_0_35px_rgba(245,158,11,0.22)]'
                  : 'bg-[#0e0c18] border-white/10 hover:border-amber-500/50'
              }`}
            >
              {/* Full-bleed ambient character art (Hooded Assassin with golden rim lighting) */}
              <img
                src="/assets/hires/card_guaranteed_agent.png"
                alt="Guaranteed Agent"
                className="absolute inset-0 w-full h-full object-cover object-left pointer-events-none select-none z-0 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#130f1c]/60 to-[#0d0914] z-[1]" />

              {/* Card Header Content */}
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <Crown className="w-8 h-8 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
                  <div className="w-9 h-9 rounded-full border border-amber-500/40 bg-amber-500/10 group-hover:bg-amber-500 group-hover:text-black flex items-center justify-center text-amber-400 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-black text-xl sm:text-2xl text-white font-rajdhani">
                      <span className="text-amber-400">Lifetime</span> Guaranteed Profiles
                    </h3>
                    <span className="text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#7c3aed] text-white shadow-[0_0_10px_rgba(124,58,237,0.5)]">
                      VERIFIED BY VIB
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed max-w-md">
                    Handpicked and verified profiles with lifetime guarantee from VIB. Secure, reliable and worry-free.
                  </p>
                </div>

                {/* 3 Pills */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-amber-400" />
                    <span>Lifetime Guarantee</span>
                  </span>
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    <span>Verified &amp; Checked</span>
                  </span>
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                    <Headphones className="w-3 h-3 text-amber-400" />
                    <span>Direct Support</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-strip matching Reference 1 */}
            <div className="p-3.5 rounded-xl bg-[#0e0c18] border border-white/5 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[11px] text-gray-300">
                  Profiles in this section are covered by VIB's lifetime guarantee subject to our terms and conditions.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('services')}
                className="text-amber-400 font-semibold text-[11px] ml-3 whitespace-nowrap hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-md p-1"
              >
                <span>Learn More</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* Card B: Public Listings (Blue Border & Theme)                 */}
          {/* ------------------------------------------------------------- */}
          <div className="flex flex-col space-y-2">
            <div
              role="button"
              tabIndex={0}
              aria-pressed={selectedMarketplace === 'public'}
              aria-label="Select Public Listings marketplace"
              onClick={() => {
                soundFx.playClickSound();
                setSelectedMarketplace('public');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  soundFx.playClickSound();
                  setSelectedMarketplace('public');
                }
              }}
              className={`relative overflow-hidden p-6 sm:p-7 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between group min-h-[250px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                selectedMarketplace === 'public'
                  ? 'bg-gradient-to-br from-[#0c1426] via-[#090f1d] to-[#070b16] border-sky-500/80 shadow-[0_0_35px_rgba(14,165,233,0.22)]'
                  : 'bg-[#0e0c18] border-white/10 hover:border-sky-500/50'
              }`}
            >
              {/* Full-bleed ambient character art (Cyber Blue Agent looking over shoulder) */}
              <img
                src="/assets/hires/card_public_agent.png"
                alt="Public Cyber Agent"
                className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#090f1d]/60 to-[#070b16] z-[1]" />

              {/* Card Header Content */}
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <Users className="w-8 h-8 text-sky-400 drop-shadow-[0_0_12px_rgba(14,165,233,0.6)]" />
                  <div className="w-9 h-9 rounded-full border border-sky-500/40 bg-sky-500/10 group-hover:bg-sky-500 group-hover:text-black flex items-center justify-center text-sky-400 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-black text-xl sm:text-2xl text-white font-rajdhani">
                      Public Listings
                    </h3>
                    <span className="text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#0369a1] text-sky-200 border border-sky-400/40 shadow-[0_0_10px_rgba(3,105,161,0.5)]">
                      COMMUNITY MARKETPLACE
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed max-w-md">
                    Listings posted by our community members. More variety, more options.
                  </p>
                </div>

                {/* 3 Pills */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-sky-400" />
                    <span>Wide Variety</span>
                  </span>
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-sky-400" />
                    <span>Direct Contact</span>
                  </span>
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-sky-400" />
                    <span>Optional Escrow</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-strip matching Reference 1 */}
            <div className="p-3.5 rounded-xl bg-[#0e0c18] border border-white/5 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[11px] text-gray-300">
                  These are community listings. Sellers are not verified by VIB. You can contact the seller directly and use our optional escrow service for transaction protection.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('services')}
                className="text-sky-400 font-semibold text-[11px] ml-3 whitespace-nowrap hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Learn More</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FEATURED LISTINGS: Handpicked Featured Profiles (Matching Reference 1) */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-[0.22em] text-amber-400 uppercase font-semibold">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {selectedMarketplace === 'guaranteed' ? 'GUARANTEED LISTINGS' : 'COMMUNITY LISTINGS'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-rajdhani">
              {selectedMarketplace === 'guaranteed'
                ? 'Handpicked Lifetime Guaranteed Profiles'
                : 'Verified Community Public Listings'}
            </h2>
            <p className="text-xs text-gray-400">
              {selectedMarketplace === 'guaranteed'
                ? 'Official VIB-vetted accounts with lifetime replacement guarantee'
                : 'Player-to-player verified accounts with VIB Escrow buyer protection'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-xs font-semibold text-purple-300 hover:bg-purple-500/30 transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <span>Clear &quot;{localSearch}&quot;</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSubmitListingModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Sell Your Account</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const q = selectedMarketplace === 'guaranteed' ? 'public' : 'guaranteed';
                setSelectedMarketplace(q);
              }}
              className="px-4 py-2 rounded-xl bg-[#23153c] border border-purple-500/40 text-xs font-bold text-purple-200 hover:bg-purple-600 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <span>Switch to {selectedMarketplace === 'guaranteed' ? 'Public' : 'Guaranteed'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              aria-label="Scroll left to view previous profiles"
              className="min-w-[44px] min-h-[44px] rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              aria-label="Scroll right to view next profiles"
              className="min-w-[44px] min-h-[44px] rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Active Notification Pill */}
        {localSearch && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-purple-400" />
              <span>
                Filtering profiles matching &ldquo;<strong className="text-white">{localSearch}</strong>&rdquo; (Found {filteredProfiles.length} result{filteredProfiles.length === 1 ? '' : 's'})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLocalSearch('')}
              className="text-purple-400 hover:text-white font-bold underline cursor-pointer p-1"
            >
              Reset Search
            </button>
          </div>
        )}

        {/* Empty State */}
        {filteredProfiles.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl border border-white/10 bg-[#0c0a18] space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white font-rajdhani">
              No profiles found matching &ldquo;{localSearch}&rdquo;
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
              We couldn&apos;t find any accounts in the {selectedMarketplace === 'guaranteed' ? 'Lifetime Guaranteed' : 'Public'} catalog matching your query. Try searching by rank name (e.g. Immortal, Radiant, Diamond) or clear the filter.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                Clear Search
              </button>
              <button
                type="button"
                onClick={() => setSelectedMarketplace(selectedMarketplace === 'guaranteed' ? 'public' : 'guaranteed')}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                Check {selectedMarketplace === 'guaranteed' ? 'Public' : 'Guaranteed'} Catalog
              </button>
            </div>
          </div>
        ) : (
          /* Cards Row (Horizontally scrollable on mobile, grid on desktop) */
          <div
            ref={carouselRef}
            className="flex overflow-x-auto lg:grid lg:grid-cols-5 gap-3.5 pb-2 scrollbar-none snap-x scroll-smooth"
          >
            {filteredProfiles.map((p) => {
              const isFav = favoriteIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  className="min-w-[260px] sm:min-w-[280px] lg:min-w-0 snap-start rounded-xl bg-[#0c0a18] border border-white/[0.08] hover:border-purple-500/50 transition-all duration-300 overflow-hidden flex flex-col justify-between group shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                >
                  {/* Character preview card top with close-up bust */}
                  <div
                    onClick={() => onNavigate('listing', p.id)}
                    className="relative aspect-[4/3] w-full overflow-hidden bg-[#100c1e] cursor-pointer"
                  >
                    <img
                      src={p.avatarImg}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/hires/profiles/card1_exact.jpg';
                      }}
                    />

                    {/* Top Left Badge: (Amber/Blue pill) */}
                    <div className="absolute top-2 left-2 pointer-events-none">
                      <span className={`text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-md font-rajdhani uppercase shadow-md ${
                        selectedMarketplace === 'guaranteed'
                          ? 'bg-[#f59e0b] text-black'
                          : 'bg-sky-500 text-black'
                      }`}>
                        {p.badge}
                      </span>
                    </div>

                    {/* Top Right: Heart Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFav(p.id);
                      }}
                      aria-label={isFav ? `Remove ${p.title} from favorites` : `Add ${p.title} to favorites`}
                      className="absolute top-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-black/60 hover:bg-black/90 text-white transition-colors cursor-pointer border border-white/15 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav ? 'fill-rose-500 text-rose-500' : 'text-gray-200'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 4 Preview Slots: Slot 1 is Rank Emblem, Slots 2-4 are Weapons (Matching Reference Exactly) */}
                  <div className="px-2.5 pt-2 grid grid-cols-4 gap-1">
                    {/* Slot 1: Rank Emblem */}
                    <div className={`h-7 rounded-md bg-[#131024] border ${p.slot1RankGlow} p-0.5 flex items-center justify-center overflow-hidden shadow-sm`}>
                      <img
                        src={p.rankIcon}
                        alt={`${p.rankName} rank emblem`}
                        className="w-5 h-5 object-contain filter drop-shadow-[0_0_6px_currentColor]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiers/25.png';
                        }}
                      />
                    </div>
                    {/* Slots 2-4: Weapons */}
                    {p.weapons.map((w, idx) => (
                      <div
                        key={idx}
                        className={`h-7 rounded-md bg-[#131024] border ${w.border} p-0.5 flex items-center justify-center overflow-hidden shadow-sm`}
                      >
                        <img
                          src={w.img}
                          alt="Weapon skin preview"
                          className="w-full h-full object-contain filter drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/items/vandal-prime.png';
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Profile Details (Matching Reference Exactly) */}
                  <div className="p-3 space-y-1">
                    <h3
                      onClick={() => onNavigate('listing', p.id)}
                      className="font-extrabold text-sm text-white group-hover:text-purple-300 transition-colors font-rajdhani cursor-pointer"
                    >
                      {p.title}
                    </h3>
                    <div className="text-[11px] text-gray-300 leading-snug">
                      {p.sub}
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <img
                        src={p.rankIcon}
                        alt=""
                        aria-hidden="true"
                        className="w-3.5 h-3.5 object-contain"
                      />
                      <span className="text-[11px] font-semibold text-slate-300">
                        {p.rankName}
                      </span>
                    </div>
                  </div>

                  {/* Pricing and Action Buttons (Matching Reference Exactly) */}
                  <div className="p-3 pt-2 border-t border-white/5 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-black text-[#ff2ebb] font-rajdhani">
                        {formatCurrencyPrice(p.priceINR, currency)}
                      </span>
                      <span className="text-[10px] text-gray-400 line-through font-mono">
                        {formatCurrencyPrice(p.originalPriceINR, currency)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onNavigate('listing', p.id)}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-gradient-to-r from-[#4c1d95] to-[#581c87] hover:from-[#6b21a8] hover:to-[#7e22ce] text-white text-xs font-bold transition-all cursor-pointer text-center border border-purple-500/40 shadow-[0_0_10px_rgba(147,51,234,0.3)] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onAddToCart({
                            id: p.id,
                            title: p.title,
                            subtitle: p.sub,
                            priceINR: p.priceINR,
                            type: 'profile',
                            image: p.avatarImg,
                            quantity: 1,
                          })
                        }
                        aria-label={`Add ${p.title} to cart`}
                        className="min-w-[44px] min-h-[44px] p-2 rounded-lg bg-[#581c87] hover:bg-[#6b21a8] text-white transition-colors cursor-pointer border border-purple-500/40 shadow-[0_0_10px_rgba(147,51,234,0.3)] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                        title="Add to Cart"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 4. JOIN THE VIB COMMUNITY Banner (Matching Reference 1)                   */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl overflow-hidden shadow-2xl relative min-h-[220px] sm:min-h-[260px] flex items-center bg-[#070510]">
          {/* Full-bleed Reference Part 26 (Team VIB Championship Podium) with gradient overlay */}
          <img
            src="/assets/reference_parts/part_26.png"
            alt="Team VIB Championship Community"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-transparent to-transparent z-[1]" />

          <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between p-5 sm:p-8 gap-5">
            <div className="space-y-1 text-left">
              <h3 className="text-xl sm:text-2xl font-black uppercase text-white font-rajdhani tracking-wide">
                JOIN THE VIB COMMUNITY
              </h3>
              <p className="text-xs sm:text-sm text-gray-300">
                Connect, trade, learn and grow with thousands of members.
              </p>
            </div>

            {/* Right side: Social icons & Join button */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <a
                  href="https://discord.gg"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] hover:bg-[#5865F2] hover:text-white transition-all shadow-sm"
                  title="Discord"
                >
                  <Discord className="w-4 h-4" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-[#E1306C]/20 border border-[#E1306C]/40 flex items-center justify-center text-[#E1306C] hover:bg-[#E1306C] hover:text-white transition-all shadow-sm"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://t.me"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-[#229ED9]/20 border border-[#229ED9]/40 flex items-center justify-center text-[#229ED9] hover:bg-[#229ED9] hover:text-white transition-all shadow-sm"
                  title="Telegram"
                >
                  <Send className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-[#FF0000]/20 border border-[#FF0000]/40 flex items-center justify-center text-[#FF0000] hover:bg-[#FF0000] hover:text-white transition-all shadow-sm"
                  title="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              </div>

              <button
                onClick={() => onNavigate('community')}
                className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg flex items-center gap-2 whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #c026d3 100%)',
                  boxShadow: '0 0 20px rgba(168, 85, 247, 0.45)',
                }}
              >
                <span>Join Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. 4 TRUST CARDS STRIP (Matching Reference 1 exactly)                     */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1 */}
          <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex items-center gap-3.5 shadow-md">
            <div className="w-11 h-11 rounded-full bg-purple-900/35 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-white">Secure Platform</div>
              <div className="text-[11px] text-gray-400">Your safety is our priority.</div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex items-center gap-3.5 shadow-md">
            <div className="w-11 h-11 rounded-full bg-purple-900/35 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-white">24/7 Support</div>
              <div className="text-[11px] text-gray-400">We're here to help.</div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex items-center gap-3.5 shadow-md">
            <div className="w-11 h-11 rounded-full bg-purple-900/35 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-white">Trusted by 50,000+</div>
              <div className="text-[11px] text-gray-400">A growing community.</div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex items-center gap-3.5 shadow-md">
            <div className="w-11 h-11 rounded-full bg-purple-900/35 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-white">Multiple Payment Options</div>
              <div className="text-[11px] text-gray-400">UPI, Bank Transfer and more.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Seller Account Submission Modal */}
      <SubmitListingModal
        isOpen={showSubmitListingModal}
        onClose={() => setShowSubmitListingModal(false)}
        onSuccess={() => {
          fetchPublishedListings();
        }}
      />
    </div>
  );
};