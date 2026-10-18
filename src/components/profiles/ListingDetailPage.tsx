import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Heart,
  ShoppingCart,
  Share2,
  ExternalLink,
  MessageSquare,
  Award,
  Zap,
  Sparkles,
  Crown,
  AlertCircle,
  Copy,
  Check,
  Play,
  Flame,
  User,
} from 'lucide-react';
import { Currency, CartItem } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from '../client/Header';
import { soundFx } from '../../utils/audio';

interface ListingDetailPageProps {
  listingId: string;
  currency: Currency;
  onNavigate: (page: ClientPage, id?: string) => void;
  onAddToCart: (item: CartItem) => void;
  onOpenCheckout: (title: string, priceINR: number, productId?: string) => void;
}

export const ListingDetailPage: React.FC<ListingDetailPageProps> = ({
  listingId,
  currency,
  onNavigate,
  onAddToCart,
  onOpenCheckout,
}) => {
  const [listing, setListing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [inspectingSkin, setInspectingSkin] = useState<any | null>(null);
  const [availableSkins, setAvailableSkins] = useState<any[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspectingSkin(null);
        setActiveVideoUrl(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!listingId) {
      setError('No listing ID provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch listing details
    fetch(`/api/listings/${listingId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Listing not found or is no longer available.');
        return res.json();
      })
      .then((data) => {
        if (data && data.listing) {
          setListing(data.listing);
        } else {
          setError('Listing data could not be retrieved.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Error loading listing.');
      })
      .finally(() => {
        setLoading(false);
      });

    // Also fetch skin catalog for rich metadata if matching skins exist
    fetch('/api/skins')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.skins)) {
          setAvailableSkins(data.skins);
        }
      })
      .catch(() => {});
  }, [listingId]);

  const handleCopyLink = () => {
    soundFx.playClickSound();
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getRankBadgeUrl = (rank: string) => {
    const cleanRank = String(rank || '').toLowerCase();
    if (cleanRank.includes('radiant')) return '/assets/hires/ranks/radiant.png';
    if (cleanRank.includes('immortal')) return '/assets/hires/ranks/immortal.png';
    if (cleanRank.includes('ascendant')) return '/assets/hires/ranks/ascendant.png';
    if (cleanRank.includes('diamond')) return '/assets/hires/ranks/diamond.png';
    if (cleanRank.includes('platinum')) return 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/17/largeIcon.png';
    if (cleanRank.includes('gold')) return 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/14/largeIcon.png';
    if (cleanRank.includes('silver')) return 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/11/largeIcon.png';
    if (cleanRank.includes('bronze')) return 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/8/largeIcon.png';
    if (cleanRank.includes('iron')) return 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/5/largeIcon.png';
    return '/assets/hires/ranks/immortal.png';
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-4">
        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-sm font-mono text-purple-300">Retrieving official escrow listing records...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-[70vh] max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black font-rajdhani text-white uppercase tracking-wider">
          Listing Unavailable
        </h2>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          {error || 'This digital account listing is not currently available or has already been acquired by another verified buyer.'}
        </p>
        <button
          onClick={() => onNavigate('profiles')}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse Available Profiles</span>
        </button>
      </div>
    );
  }

  const images = Array.isArray(listing.images) && listing.images.length > 0
    ? listing.images
    : ['/assets/hires/profiles/card1_exact.jpg', '/assets/hires/profiles/card2_exact.jpg'];
  const activeImage = images[activeImageIndex] || images[0];
  const skins: any[] = Array.isArray(listing.skins) ? listing.skins : [];
  const isGuaranteed = listing.guarantee_type === 'lifetime_guaranteed';
  const originalPrice = listing.price_inr ? Math.round(listing.price_inr * 1.35) : 0;

  return (
    <div className="min-h-screen pb-20 pt-6">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Breadcrumb & Back */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <span>/</span>
            <button
              onClick={() => onNavigate('profiles')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Digital Profiles
            </button>
            <span>/</span>
            <span className="text-purple-400 truncate max-w-[240px] sm:max-w-md font-semibold">
              {listing.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Copy Listing URL"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>

            <button
              onClick={() => onNavigate('profiles')}
              className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-xs font-semibold text-purple-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Profiles</span>
            </button>
          </div>
        </div>

        {/* Main Product Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Center Column: Gallery, Specs & Inventory (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Gallery Card */}
            <div className="rounded-2xl bg-[#0c0d1c] border border-white/10 overflow-hidden shadow-2xl relative">
              {/* Main Active Image Preview */}
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-black/80 overflow-hidden flex items-center justify-center">
                <img
                  src={activeImage}
                  alt={listing.title}
                  className="w-full h-full object-cover sm:object-contain transition-all duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/hires/profiles/card1_exact.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d1c] via-transparent to-transparent pointer-events-none" />

                {/* Top Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                  <span
                    className={`text-[11px] font-black tracking-wider px-3 py-1 rounded-lg uppercase shadow-lg font-rajdhani flex items-center gap-1.5 ${
                      isGuaranteed
                        ? 'bg-amber-500 text-black shadow-amber-500/30'
                        : 'bg-sky-500 text-black shadow-sky-500/30'
                    }`}
                  >
                    {isGuaranteed ? <Crown className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>{isGuaranteed ? 'LIFETIME GUARANTEED' : 'COMMUNITY ESCROW PROTECTED'}</span>
                  </span>

                  {listing.vip_plan && listing.vip_plan !== 'none' && (
                    <span className="text-[11px] font-extrabold px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg uppercase font-rajdhani">
                      {listing.vip_plan.toUpperCase()} TIER
                    </span>
                  )}
                </div>

                {/* Heart Toggle */}
                <button
                  type="button"
                  onClick={() => setIsFav(!isFav)}
                  aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  className="absolute top-4 right-4 min-w-[44px] min-h-[44px] rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer z-10"
                >
                  <Heart className={`w-5 h-5 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-gray-200'}`} />
                </button>
              </div>

              {/* Thumbnails Carousel */}
              {images.length > 1 && (
                <div className="p-3 bg-[#0a0a14] border-t border-white/5 flex items-center gap-2 overflow-x-auto">
                  {images.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        activeImageIndex === idx ? 'border-purple-500 shadow-md scale-105' : 'border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Account Quick Metrics & Competitive Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl bg-[#0c0d1c] border border-white/10 flex items-center gap-3">
                <img
                  src={getRankBadgeUrl(listing.rank)}
                  alt={listing.rank}
                  className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                />
                <div>
                  <div className="text-[10px] text-gray-400 font-mono uppercase">Current Rank</div>
                  <div className="text-sm sm:text-base font-black text-white font-rajdhani">{listing.rank}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0c0d1c] border border-white/10 flex items-center gap-3">
                <img
                  src={getRankBadgeUrl(listing.peak_rank || listing.rank)}
                  alt={listing.peak_rank || listing.rank}
                  className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                />
                <div>
                  <div className="text-[10px] text-gray-400 font-mono uppercase">Peak Rank</div>
                  <div className="text-sm sm:text-base font-black text-white font-rajdhani">{listing.peak_rank || listing.rank}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0c0d1c] border border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold font-mono text-sm">
                  {listing.level || 1}
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 font-mono uppercase">Account Level</div>
                  <div className="text-sm sm:text-base font-black text-white font-rajdhani">Level {listing.level || 1}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0c0d1c] border border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 font-mono uppercase">Region / Server</div>
                  <div className="text-sm sm:text-base font-black text-white font-rajdhani">{listing.region || 'AP / Mumbai'}</div>
                </div>
              </div>
            </div>

            {/* Account Details & Description */}
            <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/10 space-y-4">
              <h3 className="text-lg font-black font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Account Profile Information</span>
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                {listing.description || 'This verified account comes with full email change access, clean competitive matchmaking record, and guaranteed handover security verified by VIB Middleman Desk.'}
              </p>

              {/* Guarantee Spec Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                <div className="flex items-center gap-2 text-xs text-gray-300 bg-white/5 p-2.5 rounded-lg border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Full First Email / Current Email Access Included</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300 bg-white/5 p-2.5 rounded-lg border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Zero Competitive Bans or Hardware Flags</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300 bg-white/5 p-2.5 rounded-lg border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Clean MMR on Mumbai & Singapore Servers</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300 bg-white/5 p-2.5 rounded-lg border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Protected by VIB Middleman Escrow Hold</span>
                </div>
              </div>
            </div>

            {/* Weapon Skins Inventory Showcase */}
            <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-white/10 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black font-rajdhani text-white uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Included Weapon Skins ({skins.length})</span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Skins confirmed present on this account. Click on upgraded skins to view preview clips.
                  </p>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {listing.knife_count ? `${listing.knife_count} Knives` : 'Melees Included'}
                </span>
              </div>

              {skins.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No specific skins listed for this account.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {skins.map((skinItem: any, i) => {
                    const skinName: string = typeof skinItem === 'string' ? skinItem : skinItem?.name || 'Weapon Skin';
                    const skinObj: any = typeof skinItem === 'object' && skinItem !== null ? skinItem : null;
                    const matched = availableSkins.find(
                      (s) =>
                        s.name.toLowerCase() === skinName.toLowerCase() ||
                        s.name.toLowerCase().includes(skinName.toLowerCase()) ||
                        skinName.toLowerCase().includes(s.name.toLowerCase())
                    );
                    const resolvedSkin = {
                      name: skinName,
                      image_url: (skinObj?.image_url as string | undefined) || matched?.image_url || null,
                      video_url: (skinObj?.video_url as string | undefined) || matched?.video_url || null,
                      weapon: (skinObj?.weapon as string | undefined) || matched?.weapon || 'Weapon Skin',
                      collection: (skinObj?.collection as string | undefined) || matched?.collection || 'Official Collection',
                      tier: (skinObj?.tier as string | undefined) || matched?.tier || 'Exclusive',
                    };
                    const hasVideo = Boolean(resolvedSkin.video_url);

                    return (
                      <div
                        key={i}
                        onClick={() => setInspectingSkin(resolvedSkin)}
                        className="p-3 rounded-xl bg-[#121324] border border-white/10 hover:border-purple-500/50 hover:bg-[#181930] transition-all flex items-center justify-between gap-3 group cursor-pointer"
                        title={
                          hasVideo
                            ? `Click to view details & play upgrade animation for ${skinName}`
                            : `Click to view official artwork for ${skinName}`
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center p-1 shrink-0 overflow-hidden group-hover:border-purple-500/40 transition-colors">
                            {resolvedSkin.image_url ? (
                              <img
                                src={resolvedSkin.image_url}
                                alt={skinName}
                                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/assets/items/vandal-prime.png';
                                }}
                              />
                            ) : (
                              <Sparkles className="w-4 h-4 text-purple-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                              {skinName}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
                              <span>{resolvedSkin.weapon}</span>
                              {hasVideo && (
                                <span className="text-purple-400 text-[9px] font-semibold flex items-center gap-0.5">
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  Video
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {hasVideo ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingSkin(resolvedSkin);
                            }}
                            className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm"
                            title="Play Official Upgrade Video"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        ) : (
                          <div className="text-[10px] text-gray-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            Inspect
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Purchase Box & Escrow Security (4 cols) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* Price & Primary Purchase Card */}
            <div className="p-6 rounded-2xl bg-[#0c0d1c] border border-purple-500/40 shadow-2xl shadow-purple-900/20 space-y-5">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-purple-400 uppercase font-bold">
                  OFFICIAL ESCROW PRICE
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-3xl sm:text-4xl font-black text-white font-rajdhani tracking-tight">
                    {formatCurrencyPrice(listing.price_inr, currency)}
                  </div>
                  {originalPrice > listing.price_inr && (
                    <div className="text-sm font-mono text-gray-400 line-through">
                      {formatCurrencyPrice(originalPrice, currency)}
                    </div>
                  )}
                </div>
                <div className="text-xs text-emerald-400 font-medium mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Instant Manual UPI QR & Escrow Verification</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => onOpenCheckout(listing.title, listing.price_inr, listing.id)}
                  className="w-full min-h-[48px] px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Buy Account (Escrow Protected)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClickSound();
                    onAddToCart({
                      id: listing.id,
                      title: listing.title,
                      subtitle: `${listing.rank} • Level ${listing.level}`,
                      priceINR: listing.price_inr,
                      type: 'profile',
                      image: activeImage,
                      quantity: 1,
                    });
                  }}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/15 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-gray-300" />
                  <span>Add to Shopping Cart</span>
                </button>

                <a
                  href={`https://wa.me/919181801766?text=${encodeURIComponent(
                    `Hello VIB Team, I have an inquiry about profile listing #${listing.id} (${listing.title}). Price: ₹${listing.price_inr}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Inquire on WhatsApp (+91 9181801766)</span>
                </a>
              </div>

              {/* Seller Trust Capsule */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Seller / Provider</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    <span>{listing.seller_name || 'VIB Official'}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Protection Standard</span>
                  <span className="font-bold text-purple-300">
                    {isGuaranteed ? 'Lifetime Replacement' : 'VIB Escrow Lock'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Delivery Method</span>
                  <span className="font-bold text-emerald-400">Live Order Room Handover</span>
                </div>
              </div>
            </div>

            {/* How VIB Escrow Protects You */}
            <div className="p-5 rounded-2xl bg-[#0a0a16] border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>The VIB Escrow Guarantee</span>
              </h4>
              <ul className="text-[11px] text-gray-400 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">1.</span>
                  <span>Your payment is deposited into secure VIB escrow. The seller does not receive funds until you inspect and verify.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">2.</span>
                  <span>VIB compliance staff verifies login credentials, recovery phone, and email before delivery.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">3.</span>
                  <span>You change all credentials under middleman guidance in the Order Room. If anything does not match, 100% full refund.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Skin Detail & Video Inspection Modal (Play once, loop={false}, strictly no placeholders) */}
      {(inspectingSkin || activeVideoUrl) && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setInspectingSkin(null);
            setActiveVideoUrl(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl rounded-2xl bg-[#0c0d1c] border border-purple-500/40 p-5 shadow-2xl overflow-hidden space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                {inspectingSkin?.image_url && (
                  <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 p-1 flex items-center justify-center shrink-0">
                    <img
                      src={inspectingSkin.image_url}
                      alt={inspectingSkin.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/items/vandal-prime.png';
                      }}
                    />
                  </div>
                )}
                <div>
                  <h4 className="text-base sm:text-lg font-bold font-rajdhani text-white uppercase tracking-wider">
                    {inspectingSkin ? inspectingSkin.name : 'Skin Showcase Preview'}
                  </h4>
                  <div className="flex items-center gap-2 text-xs font-mono text-purple-300">
                    <span>{inspectingSkin?.weapon || 'Cosmetic Skin'}</span>
                    {inspectingSkin?.collection && (
                      <>
                        <span>•</span>
                        <span>{inspectingSkin.collection}</span>
                      </>
                    )}
                    {inspectingSkin?.tier && (
                      <>
                        <span>•</span>
                        <span className="text-amber-400 font-semibold">{inspectingSkin.tier} Tier</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setInspectingSkin(null);
                  setActiveVideoUrl(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
              >
                Close (ESC)
              </button>
            </div>

            {/* Media Presentation: Official Riot Upgrade Video if available (loop={false}), else official image */}
            {(inspectingSkin?.video_url || activeVideoUrl) ? (
              <div className="space-y-2">
                <div className="relative w-full aspect-video rounded-xl bg-black overflow-hidden border border-white/10 shadow-inner">
                  <video
                    src={inspectingSkin?.video_url || activeVideoUrl || ''}
                    controls
                    autoPlay
                    muted
                    loop={false}
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 px-1">
                  <span className="flex items-center gap-1.5 text-purple-300">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Official Riot In-Game Upgrade Animation
                  </span>
                  <span className="text-gray-400">Plays once (no loop)</span>
                </div>
              </div>
            ) : inspectingSkin?.image_url ? (
              <div className="space-y-2">
                <div className="relative w-full aspect-video rounded-xl bg-gradient-to-b from-[#14152b] to-[#080914] border border-white/10 flex items-center justify-center p-8 overflow-hidden shadow-inner">
                  <img
                    src={inspectingSkin.image_url}
                    alt={inspectingSkin.name}
                    className="max-h-full max-w-full object-contain filter drop-shadow-[0_15px_30px_rgba(168,85,247,0.35)] hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/items/vandal-prime.png';
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 px-1">
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Official Riot Games Artwork
                  </span>
                  <span>No standalone upgrade video available for this cosmetic tier</span>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-black/40 border border-white/10 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-purple-400 mx-auto" />
                <p className="text-xs text-gray-300">Cosmetic weapon confirmed in account inventory.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
