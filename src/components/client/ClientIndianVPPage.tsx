import React, { useState } from 'react';
import {
  ShieldCheck,
  Check,
  Headphones,
  Crown,
  CreditCard,
  ArrowRight,
  ShoppingCart,
  ChevronDown,
  MessageSquare,
  Sparkles,
  Zap,
  Globe,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { Currency, CartItem } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from './Header';
import { soundFx } from '../../utils/audio';
import { FlagIcon } from '../common/FlagIcon';

interface ClientIndianVPPageProps {
  currency: Currency;
  onNavigate: (page: ClientPage) => void;
  onAddToCart: (item: CartItem) => void;
  onOpenCheckout: (title: string, priceINR: number) => void;
}

export const ClientIndianVPPage: React.FC<ClientIndianVPPageProps> = ({
  currency,
  onNavigate,
  onAddToCart,
  onOpenCheckout,
}) => {
  const [inStockOnly, setInStockOnly] = useState(true);
  const [popularOnly, setPopularOnly] = useState(false);
  const [bestValueOnly, setBestValueOnly] = useState(false);
  const [discountedOnly, setDiscountedOnly] = useState(false);
  const [priceMax, setPriceMax] = useState(200000);
  const [sortBy, setSortBy] = useState('recommended');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Exact 13 VP packs matching Reference 2
  const vpPacks = [
    { id: 'in-475', vp: '475 VP', priceINR: 499, originalINR: 599, badge: null },
    { id: 'in-1000', vp: '1,000 VP', priceINR: 999, originalINR: 1199, badge: null },
    { id: 'in-2050', vp: '2,050 VP', priceINR: 1899, originalINR: 2199, badge: null },
    { id: 'in-3650', vp: '3,650 VP', priceINR: 3199, originalINR: 3799, badge: 'POPULAR', badgeType: 'amber' },
    { id: 'in-5350', vp: '5,350 VP', priceINR: 4499, originalINR: 5199, badge: null },
    { id: 'in-7400', vp: '7,400 VP', priceINR: 6199, originalINR: 7199, badge: null },
    { id: 'in-11000', vp: '11,000 VP', priceINR: 8999, originalINR: 10499, badge: 'BEST VALUE', badgeType: 'amber' },
    { id: 'in-14650', vp: '14,650 VP', priceINR: 11999, originalINR: 13999, badge: null },
    { id: 'in-22000', vp: '22,000 VP', priceINR: 17999, originalINR: 20999, badge: null },
    { id: 'in-44000', vp: '44,000 VP', priceINR: 34999, originalINR: 41999, badge: null },
    { id: 'in-66000', vp: '66,000 VP', priceINR: 49999, originalINR: 59999, badge: null },
    { id: 'in-110000', vp: '110,000 VP', priceINR: 79999, originalINR: 96999, badge: null },
    { id: 'in-220000', vp: '220,000 VP', priceINR: 149999, originalINR: 189999, badge: 'EXCLUSIVE', badgeType: 'cyan' },
  ];

  const handleBuy = (pack: typeof vpPacks[0]) => {
    soundFx.playClickSound();
    onOpenCheckout(`${pack.vp} (Indian Region Top-Up)`, pack.priceINR);
  };

  const handleAddToCartClick = (pack: typeof vpPacks[0]) => {
    soundFx.playClickSound();
    onAddToCart({
      id: pack.id,
      title: `${pack.vp} Indian Region`,
      subtitle: 'Official Top-Up',
      priceINR: pack.priceINR,
      type: 'vp',
      image: '/assets/hires/vp_coins_stack.png',
      quantity: 1,
    });
  };

  // Filter packs
  const filteredPacks = vpPacks.filter((p) => {
    if (p.priceINR > priceMax) return false;
    if (popularOnly && p.badge !== 'POPULAR') return false;
    if (bestValueOnly && p.badge !== 'BEST VALUE') return false;
    return true;
  });

  const IndiaFlag = ({ className = "w-4 h-3" }: { className?: string }) => (
    <FlagIcon country="IN" size="sm" className={className} />
  );

  const PhilippinesFlag = ({ className = "w-4 h-3" }: { className?: string }) => (
    <FlagIcon country="PH" size="sm" className={className} />
  );

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white space-y-7 sm:space-y-9 pb-16">
      {/* Breadcrumbs matching Reference 2 */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-3">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-purple-400 transition-colors cursor-pointer text-gray-400"
          >
            Home
          </button>
          <span className="text-gray-600">&gt;</span>
          <button
            onClick={() => onNavigate('vp')}
            className="hover:text-purple-400 transition-colors cursor-pointer text-gray-400"
          >
            VP Packs
          </button>
          <span className="text-gray-600">&gt;</span>
          <span className="text-purple-400 font-medium">Indian VP Packs</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (Matching Reference 2) */}
      {/* ========================================================================= */}
      <section className="relative w-full pt-1 min-h-[440px]">
        {/* Full-bleed Reference Part 09 (Indian Agent + India Gate) with gradient overlay */}
        <img
          src="/assets/reference_parts/part_09.png"
          alt="Indian Region Agent"
          className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0 opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05040a] via-[#05040a]/85 to-[#05040a]/15 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05040a] via-transparent to-transparent z-[1]" />
        {/* Ambient atmospheric purple glows */}
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[500px] bg-purple-700/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-[450px] h-[350px] bg-fuchsia-800/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-4">
            {/* Top pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#20103a] border border-purple-500/30 text-xs text-purple-300 font-semibold shadow-md">
              <IndiaFlag className="w-4 h-3" />
              <span className="tracking-wide">INDIAN VP PACKS</span>
            </div>

            {/* Headline */}
            <div className="space-y-0.5">
              <h1 className="text-4xl sm:text-5xl lg:text-[50px] xl:text-[56px] font-black uppercase tracking-tight text-white leading-tight font-rajdhani">
                PREMIUM VP PACKS
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed font-normal max-w-xl">
              Official top-up • Safe &amp; Secure • Instant Processing
            </p>

            {/* 4 Trust Micro Pills */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-gray-200">
              <div className="px-3.5 py-1.5 rounded-full bg-[#120f24]/90 border border-purple-500/25 flex items-center gap-2 shadow-md">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium">Verified Source</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#120f24]/90 border border-purple-500/25 flex items-center gap-2 shadow-md">
                <Check className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium">Best Prices</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#120f24]/90 border border-purple-500/25 flex items-center gap-2 shadow-md">
                <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium">Manual Verification</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#120f24]/90 border border-purple-500/25 flex items-center gap-2 shadow-md">
                <Headphones className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium">24/7 Support</span>
              </div>
            </div>
          </div>

          {/* Right Column artwork now applied as full-bleed hero background above */}
          <div className="lg:col-span-5 hidden lg:block" />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. MAIN 2-COLUMN CATALOG LAYOUT (Matching Reference 2) */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-4">
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0c0a18] border border-purple-500/40 text-purple-200 font-bold text-xs font-rajdhani uppercase tracking-wider flex items-center justify-between shadow-md cursor-pointer min-h-[44px]"
            aria-expanded={isMobileFilterOpen}
          >
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span>{isMobileFilterOpen ? 'Hide Filters & Categories' : 'Show Filters & Categories'}</span>
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMobileFilterOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ------------------------------------------------------------- */}
          {/* Left Sidebar (col-span-3)                                     */}
          {/* ------------------------------------------------------------- */}
          <div className={`lg:col-span-3 space-y-4 ${isMobileFilterOpen ? 'block' : 'hidden lg:block'}`}>
            {/* CATEGORIES */}
            <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] space-y-2.5 shadow-md">
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-gray-400 font-bold">
                CATEGORIES
              </div>
              <button
                onClick={() => onNavigate('vp-catalog')}
                className="w-full p-2.5 rounded-lg text-white font-bold text-xs flex items-center gap-2.5 cursor-pointer shadow-md text-left transition-all"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  boxShadow: '0 0 15px rgba(124, 58, 237, 0.4)',
                }}
              >
                <IndiaFlag className="w-4 h-3" />
                <span className="font-rajdhani text-sm font-extrabold tracking-wide">Indian VP Packs</span>
              </button>
              <button
                onClick={() => onNavigate('vp')}
                className="w-full p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-gray-300 font-medium text-xs flex items-center gap-2.5 cursor-pointer transition-colors text-left"
              >
                <PhilippinesFlag className="w-4 h-3" />
                <span className="font-rajdhani text-sm font-semibold tracking-wide">Philippines VP Packs</span>
              </button>
              <button
                onClick={() => onNavigate('vp')}
                className="w-full p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-gray-300 font-medium text-xs flex items-center gap-2.5 cursor-pointer transition-colors text-left"
              >
                <Globe className="w-4 h-4 text-purple-400" />
                <span className="font-rajdhani text-sm font-semibold tracking-wide">Other Regions (On Request)</span>
              </button>
            </div>

            {/* FILTERS */}
            <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] space-y-4 shadow-md">
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-gray-400 font-bold">
                FILTERS
              </div>

              {/* Price Range */}
              <div className="space-y-1.5">
                <div className="text-xs text-gray-300 font-medium">Price Range</div>
                <input
                  type="range"
                  min="499"
                  max="150000"
                  step="1000"
                  value={priceMax}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                />
                <div className="text-[11px] font-mono text-purple-300">
                  ₹0 – ₹{priceMax >= 150000 ? '20,000+' : priceMax.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Sort By */}
              <div className="space-y-1.5">
                <div className="text-xs text-gray-300 font-medium">Sort By</div>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-2 rounded-lg bg-[#141026] border border-white/10 text-xs text-gray-200 appearance-none pr-8 cursor-pointer focus:outline-none focus:border-purple-500"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="vp-high">Most VP</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Features Checkboxes */}
              <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="text-xs text-gray-300 font-medium">Features</div>
                <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="accent-purple-500 rounded cursor-pointer"
                  />
                  <span>In Stock</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={popularOnly}
                    onChange={(e) => setPopularOnly(e.target.checked)}
                    className="accent-purple-500 rounded cursor-pointer"
                  />
                  <span>Popular</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bestValueOnly}
                    onChange={(e) => setBestValueOnly(e.target.checked)}
                    className="accent-purple-500 rounded cursor-pointer"
                  />
                  <span>Best Value</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={discountedOnly}
                    onChange={(e) => setDiscountedOnly(e.target.checked)}
                    className="accent-purple-500 rounded cursor-pointer"
                  />
                  <span>Discounted</span>
                </label>
              </div>
            </div>

            {/* NEED A CUSTOM AMOUNT? Card */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-[#180e2e] to-[#0c0a18] border border-purple-500/35 space-y-3 shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-purple-900/30 border border-purple-500/20 p-1">
                  <img
                    src="/assets/hires/vp_coins_stack.png"
                    alt="VP Coins"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h4 className="font-black text-xs uppercase text-white font-rajdhani tracking-wide">
                  NEED A CUSTOM AMOUNT?
                </h4>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Can't find the VP amount you need? Contact us on WhatsApp for custom requests.
              </p>
              <a
                href="https://wa.me/919181801766?text=Hi%20VIB%20Team%2C%20I%20need%20assistance"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-black" />
                <span>WhatsApp Us →</span>
              </a>
            </div>

            {/* WE ARE ONLINE Card */}
            <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] space-y-2.5 shadow-md">
              <div className="flex items-center gap-2.5 text-white">
                <Headphones className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-[10px] font-mono tracking-wider text-gray-400 uppercase">WE ARE ONLINE</div>
                  <div className="font-extrabold text-xs text-white">9 AM – 9 PM</div>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">
                For orders outside this time, please contact us on WhatsApp.
              </p>
              <a
                href="https://wa.me/919181801766?text=Hi%20VIB%20Team%2C%20I%20need%20assistance"
                target="_blank"
                rel="noreferrer"
                className="w-full py-1.5 rounded-lg bg-[#261545] hover:bg-purple-600 text-purple-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-purple-500/30 cursor-pointer"
              >
                <span>WhatsApp Us →</span>
              </a>
            </div>

            {/* 4 Trust Badges List below sidebar (Matching Reference 2) */}
            <div className="p-3.5 rounded-xl bg-[#0c0a18] border border-white/[0.08] space-y-2.5 shadow-md text-xs text-gray-300">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="text-[11px] font-medium">100% Secure Transactions</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="text-[11px] font-medium">Verified Process</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="text-[11px] font-medium">Multiple Payment Options</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="text-[11px] font-medium">Fast &amp; Reliable Delivery</span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* Right Main Catalog Area (col-span-9)                          */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-9 space-y-4">
            {/* Top Bar: Indian VP Packs Category Header */}
            <div className="p-4 rounded-xl bg-[#0c0a18] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <IndiaFlag className="w-6 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white font-rajdhani">
                    Indian VP Packs
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 max-w-xl leading-relaxed">
                    Choose from our wide range of Indian region VP packs. All packs are sourced through official channels and delivered safely to your account after verification.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-xl whitespace-nowrap self-start sm:self-center shadow-sm">
                <Crown className="w-4 h-4 text-amber-400" />
                <div className="text-left">
                  <div className="text-[10px] text-gray-400 font-mono">Trusted by</div>
                  <div className="font-extrabold text-white text-xs">50,000+ Users</div>
                </div>
              </div>
            </div>

            {/* 13 VP Packs Grid + 1 Wide Banner in 5-Column Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredPacks.map((pack) => (
                <div
                  key={pack.id}
                  className="p-3 rounded-xl bg-[#0c0a18] border border-white/[0.08] hover:border-purple-500/50 transition-all duration-300 flex flex-col items-center text-center justify-between group shadow-md hover:shadow-[0_0_18px_rgba(168,85,247,0.2)] relative min-h-[175px]"
                >
                  {/* Badge */}
                  {pack.badge && (
                    <span
                      className={`absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider font-rajdhani shadow-sm ${
                        pack.badgeType === 'cyan'
                          ? 'bg-sky-500 text-black'
                          : 'bg-[#f59e0b] text-black'
                      }`}
                    >
                      {pack.badge}
                    </span>
                  )}

                  {/* 3D Shiny Metallic VP Coin Stack */}
                  <div className="w-20 h-20 rounded-lg flex items-center justify-center my-0.5 group-hover:scale-105 transition-transform duration-300">
                    <img
                      src="/assets/hires/vp_coins_stack.png"
                      alt={pack.vp}
                      className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                    />
                  </div>

                  {/* Pack Title & Pricing */}
                  <div className="space-y-0.5 w-full">
                    <div className="font-black text-sm text-white font-rajdhani tracking-wide">
                      {pack.vp}
                    </div>
                    <div className="font-extrabold text-xs text-purple-300 font-rajdhani">
                      {formatCurrencyPrice(pack.priceINR, currency)}
                    </div>
                    <div className="text-[10px] text-gray-500 line-through font-mono">
                      {formatCurrencyPrice(pack.originalINR, currency)}
                    </div>
                  </div>

                  {/* Buy Now Button */}
                  <button
                    type="button"
                    onClick={() => handleBuy(pack)}
                    className="w-full mt-2.5 min-h-[38px] py-1.5 px-3 rounded-lg bg-[#251342] hover:bg-[#7c3aed] text-white font-extrabold text-xs transition-colors cursor-pointer border border-purple-500/30 flex items-center justify-center gap-1.5 shadow-sm font-rajdhani uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Buy Now</span>
                  </button>
                </div>
              ))}

              {/* 14th Element: Wide 2-Column Banner "MORE VALUE MORE WINS" (Matching Reference 2) */}
              <div className="col-span-2 rounded-xl overflow-hidden bg-gradient-to-r from-[#170a2c] via-[#120822] to-[#0d0618] border border-purple-500/35 p-4 flex flex-col justify-between relative shadow-lg min-h-[175px]">
                {/* Background ambient glow */}
                <div className="absolute right-0 top-0 w-36 h-36 bg-purple-600/20 blur-2xl pointer-events-none" />

                {/* Angled Graffiti Text: MORE VALUE MORE WINS */}
                <div className="relative z-10 space-y-0.5 select-none pointer-events-none">
                  <div className="font-marker text-base sm:text-lg text-[#f472b6] -rotate-6 drop-shadow-[0_0_10px_rgba(244,114,182,0.9)]">
                    MORE VALUE
                  </div>
                  <div className="font-marker text-lg sm:text-xl text-[#e879f9] -rotate-6 drop-shadow-[0_0_12px_rgba(232,121,249,0.9)] font-bold -mt-1">
                    MORE WINS
                  </div>
                </div>

                {/* Weapon artwork resting on supply box */}
                <div className="relative z-10 w-full flex items-end justify-end mt-2">
                  <img
                    src="/assets/items/vandal-rgx.png"
                    alt="Valorant Vandal"
                    className="w-48 h-auto object-contain filter drop-shadow-[0_0_15px_rgba(168,85,247,0.7)] transform -rotate-3"
                  />
                </div>
              </div>
            </div>

            {/* Custom Amount Callout Bar (Matching Reference 2) */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#170d2c] via-[#100920] to-[#0a0614] border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-purple-900/30 border border-purple-500/30 p-1">
                  <img
                    src="/assets/hires/vp_coins_stack.png"
                    alt="VP Coins"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="font-black text-sm text-white font-rajdhani">
                    Looking for a different amount?
                  </div>
                  <div className="text-[11px] text-gray-300">
                    We can help with custom VP orders. Contact us on WhatsApp with your required amount.
                  </div>
                </div>
              </div>

              <a
                href="https://wa.me/919181801766?text=Hi%20VIB%20Team%2C%20I%20need%20assistance"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-black font-extrabold text-xs whitespace-nowrap cursor-pointer shadow-md flex items-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-black" />
                <span>Request on WhatsApp →</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. BOTTOM SECTION: How It Works & Why Choose VIB (Matching Reference 2)   */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left Card: How It Works */}
          <div className="p-6 rounded-2xl bg-[#0c0a18] border border-white/[0.08] space-y-4 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-base text-white font-rajdhani tracking-wide">
                How It Works
              </h3>
            </div>
            <p className="text-xs text-gray-400">Get your VP in 4 simple steps.</p>

            {/* 4 Steps in a single horizontal row matching Reference 2 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                  1
                </div>
                <div className="font-bold text-xs text-white font-rajdhani">Select Pack</div>
                <div className="text-[10px] text-gray-400 leading-tight">Choose your VP pack.</div>
              </div>

              <div className="space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                  2
                </div>
                <div className="font-bold text-xs text-white font-rajdhani">Provide Details</div>
                <div className="text-[10px] text-gray-400 leading-tight">Share your Riot ID and Tag.</div>
              </div>

              <div className="space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                  3
                </div>
                <div className="font-bold text-xs text-white font-rajdhani">Make Payment</div>
                <div className="text-[10px] text-gray-400 leading-tight">Complete the payment using available methods.</div>
              </div>

              <div className="space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                  4
                </div>
                <div className="font-bold text-xs text-white font-rajdhani">Verification &amp; Delivery</div>
                <div className="text-[10px] text-gray-400 leading-tight">We verify your payment and deliver your VP.</div>
              </div>
            </div>
          </div>

          {/* Right Card: Why Choose VIB? with Hooded Agent Artwork */}
          <div className="p-6 rounded-2xl bg-[#0c0a18] border border-white/[0.08] flex items-center justify-between gap-4 shadow-md relative overflow-hidden">
            <div className="space-y-3 flex-1 relative z-10">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-400 fill-purple-400/30" />
                <h3 className="font-extrabold text-base text-white font-rajdhani tracking-wide">
                  Why Choose VIB?
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Official &amp; Legitimate Source</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Competitive Pricing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Secure &amp; Verified Process</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Multiple Payment Options</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Fast Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Dedicated Support</span>
                </div>
              </div>
            </div>

            {/* Hooded Agent Graphic & Graffiti matching Reference 2 */}
            <div className="w-36 h-36 flex items-center justify-center relative flex-shrink-0">
              <div className="absolute right-0 bottom-2 pointer-events-none select-none text-right z-10 space-y-0.5">
                <div className="font-marker text-xs text-purple-400 -rotate-12 drop-shadow-[0_0_6px_rgba(168,85,247,0.7)]">PLAY</div>
                <div className="font-marker text-xs text-fuchsia-400 -rotate-10 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]">UPGRADE</div>
                <div className="font-marker text-sm text-purple-300 font-bold -rotate-8 drop-shadow-[0_0_10px_rgba(192,132,252,0.9)]">BELONG</div>
              </div>
              <img
                src="/assets/hires/profiles/card1_omen.jpg"
                alt="VIB Security Agent"
                className="w-28 h-28 object-cover rounded-xl border border-purple-500/30 filter drop-shadow-[0_0_20px_rgba(147,51,234,0.5)] opacity-85"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};