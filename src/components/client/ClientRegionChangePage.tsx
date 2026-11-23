import React, { useState } from 'react';
import {
  Globe,
  ArrowRight,
  ShieldCheck,
  Check,
  Zap,
  TrendingDown,
  ChevronDown,
  CheckCircle2,
  Headphones,
  MessageSquare,
  Lock,
  Clock,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Coins,
} from 'lucide-react';
import { Currency } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from './Header';
import { FlagIcon } from '../common/FlagIcon';
import { soundFx } from '../../utils/audio';

interface ClientRegionChangePageProps {
  currency: Currency;
  onNavigate: (page: ClientPage, sectionId?: string) => void;
  onOpenCheckout: (title: string, priceINR: number, productId?: string) => void;
}

export const ClientRegionChangePage: React.FC<ClientRegionChangePageProps> = ({
  currency,
  onNavigate,
  onOpenCheckout,
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [annualBundles, setAnnualBundles] = useState<number>(3);

  const toggleFaq = (index: number) => {
    soundFx.playClickSound();
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleOrder = () => {
    soundFx.playClickSound();
    onOpenCheckout('Region Change: IND to PHP Migration', 1299, 'service-region-migration');
  };

  // Pricing comparison data
  const comparisonItems = [
    {
      pack: '1,000 VP',
      indPrice: 890,
      phpPrice: 520,
      savings: 370,
      percent: '41%',
    },
    {
      pack: '2,050 VP',
      indPrice: 1850,
      phpPrice: 1090,
      savings: 760,
      percent: '41%',
    },
    {
      pack: '3,650 VP',
      indPrice: 3200,
      phpPrice: 1990,
      savings: 1210,
      percent: '38%',
    },
    {
      pack: '5,350 VP',
      indPrice: 4600,
      phpPrice: 2990,
      savings: 1610,
      percent: '35%',
    },
    {
      pack: '8,700 VP (Ultra Bundle)',
      indPrice: 7200,
      phpPrice: 4300,
      savings: 2900,
      percent: '40%',
      highlight: true,
    },
    {
      pack: '11,000 VP (Vault)',
      indPrice: 8950,
      phpPrice: 7200,
      savings: 1750,
      percent: '20%',
    },
  ];

  // Estimated annual savings based on selected bundle purchases
  const bundleCostIND = 7200;
  const bundleCostPHP = 4300;
  const singleBundleSaving = bundleCostIND - bundleCostPHP; // ₹2,900
  const totalAnnualSavings = singleBundleSaving * annualBundles;

  const faqs = [
    {
      q: 'Will my in-game ping or matchmaking servers change?',
      a: 'No! Valorant allows you to choose your physical game servers directly in the lobby. You will continue playing on Mumbai (15-25ms) or Singapore servers with your friends just like before.',
    },
    {
      q: 'Will I lose my existing weapon skins, knives, or rank MMR?',
      a: 'Never. 100% of your account contents remain untouched. All purchased bundles, knives, buddies, battlepass unlocks, Radianite points, and your competitive rank remain completely intact.',
    },
    {
      q: 'How long does the conversion process take?',
      a: 'Our dedicated technicians typically process and complete the region migration within 15 to 30 minutes once your payment and account handshake are confirmed.',
    },
    {
      q: 'Is this process safe and Riot-compliant?',
      a: 'Yes. We utilize legitimate Riot regional migration procedures. We have facilitated thousands of verified conversions with zero account penalties. In the rare event that technical migration cannot be completed, VIB provides a 100% money-back guarantee.',
    },
    {
      q: 'How do I top up VP after switching to Philippines region?',
      a: 'You can instantly top up VP anytime through VIB using our Philippines VP section, which offers discounted codes and instant delivery, or through our 24/7 WhatsApp help desk.',
    },
    {
      q: 'What information do I need to provide after ordering?',
      a: 'After checkout, our secure order desk will request your Riot ID / login credentials and contact details. All credentials are handled with strict end-to-end confidentiality and never shared with third parties.',
    },
  ];

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white space-y-8 sm:space-y-12 pb-20 font-sans">
      {/* ========================================================================= */}
      {/* BREADCRUMBS                                                               */}
      {/* ========================================================================= */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-purple-400 transition-colors cursor-pointer text-gray-400"
          >
            Home
          </button>
          <span className="text-gray-600">&gt;</span>
          <button
            onClick={() => onNavigate('services')}
            className="hover:text-purple-400 transition-colors cursor-pointer text-gray-400"
          >
            Services
          </button>
          <span className="text-gray-600">&gt;</span>
          <span className="text-purple-400 font-medium">Change Region (IND → PHP)</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section className="relative w-full pt-2">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-br from-[#0e0820] via-[#150a2e] to-[#080514] border border-purple-500/35 p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-fuchsia-600/15 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-[400px] h-[300px] bg-purple-700/15 rounded-full blur-[100px] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              {/* Left Column: Headline & Info */}
              <div className="lg:col-span-7 space-y-4">
                {/* Pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-500/40 text-[11px] font-mono font-bold tracking-wider text-fuchsia-300 uppercase shadow-md">
                  <Globe className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span>OFFICIAL VIB REGIONAL ARBITRAGE SERVICE</span>
                </div>

                {/* Main Heading */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-white font-rajdhani tracking-tight leading-none">
                  CHANGE REGION <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-pink-400">
                    FROM IND TO PHP
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-sm sm:text-base text-gray-300 max-w-xl leading-relaxed">
                  Switch your Valorant account region from India (IND) to Philippines (PHP) and unlock <strong>25% to 40% cheaper VP rates</strong> on every store purchase forever without losing your Mumbai ping, weapon skins, or competitive MMR.
                </p>

                {/* 4 Trust Micro Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-gray-200">
                  <div className="px-3 py-1.5 rounded-full bg-[#160d2e]/90 border border-purple-500/30 flex items-center gap-1.5 shadow-md">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-medium">100% Safe &amp; Riot-Compliant</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-[#160d2e]/90 border border-purple-500/30 flex items-center gap-1.5 shadow-md">
                    <Check className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span className="text-[11px] font-medium">Identical Mumbai Ping (15–25ms)</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-[#160d2e]/90 border border-purple-500/30 flex items-center gap-1.5 shadow-md">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-medium">15–30 Mins Setup</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-[#160d2e]/90 border border-purple-500/30 flex items-center gap-1.5 shadow-md">
                    <Lock className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[11px] font-medium">All Skins &amp; Rank Untouched</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleOrder}
                    className="px-7 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold font-rajdhani uppercase text-sm tracking-wider transition-all cursor-pointer shadow-lg shadow-fuchsia-600/40 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                  >
                    <span>Order Region Switch ({formatCurrencyPrice(1299, currency)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <a
                    href="https://wa.me/918099641606?text=Hi%20VIB%20Team%2C%20I%20have%20questions%20about%20Change%20Region%20from%20IND%20to%20PHP"
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-3 rounded-xl bg-[#1e1338] hover:bg-[#2b1950] border border-purple-500/30 text-purple-200 hover:text-white font-bold font-rajdhani uppercase text-xs sm:text-sm tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>Ask on WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Right Column: Key Metric Card */}
              <div className="lg:col-span-5 flex flex-col justify-center">
                <div className="p-6 rounded-2xl bg-[#090514]/90 border border-fuchsia-500/40 shadow-xl space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
                      SAVINGS SUMMARY
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                      ONE-TIME SETUP
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Conversion Cost:</span>
                      <span className="font-bold text-white font-rajdhani text-sm">{formatCurrencyPrice(1299, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Savings on 1 Ultra Bundle:</span>
                      <span className="font-bold text-emerald-400 font-rajdhani text-sm">~₹2,900 Saved</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Break-Even Point:</span>
                      <span className="font-bold text-fuchsia-300 font-rajdhani text-sm">Immediate on 1st Bundle</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Duration of Savings:</span>
                      <span className="font-bold text-white font-rajdhani text-sm">Lifetime / Permanent</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 text-[11px] text-gray-400 leading-snug">
                    <p>
                      ⭐ <strong className="text-white">ROI Guarantee:</strong> A single 8,700 VP bundle purchase saves ₹2,900+, recovering your ₹1,299 fee more than 2x immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. TWIN PORTALS COMPARISON (INDIA VS PHILIPPINES)                         */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-[#e879f9] font-bold">
            <Coins className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>DIRECT REGIONAL COMPARISON</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-rajdhani">
            INDIA REGION VS. PHILIPPINES REGION
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            Compare store prices, ping latency, and real savings between standard Indian accounts and discounted Philippines accounts.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
          {/* Left Portal: INDIA REGION */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-[#0b0818] border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <FlagIcon country="IN" size="md" />
                <div>
                  <h3 className="font-black text-base text-white font-rajdhani">INDIA REGION (IND)</h3>
                  <div className="text-[10px] font-mono text-gray-400">Current Standard Indian Retail</div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
                STANDARD
              </span>
            </div>

            <div className="space-y-2 text-xs text-gray-300">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-gray-400">1,000 VP Price:</span>
                <span className="font-bold text-white font-mono">₹890</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-gray-400">2,050 VP Price:</span>
                <span className="font-bold text-white font-mono">₹1,850</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-gray-400">5,350 VP Price:</span>
                <span className="font-bold text-white font-mono">₹4,600</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-gray-400">11,000 VP Price:</span>
                <span className="font-bold text-white font-mono">₹8,950</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-gray-400">Ultra Bundle (8,700 VP):</span>
                <span className="font-bold text-white font-mono">₹7,200+</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-gray-400">Server Latency:</span>
                <span className="font-bold text-emerald-400">15–25ms (Mumbai)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-400">Savings Potential:</span>
                <span className="font-bold text-zinc-500">None (Full Retail)</span>
              </div>
            </div>
          </div>

          {/* Center Bridge Indicator */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center text-center py-2 lg:py-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/40">
              <ArrowRight className="w-5 h-5 hidden lg:block" />
              <TrendingDown className="w-5 h-5 lg:hidden" />
            </div>
            <span className="text-[10px] font-mono text-fuchsia-400 uppercase font-black mt-1.5 tracking-wider">
              SAVE 40%
            </span>
          </div>

          {/* Right Portal: PHILIPPINES REGION */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-[#120826] to-[#1c0d38] border border-fuchsia-500/50 space-y-4 shadow-xl shadow-fuchsia-950/30">
            <div className="flex items-center justify-between border-b border-fuchsia-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <FlagIcon country="PH" size="md" />
                <div>
                  <h3 className="font-black text-base text-white font-rajdhani">PHILIPPINES REGION (PHP)</h3>
                  <div className="text-[10px] font-mono text-fuchsia-300">Discounted Southeast Asia Tier</div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-fuchsia-900/60 text-fuchsia-200 border border-fuchsia-500/40 uppercase font-bold">
                BEST VALUE
              </span>
            </div>

            <div className="space-y-2 text-xs text-gray-200">
              <div className="flex justify-between py-1.5 border-b border-fuchsia-500/15">
                <span className="text-gray-300">1,000 VP Price:</span>
                <span className="font-bold text-emerald-400 font-mono">~₹520 <span className="text-xs text-emerald-300 font-normal">(Save ₹370)</span></span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-fuchsia-500/15">
                <span className="text-gray-300">2,050 VP Price:</span>
                <span className="font-bold text-emerald-400 font-mono">~₹1,090 <span className="text-xs text-emerald-300 font-normal">(Save ₹760)</span></span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-fuchsia-500/15">
                <span className="text-gray-300">5,350 VP Price:</span>
                <span className="font-bold text-emerald-400 font-mono">~₹2,990 <span className="text-xs text-emerald-300 font-normal">(Save ₹1,610)</span></span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-fuchsia-500/15">
                <span className="text-gray-300">11,000 VP Price:</span>
                <span className="font-bold text-emerald-400 font-mono">~₹7,200 <span className="text-xs text-emerald-300 font-normal">(Save ₹1,750)</span></span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-fuchsia-500/15">
                <span className="text-gray-300">Ultra Bundle (8,700 VP):</span>
                <span className="font-bold text-emerald-400 font-mono">~₹4,300 <span className="text-xs text-emerald-300 font-normal">(Save ₹2,900!)</span></span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-fuchsia-500/15">
                <span className="text-gray-300">Server Latency:</span>
                <span className="font-bold text-emerald-400">Identical Mumbai / SG Ping</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-300">Total Savings:</span>
                <span className="font-bold text-fuchsia-300">Up to 40% Off Every VP Pack</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Price Comparison Table */}
        <div className="rounded-2xl bg-[#090616] border border-white/[0.08] overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
            <h3 className="font-black text-sm uppercase text-white font-rajdhani tracking-wide">
              VP Pack Price Breakdown &amp; Savings Matrix
            </h3>
            <span className="text-[10px] font-mono text-fuchsia-300 uppercase">Prices in INR (₹)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#120a24] text-gray-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">VP Amount / Bundle</th>
                  <th className="py-3 px-4">India (IND)</th>
                  <th className="py-3 px-4">Philippines (PHP)</th>
                  <th className="py-3 px-4">Your Savings</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {comparisonItems.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      item.highlight ? 'bg-fuchsia-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-white font-rajdhani text-sm flex items-center gap-2">
                      {item.pack}
                      {item.highlight && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold uppercase">
                          MOST POPULAR
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-300 font-mono">₹{item.indPrice.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold font-mono">~₹{item.phpPrice.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-fuchsia-300 font-bold font-mono">+₹{item.savings.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-400 font-rajdhani text-sm">
                      {item.percent} OFF
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE ANNUAL SAVINGS CALCULATOR                                  */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-[#140a2c] via-[#1a0e38] to-[#0f0722] border border-fuchsia-500/35 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-fuchsia-300 font-bold">
                ROI CALCULATOR
              </span>
              <h3 className="text-xl sm:text-2xl font-black uppercase text-white font-rajdhani">
                Calculate Your Annual Skin Savings
              </h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-gray-400 block uppercase">Estimated Yearly Savings</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-rajdhani">
                ₹{totalAnnualSavings.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span>How many weapon skin bundles do you buy per year?</span>
              <span className="font-bold text-fuchsia-300 font-mono text-sm">{annualBundles} Bundles / Year</span>
            </div>

            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={annualBundles}
              onChange={(e) => setAnnualBundles(Number(e.target.value))}
              className="w-full accent-fuchsia-500 cursor-pointer h-2 bg-white/10 rounded-lg"
            />

            <div className="flex justify-between text-[11px] font-mono text-gray-400">
              <span>1 Bundle (Save ₹2,900)</span>
              <span>3 Bundles (Save ₹8,700)</span>
              <span>5 Bundles (Save ₹14,500)</span>
              <span>10 Bundles (Save ₹29,000)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p className="text-gray-300">
              By paying the one-time migration fee of <strong>{formatCurrencyPrice(1299, currency)}</strong>, you recover your cost instantly on bundle #1 and save <strong>₹{totalAnnualSavings.toLocaleString('en-IN')}</strong> year after year.
            </p>
            <button
              type="button"
              onClick={handleOrder}
              className="px-5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold font-rajdhani uppercase text-xs tracking-wider whitespace-nowrap cursor-pointer transition-all shadow-md shrink-0"
            >
              Get Started Now →
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. THE OFFICIAL SERVICE PACKAGE & CHECKOUT CTA                             */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-b from-[#150a2e] to-[#0c061a] border border-fuchsia-500/40 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: What you receive */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-950/60 border border-fuchsia-500/40 text-[10px] font-mono font-bold uppercase tracking-wider text-fuchsia-300">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>COMPLETE MIGRATION PACKAGE</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani">
                Full Region Conversion: IND to PHP
              </h3>

              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Our technicians handle the complete migration protocol from start to finish. Once activated, your store prices change immediately to Philippine rates forever.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-gray-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>1-on-1 Dedicated Support Technician</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Zero Server Ping Latency Change</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>100% Skin Inventory Preserved</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Competitive Rank &amp; MMR Untouched</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>15–30 Mins Rapid Handover</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>100% Money-Back Guarantee</span>
                </div>
              </div>
            </div>

            {/* Right Column: Pricing Box */}
            <div className="lg:col-span-5">
              <div className="p-6 sm:p-8 rounded-2xl bg-[#090514] border border-white/10 space-y-5 text-center shadow-xl">
                <span className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-300 font-bold block">
                  ALL-INCLUSIVE ONE-TIME PRICE
                </span>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-gray-400 line-through text-sm sm:text-base font-rajdhani">₹1,799</span>
                    <span className="text-3xl sm:text-4xl font-black text-white font-rajdhani tracking-tight">
                      {formatCurrencyPrice(1299, currency)}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold block">
                    Save ₹500 (Limited Promotion)
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleOrder}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold font-rajdhani uppercase text-sm tracking-wider cursor-pointer shadow-lg shadow-fuchsia-600/40 transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                  >
                    <span>Order Region Switch ({formatCurrencyPrice(1299, currency)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <a
                    href="https://wa.me/918099641606?text=Hi%20VIB%20Team%2C%20I%20want%20to%20order%20Region%20Change%20from%20IND%20to%20PHP"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Order via WhatsApp Desk</span>
                  </a>
                </div>

                <div className="text-[10px] text-gray-500 pt-1 flex items-center justify-center gap-1.5 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Secure Escrow Protection • Instant Order Confirmation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. 4-STEP HOW IT WORKS PROCESS                                            */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-400 font-bold">
            SIMPLE &amp; SECURE WORKFLOW
          </span>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani">
            How The Migration Works
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            A seamless 4-step process handled completely by our technical team.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Place Order & Pay',
              desc: 'Select the region change service and complete payment via UPI, QR code, or net banking.',
            },
            {
              step: '02',
              title: 'Submit Details',
              desc: 'Provide your Riot ID and account details in our confidential, escrow-protected order desk.',
            },
            {
              step: '03',
              title: 'Technical Migration',
              desc: 'Our technician sets up the secure regional bridge and switches your currency store to PHP.',
            },
            {
              step: '04',
              title: 'Ready & Save 40%',
              desc: 'Log back into Valorant! Your store is now active in Philippines rates on Mumbai servers forever.',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#0c081b] border border-white/[0.08] hover:border-purple-500/40 transition-all space-y-3 relative group shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center font-black font-rajdhani text-sm text-fuchsia-300">
                {item.step}
              </div>
              <h4 className="font-black text-sm text-white font-rajdhani uppercase tracking-wide">
                {item.title}
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed font-normal">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FREQUENTLY ASKED QUESTIONS (FAQS)                                      */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-400 font-bold">
            GOT QUESTIONS?
          </span>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            Everything you need to know about switching your Valorant account region.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-[#0c081b] border border-white/[0.08] overflow-hidden transition-all shadow-md"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-xs sm:text-sm text-white font-rajdhani uppercase tracking-wide flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? 'rotate-180 text-fuchsia-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-gray-300 leading-relaxed border-t border-white/[0.05] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. 24/7 WHATSAPP HELP CENTRE CALLOUT BAR                                  */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#170d2c] via-[#100920] to-[#0a0614] border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-500/30 p-1 flex items-center justify-center text-purple-300 flex-shrink-0">
              <Headphones className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="font-black text-sm text-white font-rajdhani">
                Have Questions Before Switching? Contact Our 24/7 Help Centre
              </div>
              <div className="text-xs text-gray-400">
                Our technical support executives are online 24/7 on WhatsApp to answer queries and guide your migration.
              </div>
            </div>
          </div>

          <a
            href="https://wa.me/918099641606?text=Hi%20VIB%20Team%2C%20I%20have%20questions%20about%20Change%20Region%20from%20IND%20to%20PHP"
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
