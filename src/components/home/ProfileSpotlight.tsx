import React, { useState } from 'react';
import { ShieldCheck, Eye, ArrowRight, Zap, CheckCircle2, Sparkles, Award } from 'lucide-react';
import { Currency, CartItem } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';

interface ProfileSpotlightProps {
  currency: Currency;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (title: string, priceINR: number) => void;
  onInspect: (id?: string) => void;
}

export const ProfileSpotlight: React.FC<ProfileSpotlightProps> = ({
  currency,
  onAddToCart,
  onBuyNow,
  onInspect,
}) => {
  const [activeInspectTab, setActiveInspectTab] = useState<'skins' | 'rank' | 'card'>('skins');

  const spotlightProfile = {
    id: 'spotlight-reyna',
    title: 'Radiant Tier Kuronami & Champions Collection',
    rank: 'Immortal 3 Peak',
    level: 285,
    priceINR: 18999,
    originalPriceINR: 25999,
    skins: [
      'Kuronami Vandal (Max Lvl)',
      'Champions 2023 Blade',
      'Prime 2.0 Phantom',
      'Reaver Operator',
      'Araxys Vandal',
      'Magepunk Ghost',
    ],
    rankHistory: [
      { act: 'EP 8 ACT 3', rank: 'Immortal 3 (312 RR)' },
      { act: 'EP 8 ACT 2', rank: 'Immortal 2 (185 RR)' },
      { act: 'EP 8 ACT 1', rank: 'Ascendant 3 (92 RR)' },
    ],
  };

  const handleAdd = () => {
    onAddToCart({
      id: spotlightProfile.id,
      title: spotlightProfile.title,
      subtitle: `${spotlightProfile.rank} • Level ${spotlightProfile.level}`,
      priceINR: spotlightProfile.priceINR,
      type: 'profile',
      image: '/assets/agents/reyna.png',
      quantity: 1,
    });
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-r from-[#170e28] via-[#0d1222] to-[#120f24] border border-fuchsia-500/40 relative overflow-hidden shadow-2xl cyber-cut">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left: Agent Artwork Spotlight */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-fuchsia-600/30 via-purple-600/20 to-pink-500/20 blur-2xl animate-pulse" />
              
              <img
                src="/assets/agents/reyna.png"
                alt="Spotlight Profile Reyna"
                className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_0_25px_rgba(192,38,211,0.6)]"
              />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] font-chakra font-bold px-3 py-1 rounded-full bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/40">
                PREMIUM SPOTLIGHT
              </span>
              <span className="text-[10px] font-chakra font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                VIB VERIFIED
              </span>
            </div>
          </div>

          {/* Right: Inspection Tabs & Spec Sheet */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono tracking-widest text-fuchsia-400 uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Top Pick of the Week</span>
              </div>
              <h3 className="font-chakra font-black text-2xl sm:text-3xl text-white uppercase">
                {spotlightProfile.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-gray-400 font-rajdhani mt-1">
                <span className="text-fuchsia-300 font-bold">{spotlightProfile.rank}</span>
                <span>•</span>
                <span>Level {spotlightProfile.level}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">Ready for Transfer</span>
              </div>
            </div>

            {/* Inspection Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <button
                type="button"
                onClick={() => setActiveInspectTab('skins')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-chakra font-bold transition-all cursor-pointer ${
                  activeInspectTab === 'skins'
                    ? 'bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Skins Collection
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectTab('rank')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-chakra font-bold transition-all cursor-pointer ${
                  activeInspectTab === 'rank'
                    ? 'bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Rank History
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectTab('card')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-chakra font-bold transition-all cursor-pointer ${
                  activeInspectTab === 'card'
                    ? 'bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Player Card & Badges
              </button>
            </div>

            {/* Tab Body */}
            <div className="min-h-[110px]">
              {activeInspectTab === 'skins' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {spotlightProfile.skins.map((s, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-[#10162a] border border-white/5 text-xs text-gray-200 flex items-center gap-1.5"
                    >
                      <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span className="truncate">{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeInspectTab === 'rank' && (
                <div className="space-y-2">
                  {spotlightProfile.rankHistory.map((rh, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-[#10162a] border border-white/5 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono text-gray-400">{rh.act}</span>
                      <span className="font-chakra font-bold text-fuchsia-300">{rh.rank}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeInspectTab === 'card' && (
                <div className="p-3 rounded-lg bg-[#10162a] border border-white/5 text-xs text-gray-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Creation Region:</span>
                    <span className="text-white font-mono">India / Mumbai Server</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Battle Passes:</span>
                    <span className="text-white font-mono">5 Maxed Battle Passes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Radianite Balance:</span>
                    <span className="text-emerald-400 font-mono">160 RP</span>
                  </div>
                </div>
              )}
            </div>

            {/* Warranty Callout */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Full credentials provided upon purchase. Covered by VIB Refund & Replacement Guarantee.</span>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs text-gray-500 line-through font-mono">
                  {formatCurrencyPrice(spotlightProfile.originalPriceINR, currency)}
                </div>
                <div className="font-chakra font-black text-2xl text-fuchsia-400 drop-shadow-[0_0_10px_rgba(192,38,211,0.5)]">
                  {formatCurrencyPrice(spotlightProfile.priceINR, currency)}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onInspect(spotlightProfile.id)}
                  className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-chakra font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Details</span>
                </button>

                <button
                  type="button"
                  onClick={handleAdd}
                  className="px-4 py-2.5 rounded-xl border border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-600/20 font-chakra font-bold text-xs uppercase cursor-pointer"
                >
                  Add to Cart
                </button>

                <button
                  type="button"
                  onClick={() => onBuyNow(spotlightProfile.title, spotlightProfile.priceINR)}
                  className="px-6 py-2.5 rounded-xl font-chakra font-bold text-xs uppercase tracking-wider text-white transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #c026d3 0%, #9333ea 100%)',
                  }}
                >
                  Buy Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};