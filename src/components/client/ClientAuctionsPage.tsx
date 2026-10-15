import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Clock,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Flame,
  Layers,
  Award,
  AlertCircle,
} from 'lucide-react';
import { Currency } from '../../types';
import { ClientPage } from './Header';

interface ClientAuctionsPageProps {
  currency: Currency;
  onNavigate: (page: ClientPage) => void;
  onOpenCheckout: (title: string, priceINR: number) => void;
}

export const ClientAuctionsPage: React.FC<ClientAuctionsPageProps> = ({
  currency,
  onNavigate,
  onOpenCheckout,
}) => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 14,
    seconds: 36,
  });

  const [currentBid, setCurrentBid] = useState(4850);
  const [bidCount, setBidCount] = useState(18);
  const [userBidInput, setUserBidInput] = useState('5000');
  const [bidSuccessMessage, setBidSuccessMessage] = useState<string | null>(null);
  const [bidErrorMessage, setBidErrorMessage] = useState<string | null>(null);

  // Live ticking countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 2, minutes: 30, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handlePlaceBid = (e: React.FormEvent) => {
    e.preventDefault();
    setBidErrorMessage(null);
    const bidVal = parseInt(userBidInput, 10);
    if (isNaN(bidVal) || bidVal <= currentBid) {
      setBidErrorMessage(`Bid must be greater than current bid of ₹${currentBid.toLocaleString()}`);
      return;
    }
    setCurrentBid(bidVal);
    setBidCount((c) => c + 1);
    setUserBidInput(String(bidVal + 250));
    setBidSuccessMessage(`Bid of ₹${bidVal.toLocaleString()} placed successfully! You are currently the highest bidder.`);
    setTimeout(() => setBidSuccessMessage(null), 5000);
  };

  const flashAuctions = [
    {
      id: 'fa-1',
      title: 'Reaver 2.0 Karambit Bundle',
      desc: 'Reaver 2.0 Karambit (Max Level) + Reaver Vandal + 800 VP',
      currentBid: 2900,
      timeLeft: '00:45:12',
      bids: 14,
      image: '/assets/items/vandal-reaper.png',
    },
    {
      id: 'fa-2',
      title: 'Prime Vandal + Singularity Phantom',
      desc: 'Prime 1.0 Vandal + Singularity Phantom (All Variants)',
      currentBid: 3400,
      timeLeft: '01:12:05',
      bids: 22,
      image: '/assets/items/phantom-rgx.png',
    },
    {
      id: 'fa-3',
      title: 'Nocturnum Scythe Rare Drop',
      desc: 'Full Nocturnum Set with Scythe, Dagger & Gunbuddies',
      currentBid: 1800,
      timeLeft: '03:30:00',
      bids: 9,
      image: '/assets/items/vandal-rgx.png',
    },
    {
      id: 'fa-4',
      title: 'VCT Champions 2024 Kunai Set',
      desc: 'Exclusive Limited Edition Champions 2024 Kunai + Title',
      currentBid: 4200,
      timeLeft: '04:15:30',
      bids: 31,
      image: '/assets/items/vandal-prime.png',
    },
  ];

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white space-y-12 pb-20 font-sans">
      {/* 1. HERO HEADER */}
      <section className="relative w-full min-h-[240px] sm:min-h-[300px] flex items-center pt-8 pb-6 border-b border-white/5">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[300px] bg-fuchsia-600/15 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <button onClick={() => onNavigate('home')} className="hover:text-purple-300 transition-colors cursor-pointer">
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-fuchsia-400 font-semibold">Live Auctions</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>LIVE HIGH-ROLLER AUCTIONS</span>
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none font-rajdhani">
                VIB AUCTIONS: <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300">BID. WIN. OWN.</span>
              </h1>
              <p className="text-gray-300 text-xs sm:text-sm md:text-base leading-relaxed">
                Place competitive bids on rare, vaulted, and high-tier Valorant profile collections. 100% transparent bidding with instant transfer upon timer expiry.
              </p>
            </div>

            {/* REAL-TIME COUNTDOWN TIMER CARD */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#090615] border border-fuchsia-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-3.5 shadow-xl w-full md:w-auto">
              <div className="text-left sm:text-right">
                <div className="text-[9px] font-mono text-fuchsia-300 uppercase font-bold tracking-wider">PRIMARY LOT CLOSES IN</div>
                <div className="text-xs text-gray-400 font-mono">Live Clock Sync</div>
              </div>
              <div className="flex items-center gap-1.5 font-mono font-black text-xl sm:text-2xl">
                <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-fuchsia-950/80 border border-fuchsia-500/50 text-fuchsia-200">
                  {String(timeLeft.hours).padStart(2, '0')}
                  <span className="block text-[8px] text-fuchsia-400 text-center font-normal">HRS</span>
                </div>
                <span className="text-fuchsia-400">:</span>
                <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-fuchsia-950/80 border border-fuchsia-500/50 text-fuchsia-200">
                  {String(timeLeft.minutes).padStart(2, '0')}
                  <span className="block text-[8px] text-fuchsia-400 text-center font-normal">MIN</span>
                </div>
                <span className="text-fuchsia-400">:</span>
                <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 animate-pulse">
                  {String(timeLeft.seconds).padStart(2, '0')}
                  <span className="block text-[8px] text-rose-400 text-center font-normal">SEC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PRIMARY LIVE SHOWCASE LOT */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#130928] via-[#1c0d38] to-[#0e071e] border border-fuchsia-500/40 space-y-6 shadow-2xl relative overflow-hidden">
          {/* Full-bleed Reference Part 22 background with gradient overlays */}
          <img
            src="/assets/reference_parts/part_22.png"
            alt="Live Auction Auditorium Stage"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0717] via-[#0a0717]/85 to-[#0a0717]/15 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0717] via-transparent to-transparent z-[1]" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Glass Showcase Item */}
            <div className="lg:col-span-6 p-6 rounded-2xl bg-gradient-to-b from-[#1c103b]/90 to-[#0d081e]/90 backdrop-blur-md border border-fuchsia-500/40 space-y-4 shadow-xl group relative overflow-hidden">
              {/* Full-bleed Reference Part 20 weapon showcase backdrop */}
              <img
                src="/assets/reference_parts/part_20.png"
                alt="Floating Weapon Showcase"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d081e] via-[#0d081e]/50 to-transparent z-[1]" />

              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-fuchsia-900/80 text-fuchsia-200 border border-fuchsia-500/40 uppercase">
                  LOT #0881 • VAULTED COLLECTION
                </span>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Clean Account</span>
                </div>
              </div>

              <div className="py-8 flex items-center justify-center relative z-10">
                <div className="absolute inset-0 bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none" />
                <img
                  src="/assets/items/vandal-prime.png"
                  alt="Kuronami Vandal Showcase"
                  className="w-[88%] max-h-[220px] object-contain filter drop-shadow-[0_0_30px_rgba(217,70,239,0.7)] group-hover:scale-105 transition-transform duration-300 relative z-10"
                />
              </div>

              <div className="space-y-1 pt-2 border-t border-white/10">
                <h2 className="text-2xl font-black text-white font-rajdhani uppercase tracking-wide">
                  KURONAMI VANDAL + CHAMPIONS 2024 COMBO
                </h2>
                <p className="text-xs text-gray-300">
                  Includes Kuronami Vandal (Max Level + All Variants), Champions 2024 Vandal &amp; Blade, Reaver 2.0 Karambit, 1,200 VP Balance. Original Owner with First-Email.
                </p>
              </div>
            </div>

            {/* Bidding Controls & Form */}
            <div className="lg:col-span-6 p-6 sm:p-7 rounded-2xl bg-[#090616] border border-white/10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#120c2b] border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-gray-400 uppercase">CURRENT HIGHEST BID</div>
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-amber-300 font-rajdhani">
                    ₹{currentBid.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400">{bidCount} total bids placed</div>
                </div>

                <div className="p-4 rounded-xl bg-[#120c2b] border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-gray-400 uppercase">MINIMUM NEXT BID</div>
                  <div className="text-3xl font-black text-white font-rajdhani">
                    ₹{(currentBid + 150).toLocaleString()}
                  </div>
                  <div className="text-[11px] font-mono text-fuchsia-300">+₹150 minimum increment</div>
                </div>
              </div>

              {bidSuccessMessage && (
                <div role="status" className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{bidSuccessMessage}</span>
                </div>
              )}

              {bidErrorMessage && (
                <div id="bid-error" role="alert" className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{bidErrorMessage}</span>
                </div>
              )}

              <form onSubmit={handlePlaceBid} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="bid-amount-input" className="text-xs font-mono text-gray-300 font-bold uppercase cursor-pointer">
                    Enter Your Maximum Bid (INR)
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold">
                        ₹
                      </span>
                      <input
                        id="bid-amount-input"
                        type="number"
                        value={userBidInput}
                        onChange={(e) => {
                          setUserBidInput(e.target.value);
                          if (bidErrorMessage) setBidErrorMessage(null);
                        }}
                        min={currentBid + 1}
                        aria-describedby={bidErrorMessage ? "bid-error" : undefined}
                        className="w-full pl-8 pr-4 py-3 sm:py-3.5 rounded-xl bg-[#150f2e] border border-white/15 focus:border-fuchsia-500 focus:outline-none text-white font-mono font-bold text-base"
                        placeholder="Enter amount"
                      />
                    </div>
                    <button
                      type="submit"
                      className="min-h-[44px] px-8 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-xs sm:text-sm font-black font-rajdhani uppercase tracking-wider text-white shadow-lg shadow-fuchsia-600/40 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                    >
                      PLACE BID
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 border-t border-white/5 pt-3">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>Guaranteed Escrow Protection</span>
                  </div>
                  <span>Instant SMS/WhatsApp Notification</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FLASH AUCTIONS GRID */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono tracking-[0.2em] text-[#e879f9] uppercase font-bold">
              EXCLUSIVE FLASH LOTS
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-rajdhani tracking-wide uppercase">
              ACTIVE AUCTIONS
            </h2>
          </div>
          <span className="text-xs text-gray-400 font-mono">4 items in auction</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {flashAuctions.map((lot) => (
            <div
              key={lot.id}
              className="p-4 rounded-xl bg-[#0a0717] border border-white/10 hover:border-fuchsia-500/40 transition-all space-y-3 flex flex-col justify-between group shadow-md"
            >
              <div className="space-y-2.5">
                <div className="relative aspect-[16/9] w-full rounded-lg bg-[#140c26] p-2 flex items-center justify-center overflow-hidden border border-white/5">
                  <span className="absolute top-1.5 left-1.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/30 uppercase">
                    {lot.timeLeft} left
                  </span>
                  <img
                    src={lot.image}
                    alt={lot.title}
                    className="w-[80%] h-auto object-contain group-hover:scale-105 transition-transform drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]"
                  />
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-white font-rajdhani">{lot.title}</h3>
                  <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">{lot.desc}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-mono text-gray-500">CURRENT BID</div>
                  <div className="font-black text-base text-white font-rajdhani">₹{lot.currentBid.toLocaleString()}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenCheckout(`Place Bid on ${lot.title}`, lot.currentBid + 150)}
                  className="min-h-[38px] px-4 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 text-xs font-bold font-rajdhani uppercase text-white shadow-md cursor-pointer hover:brightness-110 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                >
                  Bid Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. HOW AUCTIONS WORK */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-white font-rajdhani uppercase">HOW VIB AUCTIONS WORK</h2>
          <p className="text-xs text-gray-400">Simple, transparent, and safeguarded by our verified escrow team.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-[#0b0818] border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center font-rajdhani">01</div>
            <h3 className="font-bold text-sm text-white font-rajdhani">Browse &amp; Bid</h3>
            <p className="text-xs text-gray-400">Select any active lot and enter your maximum bid amount.</p>
          </div>
          <div className="p-5 rounded-xl bg-[#0b0818] border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center font-rajdhani">02</div>
            <h3 className="font-bold text-sm text-white font-rajdhani">Live Outbid Alerts</h3>
            <p className="text-xs text-gray-400">Receive instant updates via WhatsApp if someone outbids you.</p>
          </div>
          <div className="p-5 rounded-xl bg-[#0b0818] border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center font-rajdhani">03</div>
            <h3 className="font-bold text-sm text-white font-rajdhani">Timer Expiry</h3>
            <p className="text-xs text-gray-400">When the timer hits 00:00:00, the highest bidder wins the lot.</p>
          </div>
          <div className="p-5 rounded-xl bg-[#0b0818] border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center font-rajdhani">04</div>
            <h3 className="font-bold text-sm text-white font-rajdhani">Escrow Handover</h3>
            <p className="text-xs text-gray-400">Credentials transferred within 10 minutes with lifetime warranty.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
