import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Check,
  CreditCard,
  Zap,
  Headphones,
  Users,
  ArrowRight,
  ShoppingCart,
  Calendar,
  Globe,
  Info,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Clock,
  Shield,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';
import { Currency, CartItem } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from './Header';
import { FlagIcon } from '../common/FlagIcon';

interface ClientVPOverviewPageProps {
  currency: Currency;
  onNavigate: (page: ClientPage) => void;
  onAddToCart: (item: CartItem) => void;
  onOpenCheckout: (title: string, priceINR: number, productId?: string) => void;
  onOpenFlexiblePlans?: (context?: { serviceType: 'vp' | 'account'; region?: 'in' | 'php' }) => void;
}

/* Flag Components */
const IndiaFlag = ({ className = "w-4 h-3" }: { className?: string }) => (
  <span className={`${className} rounded-sm inline-flex flex-col overflow-hidden border border-white/20 shadow-sm flex-shrink-0`}>
    <span className="h-1/3 bg-[#FF9933] w-full" />
    <span className="h-1/3 bg-white w-full flex items-center justify-center relative">
      <span className="w-1.5 h-1.5 rounded-full border-[0.5px] border-[#000080] bg-[#000080]/40 flex items-center justify-center" />
    </span>
    <span className="h-1/3 bg-[#128807] w-full" />
  </span>
);

const PhilippinesFlag = ({ className = "w-4 h-3" }: { className?: string }) => (
  <span className={`${className} rounded-sm inline-flex relative overflow-hidden border border-white/20 shadow-sm flex-shrink-0`}>
    <span className="h-1/2 bg-[#0038A8] w-full" />
    <span className="h-1/2 bg-[#CE1126] w-full" />
    <span className="absolute left-0 top-0 bottom-0 w-[45%] bg-white [clip-path:polygon(0_0,100%_50%,0_100%)] flex items-center justify-center">
      <span className="w-1 h-1 rounded-full bg-[#FCD116]" />
    </span>
  </span>
);

export const ClientVPOverviewPage: React.FC<ClientVPOverviewPageProps> = ({
  currency,
  onNavigate,
  onAddToCart,
  onOpenCheckout,
  onOpenFlexiblePlans,
}) => {
  const [activeRegion, setActiveRegion] = useState<'in' | 'php' | 'other'>('in');
  const [selectedOtherRegion, setSelectedOtherRegion] = useState<string>('Indonesia');
  const indianCarouselRef = useRef<HTMLDivElement>(null);
  const phpCarouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const indianPacks = [
    { vp: '475 VP', priceINR: 499 },
    { vp: '1,000 VP', priceINR: 999 },
    { vp: '2,050 VP', priceINR: 1899 },
    { vp: '3,650 VP', priceINR: 3199, badge: 'POPULAR' },
    { vp: '5,350 VP', priceINR: 4499 },
    { vp: '7,400 VP', priceINR: 6199 },
    { vp: '11,000 VP', priceINR: 8999, badge: 'BEST VALUE' },
  ];

  const phpPacks = [
    { vp: '475 VP', priceINR: 299 },
    { vp: '1,000 VP', priceINR: 549 },
    { vp: '1,475 VP', priceINR: 799 },
    { vp: '2,050 VP', priceINR: 1099, badge: 'POPULAR' },
    { vp: '2,525 VP', priceINR: 1349 },
    { vp: '3,050 VP', priceINR: 1599 },
    { vp: '3,650 VP', priceINR: 1999 },
  ];

  const handleBuy = (vp: string, price: number, region: string, productId?: string) => {
    const vpClean = vp.replace(/[^0-9]/g, '');
    const regionPrefix = region.toLowerCase().startsWith('philippines') ? 'vp-ph' : 'vp-in';
    const mappedId = productId || `${regionPrefix}-${vpClean}`;
    onOpenCheckout(`${vp} (${region} Top-Up)`, price, mappedId);
  };

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white space-y-7 sm:space-y-9 pb-16 font-sans">
      {/* ========================================================================= */}
      {/* 1. VP PACKS REGIONAL HUB (Instant VP Top-Ups & Regional Hub)              */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6 sm:pt-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.22em] text-[#e879f9] uppercase font-bold">
            <CreditCard className="w-3.5 h-3.5 text-[#e879f9]" />
            <span>TOP UP &amp; PLAY WITHOUT LIMITS</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-white font-rajdhani tracking-tight leading-none">
            VP PACKS <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-pink-400">
              MORE PLAY. MORE POSSIBILITIES.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
            Top up your account safely with the best prices, flexible payment options and instant delivery.
          </p>

          {/* 4 Trust Micro Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-gray-200">
            <div className="px-3 py-1.5 rounded-full bg-[#120f24]/90 border border-purple-500/30 flex items-center gap-1.5 shadow-md">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[11px] font-medium">Safe &amp; Secure</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-[#120f24]/90 border border-purple-500/30 flex items-center gap-1.5 shadow-md">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-medium">Best Prices</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-[#120f24]/90 border border-purple-500/30 flex items-center gap-1.5 shadow-md">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-medium">Instant Delivery</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-[#120f24]/90 border border-purple-500/30 flex items-center gap-1.5 shadow-md">
              <CreditCard className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-medium">Multiple Payment Options</span>
            </div>
          </div>
        </div>

        {/* 2 Regional Cards Grid (Indian vs PHP) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Indian Region Card */}
          <div className="relative rounded-2xl bg-[#0c081b] border border-purple-500/30 p-5 sm:p-7 overflow-hidden shadow-xl flex flex-col justify-between group hover:border-purple-500/50 transition-all min-h-[260px]">
            {/* Full-bleed Reference Part 09 (Indian Agent + Taj Mahal Glow) */}
            <img
              src="/assets/reference_parts/part_09.png"
              alt="Indian VP Agent Part 09"
              className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0 opacity-70 sm:opacity-85"
            />
            {/* Seamless background gradient - dark on left for text legibility, transparent on right for agent artwork */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c081b] via-[#0c081b]/95 to-transparent sm:via-[#0c081b]/80 z-0 pointer-events-none" />

            <div className="relative z-10 space-y-3.5 max-w-sm sm:max-w-md w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-900/60 border border-purple-400/40 flex items-center justify-center flex-shrink-0 shadow-md">
                  <IndiaFlag className="w-6 h-4" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase text-white font-rajdhani tracking-wide drop-shadow-md">
                    INDIAN REGION VP
                  </h3>
                  <p className="text-xs text-purple-200/90 font-medium">
                    Top up your Indian region account at the best rates.
                  </p>
                </div>
              </div>

              <ul className="space-y-1.5 pt-1 text-xs text-gray-200 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Official Region Top Ups</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Competitive Pricing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Instant Delivery</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Multiple Packs Available</span>
                </li>
              </ul>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate('vp-catalog')}
                  className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(147,51,234,0.4)] flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  <span>View Indian VP Packs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* PHP Region Card */}
          <div className="relative rounded-2xl bg-[#070b1a] border border-blue-500/30 p-5 sm:p-7 overflow-hidden shadow-xl flex flex-col justify-between group hover:border-blue-500/50 transition-all min-h-[260px]">
            {/* Full-bleed Reference Part 11 (PHP Agent + Manila Skyline) */}
            <img
              src="/assets/reference_parts/part_11.png"
              alt="PHP VP Agent Part 11"
              className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0 opacity-70 sm:opacity-85"
            />
            {/* Seamless background gradient - dark on left for text legibility, transparent on right for agent artwork */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#070b1a] via-[#070b1a]/95 to-transparent sm:via-[#070b1a]/80 z-0 pointer-events-none" />

            <div className="relative z-10 space-y-3.5 max-w-sm sm:max-w-md w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-900/60 border border-blue-400/40 flex items-center justify-center flex-shrink-0 shadow-md">
                  <PhilippinesFlag className="w-6 h-4" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase text-white font-rajdhani tracking-wide drop-shadow-md">
                    PHP REGION VP
                  </h3>
                  <p className="text-xs text-blue-200/90 font-medium">
                    Top up your Philippines region account with ease.
                  </p>
                </div>
              </div>

              <ul className="space-y-1.5 pt-1 text-xs text-gray-200 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span>Official Region Top Ups</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span>Better Pricing Options</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span>Instant Delivery</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span>Wide Pack Selection</span>
                </li>
              </ul>

              <div className="pt-2">
                <button
                  onClick={() => {
                    const el = document.getElementById('php-packs-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <span>View PHP VP Packs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CHANGE REGION FROM IND TO PHP (Regional Arbitrage & VP Savings Gateway)   */}
        {/* ========================================================================= */}
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
              Switch your Valorant account region from India (IND) to Philippines (PHP) and unlock 25% to 40% cheaper VP rates on every store purchase forever.
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
              onClick={() => onNavigate('services', 'region-change')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-xs sm:text-sm font-bold font-rajdhani uppercase tracking-wider text-white shadow-lg shadow-fuchsia-600/40 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
            >
              <span>Order Region Switch (₹1,299)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Flexible Payment Plans (EMI) Strip */}
        <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white font-rajdhani">FLEXIBLE PAYMENT PLANS</div>
              <div className="text-xs text-gray-400">Get your VP now, pay later. Easy EMI options to make topping up more convenient.</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-300">
            <span className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Easy EMI Options</span>
            </span>
            <span className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Low Initial Payment</span>
            </span>
            <span className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Secure &amp; Verified</span>
            </span>
            <span className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Quick Approval</span>
            </span>
            <button
              type="button"
              onClick={() => onOpenFlexiblePlans ? onOpenFlexiblePlans({ serviceType: 'vp', region: activeRegion === 'php' ? 'php' : 'in' }) : onNavigate('support')}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors cursor-pointer text-xs ml-2 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              Learn More →
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. REGION SELECTOR BAR (Matching Reference 3)                             */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div role="tablist" aria-label="VP Regions" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Indian VP Tab */}
          <div
            role="tab"
            tabIndex={0}
            aria-selected={activeRegion === 'in'}
            aria-label="Indian VP region, standard rates"
            onClick={() => {
              setActiveRegion('in');
              onNavigate('vp-catalog');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveRegion('in');
                onNavigate('vp-catalog');
              }
            }}
            className={`lg:col-span-3 p-3.5 rounded-xl border transition-all duration-300 flex items-center gap-3.5 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
              activeRegion === 'in'
                ? 'bg-gradient-to-r from-purple-950/70 to-[#180f2d] border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'bg-[#0c0a18] border-white/[0.08] hover:border-purple-500/40'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <FlagIcon country="IN" size="md" />
            </div>
            <div>
              <div className="font-black text-sm text-white font-rajdhani tracking-wide">
                Indian VP
              </div>
              <div className="text-[11px] text-gray-400">Standard Rates</div>
            </div>
          </div>

          {/* Philippines VP Tab */}
          <div
            role="tab"
            tabIndex={0}
            aria-selected={activeRegion === 'php'}
            aria-label="Philippines VP region, cheaper rates"
            onClick={() => {
              setActiveRegion('php');
              const el = document.getElementById('php-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveRegion('php');
                const el = document.getElementById('php-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className={`lg:col-span-3 p-3.5 rounded-xl border transition-all duration-300 flex items-center gap-3.5 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
              activeRegion === 'php'
                ? 'bg-gradient-to-r from-purple-950/70 to-[#180f2d] border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'bg-[#0c0a18] border-white/[0.08] hover:border-purple-500/40'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <FlagIcon country="PH" size="md" />
            </div>
            <div>
              <div className="font-black text-sm text-white font-rajdhani tracking-wide">
                Philippines VP
              </div>
              <div className="text-[11px] text-gray-400">Cheaper Rates</div>
            </div>
          </div>

          {/* Other Regions Tab */}
          <div
            role="tab"
            tabIndex={0}
            aria-selected={activeRegion === 'other'}
            aria-label="Other Regions, on request"
            onClick={() => {
              setActiveRegion('other');
              const el = document.getElementById('other-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveRegion('other');
                const el = document.getElementById('other-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className={`lg:col-span-3 p-3.5 rounded-xl border transition-all duration-300 flex items-center gap-3.5 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
              activeRegion === 'other'
                ? 'bg-gradient-to-r from-purple-950/70 to-[#180f2d] border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'bg-[#0c0a18] border-white/[0.08] hover:border-purple-500/40'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center flex-shrink-0 text-purple-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="font-black text-sm text-white font-rajdhani tracking-wide">
                Other Regions
              </div>
              <div className="text-[11px] text-gray-400">On Request</div>
            </div>
          </div>

          {/* Not Sure Which Region? Callout */}
          <div className="lg:col-span-3 p-3 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 flex-shrink-0">
                <Info className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-xs text-white leading-tight">
                  Not sure which region to choose?
                </div>
                <div className="text-[10px] text-gray-400 leading-tight">
                  Compare rates and find the best option for you.
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('vp-catalog')}
              className="px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-200 text-[10px] font-bold transition-colors whitespace-nowrap cursor-pointer"
            >
              View Comparison →
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INDIAN VP PACKS SHOWCASE (Matching Reference 3)                        */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
        {/* Container with purple border header */}
        <div className="p-4 rounded-xl bg-[#0c0a18] border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center flex-shrink-0 shadow-inner">
              <IndiaFlag className="w-5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black uppercase text-white font-rajdhani tracking-wide">
                  INDIAN <span className="text-purple-400">VP PACKS</span>
                </h2>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Standard pricing • Direct top-up • Secure &amp; Verified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-[11px] text-gray-400 hidden xl:block">
              Perfect for players who prefer top-up in Indian region with direct and hassle-free delivery.
            </p>
            <button
              onClick={() => onNavigate('vp-catalog')}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5 text-purple-400" />
              <span>Why Choose Indian VP?</span>
            </button>
          </div>
        </div>

        {/* 7 Cards Showcase with Carousel Arrows */}
        <div className="relative">
          {/* Left Arrow Button */}
          <button
            type="button"
            aria-label="Previous Indian VP Packs"
            onClick={() => scrollCarousel(indianCarouselRef, 'left')}
            className="absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#180f2d] border border-purple-500/50 text-purple-300 hover:bg-purple-600 hover:text-white flex items-center justify-center z-20 shadow-lg cursor-pointer transition-all hidden sm:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            aria-label="Next Indian VP Packs"
            onClick={() => scrollCarousel(indianCarouselRef, 'right')}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#180f2d] border border-purple-500/50 text-purple-300 hover:bg-purple-600 hover:text-white flex items-center justify-center z-20 shadow-lg cursor-pointer transition-all hidden sm:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* 7 Cards Grid / Carousel */}
          <div
            ref={indianCarouselRef}
            className="flex lg:grid lg:grid-cols-7 gap-3 overflow-x-auto lg:overflow-x-visible no-scrollbar pb-2 lg:pb-0 scroll-smooth snap-x"
          >
            {indianPacks.map((pack, idx) => (
              <div
                key={idx}
                className="min-w-[155px] sm:min-w-[170px] lg:min-w-0 snap-start p-3 rounded-xl bg-[#0c0a18] border border-white/[0.08] hover:border-purple-500/50 transition-all duration-300 flex flex-col items-center text-center justify-between group shadow-md relative flex-shrink-0 lg:flex-shrink"
              >
                {/* Badge if present */}
                {pack.badge && (
                  <span
                    className={`absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider font-rajdhani shadow-sm ${
                      pack.badge === 'POPULAR'
                        ? 'bg-[#f59e0b] text-black'
                        : 'bg-[#eab308] text-black'
                    }`}
                  >
                    {pack.badge}
                  </span>
                )}

                {/* 3D VP Coin Stack */}
                <div className="w-20 h-20 rounded-lg flex items-center justify-center my-1 group-hover:scale-105 transition-transform duration-300">
                  <img
                    src="/assets/hires/vp_coins_stack.png"
                    alt={pack.vp}
                    className="w-full h-full object-contain filter drop-shadow-[0_0_14px_rgba(168,85,247,0.5)]"
                  />
                </div>

                {/* Title & Pricing */}
                <div className="space-y-1 w-full">
                  <div className="font-black text-sm text-white font-rajdhani tracking-wide">
                    {pack.vp}
                  </div>
                  <div className="font-black text-sm text-[#f472b6] font-rajdhani flex items-center justify-center gap-1.5 drop-shadow-[0_0_8px_rgba(244,114,182,0.4)]">
                    <IndiaFlag className="w-3.5 h-2.5" />
                    <span>{formatCurrencyPrice(pack.priceINR, currency)}</span>
                  </div>
                </div>

                {/* Buy Button */}
                <button
                  type="button"
                  onClick={() => handleBuy(pack.vp, pack.priceINR, 'Indian')}
                  className="w-full mt-3 py-2 min-h-[44px] rounded-lg bg-[#581c87]/70 hover:bg-purple-600 text-purple-100 hover:text-white font-bold text-xs font-rajdhani transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Buy Now</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Dedicated Indian Flexible Payment Plans Bar */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-[#100a22] to-[#0c0a18] border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-purple-500/20 text-[10px] font-mono font-bold uppercase tracking-wider text-purple-300">
                FLEXIBLE PAYMENT PLANS AVAILABLE
              </div>
              <div className="text-xs text-gray-300 mt-0.5">
                Top up 11,000+ Indian VP with low down payment and easy weekly or monthly installments.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenFlexiblePlans && onOpenFlexiblePlans({ serviceType: 'vp', region: 'in' })}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-rajdhani uppercase text-xs tracking-wider transition-all cursor-pointer whitespace-nowrap shadow-md shadow-purple-600/30"
          >
            CLICK HERE TO CHECK PLANS →
          </button>
        </div>

        {/* View All Button */}
        <div className="text-center pt-1">
          <button
            onClick={() => onNavigate('vp-catalog')}
            className="px-6 py-2 rounded-xl bg-[#130d24] border border-purple-500/40 text-xs font-bold text-purple-300 hover:bg-purple-600 hover:text-white transition-all inline-flex items-center gap-2 cursor-pointer shadow-md font-rajdhani tracking-wide"
          >
            <span>View All Indian VP Packs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. PHILIPPINES VP PACKS SHOWCASE (Matching Reference 3)                   */}
      {/* ========================================================================= */}
      <section id="php-section" className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
        {/* Container with purple border header */}
        <div className="p-4 rounded-xl bg-[#0c0a18] border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center flex-shrink-0 shadow-inner">
              <PhilippinesFlag className="w-5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black uppercase text-white font-rajdhani tracking-wide">
                  PHILIPPINES <span className="text-purple-400">VP PACKS</span>
                </h2>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Cheaper rates • Same experience • More value
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-[11px] text-gray-400 hidden xl:block">
              Get VP at lower prices through Philippines region. Same in-game experience, more savings.
            </p>
            <button
              onClick={() => onNavigate('vp-catalog')}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5 text-purple-400" />
              <span>Why Choose PHP?</span>
            </button>
          </div>
        </div>

        {/* 7 Cards Showcase with Carousel Arrows */}
        <div className="relative">
          {/* Left Arrow Button */}
          <button
            type="button"
            aria-label="Previous Philippines VP Packs"
            onClick={() => scrollCarousel(phpCarouselRef, 'left')}
            className="absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#180f2d] border border-purple-500/50 text-purple-300 hover:bg-purple-600 hover:text-white flex items-center justify-center z-20 shadow-lg cursor-pointer transition-all hidden sm:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            aria-label="Next Philippines VP Packs"
            onClick={() => scrollCarousel(phpCarouselRef, 'right')}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#180f2d] border border-purple-500/50 text-purple-300 hover:bg-purple-600 hover:text-white flex items-center justify-center z-20 shadow-lg cursor-pointer transition-all hidden sm:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* 7 Cards Grid / Carousel */}
          <div
            ref={phpCarouselRef}
            className="flex lg:grid lg:grid-cols-7 gap-3 overflow-x-auto lg:overflow-x-visible no-scrollbar pb-2 lg:pb-0 scroll-smooth snap-x"
          >
            {phpPacks.map((pack, idx) => (
              <div
                key={idx}
                className="min-w-[155px] sm:min-w-[170px] lg:min-w-0 snap-start p-3 rounded-xl bg-[#0c0a18] border border-white/[0.08] hover:border-purple-500/50 transition-all duration-300 flex flex-col items-center text-center justify-between group shadow-md relative flex-shrink-0 lg:flex-shrink"
              >
                {/* Badge if present */}
                {pack.badge && (
                  <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider font-rajdhani bg-[#f59e0b] text-black shadow-sm">
                    {pack.badge}
                  </span>
                )}

                {/* 3D VP Coin Stack */}
                <div className="w-20 h-20 rounded-lg flex items-center justify-center my-1 group-hover:scale-105 transition-transform duration-300">
                  <img
                    src="/assets/hires/vp_coins_stack.png"
                    alt={pack.vp}
                    className="w-full h-full object-contain filter drop-shadow-[0_0_14px_rgba(168,85,247,0.5)]"
                  />
                </div>

                {/* Title & Pricing */}
                <div className="space-y-1 w-full">
                  <div className="font-black text-sm text-white font-rajdhani tracking-wide">
                    {pack.vp}
                  </div>
                  <div className="font-black text-sm text-[#f472b6] font-rajdhani flex items-center justify-center gap-1.5 drop-shadow-[0_0_8px_rgba(244,114,182,0.4)]">
                    <PhilippinesFlag className="w-3.5 h-2.5" />
                    <span>{formatCurrencyPrice(pack.priceINR, currency)}</span>
                  </div>
                </div>

                {/* Buy Button */}
                <button
                  type="button"
                  onClick={() => handleBuy(pack.vp, pack.priceINR, 'Philippines')}
                  className="w-full mt-3 py-2 min-h-[44px] rounded-lg bg-[#581c87]/70 hover:bg-purple-600 text-purple-100 hover:text-white font-bold text-xs font-rajdhani transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Buy Now</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Dedicated Philippines Flexible Payment Plans Bar */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-[#100a22] to-[#0c0a18] border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-purple-500/20 text-[10px] font-mono font-bold uppercase tracking-wider text-purple-300">
                FLEXIBLE PAYMENT PLANS AVAILABLE
              </div>
              <div className="text-xs text-gray-300 mt-0.5">
                Top up Philippines VP with discounted regional pricing and structured weekly or monthly installments.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenFlexiblePlans && onOpenFlexiblePlans({ serviceType: 'vp', region: 'php' })}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-rajdhani uppercase text-xs tracking-wider transition-all cursor-pointer whitespace-nowrap shadow-md shadow-purple-600/30"
          >
            CLICK HERE TO CHECK PLANS →
          </button>
        </div>

        {/* View All Button */}
        <div className="text-center pt-1">
          <button
            onClick={() => onNavigate('vp-catalog')}
            className="px-6 py-2 rounded-xl bg-[#130d24] border border-purple-500/40 text-xs font-bold text-purple-300 hover:bg-purple-600 hover:text-white transition-all inline-flex items-center gap-2 cursor-pointer shadow-md font-rajdhani tracking-wide"
          >
            <span>View All PHP VP Packs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. OTHER REGIONS (ON REQUEST) BAR (Matching Reference 3)                  */}
      {/* ========================================================================= */}
      <section id="other-section" className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0a18] border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0 shadow-inner">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white font-rajdhani tracking-wide">
                OTHER REGIONS <span className="text-purple-400">(ON REQUEST)</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                We also provide VP packs for Indonesia, Malaysia, Australia and more regions.
              </p>
            </div>
          </div>

          <div className="w-full flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                {
                  name: 'Indonesia',
                  flag: (
                    <span className="w-3.5 h-2.5 rounded-sm inline-flex flex-col overflow-hidden border border-white/20">
                      <span className="h-1/2 bg-[#FF0000] w-full" />
                      <span className="h-1/2 bg-white w-full" />
                    </span>
                  ),
                },
                {
                  name: 'Malaysia',
                  flag: (
                    <span className="w-3.5 h-2.5 rounded-sm inline-flex flex-col overflow-hidden border border-white/20">
                      <span className="h-1/2 bg-[#CC0000] w-full" />
                      <span className="h-1/2 bg-white w-full" />
                    </span>
                  ),
                },
                {
                  name: 'Australia',
                  flag: (
                    <span className="w-3.5 h-2.5 rounded-sm inline-flex flex-col overflow-hidden border border-white/20">
                      <span className="h-1/2 bg-[#00008B] w-full" />
                      <span className="h-1/2 bg-[#FF0000] w-full" />
                    </span>
                  ),
                },
                {
                  name: 'Singapore',
                  flag: (
                    <span className="w-3.5 h-2.5 rounded-sm inline-flex flex-col overflow-hidden border border-white/20">
                      <span className="h-1/2 bg-[#ED2939] w-full" />
                      <span className="h-1/2 bg-white w-full" />
                    </span>
                  ),
                },
                { name: 'Others', flag: null },
              ].map((r) => {
                const isSelected = selectedOtherRegion === r.name;
                return (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => setSelectedOtherRegion(r.name)}
                    className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600/30 border-purple-500 text-white shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                        : 'bg-white/[0.04] border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {r.flag}
                    <span>{r.name === 'Others' ? '••• Others' : r.name}</span>
                  </button>
                );
              })}
            </div>

            <a
              href={`https://wa.me/919181801766?text=${encodeURIComponent(
                'Hello VIB Regional Desk, I would like to request assistance with purchasing a Valorant Points pack for region: ' + selectedOtherRegion + '. Please share available pack denominations and provisioning details.'
              )}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-rajdhani transition-all flex items-center gap-1.5 shadow-md whitespace-nowrap cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-white" />
              <span>Request on WhatsApp ({selectedOtherRegion}) →</span>
            </a>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. 3-COLUMN SUPPORT & INFO CARDS (Matching Reference 3)                   */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Flexible Payment Plans */}
          <div className="p-6 rounded-2xl bg-[#0c0a18] border border-white/[0.08] space-y-3 flex flex-col justify-between shadow-md">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-black text-base text-white font-rajdhani tracking-wide">
                FLEXIBLE PAYMENT PLANS
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Can't pay the full amount right now? Avail VP with our flexible payment plans. Simple KYC, clear terms, and easy instalments.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onOpenFlexiblePlans ? onOpenFlexiblePlans({ serviceType: 'vp', region: activeRegion === 'php' ? 'php' : 'in' }) : onNavigate('vp')}
                className="px-4 py-2 rounded-lg bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 text-xs font-bold text-purple-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer font-rajdhani"
              >
                <span>View Payment Plans</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: How To Order */}
          <div className="p-6 rounded-2xl bg-[#0c0a18] border border-white/[0.08] space-y-3 shadow-md flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h3 className="font-black text-base text-white font-rajdhani tracking-wide">
                HOW TO ORDER
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Get your VP in 4 simple steps
              </p>
            </div>

            {/* 4 Steps row */}
            <div className="grid grid-cols-4 gap-2 pt-2 text-center">
              <div className="space-y-1">
                <div className="w-7 h-7 rounded-full bg-purple-900/50 border border-purple-500/40 text-purple-300 text-xs font-bold mx-auto flex items-center justify-center shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                  1
                </div>
                <div className="text-[10px] font-bold text-white font-rajdhani">Select Pack</div>
              </div>
              <div className="space-y-1">
                <div className="w-7 h-7 rounded-full bg-purple-900/50 border border-purple-500/40 text-purple-300 text-xs font-bold mx-auto flex items-center justify-center shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                  2
                </div>
                <div className="text-[10px] font-bold text-white font-rajdhani">Provide Details</div>
              </div>
              <div className="space-y-1">
                <div className="w-7 h-7 rounded-full bg-purple-900/50 border border-purple-500/40 text-purple-300 text-xs font-bold mx-auto flex items-center justify-center shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                  3
                </div>
                <div className="text-[10px] font-bold text-white font-rajdhani">Make Payment</div>
              </div>
              <div className="space-y-1">
                <div className="w-7 h-7 rounded-full bg-purple-900/50 border border-purple-500/40 text-purple-300 text-xs font-bold mx-auto flex items-center justify-center shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                  4
                </div>
                <div className="text-[10px] font-bold text-white font-rajdhani leading-tight">Verification &amp; Delivery</div>
              </div>
            </div>
          </div>

          {/* Card 3: Need Help? */}
          <div className="p-6 rounded-2xl bg-[#0c0a18] border border-white/[0.08] space-y-3 flex flex-col justify-between shadow-md">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Headphones className="w-5 h-5" />
              </div>
              <h3 className="font-black text-base text-white font-rajdhani tracking-wide">
                NEED HELP?
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Our team is here to assist you.<br />
                <span className="text-purple-300 font-semibold">9 AM – 9 PM</span>
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <a
                href={`https://wa.me/919181801766?text=${encodeURIComponent('Hello VIB Support, I need assistance with my VP order. Please assist me.')}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-rajdhani transition-all shadow-sm whitespace-nowrap cursor-pointer flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-white" />
                <span>WhatsApp Us →</span>
              </a>
              <button
                onClick={() => onNavigate('support')}
                className="px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 text-xs font-bold font-rajdhani transition-colors whitespace-nowrap cursor-pointer"
              >
                View FAQ →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. 4 FULL-WIDTH TRUST BADGES ROW (Matching Reference 3)                   */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex items-center gap-3.5 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs sm:text-sm text-white font-rajdhani">
                Verified &amp; Secure
              </div>
              <div className="text-[11px] text-gray-400">Manual verification for every order</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex items-center gap-3.5 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs sm:text-sm text-white font-rajdhani">
                Multiple Payment Options
              </div>
              <div className="text-[11px] text-gray-400">UPI, Bank Transfer &amp; more</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex items-center gap-3.5 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs sm:text-sm text-white font-rajdhani">
                Fast &amp; Reliable
              </div>
              <div className="text-[11px] text-gray-400">Timely delivery after verification</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex items-center gap-3.5 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs sm:text-sm text-white font-rajdhani">
                Trusted by 50,000+ Users
              </div>
              <div className="text-[11px] text-gray-400">A growing community</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. BOTTOM CINEMATIC COMMUNITY BANNER (Matching Reference 3)               */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl overflow-hidden relative shadow-2xl flex flex-col md:flex-row items-center justify-between min-h-[240px] sm:min-h-[280px] bg-[#070510]">
          {/* Full-bleed Reference Part 26 (Team VIB Championship Podium) with gradient overlay */}
          <img
            src="/assets/reference_parts/part_26.png"
            alt="Team VIB Championship Podium"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070510] via-[#070510]/85 to-[#070510]/15 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-transparent to-transparent z-[1]" />

          {/* Center Typography */}
          <div className="space-y-1 relative z-10 text-center px-6 py-8 w-full">
            <div className="text-sm sm:text-base font-black tracking-[0.2em] text-white uppercase font-rajdhani drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]">
              MORE THAN A TOP-UP
            </div>
            <div className="font-marker text-xl sm:text-3xl text-[#f472b6] italic tracking-wide drop-shadow-[0_0_14px_rgba(244,114,182,0.8)]">
              IT'S A BETTER EXPERIENCE.
            </div>
          </div>

          {/* Center-Right: 3D Valorant Crest Portal */}
          <div className="hidden lg:flex items-center justify-center relative z-10">
            <div className="w-16 h-16 rounded-full border-2 border-purple-400/40 bg-purple-950/40 flex items-center justify-center relative shadow-[0_0_25px_rgba(168,85,247,0.5)]">
              <div className="w-11 h-11 rounded-full border border-purple-300/60 flex items-center justify-center">
                <span className="font-black text-xl text-purple-300 font-rajdhani">V</span>
              </div>
            </div>
          </div>

          {/* Far Right: Angled Graffiti Callout */}
          <div className="relative z-10 select-none pointer-events-none text-right pr-6 py-3">
            <div className="font-marker text-xs sm:text-sm text-purple-300 -rotate-12 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">
              LEVEL UP
            </div>
            <div className="font-marker text-sm sm:text-base text-fuchsia-400 -rotate-10 drop-shadow-[0_0_10px_rgba(232,121,249,0.9)]">
              YOUR JOURNEY
            </div>
            <div className="font-marker text-base sm:text-lg text-purple-200 font-bold -rotate-8 drop-shadow-[0_0_12px_rgba(192,132,252,1)]">
              WITH VIB
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
