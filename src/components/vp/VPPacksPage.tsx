import React, { useState } from 'react';
import {
  Zap,
  ShieldCheck,
  Headphones,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  ShoppingBag,
  Info,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Award,
  Globe,
} from 'lucide-react';
import { Currency, VPStoreItem, CartItem } from '../../types';
import { INDIAN_VP_PACKS, PHILIPPINES_VP_PACKS } from '../../data/mockData';
import { formatCurrencyPrice } from '../../utils/format';
import { FlagIcon } from '../common/FlagIcon';

interface VPPacksPageProps {
  currency: Currency;
  onNavigateHome: () => void;
  onAddToCart: (item: CartItem) => void;
  onDirectBuy: (title: string, priceINR: number) => void;
  onSwitchTo3DStage?: () => void;
}

export const VPPacksPage: React.FC<VPPacksPageProps> = ({
  currency,
  onNavigateHome,
  onAddToCart,
  onDirectBuy,
  onSwitchTo3DStage,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<'india' | 'philippines' | 'other'>('india');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'budget' | 'popular' | 'whale'>('all');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const packs = selectedRegion === 'india' ? INDIAN_VP_PACKS : PHILIPPINES_VP_PACKS;

  const filteredPacks = packs.filter((pack) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'budget') return pack.vpAmount <= 2050;
    if (selectedCategory === 'popular') return pack.vpAmount > 2050 && pack.vpAmount <= 11000;
    if (selectedCategory === 'whale') return pack.vpAmount > 11000;
    return true;
  });

  const handleBuyNow = (pack: VPStoreItem) => {
    onDirectBuy(`${pack.vpLabel} (${selectedRegion === 'india' ? 'Indian Region' : 'Philippines Region'})`, pack.priceINR);
  };

  const handleAdd = (pack: VPStoreItem) => {
    onAddToCart({
      id: pack.id,
      title: `${pack.vpLabel} Top-Up`,
      subtitle: `${selectedRegion === 'india' ? 'India' : 'Philippines'} Server • Instant Delivery`,
      priceINR: pack.priceINR,
      type: 'vp',
      image: pack.coinAsset || '/assets/client/vp-coins-large.png',
      quantity: 1,
    });
  };

  const calculateDiscountPercent = (price: number, original?: number) => {
    if (!original || original <= price) return null;
    const diff = Math.round(((original - price) / original) * 100);
    return diff > 0 ? diff : null;
  };

  const faqs = [
    {
      q: 'Do I need to provide my Valorant password?',
      a: 'No! We never ask for your password. All VP deliveries are processed using your Riot ID (Username#TAG) or authorized Riot digital pin codes.',
    },
    {
      q: 'How long does VP delivery take?',
      a: 'Standard automated delivery takes 1 to 5 minutes after payment verification. During heavy traffic, it may take up to 15 minutes.',
    },
    {
      q: 'What if there is a delay or payment issue?',
      a: 'We offer a 100% Refund & Replacement Guarantee. If your order cannot be fulfilled, our 24/7 support will immediately replace or refund your payment.',
    },
    {
      q: 'Which payment methods are supported?',
      a: 'We support all Indian payment modes including UPI (Google Pay, PhonePe, Paytm), QR Code, Net Banking, and Debit/Credit Cards.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#070a10] text-white pb-24 selection:bg-fuchsia-600 selection:text-white">
      {/* Breadcrumb Strip */}
      <div className="border-b border-white/5 bg-[#090d16]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between text-xs font-rajdhani tracking-wider text-gray-400">
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateHome}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <span>/</span>
            <span className="text-fuchsia-400 font-semibold">VP Packs</span>
          </div>

          {onSwitchTo3DStage && (
            <button
              onClick={onSwitchTo3DStage}
              className="text-xs font-chakra font-bold text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1.5 px-3 py-1 rounded bg-fuchsia-600/10 border border-fuchsia-500/20 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Switch to 3D Agent Stage</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Banner with Glowing 3D VP Chest (Matching Image 4) */}
      <section className="relative border-b border-white/10 bg-gradient-to-b from-[#0e1322] via-[#090d16] to-[#070a10] overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-72 h-72 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-chakra font-bold tracking-wider uppercase">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instant Valorant Points Top-Up</span>
            </div>

            <h1 className="font-chakra font-black text-4xl sm:text-5xl xl:text-6xl uppercase tracking-tight text-white leading-none drop-shadow-[0_0_20px_rgba(192,38,211,0.3)]">
              BUY <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-300 to-pink-500">VALORANT POINTS (VP)</span>
            </h1>

            <p className="text-gray-300 font-rajdhani text-base sm:text-lg max-w-xl leading-relaxed">
              Instant delivery to your Riot ID. Multiple payment modes including UPI, Net Banking, and Cards. 100% authentic codes with direct verification.
            </p>

            {/* 3 Metric Pills */}
            <div className="grid grid-cols-3 gap-3 pt-2 max-w-lg">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="text-xs">
                  <div className="font-chakra font-bold text-white leading-tight">5 Min</div>
                  <div className="text-[10px] text-gray-400 font-rajdhani">Delivery</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="text-xs">
                  <div className="font-chakra font-bold text-white leading-tight">100% Secure</div>
                  <div className="text-[10px] text-gray-400 font-rajdhani">UPI & Cards</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                <Headphones className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
                <div className="text-xs">
                  <div className="font-chakra font-bold text-white leading-tight">24/7 Live</div>
                  <div className="text-[10px] text-gray-400 font-rajdhani">Support</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual: Glowing 3D VP Chest */}
          <div className="lg:col-span-5 flex justify-center items-center relative">
            <div className="relative w-full max-w-sm sm:max-w-md aspect-square flex items-center justify-center">
              <div className="absolute inset-8 rounded-full bg-gradient-to-tr from-fuchsia-600/30 via-purple-600/30 to-amber-500/20 blur-3xl animate-pulse" />
              
              <img
                src="/assets/client/vp-crate.png"
                alt="Glowing 3D VP Chest"
                className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_0_35px_rgba(192,38,211,0.6)] transform hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  e.currentTarget.src = '/assets/client/vp-coins-large.png';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Region Switcher Tabs (Matching Image 4) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={() => setSelectedRegion('india')}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl font-chakra font-bold text-xs sm:text-sm tracking-wider flex items-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
              selectedRegion === 'india'
                ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_15px_rgba(192,38,211,0.4)] border border-fuchsia-400'
                : 'bg-[#0d1220] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            <FlagIcon country="IN" size="sm" />
            <span>Indian VP (Instant)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRegion('philippines')}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl font-chakra font-bold text-xs sm:text-sm tracking-wider flex items-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
              selectedRegion === 'philippines'
                ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_15px_rgba(192,38,211,0.4)] border border-fuchsia-400'
                : 'bg-[#0d1220] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            <FlagIcon country="PH" size="sm" />
            <span>Philippines VP</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRegion('other')}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl font-chakra font-bold text-xs sm:text-sm tracking-wider flex items-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
              selectedRegion === 'other'
                ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_15px_rgba(192,38,211,0.4)] border border-fuchsia-400'
                : 'bg-[#0d1220] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Other Regions (On Request)</span>
          </button>
        </div>
      </section>

      {/* Main Catalog & Sidebar Layout (Matching Image 4) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {selectedRegion === 'other' ? (
          <div className="p-12 text-center rounded-2xl bg-[#0c101e] border border-white/10 max-w-2xl mx-auto space-y-4">
            <h3 className="font-chakra font-bold text-2xl text-white">Global Region Top-Ups</h3>
            <p className="text-gray-400 text-sm font-rajdhani">
              We provide custom VP codes and top-ups for NA, EU, AP, LATAM, and KR servers upon request.
              Contact our concierge on WhatsApp or Discord for immediate regional activation.
            </p>
            <a
              href="https://wa.me/918099641606"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-chakra font-bold text-xs uppercase cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contact Concierge on WhatsApp</span>
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar (Desktop) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Category Filter */}
              <div className="p-5 rounded-2xl bg-[#0c101e] border border-white/10 space-y-3">
                <div className="text-xs font-mono uppercase tracking-widest text-fuchsia-400 font-bold">
                  VP Categories
                </div>

                <div className="space-y-1.5 font-chakra text-xs">
                  {[
                    { id: 'all', label: `All Packs (${packs.length})` },
                    { id: 'budget', label: 'Budget Packs (≤ 2,050 VP)' },
                    { id: 'popular', label: 'Popular Packs (3.6K - 11K)' },
                    { id: 'whale', label: 'Bulk / Whale Packs (14K+)' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-fuchsia-600/25 text-fuchsia-300 font-bold border border-fuchsia-500/40'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {selectedCategory === cat.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-fuchsia-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom WhatsApp Bulk Deal Card (From Mockup Image 4) */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-[#13221e] to-[#0c1416] border border-emerald-500/30 space-y-3 cyber-cut">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>

                <h4 className="font-chakra font-bold text-white text-base">
                  Need a custom amount?
                </h4>

                <p className="text-gray-400 text-xs font-rajdhani leading-relaxed">
                  Looking for 500,000+ VP or custom tournament balance? WhatsApp us directly for custom bulk deals and invoice pricing.
                </p>

                <a
                  href="https://wa.me/918099641606"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl font-chakra font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-md"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat on WhatsApp</span>
                </a>
              </div>

              {/* Security Policy Reminder */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs font-rajdhani text-gray-300 space-y-2">
                <div className="flex items-center gap-2 text-fuchsia-400 font-chakra font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>VIB Buyer Warranty</span>
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Every VP transaction is backed by our full replacement and refund guarantee.
                </p>
              </div>
            </div>

            {/* Right VP Grid */}
            <div className="lg:col-span-9">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredPacks.map((pack) => {
                  const discountPct = calculateDiscountPercent(pack.priceINR, pack.originalPriceINR);

                  return (
                    <div
                      key={pack.id}
                      className="p-5 rounded-2xl bg-[#0c101e] border border-white/10 hover:border-fuchsia-500/50 transition-all duration-300 flex flex-col justify-between group shadow-xl hover:shadow-[0_0_25px_rgba(192,38,211,0.25)] relative overflow-hidden"
                    >
                      {/* Badge in top right */}
                      {pack.badge && (
                        <span
                          className={`absolute top-3 right-3 text-[9px] font-chakra font-bold px-2 py-0.5 rounded-full border ${
                            pack.badge === 'POPULAR'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : pack.badge === 'BEST VALUE'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
                          }`}
                        >
                          {pack.badge}
                        </span>
                      )}

                      {/* Top VP Icon & Title */}
                      <div>
                        <div className="w-14 h-14 rounded-xl bg-[#141a2e] border border-white/10 flex items-center justify-center p-2 mb-3 group-hover:scale-105 transition-transform">
                          <img
                            src={pack.coinAsset || '/assets/client/vp-coins-large.png'}
                            alt="VP Coins"
                            className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(192,38,211,0.5)]"
                          />
                        </div>

                        <div className="flex items-baseline gap-2">
                          <h3 className="font-chakra font-black text-2xl text-white group-hover:text-fuchsia-300 transition-colors">
                            {pack.vpLabel}
                          </h3>
                          {discountPct && (
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              SAVE {discountPct}%
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-rajdhani mt-1">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Instant Riot ID Delivery</span>
                        </div>
                      </div>

                      {/* Pricing & CTA */}
                      <div className="pt-5 mt-4 border-t border-white/5 flex items-center justify-between gap-2">
                        <div>
                          {pack.originalPriceINR && (
                            <div className="text-[10px] text-gray-500 line-through font-mono">
                              {formatCurrencyPrice(pack.originalPriceINR, currency)}
                            </div>
                          )}
                          <div className="font-chakra font-black text-xl text-fuchsia-400">
                            {formatCurrencyPrice(pack.priceINR, currency)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAdd(pack)}
                            className="p-2.5 rounded-xl border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-600/20 transition-colors cursor-pointer"
                            title="Add to Cart"
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBuyNow(pack)}
                            className="px-4 py-2.5 rounded-xl font-chakra font-bold text-xs uppercase tracking-wider text-white transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                            style={{
                              background: 'linear-gradient(135deg, #c026d3 0%, #9333ea 100%)',
                            }}
                          >
                            Buy Now
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* How It Works & Omen Visual Section (Matching Image 5) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Omen Visual */}
          <div className="lg:col-span-5 flex justify-center items-center relative order-2 lg:order-1">
            <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
              <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-cyan-600/20 via-purple-600/30 to-fuchsia-600/20 blur-3xl animate-pulse" />
              <img
                src="/assets/client/vp-omen-hero.png"
                alt="Omen with Phone and VP Coins"
                className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_0_30px_rgba(6,182,212,0.5)]"
                onError={(e) => {
                  e.currentTarget.src = '/assets/agents/omen.png';
                }}
              />
            </div>
          </div>

          {/* Right: How It Works 4-Step Stepper */}
          <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-fuchsia-400 font-bold mb-1">
                Simple & Transparent Process
              </div>
              <h2 className="font-chakra font-black text-3xl sm:text-4xl uppercase tracking-wider text-white">
                HOW IT WORKS
              </h2>
              <p className="text-gray-400 text-sm font-rajdhani">
                Get your Valorant Points credited in 4 effortless steps without sharing sensitive credentials.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#0c101e] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-chakra font-bold text-sm text-white">01. Select VP Pack</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300">STEP 1</span>
                </div>
                <p className="text-xs text-gray-400 font-rajdhani leading-relaxed">
                  Choose the exact VP package from our catalog that matches your skin wishlist or battlepass needs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0c101e] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-chakra font-bold text-sm text-white">02. Enter Riot ID</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300">STEP 2</span>
                </div>
                <p className="text-xs text-gray-400 font-rajdhani leading-relaxed">
                  Provide your Riot Username#TAG. Zero password or sensitive credentials required at any point.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0c101e] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-chakra font-bold text-sm text-white">03. Secure Payment</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300">STEP 3</span>
                </div>
                <p className="text-xs text-gray-400 font-rajdhani leading-relaxed">
                  Pay securely via UPI (GPay, PhonePe, Paytm), QR Code, Net Banking, or Credit/Debit Cards.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0c101e] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-chakra font-bold text-sm text-white">04. Instant Delivery</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">STEP 4</span>
                </div>
                <p className="text-xs text-gray-400 font-rajdhani leading-relaxed">
                  Points are directly credited to your Valorant account within 5 minutes of verification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose VIB for VP? 4 Pillars (Matching Image 5) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <h2 className="font-chakra font-black text-2xl sm:text-3xl uppercase tracking-wider text-white">
            WHY CHOOSE VIB FOR VP?
          </h2>
          <p className="text-gray-400 text-sm font-rajdhani">
            Built for competitive gamers who demand speed, security, and top value.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-2xl bg-[#0b0f1c] border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Award className="w-6 h-6" />
            </div>
            <h4 className="font-chakra font-bold text-white text-lg">100% Authentic</h4>
            <p className="text-xs text-gray-400 font-rajdhani leading-relaxed">
              Direct authorized distributor codes and digital PIN activations.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0b0f1c] border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-6 h-6" />
            </div>
            <h4 className="font-chakra font-bold text-white text-lg">Instant Delivery</h4>
            <p className="text-xs text-gray-400 font-rajdhani leading-relaxed">
              Automated crediting engine processes your top-up under 5 minutes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0b0f1c] border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="font-chakra font-bold text-white text-lg">Best Indian Rates</h4>
            <p className="text-xs text-gray-400 font-rajdhani leading-relaxed">
              Save up to 25% compared to official in-game store currency rates.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0b0f1c] border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Headphones className="w-6 h-6" />
            </div>
            <h4 className="font-chakra font-bold text-white text-lg">Dedicated Support</h4>
            <p className="text-xs text-gray-400 font-rajdhani leading-relaxed">
              Live WhatsApp and Discord assistance available round the clock.
            </p>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions Accordion */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        <div className="text-center mb-6">
          <h3 className="font-chakra font-bold text-xl uppercase tracking-wider text-white">
            FREQUENTLY ASKED QUESTIONS
          </h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-[#0c101e] border border-white/10 overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 text-left font-chakra font-bold text-sm text-white flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openFaq === idx ? 'rotate-180 text-fuchsia-400' : ''}`} />
              </button>
              {openFaq === idx && (
                <div className="p-4 pt-0 text-xs sm:text-sm font-rajdhani text-gray-300 leading-relaxed border-t border-white/5 bg-[#090d18]">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};