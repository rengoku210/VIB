import React, { useState } from 'react';
import { ArrowRight, ShoppingBag, Zap, ShieldCheck } from 'lucide-react';
import { Currency, CartItem, DigitalProfile, AppPage } from '../../types';
import { FEATURED_PROFILES_IMAGE_3 } from '../../data/mockData';
import { formatCurrencyPrice } from '../../utils/format';

interface FeaturedProfilesSectionProps {
  currency: Currency;
  onViewAllProfiles: () => void;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (title: string, priceINR: number) => void;
  onNavigate?: (page: AppPage, id?: string) => void;
}

export const FeaturedProfilesSection: React.FC<FeaturedProfilesSectionProps> = ({
  currency,
  onViewAllProfiles,
  onAddToCart,
  onBuyNow,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'featured' | 'our' | 'community'>('featured');

  const filteredProfiles = FEATURED_PROFILES_IMAGE_3;

  const handleAdd = (profile: DigitalProfile) => {
    onAddToCart({
      id: profile.id,
      title: profile.title,
      subtitle: `${profile.rank} • Level ${profile.level}`,
      priceINR: profile.priceINR,
      type: 'profile',
      image: profile.bannerAsset,
      quantity: 1,
    });
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono tracking-widest text-fuchsia-400 uppercase mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Hand-Verified Vault</span>
          </div>
          <h2 className="font-chakra font-black text-2xl sm:text-3xl uppercase tracking-wider text-white">
            FEATURED DIGITAL PROFILES
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm font-rajdhani">
            Top verified accounts equipped with exclusive weapon skins and high competitive ratings.
          </p>
        </div>

        {/* Tabs & View All Button */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center bg-[#0e1424] p-1 rounded-xl border border-white/10 text-xs font-chakra font-bold">
            {[
              { id: 'featured', label: 'Featured' },
              { id: 'our', label: 'Our Profiles' },
              { id: 'community', label: 'Community Listings' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(192,38,211,0.4)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={onViewAllProfiles}
            className="text-xs sm:text-sm font-chakra font-bold text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>View All Profiles</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Skin Showcase Cards (Matching Image 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProfiles.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl bg-[#0c101d] border border-white/10 hover:border-fuchsia-500/50 transition-all duration-300 flex flex-col justify-between overflow-hidden group shadow-xl hover:shadow-[0_0_25px_rgba(192,38,211,0.2)]"
          >
            {/* Skin Showcase Banner Image */}
            <div
              onClick={() => onNavigate ? onNavigate('listing', p.id) : onViewAllProfiles()}
              className="relative aspect-[16/9] w-full overflow-hidden bg-black/50 cursor-pointer"
            >
              <img
                src={p.bannerAsset}
                alt={p.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c101d] via-transparent to-black/40" />

              {/* Badges on Banner */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <span className="text-[10px] font-chakra font-bold px-2 py-0.5 rounded bg-fuchsia-600/80 text-white backdrop-blur-md">
                  {p.rank}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-gray-300 backdrop-blur-md border border-white/10">
                  Lvl {p.level}
                </span>
              </div>

              {p.badge && (
                <span className="absolute top-2.5 right-2.5 text-[9px] font-chakra font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                  {p.badge}
                </span>
              )}
            </div>

            {/* Content Details */}
            <div className="p-4 flex-1 space-y-2.5">
              <div className="text-[10px] font-mono text-gray-400">{p.code}</div>
              <h3
                onClick={() => onNavigate ? onNavigate('listing', p.id) : onViewAllProfiles()}
                className="font-chakra font-bold text-base text-white group-hover:text-fuchsia-300 transition-colors line-clamp-1 cursor-pointer"
              >
                {p.title}
              </h3>

              <div className="flex flex-wrap gap-1.5">
                {p.skins.slice(0, 3).map((skin, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-rajdhani px-2 py-0.5 rounded bg-[#141a2e] text-gray-300 border border-white/5 truncate max-w-[120px]"
                  >
                    {skin}
                  </span>
                ))}
                {p.skins.length > 3 && (
                  <span className="text-[10px] font-mono text-gray-400 px-1">
                    +{p.skins.length - 3}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400 font-rajdhani">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Replacement Guarantee</span>
              </div>
            </div>

            {/* Pricing & CTA */}
            <div className="p-4 pt-3 border-t border-white/10 bg-[#090d18] flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] text-gray-500 line-through font-mono">
                  {formatCurrencyPrice(p.originalPriceINR, currency)}
                </div>
                <div className="font-chakra font-black text-lg text-fuchsia-400">
                  {formatCurrencyPrice(p.priceINR, currency)}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdd(p)}
                  className="p-2 rounded-xl border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-600/20 transition-colors cursor-pointer"
                  title="Add to Cart"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onBuyNow(p.title, p.priceINR)}
                  className="px-3 py-2 rounded-xl font-chakra font-bold text-xs uppercase tracking-wider text-white transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #c026d3 0%, #9333ea 100%)',
                  }}
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};