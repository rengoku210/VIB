import React from 'react';
import { X, MessageSquare, Users, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';

interface DiscordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiscordModal: React.FC<DiscordModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape key press and lock body scroll
  React.useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="discord-modal-title"
        className="relative w-full max-w-md rounded-2xl border border-indigo-500/30 bg-[#0c101c] p-6 shadow-2xl overflow-hidden"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Discord dialog"
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 id="discord-modal-title" className="font-chakra font-bold text-xl text-white">VIB Discord Lounge</h3>
            <div className="flex items-center gap-2 text-xs font-chakra text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>4,120 Players Online Now</span>
            </div>
          </div>
        </div>

        <p className="font-rajdhani text-sm text-gray-300 leading-relaxed mb-6">
          Connect with radiant players, access weekly VP flash giveaways, discover live peer-to-peer account listings, and chat directly with 24/7 staff.
        </p>

        <div className="flex flex-col gap-2.5 mb-6 text-xs font-rajdhani text-gray-300">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Weekly 5,350 VP Community Raffles</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Dedicated Middleman Channels with Escrow Bot</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
            <Users className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Verified High-Elo LFG (Looking for Group) Roles</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            window.open('https://discord.gg', '_blank', 'noopener,noreferrer');
            onClose();
          }}
          className="w-full min-h-[44px] py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-chakra font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          <span>Accept Discord Invite</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
