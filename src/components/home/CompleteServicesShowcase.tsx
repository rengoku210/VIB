import React from 'react';
import { 
  Gamepad2, TrendingUp, Coins, Globe, 
  Sparkles, ChevronRight, ShieldCheck,
  MessageCircle, CheckCircle2, Lock
} from 'lucide-react';
import { ClientPage } from '../client/Header';

interface CompleteServicesShowcaseProps {
  onNavigate: (page: ClientPage) => void;
}

interface MainServiceItem {
  id: string;
  icon: React.ReactNode;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  actionLabel: string;
  targetPage?: ClientPage;
  anchor?: string;
  whatsAppMsg?: string;
}

export const CompleteServicesShowcase: React.FC<CompleteServicesShowcaseProps> = ({ onNavigate }) => {
  // The 5 Core Main Services according to the 120+ page master document
  const mainServices: MainServiceItem[] = [
    {
      id: 'profiles',
      icon: <Gamepad2 className="w-5 h-5 text-purple-400" />,
      badge: 'Lifetime Guaranteed',
      title: 'Digital Profiles',
      subtitle: 'Verified Valorant Accounts',
      description: 'Handpicked verified accounts featuring rare skins, peak ranks, and VIB Lifetime Recall Protection.',
      features: ['Verified Creation Email', 'Lifetime VIB Guarantee'],
      actionLabel: 'Browse Profiles',
      targetPage: 'profiles'
    },
    {
      id: 'vp',
      icon: <Coins className="w-5 h-5 text-amber-400" />,
      badge: 'Direct Riot ID',
      title: 'VP Recharge Packs',
      subtitle: 'Instant In-Game Top-Up',
      description: 'High-speed official Valorant Points recharge for Indian & converted Philippines accounts.',
      features: ['475 to 11,000+ VP Packs', 'Automated Direct Top-Up'],
      actionLabel: 'View VP Packs',
      targetPage: 'vp'
    },
    {
      id: 'rankup',
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      badge: '100% Human Radiant',
      title: 'Rank Progression',
      subtitle: 'Iron to Radiant Advancement',
      description: 'Structured mathematical rank boost executed exclusively by verified Radiant & Immortal specialists.',
      features: ['Solo or Duo with Coach', '100% Refund Guarantee'],
      actionLabel: 'Calculate & Order',
      anchor: '#rankup-service'
    },
    {
      id: 'conversion',
      icon: <Globe className="w-5 h-5 text-cyan-400" />,
      badge: 'Save ~40% Permanently',
      title: 'Region Conversion',
      subtitle: 'IND to PHP Store Switch',
      description: 'Safely transition to Philippines region to permanently unlock ~40% lower store and VP prices.',
      features: ['Permanent ~40% Savings', '100% Safe & Structured'],
      actionLabel: 'Convert Region',
      whatsAppMsg: 'Hello VIB Team, I want to convert my Indian Valorant Profile to Philippines region for cheaper VP.'
    },
    {
      id: 'rentals',
      icon: <Sparkles className="w-5 h-5 text-fuchsia-400" />,
      badge: 'Skin Rentals',
      title: 'VIB Experience',
      subtitle: 'High-Tier Skin Passes',
      description: 'Test-drive top-tier inventories featuring Kuronami, Prime, and Reaver at affordable daily rates.',
      features: ['Daily & Weekly Passes', 'Full Rare Skin Loadouts'],
      actionLabel: 'Explore Rentals',
      whatsAppMsg: 'Hello VIB Team, I would like to inquire about VIB Experience Skin Rentals.'
    }
  ];

  const handleAction = (service: MainServiceItem) => {
    if (service.whatsAppMsg) {
      const url = `https://wa.me/919181801766?text=${encodeURIComponent(service.whatsAppMsg)}`;
      window.open(url, '_blank');
      return;
    }

    if (service.anchor) {
      const el = document.querySelector(service.anchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    if (service.targetPage) {
      onNavigate(service.targetPage);
    }
  };

  return (
    <section id="services" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-[1360px] mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[11px] font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Core Ecosystem • 5 Flagship Services
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Our Main <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400">Services</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
            The 5 core digital services powering the VIB ecosystem — compact, transparent, and instantly accessible.
          </p>
        </div>
      </div>

      {/* 5 Main Service Boxes in 1 Single Line on Desktop (grid-cols-5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {mainServices.map((service) => (
          <div
            key={service.id}
            className="rounded-2xl bg-[#0b0c18] border border-white/[0.09] hover:border-purple-500/50 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(147,51,234,0.2)] group relative overflow-hidden"
          >
            {/* Ambient Corner Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-purple-600/25 transition-all" />

            <div>
              {/* Card Header: Icon & Badge */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {service.icon}
                </div>
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  {service.badge}
                </span>
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-base font-bold text-white mb-0.5 group-hover:text-purple-300 transition-colors">
                {service.title}
              </h3>
              <div className="text-[10px] font-mono text-purple-400/90 mb-2">
                {service.subtitle}
              </div>

              {/* Description */}
              <p className="text-gray-400 text-xs leading-relaxed mb-3">
                {service.description}
              </p>

              {/* Highlights (2 bullets) */}
              <div className="space-y-1 mb-4 pt-2.5 border-t border-white/5">
                {service.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px] text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action CTA Button */}
            <button
              type="button"
              onClick={() => handleAction(service)}
              className="w-full py-2 px-3 rounded-xl bg-[#141528] hover:bg-purple-600 border border-purple-500/30 hover:border-purple-400 text-white font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm group-hover:shadow-[0_0_12px_rgba(147,51,234,0.4)] cursor-pointer mt-1"
            >
              {service.whatsAppMsg ? (
                <>
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white" />
                  <span>{service.actionLabel}</span>
                </>
              ) : (
                <>
                  <span>{service.actionLabel}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:text-white transform group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Official VIB Guarantee Banner at bottom of services */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#101124] to-purple-950/40 border border-purple-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 flex-shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-white">Need Custom Services? Enterprise & Volume Support</div>
            <div className="text-[11px] text-gray-400">Coaching, Escrow, Deranking & Bulk VP orders available directly via our 24/7 executive desk.</div>
          </div>
        </div>

        <a
          href="https://wa.me/919181801766?text=Hello%20VIB%20Team%2C%20I%20have%20a%20custom%20service%20inquiry"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(34,197,94,0.3)] transition-all flex-shrink-0"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Chat on WhatsApp (+91 9181801766)</span>
        </a>
      </div>
    </section>
  );
};
