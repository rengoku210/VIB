import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Clock,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  User,
  Users,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Currency } from '../../types';
import { VALORANT_RANKS } from '../../data/rank-pricing';
import { formatCurrencyPrice } from '../../utils/format';

export interface RankProgressionCalculatorProps {
  currency: Currency;
  journeyType?: 'rankup' | 'derank';
  onJourneyTypeChange?: (journeyType: 'rankup' | 'derank') => void;
  onBook: (
    quote: {
      fromRankId: string;
      toRankId: string;
      mode: 'solo' | 'duo';
      queueType: 'standard' | 'priority';
      serviceType: 'rankup' | 'derank';
    },
    title: string,
    priceINR: number
  ) => void;
}

export const RankProgressionCalculator: React.FC<RankProgressionCalculatorProps> = ({
  currency,
  journeyType = 'rankup',
  onJourneyTypeChange,
  onBook,
}) => {
  const [currentJourney, setCurrentJourney] = useState<'rankup' | 'derank'>(journeyType);
  const [mode, setMode] = useState<'solo' | 'duo'>('solo');
  const [queueType, setQueueType] = useState<'standard' | 'priority'>('standard');

  // Rankup defaults: Silver 1 (6) -> Platinum 1 (12)
  // Derank defaults: Gold 1 (9) -> Bronze 3 (5)
  const [fromRankIndex, setFromRankIndex] = useState<number>(
    journeyType === 'derank' ? 9 : 6
  );
  const [toRankIndex, setToRankIndex] = useState<number>(
    journeyType === 'derank' ? 5 : 12
  );

  // Sync prop changes
  useEffect(() => {
    if (journeyType && journeyType !== currentJourney) {
      handleJourneySwitch(journeyType as 'rankup' | 'derank');
    }
  }, [journeyType]);

  const handleJourneySwitch = (newType: 'rankup' | 'derank') => {
    setCurrentJourney(newType);
    if (onJourneyTypeChange) {
      onJourneyTypeChange(newType);
    }

    if (newType === 'derank') {
      // Switch to derank mode: ensure fromRank has valid lower targets
      const initialFrom = fromRankIndex === 0 ? 8 : fromRankIndex;
      setFromRankIndex(initialFrom);
      setToRankIndex(Math.max(0, initialFrom - 2));
    } else {
      // Switch to rankup mode: ensure toRank > fromRank
      const initialFrom = fromRankIndex >= VALORANT_RANKS.length - 1 ? 18 : fromRankIndex;
      setFromRankIndex(initialFrom);
      setToRankIndex(Math.min(initialFrom + 3, VALORANT_RANKS.length - 1));
    }
  };

  const handleFromChange = (newFrom: number) => {
    setFromRankIndex(newFrom);

    if (currentJourney === 'rankup') {
      if (newFrom >= toRankIndex) {
        setToRankIndex(Math.min(newFrom + 1, VALORANT_RANKS.length - 1));
      }
    } else {
      // In Derank mode: target MUST be strictly lower than newFrom
      if (newFrom === 0) {
        // At Iron 1, no target available
        setToRankIndex(0);
      } else if (toRankIndex >= newFrom) {
        setToRankIndex(newFrom - 1);
      }
    }
  };

  const isDerank = currentJourney === 'derank';
  const isIron1 = isDerank && fromRankIndex === 0;

  // Calculate pricing & delivery time
  let finalPriceINR = 0;
  let activeHours = 0;
  let tiersCount = 0;
  let hasHighTier = false;
  let minRefundPct = 100;

  if (isDerank) {
    if (isIron1) {
      tiersCount = 0;
      finalPriceINR = 0;
      activeHours = 0;
    } else {
      tiersCount = Math.max(0, fromRankIndex - toRankIndex);

      let derankBaseINR = 0;
      for (let i = toRankIndex; i < fromRankIndex; i++) {
        const tier = VALORANT_RANKS[i];
        if (tier.tierIndex <= 5) derankBaseINR += 150; // Iron to Bronze
        else if (tier.tierIndex <= 11) derankBaseINR += 180; // Silver to Gold
        else if (tier.tierIndex <= 17) derankBaseINR += 240; // Plat to Diamond
        else derankBaseINR += 350; // Ascendant, Immortal, Radiant
      }

      derankBaseINR = Math.max(299, derankBaseINR);
      const modeMultiplier = mode === 'duo' ? 1.8 : 1;
      const queueMultiplier = queueType === 'priority' ? 1.25 : 1;
      finalPriceINR = Math.round(derankBaseINR * modeMultiplier * queueMultiplier);

      activeHours = queueType === 'priority'
        ? Math.max(4, tiersCount * 4)
        : Math.max(8, tiersCount * 8);

      if (fromRankIndex >= 18) {
        hasHighTier = true;
      }
    }
  } else {
    // Rankup mode
    tiersCount = Math.max(0, toRankIndex - fromRankIndex);
    let basePriceINR = 0;
    let totalStdHours = 0;
    let totalPriorityHours = 0;

    for (let i = fromRankIndex; i < toRankIndex; i++) {
      const tier = VALORANT_RANKS[i];
      basePriceINR += tier.costToNext;
      totalStdHours += tier.stdDeliveryHours;
      totalPriorityHours += tier.priorityDeliveryHours;

      if (tier.tierIndex >= 20) {
        hasHighTier = true;
        if (tier.tierIndex === 20) minRefundPct = Math.min(minRefundPct, 80);
        else if (tier.tierIndex === 21) minRefundPct = Math.min(minRefundPct, 75);
        else if (tier.tierIndex === 22) minRefundPct = Math.min(minRefundPct, 60);
        else if (tier.tierIndex === 23) minRefundPct = Math.min(minRefundPct, 50);
      }
    }

    const modeMultiplier = mode === 'duo' ? 2 : 1;
    const queueMultiplier = queueType === 'priority' ? 1.25 : 1;
    finalPriceINR = Math.round(basePriceINR * modeMultiplier * queueMultiplier);
    activeHours = queueType === 'priority' ? totalPriorityHours : totalStdHours;
  }

  // Delivery time formatting
  const deliveryDays = Math.ceil(activeHours / 24);
  const deliveryEstimate = activeHours <= 0
    ? 'N/A'
    : activeHours < 24
    ? `~${activeHours} Hours`
    : deliveryDays === 1
    ? '~1 Day'
    : `~${deliveryDays} Days`;

  const fromRank = VALORANT_RANKS[fromRankIndex] || VALORANT_RANKS[0];
  const toRank = VALORANT_RANKS[toRankIndex] || VALORANT_RANKS[0];

  // Options for FROM selector
  const fromOptions = isDerank
    ? VALORANT_RANKS // All ranks including Radiant
    : VALORANT_RANKS.slice(0, -1); // Up to Immortal 3 (cannot rankup above Radiant)

  // Options for TO selector
  const toOptions = isDerank
    ? VALORANT_RANKS.filter((r) => r.tierIndex < fromRankIndex).reverse() // Strictly lower ranks
    : VALORANT_RANKS.filter((r) => r.tierIndex > fromRankIndex); // Strictly higher ranks

  return (
    <div
      id="rank-calculator"
      className={`w-full rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden transition-all duration-500 border ${
        isDerank
          ? 'bg-gradient-to-b from-[#16080e] via-[#0d0711] to-[#07050b] border-rose-500/40'
          : 'bg-[#0c0d18] border-white/10'
      }`}
    >
      {/* Background Cyber Glow */}
      <div
        className={`absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[100px] pointer-events-none transition-colors ${
          isDerank ? 'bg-rose-600/15' : 'bg-purple-600/15'
        }`}
      />
      <div
        className={`absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-[100px] pointer-events-none transition-colors ${
          isDerank ? 'bg-red-600/10' : 'bg-blue-600/10'
        }`}
      />

      {/* Mode Switcher Banner (Rank Up vs D-Rank) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-2">
          {/* Journey Mode Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <button
              type="button"
              onClick={() => handleJourneySwitch('rankup')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer ${
                !isDerank
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Rank Up Services</span>
            </button>
            <button
              type="button"
              onClick={() => handleJourneySwitch('derank')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer ${
                isDerank
                  ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>D-Rank Services</span>
            </button>
          </div>

          <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight font-rajdhani uppercase">
            {isDerank ? (
              <>
                Competitive D-Rank &amp; <span className="text-rose-400">MMR Reset Assistance</span>
              </>
            ) : (
              <>
                Competitive Rank Progression <span className="text-purple-400">Assistance</span>
              </>
            )}
          </h3>

          <p className="text-gray-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
            {isDerank
              ? 'Discreet, 100% manual gameplay to safely lower your MMR or rank for casual games with friends or smurf lobbies. Zero AFK warnings, zero behavioral bans, completely transparent.'
              : 'Tier-based mathematical pricing according to official VIB service guidelines. Guaranteed rank advancement with discreet execution and transparent refund policies.'}
          </p>
        </div>

        {/* Solo vs Duo Mode Selector */}
        <div className="flex bg-[#131422] p-1.5 rounded-2xl border border-white/10 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setMode('solo')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              mode === 'solo'
                ? isDerank
                  ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                  : 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{isDerank ? 'Solo Derank' : 'Solo Progression'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('duo')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              mode === 'duo'
                ? isDerank
                  ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                  : 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isDerank ? 'Duo Derank (1.8×)' : 'Duo with Coach (2×)'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 pt-6 sm:pt-8 items-start">
        {/* Left 7 Columns: Rank Pickers & Queue Mode */}
        <div className="xl:col-span-7 w-full space-y-6 min-w-0">
          {/* Iron 1 Notice for D-Rank */}
          {isIron1 && (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-amber-200">
                  Iron 1 is Minimum Competitive Rank
                </div>
                <p className="text-xs text-amber-300/90 leading-relaxed">
                  You are already at Iron 1 (the lowest possible rank in Valorant). You cannot D-Rank any further. If you want to climb, please switch to <strong>Rank Up Services</strong> above.
                </p>
              </div>
            </div>
          )}

          {/* Dual Rank Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FROM RANK */}
            <div
              className={`border rounded-2xl p-4 sm:p-5 relative group transition-colors ${
                isDerank
                  ? 'bg-[#180d14] border-rose-500/20 hover:border-rose-500/50'
                  : 'bg-[#111220] border-white/10 hover:border-purple-500/40'
              }`}
            >
              <label className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2 block">
                Current Starting Rank
              </label>

              <div className="flex items-center gap-3 mb-3">
                <img
                  src={fromRank.icon}
                  alt={fromRank.name}
                  className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/9/largeicon.png';
                  }}
                />
                <div>
                  <div className="text-lg font-bold text-white font-rajdhani">{fromRank.name}</div>
                  <div
                    className={`text-xs font-mono ${
                      isDerank ? 'text-rose-400' : 'text-purple-400'
                    }`}
                  >
                    Tier {fromRank.tierIndex + 1} of 25
                  </div>
                </div>
              </div>

              <select
                value={fromRankIndex}
                onChange={(e) => handleFromChange(Number(e.target.value))}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none ${
                  isDerank
                    ? 'bg-[#201019] border-rose-500/30 focus:border-rose-400'
                    : 'bg-[#18192c] border-white/10 focus:border-purple-500'
                }`}
              >
                {fromOptions.map((rank) => (
                  <option key={rank.id} value={rank.tierIndex} className="bg-[#111220]">
                    {rank.name} ({rank.group})
                  </option>
                ))}
              </select>
            </div>

            {/* TO RANK */}
            <div
              className={`border rounded-2xl p-4 sm:p-5 relative group transition-colors ${
                isDerank
                  ? 'bg-[#180d14] border-rose-500/20 hover:border-rose-500/50'
                  : 'bg-[#111220] border-white/10 hover:border-purple-500/40'
              }`}
            >
              <label className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2 block">
                {isDerank ? 'Target Derank Goal' : 'Target Desired Rank'}
              </label>

              <div className="flex items-center gap-3 mb-3">
                <img
                  src={toRank.icon}
                  alt={toRank.name}
                  className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/15/largeicon.png';
                  }}
                />
                <div>
                  <div className="text-lg font-bold text-white font-rajdhani">{toRank.name}</div>
                  <div
                    className={`text-xs font-mono ${
                      isDerank
                        ? isIron1
                          ? 'text-amber-400'
                          : 'text-rose-400'
                        : 'text-green-400'
                    }`}
                  >
                    {isDerank
                      ? isIron1
                        ? 'No Lower Tier Available'
                        : `-${tiersCount} Tier${tiersCount > 1 ? 's' : ''} Lower`
                      : `+${tiersCount} Tier${tiersCount > 1 ? 's' : ''} Climb`}
                  </div>
                </div>
              </div>

              <select
                value={toRankIndex}
                disabled={isIron1 || toOptions.length === 0}
                onChange={(e) => setToRankIndex(Number(e.target.value))}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDerank
                    ? 'bg-[#201019] border-rose-500/30 focus:border-rose-400'
                    : 'bg-[#18192c] border-white/10 focus:border-purple-500'
                }`}
              >
                {isIron1 || toOptions.length === 0 ? (
                  <option value={0} className="bg-[#111220]">
                    Cannot D-Rank below Iron 1
                  </option>
                ) : (
                  toOptions.map((rank) => (
                    <option key={rank.id} value={rank.tierIndex} className="bg-[#111220]">
                      {rank.name} ({rank.group})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Queue Speed Toggle */}
          <div
            className={`border rounded-2xl p-4 sm:p-5 ${
              isDerank ? 'bg-[#180d14] border-rose-500/20' : 'bg-[#111220] border-white/10'
            }`}
          >
            <label className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-3 block">
              Execution Speed &amp; Priority Queue
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setQueueType('standard')}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  queueType === 'standard'
                    ? isDerank
                      ? 'bg-rose-950/40 border-rose-500 text-white'
                      : 'bg-purple-900/20 border-purple-500 text-white'
                    : 'bg-[#18192c] border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-sm">Standard Queue</span>
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                <span className="text-xs text-gray-400">Regular assignment within 1-2 hours</span>
              </button>

              <button
                type="button"
                onClick={() => setQueueType('priority')}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  queueType === 'priority'
                    ? isDerank
                      ? 'bg-rose-950/40 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                      : 'bg-purple-900/20 border-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]'
                    : 'bg-[#18192c] border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className={`font-bold text-sm flex items-center gap-1.5 ${
                      isDerank ? 'text-rose-300' : 'text-purple-300'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-400" /> Priority Fast-Track
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isDerank ? 'bg-rose-500/20 text-rose-300' : 'bg-purple-500/20 text-purple-300'
                    }`}
                  >
                    +25%
                  </span>
                </div>
                <span className="text-xs text-gray-400">Immediate start with dedicated specialist</span>
              </button>
            </div>
          </div>

          {/* Transparent Guarantees Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span>{isDerank ? 'No AFK/Behavioral Flags' : 'Zero third-party tools'}</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300">
              <ShieldCheck
                className={`w-4 h-4 flex-shrink-0 ${isDerank ? 'text-rose-400' : 'text-purple-400'}`}
              />
              <span>{isDerank ? 'Discreet VPN Encryption' : `${minRefundPct}% Refund Guarantee`}</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300">
              <Users className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>Offline Mode &amp; Chat Hidden</span>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Summary & Booking CTA */}
        <div
          className={`xl:col-span-5 w-full border rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xl min-w-0 ${
            isDerank
              ? 'bg-gradient-to-b from-[#240c17] to-[#12070e] border-rose-500/40'
              : 'bg-gradient-to-b from-[#16172e] to-[#0f101d] border-purple-500/30'
          }`}
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-white/10 mb-4">
              <span
                className={`text-xs font-mono uppercase tracking-wider font-bold whitespace-nowrap ${
                  isDerank ? 'text-rose-400' : 'text-purple-400'
                }`}
              >
                {isDerank ? 'D-Rank Order Summary' : 'Rankup Order Summary'}
              </span>
              <span className="text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
                Queue-Based Scheduling
              </span>
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex items-center justify-between gap-3 text-xs sm:text-sm py-2 border-b border-white/[0.06]">
                <span className="text-gray-400 whitespace-nowrap shrink-0">
                  {isDerank ? 'Derank Target:' : 'Climb Journey:'}
                </span>
                <span className="text-white font-semibold flex items-center gap-1.5 font-rajdhani text-right shrink-0">
                  <span className="whitespace-nowrap">{fromRank.name}</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 ${isDerank ? 'text-rose-400' : 'text-purple-400'}`}
                  />
                  <span className={`whitespace-nowrap ${isIron1 ? 'text-gray-400' : ''}`}>
                    {isIron1 ? 'N/A' : toRank.name}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs sm:text-sm py-2 border-b border-white/[0.06]">
                <span className="text-gray-400 whitespace-nowrap shrink-0">
                  {isDerank ? 'Tiers to Drop:' : 'Tiers to Advance:'}
                </span>
                <span
                  className={`font-mono font-bold text-right whitespace-nowrap ${
                    isDerank ? 'text-rose-300' : 'text-purple-300'
                  }`}
                >
                  {isIron1
                    ? '0 Tiers'
                    : isDerank
                    ? `-${tiersCount} Tier${tiersCount > 1 ? 's' : ''}`
                    : `+${tiersCount} Tier${tiersCount > 1 ? 's' : ''}`}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs sm:text-sm py-2 border-b border-white/[0.06]">
                <span className="text-gray-400 whitespace-nowrap shrink-0">Execution Mode:</span>
                <span className="text-white font-medium text-right whitespace-nowrap">
                  {mode === 'solo'
                    ? isDerank
                    ? 'Solo Derank'
                    : 'Solo (Executive Play)'
                    : isDerank
                    ? 'Duo Derank'
                    : 'Duo with Coach'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs sm:text-sm py-2 border-b border-white/[0.06]">
                <span className="text-gray-400 whitespace-nowrap shrink-0">Estimated Turnaround:</span>
                <span className="text-yellow-400 font-semibold flex items-center gap-1 text-right whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{deliveryEstimate}</span>
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs sm:text-sm py-2">
                <span className="text-gray-400 whitespace-nowrap shrink-0">Account Safety:</span>
                <span className="text-emerald-400 font-mono font-semibold text-right whitespace-nowrap">
                  100% Guaranteed
                </span>
              </div>
            </div>

            {/* Total Price Display */}
            <div
              className={`p-4 rounded-xl border mb-5 ${
                isDerank
                  ? 'bg-rose-950/40 border-rose-500/40'
                  : 'bg-purple-950/40 border-purple-500/40'
              }`}
            >
              <div
                className={`text-[11px] font-mono uppercase tracking-wider mb-1 ${
                  isDerank ? 'text-rose-300' : 'text-purple-300'
                }`}
              >
                Estimated Service Fee
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white flex items-baseline gap-2 font-rajdhani">
                <span>{isIron1 ? '—' : formatCurrencyPrice(finalPriceINR, currency)}</span>
                {!isIron1 && <span className="text-xs text-gray-400 font-normal">incl. all taxes</span>}
              </div>
              {hasHighTier && (
                <p className="text-[11px] text-yellow-300/90 mt-2 flex items-start gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>
                    {isDerank
                      ? 'High MMR account. Handled with extra caution to protect hidden MMR integrity.'
                      : 'High tier order (Ascendant/Immortal). Quoted based on lobby conditions & server.'}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={isIron1}
              onClick={() => {
                if (isIron1) return;
                const title = isDerank
                  ? `D-Rank: ${fromRank.name} to ${toRank.name}`
                  : `Rankup: ${fromRank.name} to ${toRank.name}`;
                onBook(
                  {
                    fromRankId: fromRank.id,
                    toRankId: toRank.id,
                    mode,
                    queueType,
                    serviceType: currentJourney,
                  },
                  title,
                  finalPriceINR
                );
              }}
              className={`w-full min-h-[48px] py-3.5 font-bold font-rajdhani text-sm sm:text-base uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all ${
                isIron1
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                  : isDerank
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-[1.01] cursor-pointer'
                  : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:scale-[1.01] cursor-pointer'
              }`}
            >
              {isIron1 ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>Cannot Derank Below Iron 1</span>
                </>
              ) : (
                <>
                  <span>{isDerank ? 'Continue to D-Rank' : 'Continue to Checkout'}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
              <span>
                Support: <strong className="text-gray-300">teamvibofficial@gmail.com</strong>
              </span>
              <span>•</span>
              <span>24/7 Operations Desk</span>
            </div>
          </div>
        </div>
      </div>

      {/* Official VIB Guarantee Notice */}
      <div
        className={`mt-8 pt-6 border-t text-xs text-gray-400 leading-relaxed p-4 rounded-xl border ${
          isDerank
            ? 'bg-[#180911] border-rose-500/20'
            : 'bg-[#0e0f1d] border-white/5'
        }`}
      >
        <strong
          className={`font-semibold ${isDerank ? 'text-rose-300' : 'text-purple-300'}`}
        >
          {isDerank ? 'Official VIB D-Rank Guarantee:' : 'Official VIB Service Guarantee:'}
        </strong>{' '}
        {isDerank
          ? 'All derank sessions are executed manually with 100% active round participation. We strictly do NOT use AFK scripts, suicide bots, or abusive chat that could compromise your account safety. Your MMR is steadily lowered in complete privacy.'
          : 'All rank progression orders are conducted manually with honest hard work by verified Radiant/Immortal players. We strictly maintain zero third-party application usage or scripts. Customers receive direct progress updates and full refund protection up to Ascendant 2 if requirements are unfulfilled.'}
      </div>
    </div>
  );
};
