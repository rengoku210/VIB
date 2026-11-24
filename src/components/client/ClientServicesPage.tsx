import React from 'react';
import {
  Globe,
  Zap,
  Repeat,
  UserRoundPlus,
  Megaphone,
  BarChart2,
  Clock,
  Award,
  Gavel,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Headphones,
  MessageSquare,
  Lock,
  Sparkles,
  Shield,
  Layers,
  Users,
} from 'lucide-react';
import { Currency } from '../../types';
import { ClientPage } from './Header';
import { soundFx } from '../../utils/audio';

interface ClientServicesPageProps {
  currency: Currency;
  onNavigate: (page: ClientPage, sectionId?: string) => void;
  onAddToCart?: (item: any) => void;
  onOpenCheckout?: (title: string, priceINR: number, productId?: string) => void;
}

export const ClientServicesPage: React.FC<ClientServicesPageProps> = ({
  currency,
  onNavigate,
}) => {
  const allServices = [
    {
      id: 'region-change',
      title: 'Change Region (IND → PHP)',
      subtitle: 'REGIONAL ARBITRAGE SERVICE',
      desc: 'Convert your existing Valorant account from India to Philippines. Unlock 25% to 40% cheaper VP on every store purchase forever with identical Mumbai server ping.',
      icon: Globe,
      color: 'indigo',
      badge: 'POPULAR MIGRATION',
      price: '₹1,299 One-Time',
      action: () => onNavigate('region-change'),
      features: [
        'Save ~₹2,900 on every Ultra Bundle',
        'Identical Mumbai / Singapore ping (15–25ms)',
        '100% Safe, Riot-compliant & ban-free',
        'Permanent billing currency conversion',
      ],
      ctaText: 'Explore Region Switch',
    },
    {
      id: 'fresh-php',
      title: 'Fresh PHP Profile',
      subtitle: 'CLEAN REGIONAL PROVISIONING',
      desc: 'Start with a brand new, unranked Philippines (PHP) Valorant account. Full first-email access provided within 10–20 minutes with zero risk to your primary account.',
      icon: UserRoundPlus,
      color: 'cyan',
      badge: 'STARTING AT ₹499',
      price: '₹499 One-Time',
      action: () => onNavigate('fresh-php'),
      features: [
        'Clean unranked account (Level 1–20)',
        'Full first-email & credentials changeable',
        'Direct access to 40% cheaper store VP',
        '100% Ban-Free & lifetime warranty',
      ],
      ctaText: 'Get Fresh PHP Profile',
    },
    {
      id: 'skins-exchange',
      title: 'Valo Skins Exchange',
      subtitle: 'P2P WEAPON SWAP & UPGRADE ESCROW',
      desc: 'Bored of your current skin collection? Trade in your existing Valorant account for store credit or upgrade directly to high-tier vaulted inventories under 100% escrow protection.',
      icon: Repeat,
      color: 'purple',
      badge: 'ESCROW VERIFIED',
      price: 'Fair Trade Differentials',
      action: () => onNavigate('skins-exchange'),
      features: [
        'Instant valuation of your current skins',
        'Fair market-based trade-in credit',
        '100% VIB middleman escrow guarantee',
        'Lifetime account recovery warranty',
      ],
      ctaText: 'Trade / Upgrade Skins',
    },
    {
      id: 'urgent-sale',
      title: 'Urgent Sale Offer',
      subtitle: 'FAST ACCOUNT BUYOUT & CASHOUT',
      desc: 'Need to sell your profile fast? Turn your skin inventory into real instant cash within 24 hours. Our verified buyout desk inspects your collection and transfers payment via UPI or IMPS.',
      icon: Zap,
      color: 'amber',
      badge: 'INSTANT CASHOUT',
      price: 'Instant Payout',
      action: () => onNavigate('urgent-sale'),
      features: [
        'Fast 15-minute valuation appraisal',
        'Direct cash payout to UPI or Bank',
        'Zero waiting for individual marketplace buyers',
        'Confidential & DPDPA-compliant transaction',
      ],
      ctaText: 'Get Urgent Cash Offer',
    },
    {
      id: 'advertise',
      title: 'Advertise Profile Plans',
      subtitle: 'OFFICIAL VIB PROMOTION NETWORK',
      desc: 'Reach thousands of active Indian gamers. Broadcast your Valorant account across official VIB WhatsApp Status, Channels, Website Marketplace, and Discord pushes.',
      icon: Megaphone,
      color: 'fuchsia',
      badge: '12 PROMOTION PLANS',
      price: 'From ₹99',
      action: () => onNavigate('advertise'),
      features: [
        'Set your own selling price',
        'WhatsApp Status & Channel promotions',
        'Website Marketplace featured listings',
        'Concierge matchmaking for serious buyers',
      ],
      ctaText: 'View Promotion Plans',
    },
    {
      id: 'rankup',
      title: 'Rank Progression Assistance',
      subtitle: 'COMPETITIVE BOOSTING & PROGRESSION',
      desc: 'Climb through competitive tiers with top-500 verified players. Choose Solo or Duo queue with VPN protection, offline mode, and live order tracking.',
      icon: BarChart2,
      color: 'rose',
      badge: 'RADIANT BOOSTERS',
      price: 'Dynamic Calculator',
      action: () => onNavigate('rankup'),
      features: [
        'Iron through Radiant progression',
        'Solo or Duo play with mentor',
        '100% manual gameplay & encrypted VPN',
        'Live order progress updates',
      ],
      ctaText: 'Calculate Rankup Price',
    },
    {
      id: 'rentals',
      title: 'Account & Skin Rentals',
      subtitle: 'TIMED HIGH-TIER INVENTORY ACCESS',
      desc: 'Test ultra-rare skins like Champions, Kuronami, and Reaver in real matches. Flexible rental durations from 24 hours to 30 days under strict fair play protection.',
      icon: Clock,
      color: 'emerald',
      badge: 'FROM 24H SLOTS',
      price: 'From ₹199',
      action: () => onNavigate('rentals'),
      features: [
        'Instant slot handover instructions',
        'Play with fully upgraded finishers & variants',
        'Zero permanent purchase commitment',
        'Automated rotation & clean handover',
      ],
      ctaText: 'Browse Available Rentals',
    },
    {
      id: 'coaching',
      title: 'Radiant Coaching Program',
      subtitle: '1-ON-1 COMPETITIVE MENTORSHIP',
      desc: 'Accelerate your mechanics, crosshair placement, and macro calling with Radiant players and VCT tier analysts. Includes live screenshare and custom aim routines.',
      icon: Award,
      color: 'sky',
      badge: '1-ON-1 DISCORD',
      price: 'From ₹799',
      action: () => onNavigate('coaching'),
      features: [
        'Round-by-round VOD breakdown',
        'Tailored aim & movement routines',
        'Agent pool lineup & execute playbook',
        '24/7 mentor scheduling access',
      ],
      ctaText: 'Explore Coaching Plans',
    },
    {
      id: 'auctions',
      title: 'Live Auctions & Mystery Boxes',
      subtitle: 'ZERO-RESERVE COMPETITIVE BIDDING',
      desc: 'Bid on rare, vaulted, and high-tier Valorant account collections. 100% transparent bidding with 50% escrow deposit protection and instant winner transfer.',
      icon: Gavel,
      color: 'yellow',
      badge: 'LIVE BIDDING',
      price: 'Zero Reserve',
      action: () => onNavigate('auctions'),
      features: [
        'Vaulted and rare collection lots',
        'Automated countdown & outbid alerts',
        'Escrow deposit protection for all bidders',
        'Instant transfer upon auction expiry',
      ],
      ctaText: 'Enter Live Auctions',
    },
    {
      id: 'flexible-payment-plans',
      title: 'Flexible Payment Plans (EMI)',
      subtitle: 'VP & LIFETIME PROFILES ON INSTALLMENTS',
      desc: 'Purchase VP packages or lifetime-guaranteed profiles in easy installments. Choose 4-week weekly plans, 4-month monthly plans, or 15-day pay-after options.',
      icon: CreditCard,
      color: 'violet',
      badge: 'WEEKLY & MONTHLY',
      price: 'Easy EMI',
      action: () => onNavigate('flexible-payment-plans'),
      features: [
        'Transparent interest-free schedules',
        'Quick 24-hour verification approval',
        'Simple KYC & handwritten agreement',
        'Available on Indian & Philippines VP',
      ],
      ctaText: 'View Flexible Plans',
    },
  ];

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white space-y-12 pb-24 font-sans">
      {/* ========================================================================= */}
      {/* 1. HERO DIRECTORY HEADER                                                  */}
      {/* ========================================================================= */}
      <section className="relative w-full pt-8 pb-12 overflow-hidden border-b border-white/[0.06]">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[350px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

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
            <span className="text-purple-400 font-semibold">All Services Directory</span>
          </div>

          {/* Hero Header */}
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-xs font-semibold uppercase tracking-wider shadow-sm">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>OFFICIAL VIB SERVICE ECOSYSTEM</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none font-rajdhani">
              VIB SERVICES <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-300">
                DIRECTORY
              </span>
            </h1>

            <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              Explore the complete ecosystem of VIB digital services. Every service is protected under official middleman escrow, transparent pricing, and 24/7 WhatsApp executive support.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Escrow Protected</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>10 Specialized Services</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-[#110e22] border border-white/10 text-xs text-gray-200 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>24/7 Verified Support</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. SERVICES GRID: 10 DISTINCT SERVICES                                    */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-white/[0.08] pb-4">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-purple-400 uppercase font-bold">
              INDIVIDUAL SERVICE PAGES
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani tracking-wide">
              CHOOSE A SPECIALIZED SERVICE
            </h2>
          </div>
          <div className="text-xs text-gray-400">
            Each service operates on its own dedicated workflow and pricing structure.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allServices.map((srv) => (
            <div
              key={srv.id}
              className="p-6 rounded-2xl bg-[#090714] border border-white/[0.08] hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-5 shadow-lg group hover:shadow-[0_8px_30px_rgba(168,85,247,0.12)]"
            >
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform">
                    <srv.icon className="w-6 h-6 text-purple-300" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30 text-[10px] font-mono font-bold uppercase text-purple-300">
                    {srv.badge}
                  </span>
                </div>

                {/* Title & Desc */}
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                    {srv.subtitle}
                  </div>
                  <h3 className="text-xl font-extrabold text-white font-rajdhani group-hover:text-purple-300 transition-colors">
                    {srv.title}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed pt-1">
                    {srv.desc}
                  </p>
                </div>

                {/* Features Checklist */}
                <div className="space-y-1.5 pt-2 border-t border-white/[0.05] text-xs text-gray-300">
                  {srv.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-[11px] text-gray-300 leading-tight">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-white/[0.05]">
                <button
                  type="button"
                  onClick={srv.action}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 font-bold font-rajdhani uppercase tracking-wider text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 group-hover:shadow-md"
                >
                  <span>{srv.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. TRUST & STATUTORY COMPLIANCE                                           */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-1">
          <div className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
            STATUTORY TRUST &amp; COMPLIANCE
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani tracking-wide">
            HOW VIB SAFEGUARDS EVERY TRANSACTION
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-[#090714] border border-white/[0.06] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-extrabold text-sm text-white font-rajdhani">Identity Verification</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Strict KYC and seller verification procedures to eliminate bad actors and guarantee authentic ownership.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#090714] border border-white/[0.06] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <Lock className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-extrabold text-sm text-white font-rajdhani">Escrow Fund Holding</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Funds and credentials remain in neutral escrow until both buyer and seller confirm verified delivery.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#090714] border border-white/[0.06] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="font-extrabold text-sm text-white font-rajdhani">India DPDPA Compliance</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              All personal customer data, payment evidence, and IDs are encrypted and protected under Indian privacy laws.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#090714] border border-white/[0.06] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <Headphones className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="font-extrabold text-sm text-white font-rajdhani">24/7 Human Resolution</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Dedicated dispute officers and executive assistance active on official WhatsApp for immediate issue resolution.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. 24/7 WHATSAPP HELP CENTRE BAR                                          */}
      {/* ========================================================================= */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#170a2a] via-[#10081d] to-[#0a0515] border border-purple-500/35 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 p-1 flex items-center justify-center text-purple-300 flex-shrink-0">
              <Headphones className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="font-black text-sm text-white font-rajdhani">
                Need Help Choosing The Right Service? Chat With Our Support Team
              </div>
              <div className="text-xs text-gray-400">
                Our support executives are available 24/7 on WhatsApp to guide you to the exact service matching your requirements.
              </div>
            </div>
          </div>

          <a
            href="https://wa.me/918099641606?text=Hi%20VIB%20Team%2C%20I%20need%20help%20choosing%20a%20service"
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
