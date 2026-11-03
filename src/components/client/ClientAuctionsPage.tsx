import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Clock,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Flame,
  Award,
  AlertCircle,
  QrCode,
  Check,
  X,
  CreditCard,
  Lock,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Currency } from '../../types';
import { ClientPage } from './Header';
import { useAuth } from '../../context/AuthContext';
import { getAuctionTimeLeft } from '../../utils/auction';
import { formatCurrencyPrice } from '../../utils/format';

interface ClientAuctionsPageProps {
  currency: Currency;
  onNavigate: (page: ClientPage) => void;
}

export const ClientAuctionsPage: React.FC<ClientAuctionsPageProps> = ({
  currency,
  onNavigate,
}) => {
  const { user, token, openAuthModal } = useAuth();
  const [activeLots, setActiveLots] = useState<any[]>([]);
  const [selectedLot, setSelectedLot] = useState<any | null>(null);
  const [recentBids, setRecentBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Bidding inputs & live calculation
  const [userBidInput, setUserBidInput] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [bidSuccessMessage, setBidSuccessMessage] = useState<string | null>(null);
  const [bidErrorMessage, setBidErrorMessage] = useState<string | null>(null);

  // Security Deposit Modal
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositData, setDepositData] = useState<{
    depositTxId: string;
    submittedBid: number;
    depositPercentage: number;
    requiredDeposit: number;
    previouslyPaid: number;
    additionalPayable: number;
    alreadyCovered: boolean;
    upiId: string;
    merchantName: string;
    refundPolicySummary: string;
  } | null>(null);
  const [paymentUtr, setPaymentUtr] = useState('');
  const [isConfirmingDeposit, setIsConfirmingDeposit] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Countdown
  const auctionEndsAt = selectedLot?.ends_at || null;
  const [timeLeft, setTimeLeft] = useState(() => getAuctionTimeLeft(auctionEndsAt));
  const isAuctionExpired = !auctionEndsAt || Date.parse(auctionEndsAt) <= Date.now();

  const currentBid = Number(selectedLot?.current_bid) || Number(selectedLot?.starting_bid) || 1000;
  const bidIncrement = Number(selectedLot?.bid_increment) || 150;
  const minRequiredBid = currentBid + bidIncrement;
  const depositPct = Number(selectedLot?.deposit_pct) || 50;

  // Real-time calculations as user types
  const parsedBid = parseInt(userBidInput, 10);
  const isValidBidAmount = !isNaN(parsedBid) && parsedBid >= minRequiredBid;
  const calculatedDeposit = isValidBidAmount
    ? Math.max(Number(selectedLot?.min_deposit_amount) || 500, Math.round(parsedBid * (depositPct / 100)))
    : 0;

  // Fetch all active lots
  const fetchActiveLots = async () => {
    try {
      const res = await fetch('/api/auctions');
      if (!res.ok) return;
      const data = await res.json();
      const lots = Array.isArray(data.lots) ? data.lots : [];
      setActiveLots(lots);
      if (lots.length > 0 && !selectedLot) {
        setSelectedLot(lots[0]);
      }
      setLoading(false);
    } catch (err) {
      console.warn('Could not fetch auctions:', err);
      setLoading(false);
    }
  };

  // Fetch single lot details & bid history
  const fetchLotData = async (lotId: string) => {
    try {
      const res = await fetch(`/api/auctions/${encodeURIComponent(lotId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.lot) {
          setSelectedLot(data.lot);
          setRecentBids(data.bids || []);
        }
      }
    } catch (err) {
      console.warn('Could not fetch auction lot:', err);
    }
  };

  useEffect(() => {
    void fetchActiveLots();
  }, []);

  useEffect(() => {
    if (!selectedLot?.id) return;
    void fetchLotData(selectedLot.id);
    const interval = setInterval(() => {
      void fetchLotData(selectedLot.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedLot?.id]);

  useEffect(() => {
    const updateCountdown = () => setTimeLeft(getAuctionTimeLeft(selectedLot?.ends_at || null));
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [selectedLot?.ends_at]);

  // Step 1: Open Deposit Intent Modal
  const handleInitiateBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidErrorMessage(null);
    setBidSuccessMessage(null);

    if (!user) {
      openAuthModal('login');
      return;
    }

    if (!isValidBidAmount) {
      setBidErrorMessage(
        `Bid must be at least ₹${minRequiredBid.toLocaleString()} (+₹${bidIncrement} increment over ₹${currentBid.toLocaleString()}).`
      );
      return;
    }

    setIsPlacingBid(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/auctions/${encodeURIComponent(selectedLot.id)}/deposit-intent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ submittedBid: parsedBid }),
      });

      const data = await res.json();
      if (!res.ok) {
        setBidErrorMessage(data.error || 'Failed to initialize deposit intent.');
      } else {
        setDepositData(data);
        setIsDepositModalOpen(true);
        setTermsAccepted(false);
        setPaymentUtr('');
      }
    } catch {
      setBidErrorMessage('Network error connecting to deposit service. Please retry.');
    } finally {
      setIsPlacingBid(false);
    }
  };

  // Step 2: Confirm Deposit & Submit Verified Bid
  const handleConfirmDepositAndBid = async () => {
    if (!depositData || !selectedLot) return;
    if (!termsAccepted) {
      alert('Please review and accept the bidding deposit terms and refund conditions.');
      return;
    }

    // If additional payment is required, ensure UTR or transaction ID is entered
    if (!depositData.alreadyCovered && !paymentUtr.trim()) {
      alert('Please enter the UPI UTR / Transaction Reference number after completing payment.');
      return;
    }

    setIsConfirmingDeposit(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Confirm deposit payment
      if (!depositData.alreadyCovered) {
        const confirmRes = await fetch(`/api/auctions/${encodeURIComponent(selectedLot.id)}/deposit-confirm`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            depositTxId: depositData.depositTxId,
            gatewayRef: paymentUtr.trim(),
            paymentMethod: 'UPI_QR',
          }),
        });

        if (!confirmRes.ok) {
          const errData = await confirmRes.json();
          alert(errData.error || 'Deposit payment could not be confirmed.');
          setIsConfirmingDeposit(false);
          return;
        }
      }

      // 2. Place verified bid
      const bidRes = await fetch(`/api/auctions/${encodeURIComponent(selectedLot.id)}/bid`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: depositData.submittedBid,
          depositTxId: depositData.depositTxId,
        }),
      });

      const bidResult = await bidRes.json();
      if (!bidRes.ok) {
        alert(bidResult.error || 'Failed to place verified bid.');
      } else {
        setIsDepositModalOpen(false);
        setUserBidInput('');
        setBidSuccessMessage(bidResult.message || `Verified bid of ₹${depositData.submittedBid.toLocaleString()} placed!`);
        void fetchLotData(selectedLot.id);
        void fetchActiveLots();
        setTimeout(() => setBidSuccessMessage(null), 8000);
      }
    } catch {
      alert('Error finalizing bid. Please check your network connection.');
    } finally {
      setIsConfirmingDeposit(false);
    }
  };

  const isUserWinning = user && selectedLot?.highest_bidder_id === user.id;

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white space-y-12 pb-20 font-sans">
      {/* 1. HERO HEADER */}
      <section className="relative w-full min-h-[220px] sm:min-h-[260px] flex items-center pt-8 pb-6 border-b border-white/5">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[300px] bg-fuchsia-600/15 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-purple-300 transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-fuchsia-400 font-semibold">Live Auctions</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>FINANCIALLY SAFEGUARDED AUCTIONS</span>
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none font-rajdhani">
                VIB AUCTIONS:{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300">
                  BID. WIN. OWN.
                </span>
              </h1>
              <p className="text-gray-300 text-xs sm:text-sm md:text-base leading-relaxed">
                Competitive bidding on verified Valorant accounts with a mandatory 50% bid-security deposit. Prevents phantom bidding, protects honest players, and credits your deposit directly toward the final purchase balance.
              </p>
            </div>

            {/* REAL-TIME COUNTDOWN TIMER CARD */}
            {selectedLot && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#090615] border border-fuchsia-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-3.5 shadow-xl w-full md:w-auto">
                <div className="text-left sm:text-right">
                  <div className="text-[9px] font-mono text-fuchsia-300 uppercase font-bold tracking-wider">
                    LOT CLOSES IN
                  </div>
                  <div className="text-xs text-gray-400 font-mono">Live Clock Sync</div>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-black text-xl sm:text-2xl">
                  <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-fuchsia-950/80 border border-fuchsia-500/50 text-fuchsia-200">
                    {String(timeLeft.hours).padStart(2, '0')}
                    <span className="block text-[8px] text-fuchsia-400 text-center font-normal">HRS</span>
                  </div>
                  <span className="text-fuchsia-400">:</span>
                  <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-fuchsia-950/80 border border-fuchsia-500/50 text-fuchsia-200">
                    {String(timeLeft.minutes).padStart(2, '0')}
                    <span className="block text-[8px] text-fuchsia-400 text-center font-normal">MIN</span>
                  </div>
                  <span className="text-fuchsia-400">:</span>
                  <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 animate-pulse">
                    {String(timeLeft.seconds).padStart(2, '0')}
                    <span className="block text-[8px] text-rose-400 text-center font-normal">SEC</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. PRIMARY LIVE SHOWCASE LOT OR CLEAN EMPTY STATE */}
      <section id="hero-auction-section" className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="h-96 rounded-3xl bg-[#090616] border border-white/5 animate-pulse" />
        ) : !selectedLot ? (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#160b29] to-[#070510] p-12 sm:p-16 text-center max-w-2xl mx-auto space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-fuchsia-900/30 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-300">
              <Gavel className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black font-rajdhani text-white uppercase tracking-wide">
                No active auctions currently open.
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                All previous lots have concluded. Administrators curate and schedule new high-roller lots regularly. Check back soon or browse buy-it-now profiles.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('profiles')}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-rajdhani font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Browse Accounts Catalog
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#130928] via-[#1c0d38] to-[#0e071e] border border-fuchsia-500/40 space-y-6 shadow-2xl relative overflow-hidden">
            <img
              src="/assets/reference_parts/part_22.png"
              alt="Live Auction Auditorium Stage"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0 opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0717] via-[#0a0717]/90 to-[#0a0717]/40 z-[1]" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
              {/* Left Column: Lot Media & Account Specs */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-6 rounded-2xl bg-gradient-to-b from-[#1c103b]/90 to-[#0d081e]/90 backdrop-blur-md border border-fuchsia-500/40 space-y-4 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-fuchsia-900/80 text-fuchsia-200 border border-fuchsia-500/40 uppercase">
                      {selectedLot.lot_number}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isUserWinning ? (
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 uppercase">
                          You are Highest Bidder
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-purple-950 border border-purple-500 text-purple-300 uppercase">
                          {selectedLot.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-6 flex items-center justify-center relative">
                    <img
                      src={selectedLot.image_url || '/assets/items/vandal-prime.png'}
                      alt={selectedLot.title}
                      className="w-[85%] max-h-[220px] object-contain filter drop-shadow-[0_0_30px_rgba(217,70,239,0.7)] hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="space-y-1 pt-2 border-t border-white/10">
                    <h2 className="text-2xl font-black text-white font-rajdhani uppercase tracking-wide">
                      {selectedLot.title}
                    </h2>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {selectedLot.description}
                    </p>
                  </div>
                </div>

                {/* Account Details Box */}
                <div className="p-4 rounded-xl bg-[#090616] border border-white/10 space-y-2 text-xs">
                  <div className="font-bold text-gray-300 font-rajdhani uppercase tracking-wider text-[11px] pb-1 border-b border-white/5">
                    Account Specifications &amp; Transfer
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-gray-300">
                    <div>Region: <strong className="text-white">{selectedLot.server_region || 'AP / Mumbai'}</strong></div>
                    <div>Account Level: <strong className="text-white">{selectedLot.account_level || 150}</strong></div>
                    <div>Delivery: <strong className="text-white">{selectedLot.delivery_eta || 'Within 2 Hours'}</strong></div>
                    <div>Deposit Required: <strong className="text-fuchsia-300">{depositPct}% of your bid</strong></div>
                  </div>
                  {selectedLot.included_benefits && (
                    <div className="text-[11px] text-gray-400 pt-1">
                      Includes: {selectedLot.included_benefits}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Bid Controls & Live Calculation */}
              <div className="lg:col-span-6 p-6 sm:p-7 rounded-2xl bg-[#090616] border border-white/10 space-y-6 shadow-xl">
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#120c2b] border border-white/5 space-y-1">
                    <div className="text-[10px] font-mono text-gray-400 uppercase">CURRENT HIGHEST BID</div>
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-amber-300 font-rajdhani">
                      ₹{currentBid.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-400">
                      {selectedLot.bid_count || 0} valid bids placed
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#120c2b] border border-white/5 space-y-1">
                    <div className="text-[10px] font-mono text-gray-400 uppercase">MINIMUM NEXT BID</div>
                    <div className="text-3xl font-black text-white font-rajdhani">
                      ₹{minRequiredBid.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-mono text-fuchsia-300">
                      +₹{bidIncrement} increment required
                    </div>
                  </div>
                </div>

                {bidSuccessMessage && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{bidSuccessMessage}</span>
                  </div>
                )}

                {bidErrorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{bidErrorMessage}</span>
                  </div>
                )}

                {/* Bid Form with Live Deposit Calculation */}
                <form onSubmit={handleInitiateBid} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-gray-300 font-bold uppercase block">
                      Enter Your Maximum Bid (INR)
                    </label>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold text-lg">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={userBidInput}
                        onChange={(e) => {
                          setUserBidInput(e.target.value);
                          setBidErrorMessage(null);
                        }}
                        min={minRequiredBid}
                        step="50"
                        required
                        disabled={isAuctionExpired}
                        placeholder={`Min ₹${minRequiredBid.toLocaleString()}`}
                        className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-[#150f2e] border border-white/15 focus:border-fuchsia-500 focus:outline-none text-white font-mono font-bold text-lg"
                      />
                    </div>
                  </div>

                  {/* Real-time Deposit Breakdown Card */}
                  {isValidBidAmount && (
                    <div className="p-4 rounded-xl bg-[#180e2f]/80 border border-fuchsia-500/30 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-gray-300">
                        <span>Submitted Bid:</span>
                        <strong className="text-white font-mono">₹{parsedBid.toLocaleString()}</strong>
                      </div>
                      <div className="flex items-center justify-between text-gray-300">
                        <span>Required Security Deposit ({depositPct}%):</span>
                        <strong className="text-fuchsia-300 font-mono">₹{calculatedDeposit.toLocaleString()}</strong>
                      </div>
                      <div className="text-[11px] text-gray-400 pt-1 border-t border-white/10 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>100% refundable if you are outbid or lose the auction.</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isPlacingBid || isAuctionExpired || !isValidBidAmount}
                    className="w-full min-h-[48px] py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-sm font-bold font-rajdhani uppercase tracking-wider text-white shadow-lg shadow-fuchsia-600/40 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                  >
                    {isPlacingBid ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>CALCULATING DEPOSIT...</span>
                      </>
                    ) : isAuctionExpired ? (
                      <span>AUCTION CLOSED</span>
                    ) : (
                      <>
                        <span>VERIFY DEPOSIT &amp; SUBMIT BID</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 pt-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      <span>Security Held in Vault (Not Revenue)</span>
                    </div>
                    <span>Winner Deadline: {selectedLot.winner_payment_deadline_hours || 24} Hours</span>
                  </div>
                </form>

                {/* Recent Bids Feed */}
                {recentBids.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                      Recent Verified Bids
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {recentBids.slice(0, 5).map((b, idx) => (
                        <div
                          key={b.id || idx}
                          className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white/5 font-mono"
                        >
                          <span className="text-gray-300">
                            {idx === 0 ? '👑 ' : ''}{b.bidder_name || 'Verified Bidder'}
                          </span>
                          <span className="text-fuchsia-300 font-bold">
                            ₹{Number(b.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. ADDITIONAL ACTIVE LOTS */}
      {activeLots.length > 1 && (
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="border-b border-white/[0.06] pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-white font-rajdhani uppercase">
              OTHER ACTIVE AUCTION LOTS
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeLots
              .filter((l) => l.id !== selectedLot?.id)
              .map((lot) => (
                <div
                  key={lot.id}
                  onClick={() => {
                    setSelectedLot(lot);
                    setUserBidInput('');
                    setBidErrorMessage(null);
                    document.getElementById('hero-auction-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="p-4 rounded-xl bg-[#0a0717] border border-white/10 hover:border-fuchsia-500/40 cursor-pointer space-y-3 transition-all"
                >
                  <div className="aspect-[16/9] w-full rounded-lg bg-[#140c26] flex items-center justify-center p-2">
                    <img
                      src={lot.image_url || '/assets/items/vandal-prime.png'}
                      alt={lot.title}
                      className="max-h-28 object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white font-rajdhani">{lot.title}</h3>
                    <div className="text-fuchsia-300 font-mono text-xs font-bold pt-1">
                      Current: ₹{Number(lot.current_bid).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. BID SECURITY DEPOSIT VERIFICATION MODAL (PART 3)                       */}
      {/* ========================================================================= */}
      {isDepositModalOpen && depositData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-[#0e091e] border border-fuchsia-500/50 p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsDepositModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-fuchsia-950 text-fuchsia-300 text-[10px] font-mono uppercase font-bold border border-fuchsia-500/40">
                <ShieldCheck className="w-3 h-3" />
                <span>Bid-Security Verification</span>
              </div>
              <h3 className="text-2xl font-black font-rajdhani text-white uppercase">
                Authorize Bid Deposit
              </h3>
              <p className="text-xs text-gray-400">
                Lot #{selectedLot?.lot_number}: {selectedLot?.title}
              </p>
            </div>

            {/* Deposit Calculation Summary */}
            <div className="p-4 rounded-xl bg-[#140c2b] border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Submitted Bid Amount:</span>
                <strong className="text-white font-mono">₹{depositData.submittedBid.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Total Required Deposit (50%):</span>
                <strong className="text-fuchsia-300 font-mono">₹{depositData.requiredDeposit.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Previously Held Deposit Credit:</span>
                <strong className="text-emerald-400 font-mono">-₹{depositData.previouslyPaid.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                <span>Amount Payable Now:</span>
                <span className="text-fuchsia-300 font-mono text-base">
                  ₹{depositData.additionalPayable.toLocaleString()}
                </span>
              </div>
            </div>

            {/* UPI QR Payment Block if additional deposit payable */}
            {depositData.additionalPayable > 0 ? (
              <div className="space-y-3 p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-white p-1 flex items-center justify-center shrink-0">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                        `upi://pay?pa=${depositData.upiId}&pn=${encodeURIComponent(
                          depositData.merchantName
                        )}&am=${depositData.additionalPayable}&tn=${encodeURIComponent(
                          `VIB Bid Deposit: ${depositData.depositTxId}`
                        )}`
                      )}`}
                      alt="UPI QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-white font-rajdhani uppercase">
                      Scan to Pay with Any UPI App
                    </div>
                    <div className="font-mono text-[11px] text-fuchsia-300">
                      UPI ID: {depositData.upiId}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Google Pay, PhonePe, Paytm, BHIM, CRED
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-mono text-gray-300 block">
                    Enter UPI UTR / Transaction Reference (12 Digits)
                  </label>
                  <input
                    type="text"
                    value={paymentUtr}
                    onChange={(e) => setPaymentUtr(e.target.value)}
                    placeholder="e.g. 429188172901"
                    className="w-full px-3 py-2 rounded-lg bg-[#0e0a1f] border border-white/20 text-white font-mono text-xs focus:border-fuchsia-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Your previously deposited funds fully cover this bid raise! No additional deposit required.</span>
              </div>
            )}

            {/* Legal Disclosures & Consent Checkbox */}
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-[11px] text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 bg-white/10 text-fuchsia-600 focus:ring-fuchsia-500"
                />
                <span>
                  I understand that my deposit is held in escrow as bid security. It is <strong>100% refundable</strong> if I am outbid or lose the auction. If I win, this deposit is credited toward the final balance, which I agree to settle within 24 hours.
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={isConfirmingDeposit || !termsAccepted}
                onClick={handleConfirmDepositAndBid}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-rajdhani font-bold text-sm uppercase tracking-wider shadow-lg shadow-fuchsia-600/40 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfirmingDeposit ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>CONFIRMING SECURITY DEPOSIT...</span>
                  </>
                ) : (
                  <>
                    <span>CONFIRM DEPOSIT &amp; LOCK BID</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
