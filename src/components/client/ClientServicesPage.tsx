import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  Check,
  Headphones,
  ArrowRight,
  ShoppingCart,
  Users,
  Globe,
  Megaphone,
  Zap,
  Lock,
  FileText,
  ChevronLeft,
  ChevronRight,
  MousePointer,
  Package,
  CreditCard,
  BarChart2,
  BadgeCheck,
  Flame,
  Award,
  Clock,
  Sparkles,
  Gavel,
  CheckCircle2,
  Tv,
  Target,
  Crosshair,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Currency, CartItem } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from './Header';
import { FlagIcon } from '../common/FlagIcon';
import { useAuth } from '../../context/AuthContext';
import { getAuctionTimeLeft } from '../../utils/auction';

interface ClientServicesPageProps {
  currency: Currency;
  onNavigate: (page: ClientPage) => void;
  onAddToCart: (item: CartItem) => void;
  onOpenCheckout: (title: string, priceINR: number) => void;
  initialSection?: string;
}

export const ClientServicesPage: React.FC<ClientServicesPageProps> = ({
  currency,
  onNavigate,
  onAddToCart,
  onOpenCheckout,
  initialSection,
}) => {
  const { user, token, openAuthModal } = useAuth();
  // ---------------------------------------------------------------------------
  // LIVE AUCTION COUNTDOWN TIMER (Real-time ticking state)
  // ---------------------------------------------------------------------------
  const [featuredLotId, setFeaturedLotId] = useState<string>('lot_1938918fb9d6');
  const [auctionEndsAt, setAuctionEndsAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(() => getAuctionTimeLeft(null));
  const [isAuctionLoading, setIsAuctionLoading] = useState(true);
  const [isAuctionUnavailable, setIsAuctionUnavailable] = useState(false);
  const [currentBid, setCurrentBid] = useState(0);
  const [bidCount, setBidCount] = useState(0);
  const [auctionStatus, setAuctionStatus] = useState<'active' | 'paused' | 'ended'>('active');
  const [userBidInput, setUserBidInput] = useState('');
  const [bidSuccessMessage, setBidSuccessMessage] = useState<string | null>(null);
  const [bidErrorMessage, setBidErrorMessage] = useState<string | null>(null);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const isAuctionActive = Boolean(
    !isAuctionLoading &&
    !isAuctionUnavailable &&
    auctionStatus === 'active' &&
    auctionEndsAt &&
    Date.parse(auctionEndsAt) > Date.now()
  );
  const isAuctionExpired = !isAuctionLoading && !isAuctionActive;

  const fetchFeaturedAuction = async () => {
    try {
      const response = await fetch('/api/auctions');
      if (!response.ok) {
        setIsAuctionUnavailable(true);
        return;
      }
      const data = await response.json();
      const lots = Array.isArray(data.lots) ? data.lots : [];
      const activeLot = lots.find((l: any) => l.status === 'active') || null;
      if (activeLot) {
        setFeaturedLotId(activeLot.id || 'lot_1938918fb9d6');
        setCurrentBid(Number(activeLot.current_bid || 0));
        setBidCount(Number(activeLot.bid_count || 0));
        setAuctionEndsAt(String(activeLot.ends_at || ''));
        setAuctionStatus(activeLot.status || 'active');
        setIsAuctionUnavailable(false);
      } else {
        const fallbackLot = (lots.length > 0 ? lots[0] : null) || data.lot || null;
        if (fallbackLot) {
          setFeaturedLotId(fallbackLot.id);
          setCurrentBid(Number(fallbackLot.current_bid || 0));
          setBidCount(Number(fallbackLot.bid_count || 0));
          setAuctionEndsAt(String(fallbackLot.ends_at || ''));
          setAuctionStatus(fallbackLot.status || 'ended');
          setIsAuctionUnavailable(false);
        } else {
          setIsAuctionUnavailable(true);
        }
      }
    } catch (error) {
      console.warn('Could not fetch featured auction:', error);
      setIsAuctionUnavailable(true);
    } finally {
      setIsAuctionLoading(false);
    }
  };

  useEffect(() => { void fetchFeaturedAuction(); }, []);

  useEffect(() => {
    const updateCountdown = () => {
      if (auctionStatus === 'active' && auctionEndsAt) {
        setTimeLeft(getAuctionTimeLeft(auctionEndsAt));
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [auctionEndsAt, auctionStatus]);

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidErrorMessage(null);
    setBidSuccessMessage(null);
    const bidVal = parseInt(userBidInput, 10);
    const minRequired = currentBid + 150;
    if (!Number.isFinite(bidVal) || bidVal < minRequired) {
      setBidErrorMessage(`Bid must be at least ₹${minRequired.toLocaleString()}.`);
      return;
    }
    if (!user) {
      openAuthModal('login');
      return;
    }
    // Navigate user to verified bidding interface where 50% security deposit is handled
    onNavigate('auctions');
  };

  // Scroll to initial section if provided
  useEffect(() => {
    if (initialSection) {
      const el = document.getElementById(initialSection);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, [initialSection]);

  const serviceCards = [
    {
      id: 'srv-1',
      title: 'Digital Profile Marketplace',
      desc: 'Explore a wide range of digital profiles listed by verified users and our platform.',
      icon: ShoppingCart,
      action: () => onNavigate('profiles'),
    },
    {
      id: 'srv-2',
      title: 'Profile Access Programs',
      desc: 'Flexible access options tailored to your competitive needs.',
      icon: Users,
      action: () => onNavigate('support'),
    },
    {
      id: 'srv-3',
      title: 'Rank Progression Assistance',
      desc: 'Get professional assistance to enhance your profile progression.',
      icon: BarChart2,
      action: () => onNavigate('rankup'),
    },
    {
      id: 'srv-4',
      title: 'Digital Profile Promotion',
      desc: 'Increase visibility for your profiles with our promotional services.',
      icon: Megaphone,
      action: () => onNavigate('advertise'),
    },
    {
      id: 'srv-5',
      title: 'Region Conversion Support',
      desc: 'Assistance with region conversion and profile configuration.',
      icon: Globe,
      action: () => {
        const el = document.getElementById('region-change');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      id: 'srv-6',
      title: 'Trading & Escrow Facilitation',
      desc: 'A safer way to trade with escrow support and brokered facilitation.',
      icon: ShieldCheck,
      action: () => {
        const el = document.getElementById('skins-exchange');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      id: 'srv-7',
      title: 'Urgent Sale Evaluation',
      desc: 'Get your profile evaluated for faster processing and instant cashout.',
      icon: Zap,
      action: () => {
        const el = document.getElementById('urgent-sale');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      id: 'srv-8',
      title: 'Customer Verification & Support',
      desc: 'Identity verification and dedicated support for a smoother experience.',
      icon: Headphones,
      action: () => onNavigate('support'),
    },
  ];

  const phpSteps = [
    {
      num: '01',
      title: 'Place Your Order',
      desc: 'Select your preferred starting rank, region specification, and submit your request.',
    },
    {
      num: '02',
      title: 'Account Set Up',
      desc: 'Our automated system provisions a fresh, clean Philippines region account with zero prior matches.',
    },
    {
      num: '03',
      title: 'Receive & Verify',
      desc: 'Receive full access login details, first-email access, and complete security credentials within 10 minutes.',
    },
    {
      num: '04',
      title: 'Start Exploring',
      desc: 'Enjoy 40% cheaper VP in the store forever with identical low ping on Mumbai and Singapore servers.',
    },
  ];

  const coachingPillars = [
    {
      icon: Tv,
      title: 'VOD Review & Macro Strategy',
      desc: 'Detailed round-by-round breakdown of positioning, rotations, utility economy, and game sense.',
    },
    {
      icon: Crosshair,
      title: 'Aim Mechanics & Micro Adjustments',
      desc: 'Crosshair placement, movement peeking drills, counter-strafing, and recoil mastery.',
    },
    {
      icon: Target,
      title: 'Agent Mastery & Ability Lineups',
      desc: 'In-depth playbook for your main agent pool including site executes, retakes, and post-plant setups.',
    },
    {
      icon: Flame,
      title: 'Mental Game & Clutch Execution',
      desc: 'Composure under pressure, team communication leadership, and winning high-stakes rounds.',
    },
  ];

  const compliance = [
    {
      title: 'Identity Verification',
      desc: 'KYC procedures to ensure genuine users.',
      icon: BadgeCheck,
    },
    {
      title: 'Transparent Service Terms',
      desc: 'Clear policies for all our services.',
      icon: FileText,
    },
    {
      title: 'Fraud Prevention Measures',
      desc: 'Active monitoring and risk control systems.',
      icon: ShieldCheck,
    },
    {
      title: 'Data Handling & Privacy',
      desc: 'Your data is protected and handled responsibly.',
      icon: Lock,
    },
    {
      title: 'Customer Support',
      desc: 'Dedicated support for any queries or issues.',
      icon: Headphones,
    },
  ];

  const featuredListings = [
    {
      id: 'l-1',
      badge: 'FEATURED',
      badgeColor: 'amber',
      code: 'Profile #A1023',
      sub: 'Level Ready • Multiple Features',
      priceINR: 4999,
      weapon: '/assets/items/vandal-prime.png',
      weaponName: 'Prime Vandal Edition',
    },
    {
      id: 'l-2',
      badge: 'POPULAR',
      badgeColor: 'amber',
      code: 'Profile #B4481',
      sub: 'Well Configured • Great Value',
      priceINR: 3499,
      weapon: '/assets/items/vandal-rgx.png',
      weaponName: 'RGX 11z Pro Vandal',
    },
    {
      id: 'l-3',
      badge: '',
      badgeColor: '',
      code: 'Profile #C7710',
      sub: 'Premium Setup • Ready to Use',
      priceINR: 5999,
      weapon: '/assets/items/phantom-rgx.png',
      weaponName: 'RGX 11z Pro Phantom',
    },
    {
      id: 'l-4',
      badge: 'NEW',
      badgeColor: 'cyan',
      code: 'Profile #D3091',
      sub: 'Balanced Profile • Smooth Progress',
      priceINR: 2499,
      weapon: '/assets/items/vandal-reaper.png',
      weaponName: 'Reaver Vandal Spec',
    },
  ];

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white space-y-12 pb-20 font-sans">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section className="relative w-full pt-6 sm:pt-8 min-h-[360px] sm:min-h-[500px] flex items-center">
        {/* Full-bleed Reference Part 27 (3D VIB Monolith Stage) with gradient overlay */}
        <img
          src="/assets/reference_parts/part_27.png"
          alt="VIB 3D Monolith Stage Part 27"
          className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0 opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05040a] via-[#05040a]/85 to-[#05040a]/15 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05040a] via-transparent to-transparent z-[1]" />
        {/* Atmospheric Ambient Glows */}
        <div className="absolute top-10 right-1/4 w-[650px] h-[550px] bg-purple-700/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-[450px] h-[350px] bg-fuchsia-800/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left Hero Details */}
          <div className="lg:col-span-7 space-y-4">
            <div className="text-[11px] font-mono tracking-[0.22em] text-[#e879f9] uppercase font-bold">
              MORE THAN A PLATFORM
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[54px] xl:text-[62px] font-black uppercase tracking-tight leading-[1.02] font-rajdhani">
              <span className="text-white">DIGITAL SERVICES.</span> <br />
              <span className="text-purple-300 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                STRUCTURED. SECURE.
              </span> <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-pink-400 drop-shadow-[0_0_25px_rgba(192,38,211,0.5)]">
                PROFESSIONAL.
              </span>
            </h1>

            <p className="text-gray-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              VIB provides digital profile services, live auctions, private coaching, marketplace facilitation, and customer support through a unified esports ecosystem.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('services-grid');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider text-white transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg flex items-center gap-2 font-rajdhani"
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #c026d3 100%)',
                  boxShadow: '0 0 20px rgba(168, 85, 247, 0.45)',
                }}
              >
                <span>EXPLORE SERVICES</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('auctions');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider text-gray-200 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer border border-purple-500/40 bg-[#0c0a18] hover:bg-purple-900/20 flex items-center gap-2 font-rajdhani"
              >
                <Gavel className="w-4 h-4 text-purple-400" />
                <span>LIVE AUCTIONS</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              </button>
            </div>

            {/* Terms notice with shield */}
            <div className="flex items-start gap-2 pt-1 text-[11px] text-gray-400 max-w-lg">
              <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>
                Services are provided subject to applicable terms, platform policies, service-specific conditions, and verification requirements.
              </span>
            </div>

            {/* 3 Micro Badges */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-gray-300 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-mono text-[10px] tracking-wider uppercase">SECURE PROCESS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono text-[10px] tracking-wider uppercase">VERIFIED USERS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-mono text-[10px] tracking-wider uppercase">DEDICATED SUPPORT</span>
              </div>
            </div>
          </div>

          {/* Part 27 now applied as full-bleed hero background above */}
          <div className="lg:col-span-5 hidden lg:flex flex-col items-center justify-center relative">
            <div className="text-[10px] font-mono tracking-[0.22em] text-purple-300 uppercase text-center opacity-85 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              A SAFER DIGITAL ECOSYSTEM FOR A STRONGER TOMORROW
            </div>
          </div>
        </div>
      </section>


      {/* ========================================================================= */}
      {/* 2. VIB URGENT SALE OFFER: SELL YOUR PROFILE FAST (Reference 2)             */}
      {/* ========================================================================= */}
      <section id="urgent-sale" className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <div className="lg:col-span-2 relative rounded-2xl overflow-hidden min-h-[340px] sm:min-h-[470px] flex items-center bg-[#070510] shadow-2xl group border border-rose-500/20">
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
                  <Shield className="w-3.5 h-3.5 text-rose-400" /> Instant Offer
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[#1c0817]/90 backdrop-blur-sm border border-rose-500/35 text-[11px] text-rose-200 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-rose-400" /> Verified Buyers
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[#1c0817]/90 backdrop-blur-sm border border-rose-500/35 text-[11px] text-rose-200 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-rose-400" /> Secure Escrow
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('support')}
                  className="min-h-[44px] px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs shadow-lg shadow-rose-600/30 hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <span>Get My Profile Evaluated</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('all-services');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
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
                <span>TWO WAYS TO SELL — SPEED OR VALUE</span>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div className="p-4 rounded-xl bg-[#11050e]/90 backdrop-blur-sm border border-rose-500/35 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-300 uppercase font-rajdhani flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-rose-400" /> Urgent Sale Offer
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 uppercase">FASTER</span>
                </div>
                <ul className="text-[11px] text-gray-300 space-y-1">
                  <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-rose-400" /> Request a quick evaluation</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-rose-400" /> Potential instant cash offer</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-rose-400" /> Faster transaction process</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-rose-400" /> Generally lower expected value</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-rose-400" /> Strict verification required</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#0d071a]/90 backdrop-blur-sm border border-purple-500/35 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-300 uppercase font-rajdhani flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" /> Promotion Method
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 uppercase">HIGHER VALUE</span>
                </div>
                <ul className="text-[11px] text-gray-300 space-y-1">
                  <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-purple-400" /> You set your asking price</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-purple-400" /> We promote your profile</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-purple-400" /> Interested buyers contact you</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-purple-400" /> Potential for better selling value</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-purple-400" /> More time may be required</li>
                </ul>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => onNavigate('advertise')}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-xs font-bold font-rajdhani uppercase tracking-wider text-purple-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View All 12 Promotion Packages</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3B. CHANGE REGION FROM IND TO PHP: REGIONAL ARBITRAGE SERVICE              */}
      {/* ========================================================================= */}
      <section id="region-change" className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#0c0919] via-[#140b2a] to-[#0c0919] border border-fuchsia-500/30 space-y-6 shadow-2xl relative overflow-hidden">
          {/* Neon Glows */}
          <div className="absolute -left-10 top-0 w-80 h-80 bg-fuchsia-600/15 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute -right-10 bottom-0 w-80 h-80 bg-purple-600/15 rounded-full blur-[90px] pointer-events-none" />

          {/* Header */}
          <div className="space-y-1 relative z-10">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-[#e879f9] uppercase font-bold">
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span>REGIONAL ARBITRAGE SERVICE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white font-rajdhani">
              CHANGE REGION FROM IND TO PHP
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
              Switch your existing Valorant account region from India (IND) to Philippines (PHP) and unlock 25% to 40% cheaper VP rates on every store purchase forever.
            </p>
          </div>

          {/* Twin Portal Gateways Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center relative z-10">
            {/* Left Portal: INDIA REGION */}
            <div className="lg:col-span-5 p-5 rounded-xl bg-[#090714] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlagIcon country="IN" size="md" />
                  <div>
                    <h3 className="font-extrabold text-sm text-white font-rajdhani">INDIA REGION (IND)</h3>
                    <div className="text-[10px] font-mono text-gray-400">Current Standard Pricing</div>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
                  STANDARD
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-300 pt-1">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">1000 VP Price:</span>
                  <span className="font-bold text-white">₹800 - ₹850</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Ultra Bundle (8700 VP):</span>
                  <span className="font-bold text-white">₹7,200+</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Server Latency:</span>
                  <span className="font-bold text-emerald-400">15-25ms (Mumbai)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Savings Potential:</span>
                  <span className="font-bold text-gray-500">None (Full Price)</span>
                </div>
              </div>
            </div>

            {/* Middle Portal Bridge */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center text-center py-2 lg:py-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/40">
                <ArrowRight className="w-5 h-5 hidden lg:block" />
                <TrendingDown className="w-5 h-5 lg:hidden" />
              </div>
              <span className="text-[9px] font-mono text-fuchsia-400 uppercase font-bold mt-1 tracking-wider">
                SAVE 40%
              </span>
            </div>

            {/* Right Portal: PHILIPPINES REGION */}
            <div className="lg:col-span-5 p-5 rounded-xl bg-gradient-to-br from-[#120824] to-[#1c0d38] border border-fuchsia-500/50 space-y-3 shadow-lg shadow-fuchsia-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlagIcon country="PH" size="md" />
                  <div>
                    <h3 className="font-extrabold text-sm text-white font-rajdhani">PHILIPPINES REGION (PHP)</h3>
                    <div className="text-[10px] font-mono text-fuchsia-300">Discounted Southeast Asia Tier</div>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-fuchsia-900/60 text-fuchsia-200 border border-fuchsia-500/40 uppercase font-bold">
                  BEST VALUE
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-200 pt-1">
                <div className="flex justify-between py-1 border-b border-fuchsia-500/20">
                  <span className="text-gray-300">1000 VP Price:</span>
                  <span className="font-bold text-emerald-400">~₹520 (Save ~₹300)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-fuchsia-500/20">
                  <span className="text-gray-300">Ultra Bundle (8700 VP):</span>
                  <span className="font-bold text-emerald-400">~₹4,300 (Save ~₹2,900)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-fuchsia-500/20">
                  <span className="text-gray-300">Server Latency:</span>
                  <span className="font-bold text-emerald-400">Identical Mumbai / SG Ping</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-300">Total Savings:</span>
                  <span className="font-bold text-fuchsia-300">Up to 40% Off Every VP Pack</span>
                </div>
              </div>
            </div>
          </div>

          {/* Why Switch to PHP Checklist & CTA */}
          <div className="pt-2 border-t border-white/[0.08] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>25-40% cheaper VP on every purchase</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Identical Mumbai/Singapore server ping</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Safe &amp; Riot-compliant account setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Full warranty &amp; instant delivery</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenCheckout('Region Conversion Support: IND to PHP', 1299)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-xs sm:text-sm font-bold font-rajdhani uppercase tracking-wider text-white shadow-lg shadow-fuchsia-600/40 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
            >
              <span>Order Region Switch (₹1,299)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>


      {/* ========================================================================= */}
      {/* 3. CREATE A FRESH PHP PROFILE: 4-STEP FLOW [View 4]                       */}
      {/* ========================================================================= */}
      <section id="fresh-php" className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0c0a18] border border-purple-500/30 space-y-6 shadow-xl relative overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-[#e879f9] uppercase font-bold">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                <span>CLEAN REGIONAL PROVISIONING</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-rajdhani tracking-wide uppercase">
                CREATE A FRESH PHP PROFILE
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
                Start with a brand new, unranked Philippines (PHP) Valorant profile to immediately access 40% cheaper VP store prices without modifying your existing account.
              </p>
            </div>

            <button
              onClick={() => onOpenCheckout('Fresh Philippines (PHP) Profile Provisioning', 499)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-xs sm:text-sm font-black font-rajdhani uppercase tracking-wider text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
            >
              <span>Get Fresh PHP Profile (₹499)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 4 Steps Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {phpSteps.map((step, idx) => (
              <div
                key={step.num}
                className="p-5 rounded-xl bg-[#090714] border border-white/[0.08] hover:border-purple-500/40 transition-all space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 font-extrabold text-xs flex items-center justify-center font-rajdhani">
                    {step.num}
                  </div>
                  <span className="text-[9px] font-mono text-gray-500 uppercase">PHASE 0{idx + 1}</span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-white font-rajdhani tracking-wide">
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 4 Guarantees */}
          <div className="pt-2 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>100% Ban-Free Guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Mumbai/SG Low Ping Matchmaking</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>First-Email &amp; Password Changeable</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Lifetime Warranty Protection</span>
            </div>
          </div>
        </div>
      </section>


      {/* ========================================================================= */}
      {/* 4B. VALO SKINS EXCHANGE: TRADE IN. UPGRADE. DOMINATE. (Reference 3)       */}
      {/* ========================================================================= */}
      <section id="skins-exchange" className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4 scroll-mt-24">
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#170a2a] via-[#10081d] to-[#0a0515] border border-purple-500/35 relative overflow-hidden shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6 min-h-[380px]">
          {/* Full-bleed Reference Part 15 (Valo Skins Exchange Hologram Stage) */}
          <img
            src="/assets/reference_parts/part_15.png"
            alt="Valo Skins Exchange Showcase"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0 opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#170a2a] via-[#170a2a]/80 to-transparent z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#170a2a] via-transparent to-transparent z-[1]" />
          <div className="absolute right-1/4 top-0 w-80 h-full bg-purple-600/15 blur-3xl pointer-events-none" />

          {/* Left Text & Actions */}
          <div className="space-y-3 max-w-xl relative z-10">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#d946ef] uppercase font-bold">
              <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />
              <span>VALO SKINS EXCHANGE PROGRAM</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-white font-rajdhani tracking-tight leading-none">
              TRADE IN. UPGRADE. <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-amber-300">DOMINATE.</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Bored of your current skin inventory? Trade in your existing Valorant accounts or weapon collections for instant store credit or upgrade directly to high-tier vaulted inventories with guaranteed 100% escrow protection.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs text-gray-300">
              <div className="p-2.5 rounded-lg bg-[#0c0817] border border-white/5 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Instant Valuation</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0c0817] border border-white/5 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Fair Trade Rates</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0c0817] border border-white/5 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>100% Escrow Protection</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <button
                onClick={() => onNavigate('community')}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs shadow-lg shadow-fuchsia-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Get Exchange Valuation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Full-bleed Part 15 background applied above */}
        </div>
      </section>


      {/* ========================================================================= */}
      {/* 4. COACHING PROGRAM: LEARN. IMPROVE. DOMINATE. [View 4]                   */}
      {/* ========================================================================= */}
      <section id="coaching" className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#0e0a1f] via-[#150d2e] to-[#0e0a1f] border border-purple-500/30 space-y-6 shadow-2xl relative overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-10 w-96 h-96 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-[90px] pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-5 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-[#e879f9] uppercase font-bold">
                <Award className="w-3.5 h-3.5 text-purple-400" />
                <span>TIER 1 COMPETITIVE COACHING</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white font-rajdhani">
                COACHING PROGRAM: <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-pink-400">LEARN. IMPROVE. DOMINATE.</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
                1-on-1 private coaching with Radiant players, VCT tier analysts, and competitive specialists. Custom drills, live VOD reviews, and tailored aim routines.
              </p>
            </div>

            {/* Pricing Packages */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenCheckout('Valorant 1-on-1 Coaching (Single 1-Hour Session)', 799)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold font-rajdhani uppercase tracking-wider text-gray-200 hover:text-white transition-colors cursor-pointer"
              >
                Single Session (₹799)
              </button>
              <button
                onClick={() => onOpenCheckout('Valorant 5-Session Mastery Bootcamp', 3499)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-xs font-bold font-rajdhani uppercase tracking-wider text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>5-Session Bootcamp (₹3,499)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4 Skill Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {coachingPillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-[#090716]/80 border border-white/[0.08] hover:border-purple-500/40 transition-all space-y-3 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-white font-rajdhani tracking-wide">
                    {p.title}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Testimonial Quote */}
          <div className="p-4 rounded-xl bg-[#090615] border border-purple-500/20 relative z-10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-white font-black text-sm font-rajdhani flex-shrink-0">
              AK
            </div>
            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm text-gray-200 italic">
                &ldquo;Went from Gold 2 to Ascendant 3 in 3 weeks. The round-by-round VOD breakdowns and crosshair placement routines completely transformed my game sense.&rdquo;
              </p>
              <div className="text-[11px] font-mono text-purple-400 font-bold">
                — Aarav K. • Verified VIB Student (Gold 2 &rarr; Ascendant 3)
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ========================================================================= */}
      {/* 2. VIB AUCTIONS: BID. WIN. OWN. WITH WORKING LIVE COUNTDOWN TIMER [View 4] */}
      {/* ========================================================================= */}
      <section id="auctions" className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#120826] via-[#1a0c35] to-[#0d071d] border border-fuchsia-500/40 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[350px] bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none z-0" />
          <div className="absolute bottom-0 left-0 w-[450px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none z-0" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#120826] via-[#120826]/75 to-transparent z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120826] via-transparent to-transparent z-[1]" />

          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-5 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-[#e879f9] uppercase font-bold">
                <span className={`w-2 h-2 rounded-full ${isAuctionActive ? 'bg-rose-500 animate-ping' : 'bg-gray-500'}`} />
                <span className={isAuctionActive ? 'text-rose-400' : 'text-gray-400'}>
                  {isAuctionLoading ? 'LOADING AUCTION' : isAuctionUnavailable ? 'AUCTION UNAVAILABLE' : !isAuctionActive ? (auctionStatus === 'paused' ? 'AUCTION PAUSED' : 'AUCTION CONCLUDED') : 'LIVE TIMED AUCTION'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white font-rajdhani">
                VIB AUCTIONS: <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300">BID. WIN. OWN.</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
                Place competitive bids on rare, vaulted, and high-tier Valorant profile collections. Zero reserve auctions with instant transfer upon timer expiry.
              </p>
            </div>

            {/* WORKING REAL-TIME COUNTDOWN TIMER */}
            <div className="p-3.5 rounded-xl bg-[#090615] border border-fuchsia-500/30 flex items-center gap-3 shadow-lg">
              <div className="text-right">
                <div className="text-[9px] font-mono text-fuchsia-300 uppercase font-bold tracking-wider">
                  {isAuctionActive ? 'AUCTION CLOSES IN' : 'AUCTION STATUS'}
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  {isAuctionLoading ? 'Syncing persisted lot…' : isAuctionUnavailable ? 'Auction data unavailable' : !isAuctionActive ? (auctionStatus === 'paused' ? 'Temporarily paused' : 'Bidding is closed') : 'Live Sync Active'}
                </div>
              </div>

              {isAuctionActive ? (
                <div className="flex items-center gap-1.5 font-mono font-black text-lg sm:text-xl">
                  <div className="px-2.5 py-1 rounded-lg bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-200">
                    {String(timeLeft.hours).padStart(2, '0')}
                    <span className="block text-[8px] text-fuchsia-400 text-center font-normal">HRS</span>
                  </div>
                  <span className="text-fuchsia-400">:</span>
                  <div className="px-2.5 py-1 rounded-lg bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-200">
                    {String(timeLeft.minutes).padStart(2, '0')}
                    <span className="block text-[8px] text-fuchsia-400 text-center font-normal">MIN</span>
                  </div>
                  <span className="text-fuchsia-400">:</span>
                  <div className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 animate-pulse">
                    {String(timeLeft.seconds).padStart(2, '0')}
                    <span className="block text-[8px] text-rose-400 text-center font-normal">SEC</span>
                  </div>
                </div>
              ) : (
                <div className="px-3.5 py-1.5 rounded-lg bg-fuchsia-950/60 border border-fuchsia-500/30 text-fuchsia-300 font-mono font-bold text-xs uppercase">
                  {auctionStatus === 'paused' ? 'Paused' : 'Concluded'}
                </div>
              )}
            </div>
          </div>

          {/* Featured Live Auction Item Showpiece */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
            {/* Left Glass Showcase Display */}
            <div className="lg:col-span-6 p-6 rounded-2xl bg-gradient-to-b from-[#180e33] to-[#0b0718] border border-fuchsia-500/40 relative overflow-hidden group shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-fuchsia-900/80 text-fuchsia-200 border border-fuchsia-500/40 uppercase">
                  LOT #0881 • ULTRA RARE
                </span>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Vaulted Item</span>
                </div>
              </div>

              {/* Weapon Render */}
              <div className="py-6 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-fuchsia-600/10 rounded-full blur-2xl pointer-events-none" />
                <img
                  src="/assets/items/vandal-prime.png"
                  alt="Auction Showcase Vandal"
                  className="w-[85%] max-h-[180px] object-contain filter drop-shadow-[0_0_25px_rgba(217,70,239,0.6)] group-hover:scale-105 transition-transform duration-300 relative z-10"
                />
              </div>

              <div className="space-y-1 pt-2 border-t border-white/10">
                <h3 className="text-xl font-black text-white font-rajdhani uppercase tracking-wide">
                  KURONAMI VANDAL + CHAMPIONS 2024 COMBO
                </h3>
                <p className="text-xs text-gray-300">
                  Includes Kuronami Vandal (Max Level + All Colors), Champions 2024 Vandal &amp; Blade, Reaver 2.0 Karambit, 1,200 VP Balance.
                </p>
              </div>
            </div>

            {/* Right Bidding Controls */}
            <div className="lg:col-span-6 p-6 rounded-2xl bg-[#0a0717] border border-white/10 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-[#110c26] border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-gray-400 uppercase">CURRENT HIGHEST BID</div>
                  <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-amber-300 font-rajdhani">
                    ₹{currentBid.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400">{bidCount} total bids placed</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#110c26] border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-gray-400 uppercase">MINIMUM NEXT BID</div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-rajdhani">
                    ₹{(currentBid + 150).toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-fuchsia-300">+₹150 minimum step</div>
                </div>
              </div>

              {/* Bid Success Toast */}
              {bidSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{bidSuccessMessage}</span>
                </div>
              )}
              {bidErrorMessage && <p role="alert" className="text-xs text-red-300">{bidErrorMessage}</p>}

              {/* Interactive Bid Form */}
              <form onSubmit={handlePlaceBid} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-gray-300 font-bold uppercase">
                    Enter Your Maximum Bid (INR)
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={userBidInput}
                        onChange={(e) => setUserBidInput(e.target.value)}
                        min={currentBid + 150}
                        className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#150f2e] border border-white/15 focus:border-fuchsia-500 focus:outline-none text-white font-mono font-bold text-base"
                        placeholder="Enter amount"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isPlacingBid || isAuctionLoading || isAuctionUnavailable || !isAuctionActive}
                      className="min-h-[44px] px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-xs sm:text-sm font-black font-rajdhani uppercase tracking-wider text-white shadow-lg shadow-fuchsia-600/40 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center disabled:opacity-50"
                    >
                      {isPlacingBid ? 'OPENING AUCTION…' : isAuctionLoading ? 'LOADING…' : isAuctionUnavailable ? 'UNAVAILABLE' : !isAuctionActive ? 'AUCTION CONCLUDED' : 'PLACE BID'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>Guaranteed Escrow Protection</span>
                  <span>Instant SMS/WhatsApp Notification</span>
                </div>
              </form>
            </div>
          </div>

          {/* Exclusive Deals Strip */}
          <div className="pt-2 border-t border-white/[0.08] relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-gray-400">All bids are placed through the live auction and are recorded in your account.</p>
            <button
              type="button"
              onClick={() => onNavigate('auctions')}
              className="px-4 py-2 rounded-lg bg-fuchsia-950/60 hover:bg-fuchsia-900 border border-fuchsia-500/40 text-xs font-bold text-fuchsia-300 font-rajdhani uppercase"
            >
              Browse Active Lots
            </button>
          </div>
        </div>
      </section>


      {/* ========================================================================= */}
      {/* 5. OUR SERVICES: Everything You Need, In One Place                        */}
      {/* ========================================================================= */}
      <section id="all-services" className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5 scroll-mt-24">
        <div id="services-grid" className="scroll-mt-24" />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono tracking-[0.2em] text-[#e879f9] uppercase font-bold">
              OUR SERVICES
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-rajdhani tracking-wide">
              Everything You Need, In One Place
            </h2>
          </div>
          <p className="text-xs text-gray-400 max-w-md md:text-right">
            A complete ecosystem of digital services, built for a better and safer community.
          </p>
        </div>

        {/* 8 Cards in 4x2 Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {serviceCards.map((srv) => {
            const Icon = srv.icon;
            return (
              <div
                key={srv.id}
                onClick={srv.action}
                className="p-5 rounded-xl bg-[#0c0a18] border border-white/[0.08] hover:border-purple-500/50 hover:bg-[#120f26] transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[170px] shadow-md relative"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white/[0.04] border border-white/10 group-hover:bg-purple-600 group-hover:border-purple-500 flex items-center justify-center text-gray-400 group-hover:text-white transition-all">
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm text-white group-hover:text-purple-300 transition-colors font-rajdhani tracking-wide">
                      {srv.title}
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {srv.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>


      {/* ========================================================================= */}
      {/* 6. TRUST & COMPLIANCE: Your Safety Is Our Priority                        */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono tracking-[0.2em] text-[#e879f9] uppercase font-bold">
              TRUST &amp; COMPLIANCE
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-rajdhani tracking-wide">
              Your Safety Is Our Priority
            </h2>
          </div>
          <p className="text-xs text-gray-400 max-w-md md:text-right">
            We follow structured policies and security measures to ensure a trusted and reliable experience.
          </p>
        </div>

        {/* 5 Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {compliance.map((c, idx) => {
            const Icon = c.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] space-y-2.5 shadow-md flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-xs sm:text-sm text-white font-rajdhani tracking-wide">
                    {c.title}
                  </h3>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {c.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FEATURED LISTINGS: Explore Digital Profiles                             */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0c0a18] border border-purple-500/25 space-y-5 shadow-md relative">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono tracking-[0.2em] text-[#e879f9] uppercase font-bold">
                FEATURED LISTINGS
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase font-rajdhani tracking-wide">
                Explore Digital Profiles
              </h2>
            </div>
            <button
              onClick={() => onNavigate('profiles')}
              className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1.5 cursor-pointer font-rajdhani transition-colors"
            >
              <span>View All Listings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredListings.map((l) => (
              <div
                key={l.id}
                className="rounded-xl bg-[#090714] border border-white/[0.08] hover:border-purple-500/50 overflow-hidden flex flex-col justify-between group shadow-md transition-all duration-300"
              >
                <div className="relative aspect-[16/9] w-full bg-gradient-to-b from-[#140e28] to-[#090714] p-3 flex items-center justify-center overflow-hidden border-b border-white/[0.06]">
                  {l.badge && (
                    <span
                      className={`absolute top-2 left-2 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider font-rajdhani z-10 shadow-sm ${
                        l.badgeColor === 'cyan'
                          ? 'bg-sky-500 text-black'
                          : 'bg-[#f59e0b] text-black'
                      }`}
                    >
                      {l.badge}
                    </span>
                  )}

                  <img
                    src={l.weapon}
                    alt={l.weaponName}
                    className="w-[85%] h-auto object-contain filter drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-transform duration-300 relative z-10"
                  />
                </div>

                <div className="p-3.5 space-y-2">
                  <div>
                    <div className="font-extrabold text-sm text-white font-rajdhani tracking-wide">
                      {l.code}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{l.sub}</div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
                    <div className="font-black text-sm text-white font-rajdhani tracking-wide">
                      {formatCurrencyPrice(l.priceINR, currency)}
                    </div>
                    <button
                      onClick={() =>
                        onAddToCart({
                          id: l.id,
                          title: l.code,
                          subtitle: l.sub,
                          priceINR: l.priceINR,
                          type: 'profile',
                          image: l.weapon,
                          quantity: 1,
                        })
                      }
                      className="p-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/30 transition-colors cursor-pointer shadow-sm"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. READY TO GET STARTED? BOTTOM CTA                                       */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#0d071f] via-[#160a33] to-[#0d071f] border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -left-10 top-0 w-60 h-60 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -right-10 bottom-0 w-60 h-60 bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-1.5 text-center md:text-left relative z-10">
            <div className="text-[10px] font-mono tracking-[0.2em] text-[#e879f9] uppercase font-bold">
              READY TO GET STARTED?
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase text-white font-rajdhani tracking-wide">
              Explore Our Services Today
            </h3>
            <p className="text-xs text-gray-300">
              Join thousands of users who trust VIB for their digital service needs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('services-grid');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-3.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider text-white transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg flex items-center gap-2 font-rajdhani relative z-10 whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #c026d3 100%)',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.45)',
            }}
          >
            <span>EXPLORE SERVICES</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
