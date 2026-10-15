import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, Zap, AlertCircle, Copy, ArrowRight } from 'lucide-react';
import { VPPackage, Currency } from '../types';
import { VP_PACKAGES } from '../data/packages';
import { useAuth } from '../context/AuthContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg?: VPPackage;
  customItem?: { title: string; priceINR: number };
  currency: Currency;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  pkg,
  customItem,
  currency,
}) => {
  const { user, token } = useAuth();
  const [riotId, setRiotId] = useState(() => user?.riot_id?.split('#')[0] || '');
  const [tagline, setTagline] = useState(() => user?.riot_id?.split('#')[1] || '');
  const [email, setEmail] = useState(() => user?.email || '');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [orderState, setOrderState] = useState<'form' | 'processing' | 'success'>('form');
  const [copied, setCopied] = useState(false);

  // Sync user info when modal opens
  React.useEffect(() => {
    if (user && isOpen) {
      if (user.riot_id) {
        const parts = user.riot_id.split('#');
        if (parts[0]) setRiotId(parts[0]);
        if (parts[1]) setTagline(parts[1]);
      }
      if (user.email) setEmail(user.email);
    }
  }, [user, isOpen]);

  // Close on Escape key press and lock body scroll
  React.useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activePkg = pkg || VP_PACKAGES[0];
  const currentPriceINR = customItem ? customItem.priceINR : activePkg.priceINR;
  const currentTitle = customItem ? customItem.title : `${activePkg.vpLabel} (${activePkg.agentName} Edition)`;

  const priceText =
    currency === 'USD'
      ? `$${(currentPriceINR / 83).toFixed(2)}`
      : currency === 'EUR'
      ? `€${(currentPriceINR / 90).toFixed(2)}`
      : `₹${currentPriceINR.toLocaleString('en-IN')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riotId || !tagline) return;
    setOrderState('processing');

    if (token) {
      try {
        await fetch('/api/user/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: currentTitle,
            amount: currentPriceINR,
            currency,
            type: currentTitle.includes('VP') ? 'vp' : 'profile',
            paymentMethod: paymentMethod === 'upi' ? 'UPI Instant Transfer' : paymentMethod === 'card' ? 'Credit/Debit Card' : 'Net Banking',
            details: {
              riotId: `${riotId}#${tagline}`,
              email,
            },
          }),
        });
      } catch (err) {
        console.warn('Order dispatch error:', err);
      }
    }

    setTimeout(() => {
      setOrderState('success');
    }, 1200);
  };

  const handleReset = () => {
    setOrderState('form');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="relative w-full max-w-lg rounded-2xl bg-[#0b1018] border border-white/15 p-6 sm:p-8 shadow-2xl overflow-hidden"
        style={{
          boxShadow: `0 0 50px ${activePkg.theme.accentGlow}`,
        }}
      >
        {/* Top Accent Line */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5 z-20"
          style={{ backgroundColor: activePkg.theme.primaryColor }}
        />

        {/* LAYER 1: Background Character Artwork (Clearly visible, contained inside card, behind UI) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 rounded-2xl select-none">
          {/* Ambient luminous backlight glow */}
          <div
            className="absolute -top-12 -left-12 w-80 h-80 rounded-full blur-[100px] opacity-35 pointer-events-none"
            style={{ backgroundColor: activePkg.theme.primaryColor }}
          />
          {/* Character artwork with boosted brightness & contrast so suit/face details pop */}
          <img
            src={activePkg.characterAsset}
            alt={activePkg.agentName}
            className="absolute -bottom-10 -left-6 sm:-left-2 h-[85%] sm:h-[95%] max-w-[50%] sm:max-w-[42%] object-contain object-bottom filter brightness-125 contrast-110 drop-shadow-[0_0_25px_rgba(0,0,0,0.85)] opacity-30 sm:opacity-40 transition-all pointer-events-none"
            referrerPolicy="no-referrer"
          />
          {/* Readability gradient overlays: transparent near character edge, rich dark solid over form area */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0b1018]/85 to-[#0b1018] z-[1] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1018] via-transparent to-transparent z-[1] pointer-events-none" />
        </div>

        {/* Close Button */}
        <button
          id="close-checkout-modal"
          type="button"
          onClick={handleReset}
          aria-label="Close checkout modal"
          className="absolute top-4 right-4 z-20 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <X className="w-5 h-5" />
        </button>

        {orderState === 'form' && (
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
                style={{
                  backgroundColor: `${activePkg.theme.primaryColor}20`,
                  borderColor: activePkg.theme.primaryColor,
                }}
              >
                <Zap className="w-5 h-5" style={{ color: activePkg.theme.primaryColor }} />
              </div>
              <div>
                <h3 id="checkout-title" className="font-chakra font-bold text-xl text-white">
                  Order {currentTitle}
                </h3>
                <p className="text-xs font-rajdhani text-gray-400">
                  Direct In-Game Delivery via VIB Instant Dispatch
                </p>
              </div>
            </div>

            {/* Selected Package Banner */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between mb-5 relative z-10 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center p-1 relative shrink-0 overflow-hidden border"
                  style={{
                    backgroundColor: `${activePkg.theme.primaryColor}15`,
                    borderColor: `${activePkg.theme.primaryColor}40`,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-xl blur-md opacity-30 pointer-events-none"
                    style={{ backgroundColor: activePkg.theme.primaryColor }}
                  />
                  <img
                    src={activePkg.characterAsset}
                    alt={activePkg.agentName}
                    className="w-full h-full object-contain filter brightness-125 contrast-115 drop-shadow-[0_0_8px_rgba(0,0,0,0.9)] relative z-10"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="font-chakra font-bold text-sm text-white">
                    {currentTitle}
                  </div>
                  <div className="text-xs font-rajdhani text-gray-400">
                    Supports Riot Accounts (India / SEA / Global)
                  </div>
                </div>
              </div>
              <div
                className="font-rajdhani font-bold text-xl shrink-0"
                style={{ color: activePkg.theme.primaryColor }}
              >
                {priceText}
              </div>
            </div>

            {/* Checkout Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Riot ID & Tag */}
              <div>
                <label className="block text-xs font-chakra tracking-wider text-gray-300 uppercase mb-1.5">
                  Riot ID & Tagline *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    id="input-riot-name"
                    type="text"
                    required
                    placeholder="e.g. PhoenixAim"
                    value={riotId}
                    onChange={(e) => setRiotId(e.target.value)}
                    className="col-span-2 px-3.5 py-2.5 rounded-lg bg-black/50 border border-white/15 text-white placeholder-gray-500 text-base sm:text-sm font-chakra focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  />
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-gray-500 font-mono">#</span>
                    <input
                      id="input-riot-tag"
                      type="text"
                      required
                      placeholder="IND1"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-black/50 border border-white/15 text-white placeholder-gray-500 text-base sm:text-sm font-chakra focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Find your Tagline in your Valorant client profile (e.g. PlayerName#NA1)
                </span>
              </div>

              {/* Email / Delivery Notification */}
              <div>
                <label className="block text-xs font-chakra tracking-wider text-gray-300 uppercase mb-1.5">
                  Delivery Receipt Email
                </label>
                <input
                  id="input-delivery-email"
                  type="email"
                  placeholder="yourname@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-black/50 border border-white/15 text-white placeholder-gray-500 text-base sm:text-sm font-chakra focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                />
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-chakra tracking-wider text-gray-300 uppercase mb-1.5">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'upi', label: 'UPI / QR', sub: 'Instant' },
                    { id: 'card', label: 'Card', sub: 'Visa/MC' },
                    { id: 'netbanking', label: 'NetBank', sub: 'Direct' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id as 'upi' | 'card' | 'netbanking')}
                      className={`min-h-[44px] p-2.5 rounded-lg border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                        paymentMethod === method.id
                          ? 'bg-white/15 border-white text-white shadow'
                          : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <div className="font-chakra font-bold text-xs">{method.label}</div>
                      <div className="text-[9px] font-rajdhani text-gray-400">{method.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Security guarantee */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Riot Games Authorized Merchant API • Instant Delivery Guarantee</span>
              </div>

              {/* Submit CTA */}
              <button
                id="btn-confirm-payment"
                type="submit"
                className="w-full py-3.5 rounded-xl font-chakra font-bold text-base text-black flex items-center justify-center gap-2 transition-all duration-200 transform active:scale-98 shadow-lg cursor-pointer hover:brightness-110 mt-2"
                style={{
                  background: activePkg.theme.ctaGradient,
                  boxShadow: `0 0 20px ${activePkg.theme.accentGlow}`,
                }}
              >
                <span>Proceed to Pay {priceText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {orderState === 'processing' && (
          <div className="py-12 flex flex-col items-center text-center space-y-4">
            <div
              className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: pkg.theme.primaryColor, borderTopColor: 'transparent' }}
            />
            <h4 className="font-chakra font-bold text-lg text-white">
              Connecting to Riot Valorant Network...
            </h4>
            <p className="text-xs font-rajdhani text-gray-400 max-w-xs">
              Verifying Riot ID #{tagline || 'IND1'} and reserving {pkg.vpLabel} allocation...
            </p>
          </div>
        )}

        {orderState === 'success' && (
          <div className="py-6 flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h4 className="font-chakra font-bold text-2xl text-white">
                Order Dispatched Successfully!
              </h4>
              <p className="text-sm font-rajdhani text-gray-300 mt-1">
                {currentTitle} successfully credited to <strong className="text-white">{riotId}#{tagline}</strong>
              </p>
            </div>

            {/* Receipt Box */}
            <div className="w-full p-4 rounded-xl bg-black/60 border border-white/10 text-left font-rajdhani space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Order Reference:</span>
                <span className="font-mono text-white">VIB-ORD-{Math.floor(100000 + Math.random() * 900000)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Item / Service:</span>
                <span className="text-white">{currentTitle}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Total Paid:</span>
                <span className="font-bold text-emerald-400">{priceText}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Status:</span>
                <span className="text-emerald-400 font-bold">COMPLETED • INSTANT SYNC</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-chakra font-bold text-sm transition-colors"
            >
              Return to Showcase
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
