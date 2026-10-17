export interface VPPackage {
  id: string;
  agentName: string;
  agentTitle: string;
  agentRole: string;
  vpAmount: number;
  vpLabel: string;
  priceINR: number;
  badge?: 'POPULAR' | 'BEST VALUE';
  quote: string;
  quoteAuthor: string;
  graffitiLeft: string;
  graffitiRight?: string;
  footerTag: string;
  description: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentGlow: string;
    bgGradient: string;
    atmosphereHaze: string;
    cityLightingTint: string;
    activeBorderColor: string;
    tagBorderColor: string;
    badgeBg: string;
    badgeText: string;
    ctaGradient: string;
  };
  characterAsset: string;
  characterBgAsset: string;
}

export type Currency = 'INR' | 'USD' | 'EUR';

export type AppPage =
  | 'home'
  | 'profiles'
  | 'listing'
  | 'vp'
  | 'rankup'
  | 'services'
  | 'community'
  | 'support'
  | 'marketplace'
  | 'trading-club'
  | 'experience';

export interface CartItem {
  id: string;
  title: string;
  subtitle?: string;
  priceINR: number;
  type: 'profile' | 'vp' | 'service';
  image?: string;
  details?: string;
  quantity: number;
}

export interface DigitalProfile {
  id: string;
  title: string;
  code: string;
  rank: string;
  rankBadge: string;
  level: number;
  skinsCount: string;
  edition: string;
  priceINR: number;
  originalPriceINR: number;
  badge?: 'FEATURED' | 'HOT' | 'POPULAR' | 'EXCLUSIVE' | 'NEW';
  bannerAsset?: string;
  agentPortrait?: string;
  skins: string[];
  marketplaceType: 'guaranteed' | 'public';
}

export interface VPStoreItem {
  id: string;
  vpAmount: number;
  vpLabel: string;
  priceINR: number;
  originalPriceINR?: number;
  badge?: 'POPULAR' | 'BEST VALUE' | 'EXCLUSIVE';
  region: 'india' | 'philippines' | 'other';
  inStock: boolean;
  coinAsset?: string;
}
