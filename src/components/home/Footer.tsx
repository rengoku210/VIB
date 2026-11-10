import React from 'react';
import { ArrowUp, ShieldCheck, Heart, MessageSquare } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative w-full bg-[#05070d] border-t border-white/10 pt-16 pb-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/5">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
              <img
                src="/assets/client/vib-logo.png"
                alt="VIB Logo"
                className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(192,38,211,0.5)]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                <span className="font-chakra font-black text-2xl tracking-wider text-white">
                  VIB <span className="text-fuchsia-400">2.0</span>
                </span>
                <span className="block text-[9px] font-chakra tracking-[0.25em] text-gray-400 -mt-0.5 uppercase">
                  Esports Digital Services
                </span>
              </div>
            </div>

            <p className="font-rajdhani text-sm text-gray-400 max-w-sm leading-relaxed">
              India's leading platform for verified Valorant accounts, fast VP top-ups, competitive rank-up, and escrow-guaranteed peer trades.
            </p>

            <div className="flex items-center gap-2 text-xs font-chakra text-gray-400 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational • 24/7 Service</span>
            </div>

            <div className="pt-1 flex items-center gap-2 text-xs font-rajdhani text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Covered by VIB Refund & Replacement Guarantee</span>
            </div>
          </div>

          {/* Quick Links 1: Digital Profiles */}
          <div>
            <h4 className="font-chakra font-bold text-sm text-white uppercase tracking-wider mb-4">
              Marketplace
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm font-rajdhani text-gray-400">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('profiles')}
                  className="hover:text-fuchsia-300 transition-colors cursor-pointer text-left"
                >
                  All Digital Profiles
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('profiles')}
                  className="hover:text-fuchsia-300 transition-colors cursor-pointer text-left"
                >
                  Guaranteed Profiles
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('profiles')}
                  className="hover:text-fuchsia-300 transition-colors cursor-pointer text-left"
                >
                  Public Listings
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('profiles')}
                  className="hover:text-fuchsia-300 transition-colors cursor-pointer text-left"
                >
                  Radiant & Immortal Tier
                </button>
              </li>
            </ul>
          </div>

          {/* Quick Links 2: VP & Services */}
          <div>
            <h4 className="font-chakra font-bold text-sm text-white uppercase tracking-wider mb-4">
              Services
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm font-rajdhani text-gray-400">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('vp')}
                  className="hover:text-fuchsia-300 transition-colors cursor-pointer text-left"
                >
                  Indian VP Top-Up
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('vp')}
                  className="hover:text-fuchsia-300 transition-colors cursor-pointer text-left"
                >
                  Philippines VP Packs
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('rankup')}
                  className="hover:text-fuchsia-300 transition-colors cursor-pointer text-left"
                >
                  Rankup Boosting
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="hover:text-fuchsia-300 transition-colors cursor-pointer text-left"
                >
                  Profile Exchange & Escrow
                </button>
              </li>
            </ul>
          </div>

          {/* Quick Links 3: Trust & Legal */}
          <div>
            <h4 className="font-chakra font-bold text-sm text-white uppercase tracking-wider mb-4">
              Trust & Support
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm font-rajdhani text-gray-400">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('support')}
                  className="hover:text-fuchsia-300 transition-colors cursor-pointer text-left"
                >
                  24/7 Discord Support
                </button>
              </li>
              <li>
                <a
                  href="https://wa.me/918099641606"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-fuchsia-300 transition-colors text-left"
                >
                  WhatsApp Concierge
                </a>
              </li>
              <li>
                <span className="hover:text-fuchsia-300 transition-colors cursor-pointer">
                  Escrow Terms
                </span>
              </li>
              <li>
                <span className="hover:text-fuchsia-300 transition-colors cursor-pointer">
                  Refund & Replacement Terms
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-rajdhani text-gray-500">
          <div className="max-w-2xl text-center md:text-left">
            <p>
              Disclaimer: VIB is an independent platform and is not endorsed by, directly affiliated with, maintained, or sponsored by Riot Games, Inc. Valorant is a registered trademark of Riot Games, Inc.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span>© 2026 VIB Digital Services. All rights reserved.</span>
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Scroll to top"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};