import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Crown,
  Lock,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { Currency } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from './Header';

interface RentalListing {
  id: string;
  title: string;
  description: string;
  image_url: string;
  gallery_json?: string;
  account_identifier: string;
  rank: string;
  region: string;
  featured_skins_json?: string;
  price_24h: number;
  price_3d: number;
  price_7d: number;
  price_30d: number;
  security_deposit: number;
  terms_conditions: string;
  status: string;
}

interface ClientRentalsPageProps {
  currency: Currency;
  onNavigate: (page: ClientPage) => void;
  onOpenCheckout: (title: string, priceINR: number, productId: string, rentalDuration: '24h' | '3d' | '7d' | '30d') => void;
}

export const ClientRentalsPage: React.FC<ClientRentalsPageProps> = ({
  currency,
  onNavigate,
  onOpenCheckout,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<'24h' | '3d' | '7d' | '30d'>('24h');
  const [listings, setListings] = useState<RentalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/rentals', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load rentals');
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setListings(data.listings || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Rentals load error:', err);
        if (active) {
          setFetchError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const getPriceForDuration = (listing: RentalListing, duration: '24h' | '3d' | '7d' | '30d') => {
    switch (duration) {
      case '24h':
        return Number(listing.price_24h ?? 0);
      case '3d':
        return Number(listing.price_3d ?? 0);
      case '7d':
        return Number(listing.price_7d ?? 0);
      case '30d':
        return Number(listing.price_30d ?? 0);
    }
  };

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white space-y-8 pb-20 font-sans">
      {/* 1. HERO HEADER */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-2 w-full">
        <div className="relative rounded-2xl overflow-hidden min-h-[300px] sm:min-h-[400px] lg:min-h-[480px] flex items-center bg-[#070510] shadow-2xl">
          <img
            src="/assets/reference_parts/part_10.png"
            alt="VIB Experience Program Weapon Cases"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0 opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05040a] via-[#05040a]/85 to-[#05040a]/20 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05040a] via-[#05040a]/30 to-transparent z-[1]" />

          {/* Foreground content: Breadcrumbs, Title, Subtitle, Duration Selector */}
          <div className="relative z-10 p-6 sm:p-10 w-full space-y-3.5">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
              <button
                onClick={() => onNavigate('home')}
                className="hover:text-purple-300 transition-colors cursor-pointer"
              >
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-purple-400 font-semibold">Skin Rentals</span>
            </div>

            <div className="max-w-3xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-purple-950/40 border border-purple-500/40 text-purple-300 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>VIB EXPERIENCE PROGRAM</span>
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none font-rajdhani">
                SKIN RENTALS:{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-400 to-pink-400">
                  PREMIUM SKINS. YOUR WAY.
                </span>
              </h1>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                Experience verified high-tier Valorant accounts at flexible rental rates. 100% genuine, database-backed listings managed and approved by administrators.
              </p>
            </div>

            {/* DURATION SELECTOR */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-mono text-gray-400 uppercase font-bold tracking-wider">
                Select Duration:
              </span>
              <div className="inline-flex flex-wrap items-center gap-2">
                {[
                  { key: '24h', label: '24 Hours' },
                  { key: '3d', label: '3 Days' },
                  { key: '7d', label: '7 Days (Popular)' },
                  { key: '30d', label: '30 Days (Best Value)' },
                ].map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setSelectedDuration(d.key as any)}
                    className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                      selectedDuration === d.key
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-600/40 border border-purple-400/50'
                        : 'bg-[#0e0a1f]/90 hover:bg-[#1a1236] border border-white/10 text-gray-300 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. RENTAL CATALOG GRID / PROFESSIONAL EMPTY STATE */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-72 rounded-2xl bg-[#0a0717] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : listings.length === 0 ? (
          // Part 1: Professional empty state when no approved listings exist
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#120a22]/80 to-[#070510] p-12 sm:p-16 text-center max-w-2xl mx-auto space-y-4 shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-900/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black font-rajdhani text-white uppercase tracking-wide">
                No rental profiles are currently available. Please check back later.
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                All approved rental inventory is currently in active play sessions or undergoing scheduled credential rotation. Administrators publish new verified listings as slots reopen.
              </p>
            </div>
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('profiles')}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-rajdhani font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Browse Accounts for Sale
              </button>
              <button
                type="button"
                onClick={() => onNavigate('support')}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-rajdhani font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Contact 24/7 Desk
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((item) => {
              const price = getPriceForDuration(item, selectedDuration);
              let featuredSkins: string[] = [];
              try {
                featuredSkins = typeof item.featured_skins_json === 'string'
                  ? JSON.parse(item.featured_skins_json)
                  : item.featured_skins_json || [];
              } catch {}

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[#0a0717] border border-white/10 hover:border-purple-500/50 p-5 space-y-4 flex flex-col justify-between group shadow-lg transition-all duration-300"
                >
                  <div className="space-y-3">
                    <div className="relative aspect-[16/9] w-full rounded-xl bg-gradient-to-b from-[#140c26] to-[#0a0717] p-3 flex items-center justify-center overflow-hidden border border-white/5">
                      <span className="absolute top-2 left-2 text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 uppercase">
                        {item.rank || 'Verified Rank'}
                      </span>
                      <span className="absolute top-2 right-2 text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 uppercase">
                        {item.region || 'AP / Mumbai'}
                      </span>
                      <img
                        src={item.image_url || '/assets/hires/profiles/card1_exact.jpg'}
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (!img.src.endsWith('/assets/hires/profiles/card1_exact.jpg')) {
                            img.src = '/assets/hires/profiles/card1_exact.jpg';
                          }
                        }}
                        alt={item.title}
                        className="w-[85%] h-auto object-contain group-hover:scale-105 transition-transform drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                      />
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-white font-rajdhani tracking-wide">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        {item.description || 'Full access rental account with premium skins.'}
                      </p>
                    </div>

                    {featuredSkins.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {featuredSkins.slice(0, 3).map((s, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-purple-300 border border-white/5"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase">
                        {selectedDuration} RENTAL
                      </div>
                      <div className="text-xl font-black text-white font-rajdhani">
                        {formatCurrencyPrice(price, currency)}
                      </div>
                      <div className="text-[9px] text-gray-400 font-mono">
                        {Number(item.security_deposit ?? 0) > 0
                          ? `+₹${item.security_deposit} refundable deposit`
                          : 'No security deposit required'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onOpenCheckout(
                          `Rent ${item.title} (${selectedDuration})`,
                          price,
                          item.id,
                          selectedDuration
                        )
                      }
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-xs font-bold font-rajdhani uppercase tracking-wider text-white shadow-md shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                    >
                      <span>Rent Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. 4 RENTAL GUARANTEES */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 rounded-2xl bg-[#0c0a18] border border-white/10 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-purple-400">
              <Zap className="w-4 h-4" />
              <h4 className="font-bold text-sm text-white font-rajdhani">Instant Access</h4>
            </div>
            <p className="text-xs text-gray-400">
              Credentials delivered within 5 minutes directly via WhatsApp or email.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <h4 className="font-bold text-sm text-white font-rajdhani">100% Anti-Cheat Safe</h4>
            </div>
            <p className="text-xs text-gray-400">
              Pure clean verified skins with zero third-party scripts or modifications.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400">
              <Crown className="w-4 h-4" />
              <h4 className="font-bold text-sm text-white font-rajdhani">All Max Variants</h4>
            </div>
            <p className="text-xs text-gray-400">
              Every weapon includes max level animations, finishers, and chromas.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-fuchsia-400">
              <Clock className="w-4 h-4" />
              <h4 className="font-bold text-sm text-white font-rajdhani">Flexible Extensions</h4>
            </div>
            <p className="text-xs text-gray-400">
              Extend your rental anytime with pro-rated discounts on longer periods.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
