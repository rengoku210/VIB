import React, { useState } from 'react';
import {
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  Clock,
  Sparkles,
  Globe,
  Repeat,
  Crown,
  Megaphone,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Layers,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { Currency } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ServiceProductDetail } from '../../data/serviceProductDetails';

interface ServiceProductPageProps {
  product: ServiceProductDetail;
  currency: Currency;
  onBuyNow: () => void;
  onBack: () => void;
  onNavigateHome: () => void;
}

export const ServiceProductPage: React.FC<ServiceProductPageProps> = ({
  product,
  currency,
  onBuyNow,
  onBack,
  onNavigateHome,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const getHeroIcon = () => {
    switch (product.iconType) {
      case 'repeat':
        return <Repeat className="w-8 h-8 text-cyan-400" />;
      case 'crown':
        return <Crown className="w-8 h-8 text-amber-400" />;
      case 'sparkles':
        return <Sparkles className="w-8 h-8 text-fuchsia-400" />;
      case 'shield':
        return <Shield className="w-8 h-8 text-emerald-400" />;
      default:
        return <Megaphone className="w-8 h-8 text-purple-400" />;
    }
  };

  const formattedPrice =
    product.priceINR === 0
      ? 'FREE'
      : formatCurrencyPrice(product.priceINR, currency);

  return (
    <div className="min-h-screen bg-[#06040d] text-white selection:bg-purple-500 selection:text-white pb-24">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-purple-900/20 via-fuchsia-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-mono">
          <button
            type="button"
            onClick={onNavigateHome}
            className="hover:text-purple-300 transition-colors focus-visible:ring-2 focus-visible:ring-purple-400 rounded cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={onBack}
            className="hover:text-purple-300 transition-colors focus-visible:ring-2 focus-visible:ring-purple-400 rounded cursor-pointer"
          >
            {product.breadcrumbParent}
          </button>
          <span>/</span>
          <span className="text-purple-300 truncate font-semibold">{product.name}</span>
        </nav>

        {/* Back Link */}
        <div className="mb-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors group focus-visible:ring-2 focus-visible:ring-purple-400 rounded py-1 px-2 -ml-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-purple-400" />
            <span>Back to {product.breadcrumbParent}</span>
          </button>
        </div>

        {/* Hero Section Card */}
        <div className="relative rounded-2xl bg-[#0b0819] border border-white/10 p-6 sm:p-8 lg:p-10 mb-10 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
            {/* Left Column: Details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  {product.categoryLabel}
                </span>
                {product.badge && (
                  <span className="px-3 py-1 rounded-full text-[11px] font-mono uppercase font-bold tracking-wider bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-sm">
                    {product.badge}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Escrow Protected</span>
                </span>
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-rajdhani text-white tracking-tight uppercase">
                  {product.name}
                </h1>
                <p className="mt-2 text-base sm:text-lg text-purple-200/90 font-medium leading-snug">
                  {product.tagline}
                </p>
              </div>

              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                {product.description}
              </p>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 uppercase mb-1">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Delivery</span>
                  </div>
                  <div className="text-sm font-bold text-white font-rajdhani leading-snug">
                    {product.deliverySpeed}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 uppercase mb-1">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Method</span>
                  </div>
                  <div className="text-sm font-bold text-white font-rajdhani leading-snug">
                    {product.fulfillmentMethod}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 uppercase mb-1">
                    <Globe className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>Region</span>
                  </div>
                  <div className="text-sm font-bold text-white font-rajdhani leading-snug">
                    {product.regionScope}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 uppercase mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Safety</span>
                  </div>
                  <div className="text-sm font-bold text-white font-rajdhani leading-snug">
                    {product.protectionLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Pricing & BUY NOW Card */}
            <div className="lg:col-span-5 bg-[#0e0a22] border border-purple-500/20 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                    {getHeroIcon()}
                  </div>
                  <div>
                    <span className="text-[11px] font-mono uppercase text-gray-400 tracking-wider">Order Total</span>
                    <div className="text-2xl sm:text-3xl font-black font-rajdhani text-white">
                      {formattedPrice}
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                  {product.priceINR === 0 ? 'Complimentary' : 'One-time payment'}
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-mono uppercase text-gray-400 tracking-wider">What is included:</div>
                {product.services.slice(0, 4).map((service, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-200">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    </div>
                    <span>{service}</span>
                  </div>
                ))}
              </div>

              {/* Prominent BUY NOW Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onBuyNow}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-pink-500 text-white font-black text-sm uppercase tracking-wider font-rajdhani shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all flex items-center justify-center gap-2 group cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span>BUY NOW — {formattedPrice}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-gray-400 pt-2 border-t border-white/[0.06]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Verified Checkout
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  {product.deliverySpeed}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Deliverables & Benefits Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div className="rounded-2xl bg-[#0b0819] border border-white/10 p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-rajdhani text-white uppercase">Included Deliverables</h2>
                <p className="text-xs text-gray-400">Everything fulfilled as part of your order</p>
              </div>
            </div>
            <ul className="space-y-3">
              {product.services.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-200 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-1" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-[#0b0819] border border-white/10 p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-rajdhani text-white uppercase">Key Benefits</h2>
                <p className="text-xs text-gray-400">Why players order through VIB Official</p>
              </div>
            </div>
            <ul className="space-y-3">
              {product.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-200 leading-relaxed">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Important Conditions */}
        {product.conditions.length > 0 && (
          <div className="rounded-2xl bg-amber-950/15 border border-amber-500/30 p-6 sm:p-8 mb-10 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-300 font-bold font-rajdhani text-lg uppercase tracking-wider">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Important Conditions</span>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm font-mono text-gray-300">
              {product.conditions.map((c, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-amber-400 font-bold">-</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* FAQs Accordion */}
        {product.faqs.length > 0 && (
          <div className="rounded-2xl bg-[#0b0819] border border-white/10 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/10 text-white font-bold font-rajdhani text-xl uppercase tracking-wider">
              <HelpCircle className="w-5 h-5 text-purple-400" />
              <span>Frequently Asked Questions</span>
            </div>

            <div className="space-y-3">
              {product.faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <span className="font-bold text-sm text-white font-rajdhani">{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-purple-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-xs sm:text-sm text-gray-300 leading-relaxed font-mono border-t border-white/5 pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
