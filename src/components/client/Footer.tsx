import React from 'react';
import { Instagram, Disc as Discord, Youtube, Send, ArrowUp, Heart } from 'lucide-react';
import { ClientPage } from './Header';

interface FooterProps {
  onNavigate: (page: ClientPage) => void;
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
              <span className="block text-[11px] text-gray-500">Built for a Global Community • MSME Verified</span>
            </div>
          </div>

          {/* Links Row with accessible touch targets */}
          <nav aria-label="Footer Navigation" className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[12px]">
            <button
              type="button"
              onClick={() => onNavigate('services')}
              className="min-h-[40px] px-2 py-1 flex items-center hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => onNavigate('services')}
              className="min-h-[40px] px-2 py-1 flex items-center hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => onNavigate('services')}
              className="min-h-[40px] px-2 py-1 flex items-center hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onNavigate('services')}
              className="min-h-[40px] px-2 py-1 flex items-center hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              Refund Policy
            </button>
            <button
              type="button"
              onClick={() => onNavigate('community')}
              className="min-h-[40px] px-2 py-1 flex items-center hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              Community Guidelines
            </button>
            <button
              type="button"
              onClick={() => onNavigate('support')}
              className="min-h-[40px] px-2 py-1 flex items-center hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              Contact
            </button>
            {onOpenTracking && (
              <button
                type="button"
                onClick={onOpenTracking}
                className="min-h-[40px] px-2.5 py-1 flex items-center text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                Track Live Order
              </button>
            )}
          </nav>

          {/* Social Icons with compliant 44x44px touch targets */}
          <div className="flex items-center gap-2">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Follow VIB on Instagram"
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://discord.gg"
              target="_blank"
              rel="noreferrer"
              aria-label="Join VIB Discord Community"
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <Discord className="w-4 h-4" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Subscribe to VIB on YouTube"
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <Youtube className="w-4 h-4" />
            </a>
            <a
              href="https://t.me"
              target="_blank"
              rel="noreferrer"
              aria-label="Join VIB on Telegram"
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <Send className="w-4 h-4" />
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