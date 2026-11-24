import React, { useState } from 'react';
import {
  Zap,
  ShieldCheck,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Headphones,
  MessageSquare,
  Clock,
  Sparkles,
  Shield,
  CreditCard,
  AlertCircle,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';
import { Currency } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from './Header';
import { soundFx } from '../../utils/audio';

interface ClientUrgentSalePageProps {
  currency: Currency;
  onNavigate: (page: ClientPage, sectionId?: string) => void;
  onOpenCheckout: (title: string, priceINR: number, productId?: string) => void;
}

export const ClientUrgentSalePage: React.FC<ClientUrgentSalePageProps> = ({
  currency,
  onNavigate,
  onOpenCheckout,
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    soundFx.playClickSound();
    setActiveFaq(activeFaq === index ? null : index);
  };

  const urgentSaleSteps = [
    {
      num: '01',
      title: 'Submit Profile Details',
      desc: 'Send your current in-game Riot ID, level, unlocked skin lines, and proof of original ownership to our valuation desk.',
      badge: 'PHASE 01',
    },
    {
      num: '02',
      title: 'Instant Fair Appraisal',
      desc: 'Our senior compliance team verifies matches, account security, first-email status, and calculates a guaranteed buyout price within 15 minutes.',
      badge: 'PHASE 02',
    },
    {
      num: '03',
      title: 'Escrow Handover & Verification',
      desc: 'Credentials and security details are securely inspected. Recovery safeguards and first-email verification are confirmed.',
      badge: 'PHASE 03',
    },
    {
      num: '04',
      title: 'Instant Cash Payout',
      desc: 'Funds are transferred directly to your verified bank account or UPI ID (Google Pay, PhonePe, Paytm) within 15 to 45 minutes.',
      badge: 'PHASE 04',
    },
  ];

  const faqs = [
    {
      q: 'What is the VIB Urgent Sale Offer?',
      a: 'The Urgent Sale Offer is a fast-track buyout service for players who want immediate cash for their Valorant accounts without waiting days or weeks for an individual marketplace buyer.',
    },
    {
      q: 'How does Urgent Sale differ from the Advertisement Plans?',
      a: 'With Advertisement Plans, you set your own asking price and we promote your account across our network until a buyer purchases it (higher eventual value, but takes more time). With Urgent Sale, VIB purchases or arranges an instant verified buyer buyout immediately (faster cashout, but discounted valuation).',
    },
    {
      q: 'How quickly will I receive the payment?',
      a: 'Once your credentials and first-email access are verified by our operations desk, payment is dispatched instantly via UPI or IMPS bank transfer (typically within 15 to 45 minutes).',
    },
    {
      q: 'What accounts are eligible for Urgent Sale?',
      a: 'Accounts must be clean of active bans, have verified first-email access, and contain recognizable premium knife/vandal skins (e.g. Kuronami, Champions, Reaver, Prime, Sovereign, Glitchpop).',
    },
    {
      q: 'Is my data and personal information secure?',
      a: 'Yes. All transactions adhere strictly to VIB escrow protocols and India DPDPA compliance. Your payment and personal details are handled confidentially and never publicly shared.',
    },
  ];

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-amber-600 selection:text-white space-y-12 pb-24 font-sans">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section className="relative w-full pt-8 pb-12 overflow-hidden border-b border-white/[0.06]">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[350px] bg-amber-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <button
              onClick={() => onNavigate('services')}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Services
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-amber-400 font-semibold">Urgent Sale Offer</span>
          </div>

          {/* Hero Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs font-semibold uppercase tracking-wider shadow-sm">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>INSTANT PROFILE CASHOUT</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none font-rajdhani">
                VIB URGENT <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-200">
                  SALE OFFER
                </span>
              </h1>

              <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                Need to sell your Valorant account fast? Turn your skin inventory into real instant cash. Our verified buyout desk inspects your collection and transfers payment within hours.
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>15-Min Fast Evaluation</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Instant UPI / IMPS Payout</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100% Secure VIB Escrow</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero Middleman Scams</span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <a
                  href="https://wa.me/918099641606?text=Hi%20VIB%20Team%2C%20I%20want%20to%20sell%20my%20Valorant%20account%20via%20Urgent%20Sale"
                  target="_blank"
                  rel="noreferrer"
                  className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold font-rajdhani uppercase tracking-wider text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center gap-2 group"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  <span>Get My Profile Evaluated On WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => onNavigate('advertise')}
                  className="px-5 py-3.5 rounded-xl bg-[#141226] hover:bg-[#1c1936] border border-white/10 text-gray-200 hover:text-white font-bold font-rajdhani uppercase tracking-wider text-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Compare With Advertising Plans</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Card: Speed vs Value Comparison */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-[#160f08] to-[#0a0705] border border-amber-500/35 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white font-rajdhani">TWO WAYS TO SELL</h3>
                    <div className="text-[10px] font-mono text-amber-300">Choose Speed Or Maximum Value</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Method A: Urgent Sale */}
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 uppercase font-rajdhani text-sm">A. Urgent Sale Offer</span>
                    <span className="px-2 py-0.5 rounded bg-amber-900/60 text-[9px] font-mono text-amber-200 font-bold uppercase">FASTER CASHOUT</span>
                  </div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    Instant cash buyout within 24 hours. Ideal if you need funds urgently and don't want to wait for individual buyers.
                  </p>
                </div>

                {/* Method B: Advertisement Plans */}
                <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300 uppercase font-rajdhani text-sm">B. Profile Advertisement</span>
                    <span className="px-2 py-0.5 rounded bg-purple-900/60 text-[9px] font-mono text-purple-200 font-bold uppercase">MAXIMUM VALUE</span>
                  </div>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Set your own price. We promote your account to thousands of buyers across WhatsApp, Web, and Discord.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="https://wa.me/918099641606?text=Hi%20VIB%20Team%2C%20I%20have%20questions%20about%20selling%20my%20account%20via%20Urgent%20Sale"
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 font-bold font-rajdhani uppercase tracking-wider text-xs transition-all cursor-pointer text-center"
                >
                  Start Urgent Sale Evaluation →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. 4-PHASE CASHOUT TIMELINE                                               */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-1">
          <div className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold">
            RAPID BUYOUT PROTOCOL
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani tracking-wide">
            HOW URGENT SALE WORKS
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
            From initial submission to verified cash payout into your bank account.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {urgentSaleSteps.map((step) => (
            <div
              key={step.num}
              className="p-5 rounded-xl bg-[#090714] border border-white/[0.08] hover:border-amber-500/40 transition-all space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 font-extrabold text-xs flex items-center justify-center font-rajdhani">
                  {step.num}
                </div>
                <span className="text-[9px] font-mono text-amber-400 uppercase">{step.badge}</span>
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
      </section>

      {/* ========================================================================= */}
      {/* 3. FREQUENTLY ASKED QUESTIONS                                             */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="space-y-1">
          <div className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold">
            FREQUENTLY ASKED QUESTIONS
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase text-white font-rajdhani tracking-wide">
            URGENT SALE FAQS
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-[#090714] border border-white/[0.06] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02]"
                >
                  <span className="font-bold text-xs sm:text-sm text-gray-200">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-amber-400' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-gray-400 leading-relaxed border-t border-white/[0.04]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. 24/7 WHATSAPP APPRAISAL DESK BAR                                       */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#170e08] via-[#100a06] to-[#0a0604] border border-amber-500/35 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/40 p-1 flex items-center justify-center text-amber-300 flex-shrink-0">
              <Headphones className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="font-black text-sm text-white font-rajdhani">
                Want An Instant Cash Offer Today? Contact Our Valuation Desk
              </div>
              <div className="text-xs text-gray-400">
                Our appraisal team is online 24/7 on WhatsApp to review your inventory and quote guaranteed buyout prices.
              </div>
            </div>
          </div>

          <a
            href="https://wa.me/918099641606?text=Hi%20VIB%20Team%2C%20I%20want%20to%20sell%20my%20Valorant%20profile%20fast"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-black font-extrabold text-xs whitespace-nowrap cursor-pointer shadow-md flex items-center gap-1.5 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5 fill-black" />
            <span>Chat on WhatsApp →</span>
          </a>
        </div>
      </section>
    </div>
  );
};
