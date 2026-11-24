import React, { useState } from 'react';
import {
  ArrowLeftRight,
  ShieldCheck,
  Check,
  Zap,
  Repeat,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Headphones,
  MessageSquare,
  Lock,
  Clock,
  Sparkles,
  Shield,
  HelpCircle,
  Coins,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { Currency } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from './Header';
import { soundFx } from '../../utils/audio';

interface ClientSkinsExchangePageProps {
  currency: Currency;
  onNavigate: (page: ClientPage, sectionId?: string) => void;
  onOpenCheckout: (title: string, priceINR: number, productId?: string) => void;
}

export const ClientSkinsExchangePage: React.FC<ClientSkinsExchangePageProps> = ({
  currency,
  onNavigate,
  onOpenCheckout,
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    soundFx.playClickSound();
    setActiveFaq(activeFaq === index ? null : index);
  };

  const exchangeSteps = [
    {
      num: '01',
      title: 'Submit Current Inventory',
      desc: 'Share your current account Riot ID, list of premium skins, and whether you want store credit or a direct account swap.',
      badge: 'STEP 01',
    },
    {
      num: '02',
      title: 'Instant Fair Valuation',
      desc: 'Our senior evaluators analyze your skin collection, rarity, and tier to calculate a guaranteed trade-in valuation within 15 minutes.',
      badge: 'STEP 02',
    },
    {
      num: '03',
      title: '100% Escrow Security Lock',
      desc: 'Both parties deposit credentials into VIB middleman escrow. Credentials and security email access are audited before release.',
      badge: 'STEP 03',
    },
    {
      num: '04',
      title: 'Handover & Warranty Activation',
      desc: 'Receive your upgraded profile or store credit instantly. Every trade includes lifetime warranty protection against recovery.',
      badge: 'STEP 04',
    },
  ];

  const securityPillars = [
    {
      title: 'Instant Transparent Valuation',
      desc: 'Clear market-backed appraisal on exclusive knives, vandal skins, and battlepass items without unfair deductions.',
      icon: Zap,
      color: 'text-amber-400',
    },
    {
      title: '100% Middleman Escrow Protection',
      desc: 'Your credentials never go directly to another player. VIB holds assets in secure escrow until both sides confirm satisfaction.',
      icon: ShieldCheck,
      color: 'text-emerald-400',
    },
    {
      title: 'Fair Exchange Trade Rates',
      desc: 'Upgrade from mid-tier inventories to high-tier vaulted skins paying only the verified price differential.',
      icon: Repeat,
      color: 'text-purple-400',
    },
    {
      title: 'Lifetime Recovery Guarantee',
      desc: 'Full financial guarantee. If any traded profile encounters access issues, VIB resolves or replaces it with equivalent value.',
      icon: Shield,
      color: 'text-cyan-400',
    },
  ];

  const faqs = [
    {
      q: 'How does the Valo Skins Exchange Program work?',
      a: 'If you are tired of your current skin collection, you can trade it in for another account from our marketplace or receive VIB store credit. VIB acts as the trusted middleman escrow to ensure both parties receive their credentials safely.',
    },
    {
      q: 'How is the valuation of my inventory calculated?',
      a: 'Valuations are calculated based on the number and rarity of premium weapon skins (Champions, Kuronami, Reaver, Prime, etc.), knife/melee skins, unlocked variants, and current VP store values.',
    },
    {
      q: 'Can I trade my account and pay the difference for a higher tier?',
      a: 'Yes! That is the core upgrade feature. If your account is valued at ₹4,000 and the account you want is ₹6,000, you only pay the ₹2,000 difference plus the nominal escrow fee.',
    },
    {
      q: 'Is account trading safe with VIB?',
      a: 'Yes. Unlike unverified Discord or peer-to-peer trades where one party risks being scammed, VIB secures the first email, tests in-game credentials, verifies ownership, and holds all assets in neutral escrow.',
    },
    {
      q: 'What information do I need to start an exchange valuation?',
      a: 'You just need your current in-game Riot ID & #Tag, a list or screenshots of your premium skins, and an active WhatsApp number where our appraisal team can contact you.',
    },
  ];

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white space-y-12 pb-24 font-sans">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section className="relative w-full pt-8 pb-12 overflow-hidden border-b border-white/[0.06]">
        {/* Full-bleed Reference Artwork Background */}
        <img
          src="/assets/reference_parts/part_15.png"
          alt="Valo Skins Exchange Showcase"
          className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0 opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05040a] via-[#05040a]/90 to-[#05040a]/30 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05040a] via-transparent to-transparent z-[1]" />

        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[350px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none z-[1]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none z-[1]" />

        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-purple-300 transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <button
              onClick={() => onNavigate('services')}
              className="hover:text-purple-300 transition-colors cursor-pointer"
            >
              Services
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-purple-400 font-semibold">Valo Skins Exchange</span>
          </div>

          {/* Hero Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-xs font-semibold uppercase tracking-wider shadow-sm">
                <Repeat className="w-3.5 h-3.5 text-purple-400" />
                <span>VALO SKINS EXCHANGE &amp; ESCROW</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none font-rajdhani">
                TRADE IN. UPGRADE. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-amber-300">
                  DOMINATE.
                </span>
              </h1>

              <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                Bored of your current skin inventory? Trade in your existing Valorant accounts or weapon collections for instant store credit or upgrade directly to high-tier vaulted inventories with guaranteed 100% escrow protection.
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Instant Skin Valuation</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100% Escrow Middleman</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Fair Upgrade Differentials</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lifetime Warranty Handover</span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <a
                  href="https://wa.me/918099641606?text=Hi%20VIB%20Team%2C%20I%20would%20like%20to%20get%20an%20instant%20valuation%20to%20trade%20or%20upgrade%20my%20Valorant%20skins"
                  target="_blank"
                  rel="noreferrer"
                  className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold font-rajdhani uppercase tracking-wider text-sm shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2 group"
                >
                  <Repeat className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                  <span>Get Trade Valuation On WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => onNavigate('profiles')}
                  className="px-5 py-3.5 rounded-xl bg-[#141226] hover:bg-[#1c1936] border border-white/10 text-gray-200 hover:text-white font-bold font-rajdhani uppercase tracking-wider text-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Browse Vaulted Inventories</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Card: How Valuation Works */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-[#120a22] to-[#080512] border border-purple-500/35 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-300 flex items-center justify-center font-black">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white font-rajdhani">TRADE-IN PROTOCOL</h3>
                    <div className="text-[10px] font-mono text-purple-300">P2P Escrow Facilitation</div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-purple-950/80 text-[10px] font-mono text-purple-300 border border-purple-500/40 font-bold uppercase">
                  ESCROW PROTECTED
                </span>
              </div>

              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Accepted Items:</span>
                  <span className="font-bold text-white">Exclusive Knives, Bundles &amp; Vaulted Skins</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Valuation Turnaround:</span>
                  <span className="font-bold text-emerald-400">10 – 15 Minutes Online</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Escrow Security:</span>
                  <span className="font-bold text-purple-300">100% VIB Middleman Protection</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Upgrade Option:</span>
                  <span className="font-bold text-white">Pay difference for higher-tier inventory</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-400">Warranty:</span>
                  <span className="font-bold text-cyan-300">Lifetime Account Recovery Protection</span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="https://wa.me/918099641606?text=Hi%20VIB%20Team%2C%20I%20want%20to%20upgrade%20my%20Valorant%20skin%20inventory"
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white border border-purple-500/40 font-bold font-rajdhani uppercase tracking-wider text-xs transition-all cursor-pointer text-center"
                >
                  Start Trade Evaluation Now →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. 4-STEP EXCHANGE PROCESS                                                */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-1">
          <div className="text-[10px] font-mono tracking-widest text-purple-400 uppercase font-bold">
            SAFE MIDDLEMAN WORKFLOW
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani tracking-wide">
            HOW VALO SKINS EXCHANGE WORKS
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
            Never risk unverified P2P trades. VIB middleman escrow audits and guarantees every transaction.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {exchangeSteps.map((step) => (
            <div
              key={step.num}
              className="p-5 rounded-xl bg-[#090714] border border-white/[0.08] hover:border-purple-500/40 transition-all space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 font-extrabold text-xs flex items-center justify-center font-rajdhani">
                  {step.num}
                </div>
                <span className="text-[9px] font-mono text-purple-400 uppercase">{step.badge}</span>
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
      {/* 3. FOUR SECURITY PILLARS                                                  */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-1">
          <div className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
            ESCROW &amp; INTEGRITY STANDARDS
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani tracking-wide">
            WHY GAMERS TRUST VIB FOR ACCOUNT &amp; SKIN SWAPS
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {securityPillars.map((p, i) => (
            <div
              key={i}
              className="p-5 rounded-xl bg-[#0a0818] border border-white/[0.06] space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <p.icon className={`w-5 h-5 ${p.color}`} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-white font-rajdhani">{p.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FREQUENTLY ASKED QUESTIONS                                             */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="space-y-1">
          <div className="text-[10px] font-mono tracking-widest text-purple-400 uppercase font-bold">
            FREQUENTLY ASKED QUESTIONS
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase text-white font-rajdhani tracking-wide">
            VALO SKINS EXCHANGE FAQS
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
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-purple-400' : ''}`}
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
      {/* 5. 24/7 WHATSAPP TRADE CONCIERGE BAR                                      */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#170a2a] via-[#10081d] to-[#0a0515] border border-purple-500/35 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 p-1 flex items-center justify-center text-purple-300 flex-shrink-0">
              <Headphones className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="font-black text-sm text-white font-rajdhani">
                Ready to Trade or Upgrade Your Inventory? Contact Our Trade Concierge
              </div>
              <div className="text-xs text-gray-400">
                Our appraisal executives are active 24/7 on WhatsApp to inspect your inventory and quote trade values.
              </div>
            </div>
          </div>

          <a
            href="https://wa.me/918099641606?text=Hi%20VIB%20Team%2C%20I%20have%20an%20inventory%20to%20trade%20or%20exchange"
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
