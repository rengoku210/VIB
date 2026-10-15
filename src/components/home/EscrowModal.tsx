import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Lock, ArrowRight } from 'lucide-react';

interface EscrowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EscrowModal: React.FC<EscrowModalProps> = ({ isOpen, onClose }) => {
  const [tradeType, setTradeType] = useState<'buy' | 'sell' | 'swap'>('buy');
  const [sellerTag, setSellerTag] = useState('');
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="escrow-modal-title"
        className="relative w-full max-w-lg rounded-2xl border border-amber-500/30 bg-[#0c0f17] p-6 shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close escrow dialog"
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 id="escrow-modal-title" className="font-chakra font-bold text-xl text-white">VIB Escrow Desk</h3>
            <span className="text-xs font-chakra text-amber-400">Official Middleman Service</span>
          </div>
        </div>

        {submitted ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h4 className="font-chakra font-bold text-xl text-white">Escrow Ticket Initiated!</h4>
            <p className="font-rajdhani text-sm text-gray-300 max-w-xs mt-1">
              A certified VIB Middleman agent has been assigned to your ticket. Check your Discord / Email notifications.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-chakra text-gray-400 uppercase tracking-wider mb-1.5">
                Transaction Nature
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['buy', 'sell', 'swap'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTradeType(t)}
                    className={`py-2 rounded-lg text-xs font-chakra font-bold uppercase transition-all cursor-pointer ${
                      tradeType === t
                        ? 'bg-amber-500 text-black shadow-md'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {t === 'buy' ? 'Buying Account' : t === 'sell' ? 'Selling Account' : 'Direct Swap'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-chakra text-gray-400 uppercase tracking-wider mb-1.5">
                Counterparty Discord / Riot ID
              </label>
              <input
                type="text"
                required
                value={sellerTag}
                onChange={(e) => setSellerTag(e.target.value)}
                placeholder="e.g. TenZ#NA1 or user#1234"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-chakra text-sm focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-chakra text-gray-400 uppercase tracking-wider mb-1.5">
                Estimated Trade Value (INR / USD)
              </label>
              <input
                type="text"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. ₹6,500 or $80"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-chakra text-sm focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-rajdhani text-amber-200/90 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Escrow Fee Policy</span>
              </div>
              VIB charges a flat 3% middleman security fee upon successful ownership confirmation. 0% charged if trade is canceled.
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-chakra font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer mt-1"
            >
              <span>Create Escrow Ticket</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
