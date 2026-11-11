import React from 'react';
import {
  Award,
  Tv,
  Crosshair,
  Target,
  Flame,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Star,
  Users,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Currency } from '../../types';
import { ClientPage } from './Header';
import { formatCurrencyPrice } from '../../utils/format';

interface ClientCoachingPageProps {
  currency: Currency;
  onNavigate: (page: ClientPage) => void;
  onOpenCheckout: (title: string, priceINR: number) => void;
}

export const ClientCoachingPage: React.FC<ClientCoachingPageProps> = ({
  currency,
  onNavigate,
  onOpenCheckout,
}) => {
  const pillars = [
    {
      icon: Tv,
      title: 'VOD Review & Macro Strategy',
      desc: 'Round-by-round breakdown of your positioning, rotations, utility economy, and game sense in ranked lobbies.',
    },
    {
      icon: Crosshair,
      title: 'Aim Mechanics & Micro Adjustments',
      desc: 'Crosshair placement routines, movement peeking drills, counter-strafing, and recoil mastery.',
    },
    {
      icon: Target,
      title: 'Agent Mastery & Ability Lineups',
      desc: 'Playbook for your main agent pool including site executes, retakes, and post-plant setups.',
    },
    {
      icon: Flame,
      title: 'Mental Game & Clutch Execution',
      desc: 'Composure under pressure, team communication leadership, and winning deciding 1v2 and 1v3 rounds.',
    },
  ];

  const packages = [
    {
      id: 'coach-1',
      title: 'Single 1-Hour Session',
      sub: 'Focused VOD Review or Live Coaching',
      price: 799,
      features: [
        '1-on-1 Private Discord Screen-share',
        'Detailed Match VOD Breakdown',
        'Custom Aim Routine Recommendation',
        'Session Recording Provided',
      ],
      popular: false,
    },
    {
      id: 'coach-2',
      title: '5-Session Mastery Bootcamp',
      sub: 'Complete Competitive Transformation',
      price: 3499,
      features: [
        '5 Hours of 1-on-1 Coaching',
        'Full Gameplay & Macro Diagnostic',
        'Personalized Daily Aim & Movement Routine',
        'Agent Lineup & Setup Playbook',
        '24/7 Discord & WhatsApp Coach Access',
        'Guaranteed Rank Improvement',
      ],
      popular: true,
    },
    {
      id: 'coach-3',
      title: 'Duo Coaching Package',
      sub: 'Level Up With Your Duo Partner',
      price: 1499,
      features: [
        '2-Hour Duo Synergy Session',
        'Crossfire & Trade Mechanics',
        'Double-Initiator / Duelist Pairings',
        'Both Players Coached Simultaneously',
      ],
      popular: false,
    },
  ];

  const scrollToPlans = () => {
    const el = document.getElementById('coaching-plans');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white space-y-6 sm:space-y-8 pb-20 font-sans">
      {/* 1. HERO HEADER: Seamless Rounded Card matching Reference 4 */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 w-full">
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden min-h-[280px] sm:min-h-[320px] lg:min-h-[360px] flex items-center justify-end bg-[#070510] border border-purple-500/25 shadow-2xl">
          {/* Full-bleed reference background properly fitted - natural orientation */}
          <img
            src="/assets/reference_parts/part_21.png"
            alt="VIB Coaching Program"
            className="absolute inset-0 w-full h-full object-cover object-left pointer-events-none select-none z-0 opacity-75 sm:opacity-85"
          />
          {/* Seamless gradient filters - perfectly fitted with zero cutoff across all viewports */}
          <div className="absolute inset-0 bg-[#070510]/80 lg:bg-transparent z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/70 to-[#070510]/30 lg:bg-gradient-to-l lg:from-[#070510] lg:via-[#070510]/95 lg:to-transparent z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070510]/50 via-transparent to-transparent z-[1]" />

          {/* Atmospheric Glow */}
          <div className="absolute -top-10 right-1/4 w-[350px] h-[200px] bg-purple-600/20 rounded-full blur-[90px] pointer-events-none z-[1]" />

          {/* Foreground content: Breadcrumbs, Title, Subtitle, Badges & CTA */}
          <div className="relative z-10 p-6 sm:p-8 lg:p-10 w-full lg:max-w-2xl space-y-4">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
              <button
                onClick={() => onNavigate('home')}
                className="hover:text-purple-300 transition-colors cursor-pointer"
              >
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-purple-400 font-semibold">Coaching</span>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5 text-purple-400" />
                <span>TIER 1 COMPETITIVE COACHING</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white leading-tight font-rajdhani">
                COACHING: <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-pink-400">LEARN. IMPROVE. DOMINATE.</span>
              </h1>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed max-w-xl">
                1-on-1 private coaching with Radiant players, VCT tier analysts, and competitive specialists. Custom drills, live VOD reviews, and tailored aim routines.
              </p>
            </div>

            {/* Coach Badges & View Plans CTA */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300 font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-purple-950/70 border border-purple-500/30 text-purple-300 text-[11px]">
                  1-on-1 Coaching Sessions
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-fuchsia-950/70 border border-fuchsia-500/30 text-fuchsia-300 text-[11px]">
                  VOD &amp; Mechanics Review
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[11px]">
                  Structured Practice Plans
                </span>
              </div>
              <button
                type="button"
                onClick={scrollToPlans}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-rajdhani font-bold uppercase tracking-wider text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(147,51,234,0.4)] shrink-0 focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <span>View Plans</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 4 SKILL PILLARS */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-2.5">
        <div className="space-y-0.5 border-b border-white/[0.06] pb-2">
          <div className="text-[10px] font-mono tracking-[0.2em] text-[#e879f9] uppercase font-bold">
            COACHING CURRICULUM
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white font-rajdhani tracking-wide uppercase">
            THE 4 PILLARS OF MASTERY
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="p-3.5 sm:p-4 rounded-xl bg-[#0a0717] border border-white/10 hover:border-purple-500/40 transition-all space-y-1.5 group shadow-md"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-white font-rajdhani tracking-wide">
                  {p.title}
                </h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {p.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. COACHING PACKAGES */}
      <section id="coaching-plans" className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4 scroll-mt-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-rajdhani uppercase tracking-wide">
            CHOOSE YOUR COACHING PLAN
          </h2>
          <p className="text-xs text-gray-400">Tailored sessions designed to immediately boost your rank and in-game confidence.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`p-5 sm:p-6 rounded-2xl border transition-all flex flex-col justify-between relative shadow-xl ${
                pkg.popular
                  ? 'bg-gradient-to-b from-[#180e33] to-[#0c081e] border-fuchsia-500/60 shadow-[0_0_25px_rgba(217,70,239,0.25)]'
                  : 'bg-[#0a0717] border-white/10 hover:border-purple-500/30'
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold px-3 py-1 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white uppercase tracking-wider shadow-md">
                  MOST POPULAR
                </span>
              )}

              <div className="space-y-3.5">
                <div className="space-y-0.5">
                  <h3 className="font-black text-lg text-white font-rajdhani uppercase">{pkg.title}</h3>
                  <p className="text-xs text-gray-400">{pkg.sub}</p>
                </div>

                <div className="text-2xl sm:text-3xl font-black text-white font-rajdhani">
                  {formatCurrencyPrice(pkg.price, currency)}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  {pkg.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-5">
                <button
                  type="button"
                  onClick={() => onOpenCheckout(`Coaching: ${pkg.title}`, pkg.price)}
                  className={`w-full min-h-[44px] py-3 rounded-xl text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-fuchsia-600/30'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                  }`}
                >
                  <span>Book This Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
