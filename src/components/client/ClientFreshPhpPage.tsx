import React, { useState } from 'react';
import {
  Globe,
  ArrowRight,
  ShieldCheck,
  Check,
  Zap,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Headphones,
  MessageSquare,
  Lock,
  Clock,
  Sparkles,
  User,
  Settings,
  Mail,
  Shield,
  Star,
  Users,
} from 'lucide-react';
import { Currency } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from './Header';
import { soundFx } from '../../utils/audio';

interface ClientFreshPhpPageProps {
  currency: Currency;
  onNavigate: (page: ClientPage, sectionId?: string) => void;
  onOpenCheckout: (title: string, priceINR: number, productId?: string) => void;
}

export const ClientFreshPhpPage: React.FC<ClientFreshPhpPageProps> = ({
  currency,
  onNavigate,
  onOpenCheckout,
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    soundFx.playClickSound();
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleOrder = () => {
    soundFx.playClickSound();
    onOpenCheckout('Fresh Philippines (PHP) Profile Provisioning', 499, 'service-fresh-php');
  };

  const provisioningSteps = [
    {
      num: '01',
      title: 'Place Your Order',
      desc: 'Select your preferred starting preferences, provide your delivery email and WhatsApp, and submit your request.',
      badge: 'PHASE 01',
    },
    {
      num: '02',
      title: 'Automated Account Setup',
      desc: 'Our specialized system provisions a fresh, clean Philippines region account with zero prior matches, verified region tag, and clean MMR.',
      badge: 'PHASE 02',
    },
    {
      num: '03',
      title: 'Receive & Verify Credentials',
      desc: 'Receive full access login details, first-email access, and complete security credentials via encrypted email & WhatsApp within 10–20 minutes.',
      badge: 'PHASE 03',
    },
    {
      num: '04',
      title: 'Start Playing & Saving',
      desc: 'Log in and enjoy 40% cheaper VP in the store forever with identical low ping (15–25ms) on Mumbai and Singapore servers.',
      badge: 'PHASE 04',
    },
  ];

  const guarantees = [
    {
      title: '100% Ban-Free Guarantee',
      desc: 'Every account is manually generated using clean residential routing. Zero automated botting or risky third-party scripts.',
      icon: ShieldCheck,
      color: 'text-emerald-400',
    },
    {
      title: 'Mumbai & Singapore Low Ping',
      desc: 'Connect to standard Mumbai (15–25ms) and Singapore game servers with zero ping degradation or latency penalty.',
      icon: Zap,
      color: 'text-cyan-400',
    },
    {
      title: 'First-Email & Password Changeable',
      desc: 'You receive complete first-email access. Change the registered email, password, and security questions immediately to your own.',
      icon: Mail,
      color: 'text-purple-400',
    },
    {
      title: 'Lifetime Warranty Protection',
      desc: 'Backed by VIB official escrow protection. In the unlikely event of any provisioning defect, receive an instant replacement.',
      icon: Shield,
      color: 'text-amber-400',
    },
  ];

  const faqs = [
    {
      q: 'Do I need to share my existing Valorant account details for this service?',
      a: 'No. This service provisions a brand new, clean Philippines (PHP) Valorant profile. Your existing account remains completely untouched and independent.',
    },
    {
      q: 'Will my in-game ping be high playing on a Philippines account?',
      a: 'No. Valorant matches players based on the physical game server selected in the lobby (such as Mumbai or Singapore), not your account billing region. You get identical 15–25ms ping to Mumbai servers.',
    },
    {
      q: 'Can I change the email and password to my own?',
      a: 'Yes, 100%. You receive the original first-email credentials. Once delivered, you can bind your personal email address, phone number, and password permanently.',
    },
    {
      q: 'How much cheaper are Valorant Points on a Philippines account?',
      a: 'In-game VP bundles in the Philippines store are approximately 25% to 40% cheaper compared to standard Indian store pricing. An Ultra Edition bundle (8,700 VP) costs ~₹4,300 in PHP currency versus ₹7,200+ in INR currency.',
    },
    {
      q: 'How long does delivery take after payment?',
      a: 'Fresh PHP profile credentials are delivered to your registered email and WhatsApp within 10 to 20 minutes following payment confirmation.',
    },
  ];

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-cyan-600 selection:text-white space-y-12 pb-24 font-sans">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section className="relative w-full pt-8 pb-12 overflow-hidden border-b border-white/[0.06]">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[350px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <button
              onClick={() => onNavigate('services')}
              className="hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Services
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-cyan-400 font-semibold">Fresh PHP Profile</span>
          </div>

          {/* Hero Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-semibold uppercase tracking-wider shadow-sm">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>CLEAN REGIONAL PROVISIONING</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none font-rajdhani">
                CREATE A FRESH <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300">
                  PHP PROFILE
                </span>
              </h1>

              <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                Start with a brand new, clean, unranked Philippines (PHP) Valorant account. Access 25% to 40% cheaper VP in the store forever without touching or risking your primary account.
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100% Ban-Free Setup</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Identical Mumbai Ping (15–25ms)</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>First-Email Access Included</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>10–20 Mins Delivery</span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleOrder}
                  className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold font-rajdhani uppercase tracking-wider text-sm shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center gap-2 group"
                >
                  <span>Get Fresh PHP Profile ({formatCurrencyPrice(499, currency)})</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <a
                  href="https://wa.me/918099641606?text=Hi%20VIB%20Team%2C%20I%20have%20questions%20about%20ordering%20a%20Fresh%20PHP%20Profile"
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3.5 rounded-xl bg-[#141226] hover:bg-[#1c1936] border border-white/10 text-gray-200 hover:text-white font-bold font-rajdhani uppercase tracking-wider text-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Ask On WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Right Card: Quick Spec Highlight */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-[#0c0e1e] to-[#070914] border border-cyan-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-black">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white font-rajdhani">PACKAGE HIGHLIGHT</h3>
                    <div className="text-[10px] font-mono text-cyan-300">Clean Unranked PHP Profile</div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-cyan-950/80 text-[10px] font-mono text-cyan-300 border border-cyan-500/40 font-bold uppercase">
                  READY TO PLAY
                </span>
              </div>

              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Account Type:</span>
                  <span className="font-bold text-white">Clean Unranked (Level 1–20)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Billing Region:</span>
                  <span className="font-bold text-cyan-300">Philippines (PHP Currency)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Matchmaking Servers:</span>
                  <span className="font-bold text-emerald-400">Mumbai / Singapore (15–25ms)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Store Savings:</span>
                  <span className="font-bold text-fuchsia-400">25% – 40% Cheaper VP Forever</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-400">Delivery Speed:</span>
                  <span className="font-bold text-white">10 – 20 Minutes Guaranteed</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOrder}
                  className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:text-white border border-cyan-500/40 font-bold font-rajdhani uppercase tracking-wider text-xs transition-all cursor-pointer text-center"
                >
                  Order For {formatCurrencyPrice(499, currency)} →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. 4-PHASE TECHNICAL PROVISIONING TIMELINE                                */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-1">
          <div className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
            SIMPLE &amp; TRANSPARENT WORKFLOW
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani tracking-wide">
            HOW FRESH PHP PROVISIONING WORKS
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
            A frictionless 4-phase handover managed securely by our operations desk.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {provisioningSteps.map((step) => (
            <div
              key={step.num}
              className="p-5 rounded-xl bg-[#090b17] border border-white/[0.08] hover:border-cyan-500/40 transition-all space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-extrabold text-xs flex items-center justify-center font-rajdhani">
                  {step.num}
                </div>
                <span className="text-[9px] font-mono text-cyan-400 uppercase">{step.badge}</span>
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
      {/* 3. FOUR KEY GUARANTEES                                                    */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-1">
          <div className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
            COMPLIANCE &amp; SECURITY ASSURANCE
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani tracking-wide">
            BUILT FOR LONG-TERM COMPETITIVE PEACE OF MIND
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {guarantees.map((g, i) => (
            <div
              key={i}
              className="p-5 rounded-xl bg-[#0a0c1a] border border-white/[0.06] space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <g.icon className={`w-5 h-5 ${g.color}`} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-white font-rajdhani">{g.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. COMPLETE PACKAGE INCLUSIONS CARD                                       */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#0c0f24] via-[#090b1c] to-[#060814] border border-cyan-500/30 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>ALL-INCLUSIVE PROVISIONING</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani tracking-tight">
              FRESH PHILIPPINES PROFILE (₹499)
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Everything required to jump in with discounted VP store pricing, permanent first-email ownership, and dedicated WhatsApp support.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Original first-email access included</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Password and security details changeable</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Clean match history &amp; zero bans</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Full lifetime warranty protection</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#070916] border border-white/10 text-center space-y-3 min-w-[260px] w-full sm:w-auto">
            <div className="text-[11px] font-mono text-gray-400 uppercase">ONE-TIME FEE</div>
            <div className="text-3xl font-black text-white font-rajdhani">
              {formatCurrencyPrice(499, currency)}
            </div>
            <button
              type="button"
              onClick={handleOrder}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold font-rajdhani uppercase tracking-wider text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Order Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="text-[10px] text-gray-400">10–20 Mins Delivery via WhatsApp &amp; Email</div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FREQUENTLY ASKED QUESTIONS                                             */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="space-y-1">
          <div className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
            FREQUENTLY ASKED QUESTIONS
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase text-white font-rajdhani tracking-wide">
            FRESH PHP PROVISIONING FAQS
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-[#090b17] border border-white/[0.06] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02]"
                >
                  <span className="font-bold text-xs sm:text-sm text-gray-200">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-cyan-400' : ''}`}
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
      {/* 6. 24/7 WHATSAPP HELP CENTRE BAR                                          */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0d1024] via-[#090b1a] to-[#060814] border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 p-1 flex items-center justify-center text-cyan-300 flex-shrink-0">
              <Headphones className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="font-black text-sm text-white font-rajdhani">
                Questions About Fresh PHP Profiles? Contact Our 24/7 Help Centre
              </div>
              <div className="text-xs text-gray-400">
                Our operations executives are active 24/7 on WhatsApp to answer queries and guide your delivery.
              </div>
            </div>
          </div>

          <a
            href="https://wa.me/918099641606?text=Hi%20VIB%20Team%2C%20I%20have%20questions%20about%20ordering%20a%20Fresh%20PHP%20Profile"
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
