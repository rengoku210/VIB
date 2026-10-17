import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Check,
  Users,
  User,
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
  Zap,
  Shield,
  CreditCard,
  Gavel,
  TrendingUp,
  TrendingDown,
  Repeat,
  Globe,
  Award,
  CheckCircle2,
  Flame,
  Lock,
  Settings,
  Mail,
  Brain,
  Map,
} from 'lucide-react';
import { Currency, CartItem } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from './Header';
import { soundFx } from '../../utils/audio';
import { FlagIcon } from '../common/FlagIcon';
import { useRankBadges, getRankBadgeUrl } from '../../utils/valorantRanks';

interface ClientHomePageProps {
  currency: Currency;
  onNavigate: (page: ClientPage, id?: string) => void;
  onAddToCart: (item: CartItem) => void;
  onOpenCheckout: (title: string, priceINR: number, productId?: string) => void;
}

const RANK_TIERS = [
  { name: 'Iron', color: 'from-gray-600 to-zinc-700', border: 'border-zinc-600', text: 'text-zinc-400', badge: 'IRON' },
  { name: 'Bronze', color: 'from-amber-800 to-yellow-900', border: 'border-amber-700', text: 'text-amber-500', badge: 'BRONZE' },
  { name: 'Silver', color: 'from-slate-400 to-gray-500', border: 'border-slate-400', text: 'text-slate-300', badge: 'SILVER' },
  { name: 'Gold', color: 'from-yellow-500 to-amber-600', border: 'border-yellow-400', text: 'text-yellow-400', badge: 'GOLD' },
  { name: 'Platinum', color: 'from-cyan-500 to-teal-600', border: 'border-cyan-400', text: 'text-cyan-400', badge: 'PLAT' },
  { name: 'Diamond', color: 'from-purple-500 to-fuchsia-600', border: 'border-purple-400', text: 'text-purple-400', badge: 'DIAMOND' },
  { name: 'Ascendant', color: 'from-emerald-500 to-green-600', border: 'border-emerald-400', text: 'text-emerald-400', badge: 'ASCEND' },
  { name: 'Immortal', color: 'from-rose-500 to-red-600', border: 'border-rose-400', text: 'text-rose-400', badge: 'IMMORTAL' },
  { name: 'Radiant', color: 'from-amber-300 via-yellow-400 to-yellow-200', border: 'border-yellow-300', text: 'text-yellow-300', badge: 'RADIANT' },
];

export const ClientHomePage: React.FC<ClientHomePageProps> = ({
  currency,
  onNavigate,
  onAddToCart,
  onOpenCheckout,
}) => {
  const rankBadges = useRankBadges();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedMarketplace, setSelectedMarketplace] = useState<'guaranteed' | 'public'>('guaranteed');
  const [journeyType, setJourneyType] = useState<'rankup' | 'derank'>('rankup');
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    soundFx.playClickSound();
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 14, seconds: 36 });
  const [currentBid, setCurrentBid] = useState(4850);
  const [bidCount, setBidCount] = useState(18);
  const [userBidInput, setUserBidInput] = useState('5000');
  const [bidSuccessMessage, setBidSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 2, minutes: 30, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePlaceBid = (e: React.FormEvent) => {
    e.preventDefault();
    const bidVal = parseInt(userBidInput, 10);
    if (isNaN(bidVal) || bidVal <= currentBid) {
      alert(`Bid must be greater than current bid of ₹${currentBid.toLocaleString()}`);
      return;
    }
    setCurrentBid(bidVal);
    setBidCount((c) => c + 1);
    setUserBidInput(String(bidVal + 250));
    setBidSuccessMessage(`Bid of ₹${bidVal.toLocaleString()} placed successfully! You are the highest bidder.`);
    setTimeout(() => setBidSuccessMessage(null), 5000);
  };

  const toggleFav = (id: string) => {
    soundFx.playClickSound();
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const [dbListings, setDbListings] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/listings?limit=20')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.listings) && data.listings.length > 0) {
          setDbListings(data.listings);
        }
      })
      .catch((err) => console.warn('Could not fetch home listings:', err));
  }, []);

  const mapHomeListing = (item: any) => {
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
      radiant: 'border-[#fbbf24]/40 shadow-[0_0_8px_rgba(251,191,36,0.3)]',
      immortal: 'border-[#f43f5e]/40 shadow-[0_0_8px_rgba(244,63,94,0.3)]',
      ascendant: 'border-[#10b981]/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]',
      diamond: 'border-[#38bdf8]/40 shadow-[0_0_8px_rgba(56,189,248,0.3)]',
      platinum: 'border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]',
      gold: 'border-amber-400/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]',
      silver: 'border-slate-400/40 shadow-[0_0_8px_rgba(148,163,184,0.3)]',
      bronze: 'border-amber-700/40 shadow-[0_0_8px_rgba(180,83,9,0.3)]',
      iron: 'border-zinc-500/40 shadow-[0_0_8px_rgba(113,113,122,0.3)]',
    };

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
      return { img, border };
    });

    if (weaponPreviews.length === 0) {
      weaponPreviews.push(
        { img: '/assets/items/vandal-prime.png', border: 'border-amber-500/40' },
        { img: '/assets/items/vandal-rgx.png', border: 'border-emerald-500/40' },
        { img: '/assets/items/phantom-rgx.png', border: 'border-cyan-500/40' },
      );
    }

    return {
      id: item.id,
      badge: item.featured ? 'FEATURED' : 'VERIFIED',
      title: item.title,
      sub: `Level ${item.level || 1} • ${item.skin_count || (skins.length > 0 ? skins.length : 20)}+ Skins`,
      rankName: rankStr,
      rankIcon: `/assets/hires/ranks/${rankFirstWord}.png`,
      slot1RankGlow: rankGlowMap[rankFirstWord] || 'border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]',
      priceINR: Number(item.price_inr),
      originalPriceINR: Math.round(Number(item.price_inr) * 1.3),
      avatarImg,
      weapons: weaponPreviews,
    };
  };

  const profiles = dbListings.map(mapHomeListing);

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white space-y-8 sm:space-y-10 pb-16">
      {/* 1. HERO */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-2 w-full">
        <div className="relative rounded-2xl overflow-hidden min-h-[420px] sm:min-h-[480px] lg:min-h-[520px] flex items-center bg-[#070510] shadow-2xl">
          <img
            src="/assets/hires/hero_banner_full.jpg"
            alt="VIB Esports Heroine"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
            style={{ objectPosition: 'center 30%' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05040a] via-[#05040a]/90 sm:via-[#05040a]/55 to-[#05040a]/80 sm:to-[#05040a]/10 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05040a] via-[#05040a]/50 sm:via-[#05040a]/25 to-transparent z-[1]" />
          <div className="relative z-10 p-6 sm:p-10 max-w-xl space-y-4">
            <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5 select-none">
              <span className="hover:text-gray-200 cursor-pointer transition-colors" onClick={() => onNavigate('home')}>Home</span>
              <span className="text-gray-600">{'>'}</span>
              <span className="text-purple-400 font-semibold">Digital Profiles</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none font-rajdhani drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)]">
                EXPLORE
              </h1>
              <div className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-none font-rajdhani text-transparent bg-clip-text bg-gradient-to-r from-[#f3e8ff] via-[#d946ef] to-[#a855f7] drop-shadow-[0_0_30px_rgba(217,70,239,0.55)]">
                DIGITAL PROFILES
              </div>
            </div>
            <p className="text-gray-200 text-xs sm:text-sm leading-relaxed max-w-md drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              India's most trusted esports &amp; digital services platform. Buy, sell, top up, rank up and trade — all in one place.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="px-3 py-1.5 rounded-full bg-[#120f24]/80 backdrop-blur-sm border border-purple-500/35 text-xs text-gray-200 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium text-[11px]">Safe &amp; Secure</span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-[#120f24]/80 backdrop-blur-sm border border-purple-500/35 text-xs text-gray-200 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium text-[11px]">Verified Process</span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-[#120f24]/80 backdrop-blur-sm border border-purple-500/35 text-xs text-gray-200 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium text-[11px]">50,000+ Community</span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-[#120f24]/80 backdrop-blur-sm border border-purple-500/35 text-xs text-gray-200 flex items-center gap-2">
                <Headphones className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium text-[11px]">Dedicated Support</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('featured-profiles');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="min-h-[44px] px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <span>Browse Profiles</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('services')}
                className="min-h-[44px] px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 backdrop-blur-sm text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                All Services
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CHOOSE A MARKETPLACE */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                  ? 'bg-gradient-to-br from-[#1b1625] via-[#130f1c] to-[#0d0914] border-amber-500/70 shadow-[0_0_35px_rgba(245,158,11,0.22)]'
                  : 'bg-[#0e0c18] border-purple-500/15 hover:border-amber-500/50'
              }`}
            >
              <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
                <img
                  src="/assets/hires/card_guaranteed_bg.png"
                  alt="Guaranteed Agent"
                  className="h-full w-auto object-cover object-left opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0e0c18] via-[#0e0c18]/60 to-transparent" />
              </div>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <Crown className="w-9 h-9 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.7)]" />
                  <div className="w-9 h-9 rounded-full border border-amber-500/50 bg-amber-500/10 group-hover:bg-amber-500 group-hover:text-black flex items-center justify-center text-amber-400 transition-all">
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
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-amber-400" />
                    <span>Lifetime Guarantee</span>
                  </span>
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    <span>Verified & Checked</span>
                  </span>
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                    <Headphones className="w-3 h-3 text-amber-400" />
                    <span>Direct Support</span>
                  </span>
                </div>
              </div>
            </div>
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
                onClick={() => {
                  const el = document.getElementById('featured-profiles');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-purple-400 font-semibold text-[11px] ml-3 whitespace-nowrap hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded p-1"
              >
                <span>Learn More</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

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
                  ? 'bg-gradient-to-br from-[#0c1426] via-[#090f1d] to-[#070b16] border-sky-500/70 shadow-[0_0_35px_rgba(14,165,233,0.22)]'
                  : 'bg-[#0e0c18] border-purple-500/15 hover:border-sky-500/50'
              }`}
            >
              <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden flex justify-end">
                <img
                  src="/assets/hires/card_public_bg.png"
                  alt="Public Cyber Agent"
                  className="h-full w-auto object-cover object-right opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0e0c18]/60 to-[#0e0c18]" />
              </div>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <Users className="w-9 h-9 text-sky-400 drop-shadow-[0_0_12px_rgba(14,165,233,0.7)]" />
                  <div className="w-9 h-9 rounded-full border border-sky-500/50 bg-sky-500/10 group-hover:bg-sky-500 group-hover:text-black flex items-center justify-center text-sky-400 transition-all">
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
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-sky-400" />
                    <span>Wide Variety</span>
                  </span>
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-sky-400" />
                    <span>Direct Contact</span>
                  </span>
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-sky-400" />
                    <span>Optional Escrow</span>
                  </span>
                </div>
              </div>
            </div>
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
                onClick={() => {
                  const el = document.getElementById('featured-profiles');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-purple-400 font-semibold text-[11px] ml-3 whitespace-nowrap hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Learn More</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED PROFILES (Reference 1) */}
      <section id="featured-profiles" className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-[0.22em] text-amber-400 uppercase font-semibold">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>FEATURED PROFILES</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-rajdhani">
              Handpicked Featured Profiles
            </h2>
            <p className="text-xs text-gray-400">
              Premium profiles from our marketplace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('profiles')}
              className="px-4 py-2 rounded-xl bg-[#23153c] border border-purple-500/40 text-xs font-bold text-purple-200 hover:bg-purple-600 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <span>View All Featured</span>
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

        <div
          ref={carouselRef}
          className="flex overflow-x-auto lg:grid lg:grid-cols-5 gap-2.5 sm:gap-3.5 pb-2 scrollbar-none snap-x scroll-smooth"
        >
          {profiles.map((p) => {
            const isFav = favoriteIds.includes(p.id);
            return (
              <div
                key={p.id}
                className="min-w-[240px] sm:min-w-[260px] lg:min-w-0 snap-start rounded-xl bg-[#0c0a18] border border-white/[0.08] hover:border-purple-500/50 transition-all duration-300 overflow-hidden flex flex-col justify-between group shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
              >
                <div
                  onClick={() => onNavigate('listing', p.id)}
                  className="relative aspect-[4/3] w-full overflow-hidden bg-[#100c1e] cursor-pointer"
                >
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-[#f59e0b] text-black font-black text-[9px] tracking-wider uppercase shadow-md pointer-events-none select-none">
                    {p.badge}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav(p.id);
                    }}
                    aria-label={isFav ? `Remove ${p.title} from favorites` : `Add ${p.title} to favorites`}
                    className="absolute top-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg cursor-pointer bg-black/50 hover:bg-black/75 border border-white/15 transition-colors z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 backdrop-blur-sm"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isFav
                          ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                          : 'text-white/80'
                      }`}
                    />
                  </button>
                  <img
                    src={p.avatarImg}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/hires/profiles/card1_exact.jpg';
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#0c0a18] to-transparent pointer-events-none" />
                </div>

                <div className="px-2.5 pt-2 grid grid-cols-4 gap-1">
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
      </section>

      {/* 4. SOCIAL CONVERSION BANNERS (Reference 1) */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Instagram: full-bleed Part 03 artwork + 3D phone on top */}
          <div className="relative rounded-2xl overflow-hidden min-h-[300px] sm:min-h-[420px] flex items-center bg-[#070510] shadow-2xl group">
            <img
              src="/assets/reference_parts/part_03.png"
              alt="Instagram Promotion Artwork"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

            <div className="relative z-10 p-6 sm:p-8 w-full flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-3 max-w-sm">
                <div className="inline-flex items-center gap-2 text-[10.5px] font-mono tracking-widest text-[#f43f5e] uppercase font-bold">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-[#f59e0b] via-[#ec4899] to-[#8b5cf6] flex items-center justify-center text-white shadow-sm">
                    <Instagram className="w-3 h-3" />
                  </div>
                  <span>FOLLOW OUR INSTAGRAM</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani tracking-wide leading-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]">
                  STAY UPDATED <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300">
                    & WIN EXCITING REWARDS!
                  </span>
                </h3>
                <p className="text-xs text-gray-200 leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                  Follow us on Instagram to stand a chance to win giveaways of VP, Profiles and Cash Prizes!
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="px-2.5 py-1 rounded-full bg-[#201133]/80 backdrop-blur-sm border border-pink-500/30 text-[10.5px] font-medium text-pink-200 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-pink-400" /> Giveaways
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#201133]/80 backdrop-blur-sm border border-pink-500/30 text-[10.5px] font-medium text-pink-200 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-pink-400" /> Exclusive Drops
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#201133]/80 backdrop-blur-sm border border-pink-500/30 text-[10.5px] font-medium text-pink-200 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-pink-400" /> Announcements
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#201133]/80 backdrop-blur-sm border border-pink-500/30 text-[10.5px] font-medium text-pink-200 flex items-center gap-1">
                    <Star className="w-3 h-3 text-pink-400" /> Fun Events
                  </span>
                </div>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-800 via-pink-700 to-rose-600 hover:from-purple-700 hover:via-pink-600 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(236,72,153,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Follow Us on Instagram</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* WhatsApp: full-bleed Part 01 artwork + 3D phone on top */}
          <div className="relative rounded-2xl overflow-hidden min-h-[300px] sm:min-h-[420px] flex items-center bg-[#070510] shadow-2xl group">
            <img
              src="/assets/reference_parts/part_01.png"
              alt="WhatsApp Channel Artwork"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

            <div className="relative z-10 p-6 sm:p-8 w-full flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-3 max-w-sm">
                <div className="inline-flex items-center gap-2 text-[10.5px] font-mono tracking-widest text-[#10b981] uppercase font-bold">
                  <div className="w-5 h-5 rounded-md bg-[#25D366] flex items-center justify-center text-white shadow-sm font-bold text-xs">
                    <MessageSquare className="w-3 h-3" />
                  </div>
                  <span>JOIN OUR WHATSAPP CHANNEL</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani tracking-wide leading-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]">
                  BE THE FIRST <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-green-200">
                    TO KNOW!
                  </span>
                </h3>
                <p className="text-xs text-gray-200 leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                  Join our official WhatsApp channel to receive latest updates, drops, giveaway announcements, coupons and more — directly delivered to you.
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-[11px] text-emerald-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400 flex-shrink-0" /><span>Latest Updates</span></div>
                  <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400 flex-shrink-0" /><span>Special Coupons</span></div>
                  <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400 flex-shrink-0" /><span>Instant Announcements</span></div>
                  <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400 flex-shrink-0" /><span>Early Access</span></div>
                  <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400 flex-shrink-0" /><span>Exclusive Drops</span></div>
                  <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400 flex-shrink-0" /><span>Important Notices</span></div>
                  <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400 flex-shrink-0" /><span>Giveaway Alerts</span></div>
                  <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400 flex-shrink-0" /><span>Be the First to Get Benefits</span></div>
                </div>
                <a
                  href="https://whatsapp.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Join Our WhatsApp Channel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SELL YOUR ACCOUNT (Reference 1) — full-bleed Part 06 */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden min-h-[380px] sm:min-h-[440px] flex items-center bg-[#070510] shadow-2xl group">
          <img
            src="/assets/reference_parts/part_06.png"
            alt="Sell Your Account Artwork"
            className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

          <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono tracking-widest text-[#d946ef] uppercase font-bold">
              <MessageSquare className="w-3.5 h-3.5 text-[#d946ef]" />
              <span>SELL YOUR ACCOUNT WITH VIB</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-white font-rajdhani tracking-tight leading-none drop-shadow-[0_4px_22px_rgba(0,0,0,0.9)]">
              Turn Your Profile Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-purple-300 to-amber-300">Profit</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-lg drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              Looking to sell your account? List it with VIB and reach thousands of buyers. Choose from our flexible advertisement plans and get the exposure you deserve.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
              <button
                onClick={() => onOpenCheckout('VIB Profile Advertisement Plan', 1499)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2 w-fit"
              >
                <span>View Advertisement Plans</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Reach Genuine Buyers</span></div>
                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Fast & Easy Listing</span></div>
                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Flexible Plans</span></div>
                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Trusted Platform</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. VIB URGENT SALE OFFER (Reference 2) — full-bleed Part 07 + Two Ways panel */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <div className="lg:col-span-2 relative rounded-2xl overflow-hidden min-h-[340px] sm:min-h-[470px] flex items-center bg-[#070510] shadow-2xl group">
            <img
              src="/assets/reference_parts/part_07.png"
              alt="Urgent Sale Artwork"
              className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

            <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-rose-400 uppercase font-bold">
                <Zap className="w-3.5 h-3.5 text-rose-400" />
                <span>SELL YOUR PROFILE</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase font-rajdhani tracking-tight leading-none drop-shadow-[0_4px_22px_rgba(0,0,0,0.9)]">
                <span className="text-white">VIB URGENT</span><br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-red-400 to-pink-400">SALE OFFER</span>
              </h2>
              <p className="text-sm sm:text-base font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                Need to sell your profile fast? <span className="text-rose-300">Get an urgent sale offer through VIB.</span>
              </p>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-lg drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                Turn your inventory into real value. Our verified buyer network helps you get a potential instant offer with a fast and secure process.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-3 py-1.5 rounded-full bg-[#1c0817]/90 backdrop-blur-sm border border-rose-500/35 text-[11px] text-rose-200 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-rose-400" /> Fast Evaluation
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[#1c0817]/90 backdrop-blur-sm border border-rose-500/35 text-[11px] text-rose-200 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-rose-400" /> Potential Instant Offer
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[#1c0817]/90 backdrop-blur-sm border border-rose-500/35 text-[11px] text-rose-200 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-rose-400" /> Verified Buyer Network
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[#1c0817]/90 backdrop-blur-sm border border-rose-500/35 text-[11px] text-rose-200 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-rose-400" /> Secure Transaction
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenCheckout('Urgent Profile Valuation Request', 0)}
                  className="min-h-[44px] px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs shadow-lg shadow-rose-600/30 hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <span>Get My Profile Evaluated</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="min-h-[44px] px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-bold font-rajdhani uppercase tracking-wider text-gray-200 hover:text-white transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  Learn More
                </button>
              </div>
              <p className="text-[10px] text-gray-400/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                Note: Offers are subject to profile quality, demand and verification. An evaluation does not guarantee a purchase.
              </p>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden min-h-[340px] sm:min-h-[470px] bg-gradient-to-b from-[#120826] to-[#070510] p-5 sm:p-6 flex flex-col justify-between shadow-2xl border border-purple-500/20">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-purple-300 uppercase font-bold">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>TWO WAYS TO SELL</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white font-rajdhani uppercase tracking-wide">
                SPEED OR VALUE — <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-purple-300">THE CHOICE IS YOURS</span>
              </h3>
            </div>

            <div className="space-y-3 mt-4">
              <div className="p-4 rounded-xl bg-[#11050e]/90 backdrop-blur-sm border border-rose-500/35 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-300 uppercase font-rajdhani flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-rose-400" /> Urgent Sale Offer
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 uppercase">FASTER</span>
                </div>
                <div className="text-[11px] text-gray-300 space-y-1">
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-rose-400 flex-shrink-0" /><span>Request a quick evaluation</span></div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-rose-400 flex-shrink-0" /><span>Potential instant cash offer</span></div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-rose-400 flex-shrink-0" /><span>Faster transaction process</span></div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-rose-400 flex-shrink-0" /><span>Generally lower expected value</span></div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-rose-400 flex-shrink-0" /><span>Strict verification required</span></div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#14081c]/90 backdrop-blur-sm border border-purple-500/35 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-300 uppercase font-rajdhani flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Promotion Method
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 uppercase">HIGHER VALUE</span>
                </div>
                <div className="text-[11px] text-gray-300 space-y-1">
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-purple-400 flex-shrink-0" /><span>You set your asking price</span></div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-purple-400 flex-shrink-0" /><span>We promote your profile</span></div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-purple-400 flex-shrink-0" /><span>Interested buyers contact you</span></div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-purple-400 flex-shrink-0" /><span>Potential for better selling value</span></div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-purple-400 flex-shrink-0" /><span>More time may be required</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. VP PACKS HUB (Reference 2) — full-bleed Part 08 hero + regional cards */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="relative rounded-2xl overflow-hidden min-h-[280px] sm:min-h-[380px] flex items-center bg-[#070510] shadow-2xl group">
          <img
            src="/assets/reference_parts/part_08.png"
            alt="VP Packs Artwork"
            className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

          <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#e879f9] uppercase font-bold">
              <CreditCard className="w-3.5 h-3.5 text-[#e879f9]" />
              <span>TOP UP & PLAY WITHOUT LIMITS</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase text-white font-rajdhani tracking-tight leading-none drop-shadow-[0_4px_22px_rgba(0,0,0,0.9)]">
              VP <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-purple-400">PACKS</span>
            </h2>
            <div className="text-lg sm:text-2xl font-black font-rajdhani text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 uppercase tracking-wide">
              MORE PLAY. MORE POSSIBILITIES.
            </div>
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-lg drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              Top up your account safely with the best prices, flexible payment options and instant delivery.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Safe & Secure
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-purple-400" /> Best Prices
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-purple-400" /> Instant Delivery
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-purple-400" /> Multiple Payment Options
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative rounded-2xl overflow-hidden min-h-[300px] sm:min-h-[340px] flex items-center bg-[#070510] shadow-2xl group">
            <img
              src="/assets/reference_parts/part_09.png"
              alt="Indian Region VP Artwork"
              className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

            <div className="relative z-10 p-6 space-y-3.5 w-full">
              <div className="flex items-center gap-3">
                <FlagIcon country="IN" size="lg" className="shadow-lg" />
                <div>
                  <h3 className="font-extrabold text-lg text-white font-rajdhani uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">INDIAN REGION VP</h3>
                  <div className="text-[11px] text-gray-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">Top up your Indian region account at the best rates.</div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-200 max-w-[300px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Official Region Top Ups</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Competitive Pricing</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Instant Delivery</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Multiple Packs Available</span></div>
              </div>
              <button
                onClick={() => onNavigate('vp-catalog')}
                className="px-5 py-2.5 rounded-xl bg-purple-600/40 hover:bg-purple-600 text-purple-100 hover:text-white border border-purple-500/40 backdrop-blur-sm font-bold text-xs font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-md"
              >
                <span>View Indian VP Packs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden min-h-[300px] sm:min-h-[340px] flex items-center bg-[#070510] shadow-2xl group">
            <img
              src="/assets/reference_parts/part_11.png"
              alt="PHP Region VP Artwork"
              className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

            <div className="relative z-10 p-6 space-y-3.5 w-full">
              <div className="flex items-center gap-3">
                <FlagIcon country="PH" size="lg" className="shadow-lg" />
                <div>
                  <h3 className="font-extrabold text-lg text-white font-rajdhani uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">PHP REGION VP</h3>
                  <div className="text-[11px] text-gray-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">Top up your Philippines region account with ease.</div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-200 max-w-[300px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Official Region Top Ups</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Better Pricing Options</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Instant Delivery</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Wide Pack Selection</span></div>
              </div>
              <button
                onClick={() => onNavigate('vp')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold text-xs font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-fuchsia-600/30"
              >
                <span>View PHP VP Packs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#090615] border border-purple-500/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs relative">
          <div className="flex items-center gap-2 text-gray-300">
            <CreditCard className="w-4 h-4 text-purple-400" />
            <span><span className="text-purple-300 font-bold uppercase font-rajdhani">Flexible Payment Plans:</span> Get your VP now, pay later. Easy EMI options to make topping up more convenient.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-500 font-mono hidden lg:flex items-center gap-1"><Zap className="w-3 h-3 text-purple-400" /> Easy EMI Options</span>
            <span className="text-[10px] text-gray-500 font-mono hidden lg:flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-purple-400" /> Secure & Verified</span>
            <button
              onClick={() => onOpenCheckout('EMI Payment Plan Consultation', 0)}
              className="px-4 py-2 rounded-lg bg-purple-600/25 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 font-bold font-rajdhani uppercase flex items-center gap-1 cursor-pointer whitespace-nowrap transition-all"
            >
              <span>Learn More</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 8. SKIN RENTALS (Reference 2) — full-bleed Part 10 */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden min-h-[320px] sm:min-h-[440px] lg:min-h-[544px] flex items-center bg-[#070510] shadow-2xl group">
          <img
            src="/assets/reference_parts/part_10.png"
            alt="Skin Rentals Artwork"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

          <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#e879f9] uppercase font-bold">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>VIB EXPERIENCE PROGRAM</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black uppercase text-white font-rajdhani tracking-tight leading-none drop-shadow-[0_4px_22px_rgba(0,0,0,0.9)]">
              SKIN <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-pink-400">RENTALS</span>
            </h2>
            <div className="text-lg sm:text-2xl font-black font-rajdhani text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 uppercase tracking-wide">
              PREMIUM SKINS. YOUR WAY.
            </div>
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-lg drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              Experience high-end skins at affordable rates. Play with the looks you love, without the long-term commitment.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Wide Skin Collection
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-purple-400" /> Affordable Plans
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-purple-400" /> Instant Access
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-purple-400" /> Flexible Durations
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('rentals')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Explore Rentals</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('rentals')}
                className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-bold font-rajdhani uppercase tracking-wider text-gray-200 hover:text-white transition-colors cursor-pointer"
              >
                How It Works
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. RANKUP & DERANK SERVICES (Reference 3) — full-bleed Part 14 */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden min-h-[420px] sm:min-h-[480px] flex items-center bg-[#070510] shadow-2xl group">
          <img
            src="/assets/reference_parts/part_14.png"
            alt="Rankup Champion Artwork"
            className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

          <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#e879f9] uppercase font-bold">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>COMPETITIVE SERVICES</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-white font-rajdhani tracking-tight leading-none drop-shadow-[0_4px_22px_rgba(0,0,0,0.9)]">
              RANKUP & <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-rose-400">DERANK SERVICES</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-lg drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              Reach your desired rank or adjust to a lower rank with the help of our verified professional players. Safe, secure and reliable.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-purple-400" /> Verified Players
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Secure Account Handling
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Progress Tracking
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-purple-400" /> Multiple Queue Options
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('rankup')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-purple-600 to-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Rankup Calculator</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div
            role="button"
            tabIndex={0}
            aria-pressed={journeyType === 'rankup'}
            aria-label="Select Rankup Services mode"
            onClick={() => {
              soundFx.playClickSound();
              setJourneyType('rankup');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                soundFx.playClickSound();
                setJourneyType('rankup');
              }
            }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              journeyType === 'rankup'
                ? 'bg-gradient-to-br from-[#0a1526]/95 to-[#070e1a]/95 backdrop-blur-sm border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.2)]'
                : 'bg-[#080b15] border-purple-500/15 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-white font-rajdhani text-base">RANKUP SERVICES</span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 uppercase">CLIMB</span>
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-cyan-400 flex-shrink-0" /><span>All Ranks Supported</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-cyan-400 flex-shrink-0" /><span>Solo or Duo Options</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-cyan-400 flex-shrink-0" /><span>Standard & Priority</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-cyan-400 flex-shrink-0" /><span>Real Progress Tracking</span></div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onNavigate('rankup'); }}
              className="px-5 py-2.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white border border-cyan-500/40 font-bold text-xs font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <span>Rankup Plans</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-pressed={journeyType === 'derank'}
            aria-label="Select Derank Services mode"
            onClick={() => {
              soundFx.playClickSound();
              setJourneyType('derank');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                soundFx.playClickSound();
                setJourneyType('derank');
              }
            }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
              journeyType === 'derank'
                ? 'bg-gradient-to-br from-[#240a15]/95 to-[#17060e]/95 backdrop-blur-sm border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.2)]'
                : 'bg-[#15070f] border-purple-500/15 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                <span className="font-bold text-white font-rajdhani text-base">DERANK SERVICES</span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30 uppercase">LOWER MMR</span>
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-rose-400 flex-shrink-0" /><span>Lower to Desired Rank</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-rose-400 flex-shrink-0" /><span>Safe & Discreet</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-rose-400 flex-shrink-0" /><span>Multiple Rank Options</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-rose-400 flex-shrink-0" /><span>Play with Friends</span></div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onNavigate('rankup'); }}
              className="px-5 py-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 font-bold text-xs font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <span>Derank Plans</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-500 text-center pt-1">"Same game. Different goals. We support both." — VIB</p>
      </section>

      {/* 10. SAME GAME HIGHER YOU divider — full-bleed Part 17 */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden min-h-[220px] sm:min-h-[260px] flex items-center bg-[#070510] shadow-2xl">
          <img
            src="/assets/reference_parts/part_17.png"
            alt="Same Game Higher You Artwork"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />
          <div className="relative z-10 w-full px-6 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <img
              src="/assets/hires/vib_logo_metallic_hires.png"
              alt="VIB"
              className="h-9 w-auto object-contain drop-shadow-[0_0_18px_rgba(168,85,247,0.7)] hidden md:block"
              onError={(e) => { (e.target as HTMLImageElement).src = '/assets/client/vib-logo.png'; }}
            />
            <div className="text-center space-y-1">
              <h3 className="text-2xl sm:text-4xl font-black uppercase font-rajdhani tracking-wide drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]">
                <span className="text-white">SAME GAME.</span>{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-rose-400">HIGHER YOU.</span>
              </h3>
            </div>
            <p className="text-xs text-gray-300 max-w-[200px] text-center md:text-right drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              More than just a service. A community that helps you grow.
            </p>
          </div>
        </div>
      </section>

      {/* 11. THE RANK JOURNEY (Reference 3) — full-bleed Part 12 staircase */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden min-h-[360px] sm:min-h-[500px] bg-[#070510] shadow-2xl flex flex-col justify-between">
          <img
            src="/assets/reference_parts/part_12.png"
            alt="Rank Journey Staircase"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/60 to-transparent z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

          <div className="relative z-10 p-6 sm:p-10 space-y-2">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-cyan-300 uppercase font-bold">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>THE RANK JOURNEY • 9 TIER PROGRESSION</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase font-rajdhani tracking-tight leading-none drop-shadow-[0_4px_22px_rgba(0,0,0,0.9)]">
              <span className="text-white">EVERY RANK</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-300">A NEW YOU</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-200 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              Your journey. Our support. Reach higher.
            </p>
          </div>

          <div className="relative z-10 px-3 sm:px-8 pb-6">
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5 sm:gap-2">
              {RANK_TIERS.map((tier) => {
                const rankIconUrl = rankBadges[tier.name as keyof typeof rankBadges] || getRankBadgeUrl(tier.name);
                return (
                  <div
                    key={tier.name}
                    className={`p-1.5 sm:p-2.5 rounded-xl bg-[#070510]/90 backdrop-blur-sm border ${tier.border ?? ''}/30 text-center space-y-1 sm:space-y-1.5 flex flex-col items-center justify-between hover:border-purple-400 transition-colors ${tier.text}`}
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center relative">
                      <img
                        src={rankIconUrl}
                        alt={`${tier.name} Rank Badge`}
                        className="w-8 h-8 sm:w-9 sm:h-9 object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] hover:scale-110 transition-transform"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getRankBadgeUrl(tier.name);
                        }}
                      />
                    </div>
                    <div className={`font-bold text-[10px] sm:text-[11px] font-rajdhani uppercase tracking-wide truncate max-w-full`}>{tier.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 12. STATS ROWS (Reference 3) */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-[#0a0717] border border-purple-500/15 flex items-center gap-3">
            <User className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-xs text-white font-rajdhani uppercase tracking-wider">SOLO</div>
              <div className="text-[10px] text-gray-500">Individual progression</div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0a0717] border border-purple-500/15 flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-xs text-white font-rajdhani uppercase tracking-wider">DUO</div>
              <div className="text-[10px] text-gray-500">Progress together</div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0a0717] border border-purple-500/15 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-xs text-white font-rajdhani uppercase tracking-wider">STANDARD</div>
              <div className="text-[10px] text-gray-500">Regular queue</div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0a0717] border border-purple-500/15 flex items-center gap-3">
            <Shield className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-xs text-white font-rajdhani uppercase tracking-wider">PRIORITY</div>
              <div className="text-[10px] text-gray-500">Faster completion</div>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#0a0717] border border-purple-500/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 font-rajdhani">50,000+</div>
            <div className="text-[11px] text-gray-400">Community Members</div>
          </div>
          <div>
            <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-amber-300 font-rajdhani">1M+</div>
            <div className="text-[11px] text-gray-400">Successful Transactions</div>
          </div>
          <div>
            <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300 font-rajdhani">99%</div>
            <div className="text-[11px] text-gray-400">Positive Reviews</div>
          </div>
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <div className="text-[10px] text-gray-400">Trusted by a growing community of players across India.</div>
          </div>
        </div>
      </section>

      {/* 13. VALO SKINS EXCHANGE (Reference 3) — full-bleed Part 15 */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden min-h-[320px] sm:min-h-[460px] flex items-center bg-[#070510] shadow-2xl group">
          <img
            src="/assets/reference_parts/part_15.png"
            alt="Valo Skins Exchange Artwork"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

          <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#d946ef] uppercase font-bold">
              <Repeat className="w-3.5 h-3.5 text-[#d946ef]" />
              <span>TRADE & EXCHANGE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-white font-rajdhani tracking-tight leading-none drop-shadow-[0_4px_22px_rgba(0,0,0,0.9)]">
              VALO SKINS <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-pink-400 to-purple-300">EXCHANGE</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-lg drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              Trade or exchange your unwanted skins with other players. Find better skins, upgrade your collection — all in one place.
            </p>
            <button
              onClick={() => onOpenCheckout('Valo Skins Exchange Valuation', 0)}
              className="text-sm font-bold text-[#ff2ebb] hover:text-fuchsia-300 font-rajdhani uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
            >
              <span>Start Trading</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Wide Skin Selection
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-purple-400" /> Fair Valuation
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-purple-400" /> Secure Transactions
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-purple-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <Headphones className="w-3.5 h-3.5 text-purple-400" /> Direct Support
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 14. REGION MIGRATION GATEWAY (Reference 3) — full-bleed Part 18 */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden min-h-[360px] sm:min-h-[500px] bg-[#070510] shadow-2xl flex flex-col justify-between">
          <img
            src="/assets/reference_parts/part_18.png"
            alt="Region Migration Gateway Artwork"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/60 to-transparent z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

          <div className="relative z-10 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center w-full">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#e879f9] uppercase font-bold">
                <Globe className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>GLOBAL ACCESS</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase font-rajdhani tracking-tight leading-none drop-shadow-[0_4px_22px_rgba(0,0,0,0.9)]">
                <span className="text-white">CHANGE REGION</span><br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-fuchsia-400 to-cyan-400">FROM IND TO PHP</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-lg drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                Switch your account from Indian region to Philippines region and unlock lower prices, more purchase options and exclusive content.
              </p>
              <button
                onClick={() => onOpenCheckout('Region Change: IND to PHP Migration', 1299)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs shadow-lg shadow-fuchsia-600/30 hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Switch to PHP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#0a0717]/90 backdrop-blur-md border border-purple-500/25 space-y-3 shadow-xl">
              <div className="text-[11px] font-mono font-bold text-purple-300 uppercase tracking-widest">WHY SWITCH TO PHP?</div>
              <div className="space-y-2 text-xs text-gray-200">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Cheaper VP Prices</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>More Purchase Options</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Exclusive Skins & Bundles</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Better Long-Term Value</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 15. CREATE A FRESH PHP PROFILE (Reference 4) — full-bleed Part 16 */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden min-h-[320px] sm:min-h-[460px] flex items-center bg-[#070510] shadow-2xl group">
          <img
            src="/assets/reference_parts/part_16.png"
            alt="Fresh PHP Profile Artwork"
            className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

          <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-pink-400 uppercase font-bold">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>NEW BEGINNINGS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase font-rajdhani tracking-tight leading-none drop-shadow-[0_4px_22px_rgba(0,0,0,0.9)]">
              <span className="text-white">CREATE A FRESH</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-cyan-200">PHP PROFILE</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-lg drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              Get a brand new Philippines region profile, ready to use. More access. More value. More possibilities.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-cyan-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-cyan-400" /> Clean & Fresh Profile
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-cyan-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Ready for Purchases
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-cyan-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> Verified & Secure
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-cyan-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-cyan-400" /> Hassle-Free Setup
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onOpenCheckout('Fresh Philippines (PHP) Profile Provisioning', 499)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-sky-500/30 hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Get Your PHP Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="text-[10px] text-gray-400 font-mono drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">STARTING FROM ₹499</div>
            </div>
          </div>
        </div>
      </section>

      {/* 16. HOW IT WORKS — 4-step strip (Reference 4) */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0a0717] border border-purple-500/15 shadow-xl flex flex-col lg:flex-row items-center gap-6">
          <div className="space-y-1 text-left lg:w-52 flex-shrink-0">
            <h3 className="text-lg font-black uppercase text-white font-rajdhani tracking-wide">HOW IT WORKS?</h3>
            <div className="text-sm font-marker text-purple-300">Simple. Secure. Quick.</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 w-full">
            {[
              { icon: ShoppingCart, step: '1', title: 'Place Your Order', desc: 'Choose your PHP profile plan.' },
              { icon: Settings, step: '2', title: 'We Set It Up', desc: 'Our team prepares your profile.' },
              { icon: Mail, step: '3', title: 'Receive & Verify', desc: 'Get your login details safely.' },
              { icon: CheckCircle2, step: '4', title: 'Start Exploring', desc: 'Access exclusive content & more.' },
            ].map((s, i) => (
              <div key={i} className="relative flex items-start gap-3 p-3.5 rounded-xl bg-[#0d0919]/80 border border-white/5 group/step">
                <div className="w-9 h-9 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0">
                  <s.icon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-fuchsia-400 font-rajdhani">{s.step}</span>
                    <span className="text-xs font-bold text-white">{s.title}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 leading-snug">{s.desc}</div>
                </div>
                {i < 3 && (
                  <ArrowRight className="w-3.5 h-3.5 text-purple-500/60 absolute -right-2.5 top-1/2 -translate-y-1/2 hidden lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 17. COACHING PROGRAM (Reference 4) — full-bleed Part 21, text right */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden min-h-[340px] sm:min-h-[470px] flex items-center justify-end bg-[#070510] shadow-2xl group">
          <img
            src="/assets/reference_parts/part_21.png"
            alt="Coaching Program Artwork"
            className="absolute inset-0 w-full h-full object-cover object-left pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

          <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>LEARN. IMPROVE. DOMINATE.</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase font-rajdhani tracking-tight leading-none drop-shadow-[0_4px_22px_rgba(0,0,0,0.9)]">
              <span className="text-white">COACHING</span>{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-400">PROGRAM</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-lg drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              Learn from experienced and verified players. Improve your aim, game sense, strategies and more with 1-on-1 or group sessions.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-amber-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-amber-400" /> 1-on-1 or Group Sessions
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-amber-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-amber-400" /> High-Rank Coaches
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-amber-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Personalized Guidance
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#120f24]/85 backdrop-blur-sm border border-amber-500/35 text-[11px] text-gray-200 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" /> Flexible Scheduling
              </span>
            </div>
            <button
              onClick={() => onNavigate('coaching')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 hover:scale-105 transition-all cursor-pointer flex items-center gap-2 w-fit"
            >
              <span>Checkout Coaching Plans</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex flex-wrap items-center gap-5 pt-2 text-[10px] text-gray-300 uppercase tracking-wider font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-amber-400" /> Improve Faster</span>
              <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> Game Sense & Decisions</span>
              <span className="flex items-center gap-1.5"><Map className="w-3.5 h-3.5 text-amber-400" /> Map Knowledge & Strategies</span>
              <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-amber-400" /> Learn From The Best</span>
            </div>
          </div>
        </div>
      </section>

      {/* 18. VIB LIVE AUCTIONS (Matching ClientAuctionsPage exactly) */}
      <section className="relative w-full flex items-center pt-8 pb-4">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[300px] bg-fuchsia-600/15 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>LIVE HIGH-ROLLER AUCTIONS</span>
              </div>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none font-rajdhani">
                VIB AUCTIONS: <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300">BID. WIN. OWN.</span>
              </h2>
              <p className="text-gray-300 text-xs sm:text-sm md:text-base leading-relaxed">
                Place competitive bids on rare, vaulted, and high-tier Valorant profile collections. 100% transparent bidding with instant transfer upon timer expiry.
              </p>
            </div>

            {/* REAL-TIME COUNTDOWN TIMER CARD */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#090615] border border-fuchsia-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-3.5 shadow-xl w-full md:w-auto">
              <div className="text-left sm:text-right">
                <div className="text-[9px] font-mono text-fuchsia-300 uppercase font-bold tracking-wider">PRIMARY LOT CLOSES IN</div>
                <div className="text-xs text-gray-400 font-mono">Live Clock Sync</div>
              </div>
              <div className="flex items-center gap-1.5 font-mono font-black text-xl sm:text-2xl">
                <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-fuchsia-950/80 border border-fuchsia-500/50 text-fuchsia-200">
                  {String(timeLeft.hours).padStart(2, '0')}
                  <span className="block text-[8px] text-fuchsia-400 text-center font-normal">HRS</span>
                </div>
                <span className="text-fuchsia-400">:</span>
                <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-fuchsia-950/80 border border-fuchsia-500/50 text-fuchsia-200">
                  {String(timeLeft.minutes).padStart(2, '0')}
                  <span className="block text-[8px] text-fuchsia-400 text-center font-normal">MIN</span>
                </div>
                <span className="text-fuchsia-400">:</span>
                <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 animate-pulse">
                  {String(timeLeft.seconds).padStart(2, '0')}
                  <span className="block text-[8px] text-rose-400 text-center font-normal">SEC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRIMARY LIVE SHOWCASE LOT */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#130928] via-[#1c0d38] to-[#0e071e] border border-fuchsia-500/40 space-y-6 shadow-2xl relative overflow-hidden">
          {/* Full-bleed Reference Part 22 background with gradient overlays */}
          <img
            src="/assets/reference_parts/part_22.png"
            alt="Live Auction Auditorium Stage"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0717] via-[#0a0717]/85 to-[#0a0717]/15 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0717] via-transparent to-transparent z-[1]" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Glass Showcase Item */}
            <div className="lg:col-span-6 p-6 rounded-2xl bg-gradient-to-b from-[#1c103b]/90 to-[#0d081e]/90 backdrop-blur-md border border-fuchsia-500/40 space-y-4 shadow-xl group relative overflow-hidden">
              {/* Full-bleed Reference Part 20 weapon showcase backdrop */}
              <img
                src="/assets/reference_parts/part_20.png"
                alt="Floating Weapon Showcase"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d081e] via-[#0d081e]/50 to-transparent z-[1]" />

              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-fuchsia-900/80 text-fuchsia-200 border border-fuchsia-500/40 uppercase">
                  LOT #0881 • VAULTED COLLECTION
                </span>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Clean Account</span>
                </div>
              </div>

              <div className="py-8 flex items-center justify-center relative z-10">
                <div className="absolute inset-0 bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none" />
                <img
                  src="/assets/items/vandal-prime.png"
                  alt="Kuronami Vandal Showcase"
                  className="w-[88%] max-h-[220px] object-contain filter drop-shadow-[0_0_30px_rgba(217,70,239,0.7)] group-hover:scale-105 transition-transform duration-300 relative z-10"
                />
              </div>

              <div className="space-y-1 pt-2 border-t border-white/10">
                <h2 className="text-2xl font-black text-white font-rajdhani uppercase tracking-wide">
                  KURONAMI VANDAL + CHAMPIONS 2024 COMBO
                </h2>
                <p className="text-xs text-gray-300">
                  Includes Kuronami Vandal (Max Level + All Variants), Champions 2024 Vandal &amp; Blade, Reaver 2.0 Karambit, 1,200 VP Balance. Original Owner with First-Email.
                </p>
              </div>
            </div>

            {/* Bidding Controls & Form */}
            <div className="lg:col-span-6 p-6 sm:p-7 rounded-2xl bg-[#090616] border border-white/10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#120c2b] border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-gray-400 uppercase">CURRENT HIGHEST BID</div>
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-amber-300 font-rajdhani">
                    ₹{currentBid.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400">{bidCount} total bids placed</div>
                </div>

                <div className="p-4 rounded-xl bg-[#120c2b] border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-gray-400 uppercase">MINIMUM NEXT BID</div>
                  <div className="text-3xl font-black text-white font-rajdhani">
                    ₹{(currentBid + 150).toLocaleString()}
                  </div>
                  <div className="text-[11px] font-mono text-fuchsia-300">+₹150 minimum increment</div>
                </div>
              </div>

              {bidSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{bidSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handlePlaceBid} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-300 font-bold uppercase">
                    Enter Your Maximum Bid (INR)
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={userBidInput}
                        onChange={(e) => setUserBidInput(e.target.value)}
                        min={currentBid + 1}
                        className="w-full pl-8 pr-4 py-3 sm:py-3.5 rounded-xl bg-[#150f2e] border border-white/15 focus:border-fuchsia-500 focus:outline-none text-white font-mono font-bold text-base"
                        placeholder="Enter amount"
                      />
                    </div>
                    <button
                      type="submit"
                      className="min-h-[44px] px-8 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-xs sm:text-sm font-black font-rajdhani uppercase tracking-wider text-white shadow-lg shadow-fuchsia-600/40 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                    >
                      PLACE BID
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 border-t border-white/5 pt-3">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>Guaranteed Escrow Protection</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('auctions')}
                    className="text-fuchsia-400 hover:text-fuchsia-300 font-bold font-rajdhani uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Active Lots</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 19. EXCLUSIVE DEALS strip (Reference 4) */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-4 rounded-2xl bg-[#0a0717] border border-purple-500/15 shadow-xl flex flex-col lg:flex-row items-center gap-5">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-white font-rajdhani tracking-wide">
                EXCLUSIVE <span className="text-orange-400">DEALS</span>
              </h3>
              <p className="text-[11px] text-gray-400">Limited time offers. Top picks. Don't miss out.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 flex-1 w-full">
            {[
              '/assets/items/vandal-reaper.png',
              '/assets/hires/ranks/immortal.png',
              '/assets/items/vandal-prime.png',
              '/assets/hires/ranks/radiant.png',
              '/assets/items/phantom-rgx.png',
            ].map((img, i) => (
              <div key={i} className="h-12 rounded-lg bg-[#0d0919] border border-purple-500/20 p-1.5 flex items-center justify-center overflow-hidden hover:border-fuchsia-500/50 transition-colors">
                <img src={img} alt="Deal item" className="w-full h-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 20. JOIN THE VIB COMMUNITY (Reference 4) — full-bleed Part 26 */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden min-h-[300px] sm:min-h-[340px] bg-[#070510] shadow-2xl flex items-center">
          <img
            src="/assets/reference_parts/part_26.png"
            alt="Team VIB Championship Podium"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/20 to-transparent z-[1]" />

          <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between p-6 sm:p-10 gap-5">
            <div className="space-y-1.5 text-left">
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani tracking-wide drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]">
                JOIN THE VIB COMMUNITY
              </h3>
              <p className="text-xs sm:text-sm text-gray-200 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                Connect, trade, learn and grow with thousands of members across India & SEA.
              </p>
            </div>

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

      {/* 21. TRUST CARDS STRIP */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex items-center gap-3.5 shadow-md">
            <div className="w-11 h-11 rounded-full bg-purple-900/35 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-white">Secure-Link Delivery</div>
              <div className="text-[11px] text-gray-400">Encrypted credential delivery</div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex items-center gap-3.5 shadow-md">
            <div className="w-11 h-11 rounded-full bg-purple-900/35 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-white">Dedicated Support</div>
              <div className="text-[11px] text-gray-400">Live executive & order assistance</div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex items-center gap-3.5 shadow-md">
            <div className="w-11 h-11 rounded-full bg-purple-900/35 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-white">Escrow Protected</div>
              <div className="text-[11px] text-gray-400">Safe community trade mediation</div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex items-center gap-3.5 shadow-md">
            <div className="w-11 h-11 rounded-full bg-purple-900/35 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-white">Flexible Payment Plans</div>
              <div className="text-[11px] text-gray-400">Manual UPI, QR & Bank Transfer</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
