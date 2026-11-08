import React, { useState } from 'react';
import {
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  Clock,
  Sparkles,
  Users,
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
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Currency } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { PackageDetailData } from '../../data/advertisementProductDetails';

interface AdvertisementProductPageProps {
  packageData: PackageDetailData;
  currency: Currency;
  onBuyNow: () => void;
  onBackToPlans: () => void;
  onComparePlans?: () => void;
}

export const AdvertisementProductPage: React.FC<AdvertisementProductPageProps> = ({
  packageData,
  currency,
  onBuyNow,
  onBackToPlans,
  onComparePlans,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const getHeroIcon = () => {
    switch (packageData.heroIconType) {
      case 'repeat':
        return <Repeat className="w-8 h-8 text-cyan-400" />;
      case 'crown':
        return <Crown className="w-8 h-8 text-amber-400" />;
      case 'sparkles':
        return <Sparkles className="w-8 h-8 text-fuchsia-400" />;
      case 'shield':
        return <Shield className="w-8 h-8 text-emerald-400" />;
      case 'megaphone':
      default:
        return <Megaphone className="w-8 h-8 text-purple-400" />;
    }
  };

  const formattedPrice =
    packageData.price === 0
      ? 'FREE'
      : formatCurrencyPrice(packageData.price, currency);

  return (
    <div className="min-h-screen bg-[#06040d] text-white selection:bg-purple-500 selection:text-white pb-24">
      {/* Background Neon Atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-purple-900/20 via-fuchsia-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-mono">
          <button
            onClick={onBackToPlans}
            className="hover:text-purple-300 transition-colors focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
          >
            Home
          </button>
          <span>/</span>
          <button
            onClick={onBackToPlans}
            className="hover:text-purple-300 transition-colors focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
          >
            Advertise
          </button>
          <span>/</span>
          <span className="text-purple-300 truncate font-semibold">{packageData.name}</span>
        </nav>

        {/* Back Link */}
        <div className="mb-6">
          <button
            onClick={onBackToPlans}
            className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors group focus-visible:ring-2 focus-visible:ring-purple-400 rounded py-1 px-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-purple-400" />
            <span>Back to All Advertisement Plans</span>
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
                  {packageData.categoryLabel}
                </span>
                {packageData.badge && (
                  <span className="px-3 py-1 rounded-full text-[11px] font-mono uppercase font-bold tracking-wider bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-sm">
                    {packageData.badge}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Escrow Protected
                </span>
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-rajdhani text-white tracking-tight uppercase">
                  {packageData.name}
                </h1>
                <p className="mt-2 text-base sm:text-lg text-purple-200/90 font-medium leading-snug">
                  {packageData.tagline}
                </p>
              </div>

              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                {packageData.description}
              </p>

              {/* Specs Pills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 uppercase mb-1">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Duration</span>
                  </div>
                  <div className="text-sm font-bold text-white font-rajdhani truncate">
                    {packageData.promotion_duration}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 uppercase mb-1">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Audience Reach</span>
                  </div>
                  <div className="text-sm font-bold text-white font-rajdhani truncate">
                    {packageData.reach}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 uppercase mb-1">
                    <Layers className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>Placement</span>
                  </div>
                  <div className="text-sm font-bold text-white font-rajdhani truncate">
                    {packageData.placement}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 uppercase mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Scheduling</span>
                  </div>
                  <div className="text-sm font-bold text-white font-rajdhani truncate">
                    {packageData.turnaround}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Pricing & Action Card */}
            <div className="lg:col-span-5 bg-[#0e0a22] border border-purple-500/20 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                    {getHeroIcon()}
                  </div>
                  <div>
                    <span className="text-[11px] font-mono uppercase text-gray-400 tracking-wider">Plan Investment</span>
                    <div className="text-2xl sm:text-3xl font-black font-rajdhani text-white">
                      {formattedPrice}
                    </div>
                  </div>
                </div>

                {packageData.price === 0 ? (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                    18% Fee on Sale
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                    One-time payment
                  </span>
                )}
              </div>

              {/* Fast feature bullets */}
              <div className="space-y-2.5">
                <div className="text-xs font-mono uppercase text-gray-400 tracking-wider">What you get:</div>
                {packageData.services.slice(0, 4).map((service, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-200">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    </div>
                    <span>{service}</span>
                  </div>
                ))}
              </div>

              {/* Big Prominent BUY NOW Button */}
              <div className="pt-2">
                <button
                  onClick={onBuyNow}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-pink-500 text-white font-black text-sm uppercase tracking-wider font-rajdhani shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all flex items-center justify-center gap-2 group cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span>Buy Now — {formattedPrice}</span>
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
                  Instant Queue
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Sections: Services & Benefits */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Included Services Card */}
          <div className="rounded-2xl bg-[#0b0819] border border-white/10 p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-rajdhani text-white uppercase">Included Services</h2>
                <p className="text-xs text-gray-400">Comprehensive deliverables included with this package</p>
              </div>
            </div>

            <ul className="space-y-3">
              {packageData.services.map((service, index) => (
                <li key={index} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="text-sm text-gray-200 leading-snug">{service}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Benefits Card */}
          <div className="rounded-2xl bg-[#0b0819] border border-white/10 p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
              <div className="w-9 h-9 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-rajdhani text-white uppercase">Seller Benefits</h2>
                <p className="text-xs text-gray-400">Why this package accelerates your sale or trade</p>
              </div>
            </div>

            <ul className="space-y-3">
              {packageData.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="w-5 h-5 rounded-md bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <ArrowRight className="w-3 h-3 text-purple-300" />
                  </div>
                  <span className="text-sm text-gray-200 leading-snug">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Important Conditions & Guidelines Alert */}
        <div className="rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 p-6 sm:p-7 mb-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold font-rajdhani text-amber-200 uppercase tracking-wide">
              Important Conditions & Profile Guidelines
            </h3>
          </div>

          <ul className="space-y-2 text-xs sm:text-sm text-amber-100/80 pl-2">
            {packageData.conditions.map((condition, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <span className="text-amber-400 font-bold">•</span>
                <span>{condition}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Frequently Asked Questions (Accordion) */}
        {packageData.faqs && packageData.faqs.length > 0 && (
          <div className="rounded-2xl bg-[#0b0819] border border-white/10 p-6 sm:p-8 mb-10 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-rajdhani text-white uppercase">Frequently Asked Questions</h2>
                <p className="text-xs text-gray-400">Common questions about this advertisement package</p>
              </div>
            </div>

            <div className="space-y-3">
              {packageData.faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full flex items-center justify-between p-4 text-left font-rajdhani font-bold text-sm sm:text-base text-white hover:text-purple-300 transition-colors focus-visible:ring-2 focus-visible:ring-purple-400"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-purple-400 shrink-0 ml-3" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-3" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-white/[0.04]">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom CTA & Compare Bar */}
        <div className="rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#0d0920] to-fuchsia-950/40 border border-purple-500/20 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-xs font-mono text-purple-300 uppercase tracking-wider">Ready to broadcast?</div>
            <h3 className="text-2xl font-black font-rajdhani text-white uppercase">
              {packageData.name} — {formattedPrice}
            </h3>
            <p className="text-xs text-gray-400">
              Verified queue placement • Admin verification • 100% Escrow Protection
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onComparePlans && (
              <button
                onClick={onComparePlans}
                className="py-3 px-5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-xs font-mono uppercase text-gray-300 hover:text-white transition-colors"
              >
                Compare All Plans
              </button>
            )}
            <button
              onClick={onBuyNow}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-sm uppercase tracking-wider font-rajdhani shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 group cursor-pointer"
            >
              <span>Buy Now</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
