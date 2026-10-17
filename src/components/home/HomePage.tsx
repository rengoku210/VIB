import React, { useState } from 'react';
import { HomeHeroClient } from './HomeHeroClient';
import { ServicesGrid } from './ServicesGrid';
import { FeaturedProfilesSection } from './FeaturedProfilesSection';
import { ProfileSpotlight } from './ProfileSpotlight';
import { HowVIBWorks } from './HowVIBWorks';
import { TrustComplianceSection } from './TrustComplianceSection';
import { CommunityBanner } from './CommunityBanner';
import { Footer } from './Footer';
import { Currency, AppPage, CartItem } from '../../types';

interface HomePageProps {
  currency: Currency;
  onNavigate: (page: AppPage, pkgIndex?: number) => void;
  onOpenCheckout: (title?: string, price?: number) => void;
  onAddToCart: (item: CartItem) => void;
  onOpenDiscordModal: () => void;
  onOpenEscrowModal: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  currency,
  onNavigate,
  onOpenCheckout,
  onAddToCart,
  onOpenDiscordModal,
  onOpenEscrowModal,
}) => {
  return (
    <div className="w-full flex flex-col bg-[#070a10] text-white">
      {/* 1. Official Platform Hero with Cyberpunk Assassin & Metrics (Matching Image 3) */}
      <HomeHeroClient
        onExploreProfiles={() => onNavigate('profiles')}
        onBuyVP={() => onNavigate('vp')}
      />

      {/* 2. 8 Glowing Services Grid (Matching Image 3) */}
      <ServicesGrid
        onNavigate={onNavigate}
        onOpenServiceModal={(serviceTitle) => onOpenCheckout(serviceTitle)}
      />

      {/* 3. Featured Digital Profiles with Weapon Skin Cards (Matching Image 3) */}
      <FeaturedProfilesSection
        currency={currency}
        onViewAllProfiles={() => onNavigate('profiles')}
        onAddToCart={onAddToCart}
        onBuyNow={(title, price) => onOpenCheckout(title, price)}
        onNavigate={onNavigate}
      />

      {/* 4. Premium Digital Profiles Spotlight with Reyna & Inspection Tabs (Matching Image 3) */}
      <ProfileSpotlight
        currency={currency}
        onAddToCart={onAddToCart}
        onBuyNow={(title, price) => onOpenCheckout(title, price)}
        onInspect={(id) => onNavigate('listing', id || 'lst_immortal_kuronami')}
      />

      {/* 5. How VIB Works with 3D Monolith & 4-Step Stepper (Matching Image 2) */}
      <HowVIBWorks />

      {/* 6. Trust & Compliance 5 Pillars (Matching Image 2) */}
      <TrustComplianceSection />

      {/* 7. Community Banner with 15K+ Discord Members (Matching Image 2) */}
      <CommunityBanner onJoinDiscord={onOpenDiscordModal} />

      {/* 8. Full Client Footer (Matching Image 2) */}
      <Footer onNavigate={(page) => onNavigate(page as AppPage)} />
    </div>
  );
};