import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { verifyRiotIdOnServer, RiotVerificationResponse } from '../../lib/riot';
import { useAuth } from '../../context/AuthContext';

interface EscrowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EscrowModal: React.FC<EscrowModalProps> = ({ isOpen, onClose }) => {
  const { token, user } = useAuth();
  const [tradeType, setTradeType] = useState<'buy' | 'sell' | 'swap'>('buy');
  const [sellerTag, setSellerTag] = useState('');
  const [weaponOrSkin, setWeaponOrSkin] = useState('');
  const [skinVariant, setSkinVariant] = useState('');
  const [region, setRegion] = useState('India (MUM)');
  const [amount, setAmount] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [riotVerification, setRiotVerification] = useState<RiotVerificationResponse | null>(null);
  const [isVerifyingRiot, setIsVerifyingRiot] = useState(false);

  useEffect(() => {
    if (user?.email && !contactEmail) {
      setContactEmail(user.email);
    }
  }, [user, contactEmail]);

  useEffect(() => {
    if (!isOpen || !sellerTag.includes('#')) {
      setRiotVerification(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsVerifyingRiot(true);
      const res = await verifyRiotIdOnServer(sellerTag.trim());
      setIsVerifyingRiot(false);
      setRiotVerification(res);
    }, 450);
    return () => clearTimeout(timer);
  }, [sellerTag, isOpen]);

  // Close on Escape key press and lock body scroll
  useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/escrow/tickets', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tradeType,
          counterparty: sellerTag.trim(),
          weaponOrSkin: weaponOrSkin.trim(),
          skinVariant: skinVariant.trim() || undefined,
          region,
          amount: amount.trim(),
          contactEmail: contactEmail.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to initiate escrow ticket.');
      } else {
        setSubmittedTicketId(data.ticketId || data.ticket?.id || 'ESCROW-PENDING');
        setTimeout(() => {
          setSubmittedTicketId(null);
          onClose();
        }, 3500);
      }
    } catch {
      setSubmitError('Network failure connecting to VIB escrow desk. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="escrow-modal-title"
        className="relative w-full max-w-lg rounded-2xl border border-amber-500/30 bg-[#0c0f17] p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
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
            <span className="text-xs font-chakra text-amber-400">Official Middleman &amp; Trade Protection</span>
          </div>
        </div>

        {submittedTicketId ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h4 className="font-chakra font-bold text-xl text-white">Escrow Ticket #{submittedTicketId} Initiated!</h4>
            <p className="font-rajdhani text-sm text-gray-300 max-w-xs mt-2">
              A certified VIB Middleman agent has been assigned to your trade. Ticket is active in your dashboard and notification feed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-chakra text-gray-400 uppercase tracking-wider">
                  Counterparty Discord / Riot ID *
                </label>
                {isVerifyingRiot && (
                  <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking...
                  </span>
                )}
                {riotVerification?.exists && (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified Riot ID
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={sellerTag}
                onChange={(e) => setSellerTag(e.target.value)}
                placeholder="e.g. TenZ#NA1 or user#1234"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-chakra text-sm focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-chakra text-gray-400 uppercase tracking-wider mb-1">
                  Skin / Item Description *
                </label>
                <input
                  type="text"
                  required
                  value={weaponOrSkin}
                  onChange={(e) => setWeaponOrSkin(e.target.value)}
                  placeholder="e.g. Prime Vandal / Kuronami"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-chakra text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-chakra text-gray-400 uppercase tracking-wider mb-1">
                  Variant / Upgrades (Optional)
                </label>
                <input
                  type="text"
                  value={skinVariant}
                  onChange={(e) => setSkinVariant(e.target.value)}
                  placeholder="e.g. Cyan Variant / Level 4"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-chakra text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-chakra text-gray-400 uppercase tracking-wider mb-1">
                  Account Region *
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#111624] border border-white/10 text-white font-chakra text-sm focus:outline-none focus:border-amber-500/50"
                >
                  <option value="India (MUM)">India (MUM)</option>
                  <option value="Philippines (PHP)">Philippines (PHP)</option>
                  <option value="Asia Pacific (AP)">Asia Pacific (AP)</option>
                  <option value="North America (NA)">North America (NA)</option>
                  <option value="Europe (EU)">Europe (EU)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-chakra text-gray-400 uppercase tracking-wider mb-1">
                  Estimated Trade Value (INR) *
                </label>
                <input
                  type="text"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. ₹6,500"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-chakra text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-chakra text-gray-400 uppercase tracking-wider mb-1">
                Your Contact Email (For Status Updates)
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-chakra text-sm focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-rajdhani text-amber-200/90 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Escrow Fee Policy</span>
              </div>
              VIB charges a flat 3% middleman security fee upon successful ownership confirmation. 0% charged if trade is canceled.
            </div>

            {submitError && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-chakra font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer mt-1 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Escrow Request...</span>
                </>
              ) : (
                <>
                  <span>Create Escrow Ticket</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
