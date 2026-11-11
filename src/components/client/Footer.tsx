import React from 'react';
import { ArrowUp, Heart } from 'lucide-react';
import { ClientPage } from './Header';

interface FooterProps {
  onNavigate: (page: ClientPage, slug?: string) => void;
  onOpenTracking?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenTracking }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#06060b] border-t border-white/10 pt-10 pb-8 text-xs text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Row: Brand & Policy Navigation & Socials */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/5">
          {/* Logo + Tagline */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center h-8">
              <div className="absolute inset-0 bg-purple-600/30 blur-md rounded-full pointer-events-none scale-125" />
              <img
                src="/assets/hires/vib_logo_metallic_hires.png"
                alt="VIB Logo"
                className="h-8 w-auto object-contain relative z-10 drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/client/vib-logo.png';
                }}
              />
            </div>
            <div>
              <span className="font-bold text-sm text-white">Digital Services Platform</span>
              <span className="block text-[11px] text-gray-500">Valorant Top-Ups, Profiles &amp; Escrow Services</span>
            </div>
          </div>

          {/* Links Row with accessible touch targets */}
          <nav aria-label="Footer Navigation" className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[12px]">
            <button
              type="button"
              onClick={() => onNavigate('legal', 'terms-of-service')}
              className="min-h-[40px] px-2 py-1 flex items-center hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => onNavigate('legal', 'privacy-policy')}
              className="min-h-[40px] px-2 py-1 flex items-center hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              Privacy (DPDPA)
            </button>
            <button
              type="button"
              onClick={() => onNavigate('legal', 'refund-policy')}
              className="min-h-[40px] px-2 py-1 flex items-center hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              Refund Policy
            </button>
            <button
              type="button"
              onClick={() => onNavigate('legal', 'auction-rules')}
              className="min-h-[40px] px-2 py-1 flex items-center hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              Auction Rules
            </button>
            <button
              type="button"
              onClick={() => onNavigate('legal', 'account-rental-agreement')}
              className="min-h-[40px] px-2 py-1 flex items-center hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              Rental Agreement
            </button>
            <button
              type="button"
              onClick={() => onNavigate('legal', 'grievance-redressal')}
              className="min-h-[40px] px-2 py-1 flex items-center hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              Grievance Officer
            </button>
            {onOpenTracking && (
              <button
                type="button"
                onClick={() => onOpenTracking()}
                className="min-h-[40px] px-2.5 py-1 flex items-center text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                Track Live Order
              </button>
            )}
          </nav>

          {/* Direct Support & Contact Links */}
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/918099641606?text=${encodeURIComponent('Hello VIB Support, I need assistance.')}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Contact VIB on WhatsApp"
              className="px-3 py-2 min-h-[40px] rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 text-emerald-300 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span>WhatsApp Support</span>
            </a>
          </div>
        </div>

        {/* Bottom Row: Made with love in India, Legal Disclaimer, Trust Trade Grow */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-gray-500 text-center md:text-left">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" aria-label="love" />
            <span>in India</span>
          </div>

          <div className="max-w-2xl text-[10px] leading-relaxed text-gray-500">
            VIB is an independent digital services platform. We are not affiliated with or endorsed by any game publisher.
            All trademarks, images and brand names are the property of their respective owners and are used for identification purposes only.
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-gray-400 font-medium">Trust • Trade • Grow</span>
            <button
              type="button"
              onClick={scrollToTop}
              title="Scroll to top"
              aria-label="Scroll back to top of page"
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
