import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Lock,
  Clock,
  ChevronRight,
  Award,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Users,
  Layers,
} from 'lucide-react';
import { Currency } from '../../types';
import { ClientPage } from './Header';
import { RankProgressionCalculator } from '../home/RankProgressionCalculator';
import { useRankBadges, getRankBadgeUrl } from '../../utils/valorantRanks';

interface ClientRankupPageProps {
  currency: Currency;
  onNavigate: (page: ClientPage) => void;
  onOpenCheckout: (title: string, price: number, productId?: string, rankup?: { fromRankId: string; toRankId: string; mode: 'solo' | 'duo'; queueType: 'standard' | 'priority' }) => void;
}

const RANK_TIERS = [
  { name: 'Iron', color: 'from-gray-600 to-zinc-700', border: 'border-zinc-600', text: 'text-zinc-400', badge: 'IRON' },
  { name: 'Bronze', color: 'from-amber-800 to-yellow-900', border: 'border-amber-700', text: 'text-amber-500', badge: 'BRONZE' },
  { name: 'Silver', color: 'from-slate-400 to-gray-500', border: 'border-slate-400', text: 'text-slate-300', badge: 'SILVER' },
  { name: 'Gold', color: 'from-yellow-500 to-amber-600', border: 'border-yellow-400', text: 'text-yellow-400', badge: 'GOLD' },
  { name: 'Platinum', color: 'from-cyan-500 to-teal-600', border: 'border-cyan-400', text: 'text-cyan-400', badge: 'PLAT' },
  { name: 'Diamond', color: 'from-purple-500 to-fuchsia-600', border: 'border-purple-400', text: 'text-purple-400', badge: 'DIAMOND' },
  { name: 'Ascendant', color: 'from-emerald-500 to-green-600', border: 'border-emerald-400', text: 'text-emerald-400', badge: 'ASCEND' },
  { name: 'Immortal', color: 'from-rose-500 to-red-600', border: 'border-rose-400', text: 'text-rose-400', badge: 'IMMORTAL' },
  { name: 'Radiant', color: 'from-amber-300 via-yellow-400 to-yellow-200', border: 'border-yellow-300', text: 'text-yellow-300', badge: 'RADIANT' },
];

export const ClientRankupPage: React.FC<ClientRankupPageProps> = ({
  currency,
  onNavigate,
  onOpenCheckout,
}) => {
  const [journeyType, setJourneyType] = useState<'rankup' | 'derank'>('rankup');
  const rankBadges = useRankBadges();

  const handleSelectJourney = (type: 'rankup' | 'derank') => {
    setJourneyType(type);
    const el = document.getElementById('rank-calculator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white space-y-12 pb-20 font-sans">
      {/* ========================================================================= */}
      {/* 1. HERO HEADER: RANKUP & DERANK SERVICES (Matching Reference 3)            */}
      {/* ========================================================================= */}
      <section className="relative w-full min-h-[280px] sm:min-h-[340px] flex items-center pt-8 pb-6 border-b border-white/5 overflow-hidden">
        {/* Full-bleed Reference Part 14 background with gradient overlay */}
        <img
          src="/assets/reference_parts/part_14.png"
          alt="Esports Champion Trophy"
          className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none z-0 opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05040a] via-[#05040a]/85 to-[#05040a]/20 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05040a] via-transparent to-transparent z-[1]" />

        {/* Atmospheric Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-[550px] h-[320px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none z-[1]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none z-[1]" />

        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono relative z-10">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-purple-300 transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-purple-400 font-semibold">Competitive Services</span>
          </div>

          <div className="max-w-3xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>Verified Competitive Boosting &amp; Deranking</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none font-rajdhani">
              RANKUP &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-rose-400">DERANK SERVICES</span>
            </h1>

            <p className="text-gray-300 text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl">
              Choose your competitive journey. Climb to Radiant with top-500 verified players or safely lower your MMR with 100% manual gameplay, offline mode, and encrypted VPN protection.
            </p>
          </div>

          {/* CHOOSE YOUR JOURNEY: DUAL TOGGLE CARDS (Matching Reference 3) */}
          <div className="space-y-3 pt-2 relative z-10">
            <div className="text-[10px] font-mono tracking-[0.25em] text-purple-300 uppercase font-bold">
              CHOOSE YOUR JOURNEY
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: RANKUP SERVICES (Blue / Cyan Glow) */}
              <div
                onClick={() => handleSelectJourney('rankup')}
                className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  journeyType === 'rankup'
                    ? 'bg-gradient-to-br from-[#0b1426] via-[#0d1b33] to-[#070b16] border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
                    : 'bg-[#090b16] border-white/10 hover:border-cyan-500/30 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[9px] font-mono tracking-widest text-cyan-400 uppercase font-bold">MODE 01</div>
                        <h2 className="text-lg sm:text-xl font-black text-white font-rajdhani uppercase">RANKUP SERVICES</h2>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 uppercase">
                      CLIMB
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    Climb to your dream rank with verified Radiant &amp; Immortal players. 100% manual gameplay, offline mode &amp; full VPN protection.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-cyan-200">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950/50 border border-cyan-500/20">Top 500 Radiants</span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950/50 border border-cyan-500/20">Offline Invisible</span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950/50 border border-cyan-500/20">Solo &amp; Duo Queue</span>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-cyan-500/20 flex items-center justify-between text-xs font-bold text-cyan-400 font-rajdhani">
                  <span>Calculate Rankup Price</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Card 2: DERANK SERVICES (Red / Rose Glow) */}
              <div
                onClick={() => handleSelectJourney('derank')}
                className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  journeyType === 'derank'
                    ? 'bg-gradient-to-br from-[#260b14] via-[#330d1b] to-[#16070b] border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.25)]'
                    : 'bg-[#16090f] border-white/10 hover:border-rose-500/30 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                        <TrendingDown className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[9px] font-mono tracking-widest text-rose-400 uppercase font-bold">MODE 02</div>
                        <h2 className="text-lg sm:text-xl font-black text-white font-rajdhani uppercase">DERANK SERVICES</h2>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-500/30 uppercase">
                      LOWER MMR
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    Safely lower your MMR or rank for casual play or smurfing. Discreet, rapid, 100% manual gameplay without behavioral penalties.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-rose-200">
                    <span className="px-2 py-0.5 rounded-md bg-rose-950/50 border border-rose-500/20">Zero Ban Guarantee</span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-950/50 border border-rose-500/20">No AFK Penalties</span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-950/50 border border-rose-500/20">Express Completion</span>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-rose-500/20 flex items-center justify-between text-xs font-bold text-rose-400 font-rajdhani">
                  <span>Configure D-Rank Journey</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* 4 Feature Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-[#0e0c18] border border-white/10 flex items-center gap-3 shadow-md">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Offline Mode</div>
                <div className="text-[10px] text-gray-400">Boost completely invisible to friends</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0e0c18] border border-white/10 flex items-center gap-3 shadow-md">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">VPN Encryption</div>
                <div className="text-[10px] text-gray-400">Matched to your exact location</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0e0c18] border border-white/10 flex items-center gap-3 shadow-md">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Radiant Boosters</div>
                <div className="text-[10px] text-gray-400">Top 500 verified players only</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0e0c18] border border-white/10 flex items-center gap-3 shadow-md">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Fast Completion</div>
                <div className="text-[10px] text-gray-400">Express queue available</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. THE RANK JOURNEY: 9-TIER STAIRCASE (Matching Reference 3)               */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono tracking-[0.2em] text-[#e879f9] uppercase font-bold">
              TIER PROGRESSION
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-rajdhani tracking-wide uppercase">
              THE RANK JOURNEY
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded bg-purple-950/50 border border-purple-500/30 text-purple-300">
              Solo Boost (Booster on Account)
            </span>
            <span className="px-2.5 py-1 rounded bg-fuchsia-950/50 border border-fuchsia-500/30 text-fuchsia-300">
              Duo Boost (Play Together)
            </span>
            <span className="px-2.5 py-1 rounded bg-cyan-950/50 border border-cyan-500/30 text-cyan-300">
              Standard Speed (2-3 Tiers/Day)
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-950/50 border border-amber-500/30 text-amber-300">
              Express Priority
            </span>
          </div>
        </div>

        {/* Full-bleed Reference Part 12 (Glowing 9-Tier Rank Staircase) */}
        <div className="relative rounded-2xl overflow-hidden min-h-[240px] sm:min-h-[300px] bg-[#070510] shadow-2xl flex items-end">
          <img
            src="/assets/reference_parts/part_12.png"
            alt="Rank Staircase Progression"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-transparent to-transparent z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070510]/60 via-transparent to-transparent z-[1]" />
        </div>

        {/* 9-Tier Rank Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5 pt-1">
          {RANK_TIERS.map((tier, idx) => {
            const rankIconUrl = rankBadges[tier.name as keyof typeof rankBadges] || getRankBadgeUrl(tier.name);
            return (
              <div
                key={tier.name}
                className={`p-3 rounded-xl bg-[#0a0815] border ${tier.border}/30 hover:${tier.border} transition-all duration-200 text-center space-y-2 group shadow-sm flex flex-col items-center justify-between hover:shadow-[0_0_15px_rgba(147,51,234,0.25)]`}
              >
                <div className="text-[9px] font-mono text-gray-500">0{idx + 1}</div>
                <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center relative">
                  <img
                    src={rankIconUrl}
                    alt={`${tier.name} Rank Badge`}
                    className="w-10 h-10 sm:w-11 sm:h-11 object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getRankBadgeUrl(tier.name);
                    }}
                  />
                </div>
                <div>
                  <div className={`font-bold text-xs ${tier.text} font-rajdhani tracking-wide`}>
                    {tier.name}
                  </div>
                  <div className="text-[9px] text-gray-500 uppercase font-mono">1 - 3</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE RANK PROGRESSION CALCULATOR                                 */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <RankProgressionCalculator
          currency={currency}
          journeyType={journeyType}
          onJourneyTypeChange={setJourneyType}
          onBook={(quote, title, price) => onOpenCheckout(title, price, undefined, quote)}
        />
      </section>

      {/* ========================================================================= */}
      {/* 4. HOW IT WORKS                                                           */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-rajdhani">
            HOW VIB RANK-UP WORKS
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">
            Transparent, secure, and monitored from order placement to rank delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-[#0c0a18] border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 font-black text-base flex items-center justify-center font-rajdhani">
              01
            </div>
            <h3 className="font-bold text-base text-white font-rajdhani">Select Ranks &amp; Queue</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Choose your current tier and target tier. Select Solo (booster plays on your account) or Duo (play alongside a Radiant booster).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0c0a18] border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 font-black text-base flex items-center justify-center font-rajdhani">
              02
            </div>
            <h3 className="font-bold text-base text-white font-rajdhani">Secure Checkout &amp; Order Tracking</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Review your server-priced quote at checkout, place your order, and track payment verification and fulfillment from your account dashboard.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0c0a18] border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 font-black text-base flex items-center justify-center font-rajdhani">
              03
            </div>
            <h3 className="font-bold text-base text-white font-rajdhani">Track &amp; Enjoy Your Rank</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Receive live game-by-game updates. Once the target rank is locked in, change your password and enjoy your new competitive rank.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
