export interface PackageDetailData {
  id: string;
  name: string;
  price: number;
  category: 'standard' | 'trade' | 'premium' | 'bonus';
  categoryLabel: string;
  badge?: string;
  tagline: string;
  description: string;
  promotion_duration: string;
  reach: string;
  placement: string;
  turnaround: string;
  services: string[];
  benefits: string[];
  conditions: string[];
  faqs: { question: string; answer: string }[];
  heroIconType: 'megaphone' | 'repeat' | 'crown' | 'sparkles' | 'shield';
}

export interface LivePlanInput {
  id: string;
  category?: string;
  name?: string;
  price?: number;
  description?: string;
  badge?: string;
  story_count?: string;
  promotion_duration?: string;
  reach_estimate?: string;
  placement_tag?: string;
  benefits?: string[];
  conditions?: string[];
  custom_faq?: { question: string; answer: string }[];
  ai_draft?: { headline?: string; summary?: string; highlights?: string[] } | null;
}

export const ADVERTISEMENT_PRODUCT_DETAILS: Record<string, PackageDetailData> = {
  'ad-story-95': {
    id: 'ad-story-95',
    name: 'WhatsApp Status Promotion',
    price: 95,
    category: 'standard',
    categoryLabel: 'Standard Promotion',
    badge: 'STARTER',
    tagline: '24-Hour WhatsApp Status Broadcast to Active Indian Valorant Buyers',
    description:
      '24-hour dedicated WhatsApp Status & broadcast showcase to reach active Valorant buyers across India with direct seller contact routing.',
    promotion_duration: '24 Hours',
    reach: 'VIB WhatsApp Status Network',
    placement: 'WhatsApp Status (24h)',
    turnaround: 'Reviewed after payment confirmation',
    services: [
      '24-Hour WhatsApp Status Promotion',
      'Shared across VIB Buyer Broadcasts',
      'Direct Seller Contact Tag & Inquiry Link',
      'Fast Queue Scheduling after Review',
    ],
    benefits: [
      'Immediate exposure to active Indian gamers browsing daily WhatsApp status drops.',
      'Direct communication: Interested buyers connect via your selected contact method.',
      'Transparent verification: Our team reviews and schedules your campaign after payment approval.',
      'Optional middleman escrow support when a buyer initiates a purchase.',
    ],
    conditions: [
      'Only list accounts with premium/exclusive skins. Battle pass-only accounts are not accepted.',
      'Keep your primary contact details reachable for incoming buyer inquiries.',
      'Provide a clean screenshot showing your weapon collection grid clearly.',
    ],
    faqs: [
      {
        question: 'When will my WhatsApp status promotion be posted?',
        answer:
          'After payment verification and inventory detail submission, your status promotion is scheduled during operational hours (10 AM - 12 Midnight IST).',
      },
      {
        question: 'How do interested buyers contact me?',
        answer:
          'Buyers use the contact option included in your promotion card (WhatsApp or listed handle) to message you directly or initiate VIB escrow.',
      },
      {
        question: 'Is escrow mediation included?',
        answer:
          'Yes. Once a buyer contacts you, both sides can complete the deal through VIB middleman escrow on WhatsApp.',
      },
    ],
    heroIconType: 'megaphone',
  },

  'ad-story-highlight-150': {
    id: 'ad-story-highlight-150',
    name: 'Status + Featured Highlight',
    price: 150,
    category: 'standard',
    categoryLabel: 'Standard Promotion',
    badge: 'POPULAR',
    tagline: '24H Status Blast Plus Permanent Featured Highlight Placement',
    description:
      'WhatsApp Status promotion plus permanent featured highlight placement so active buyers can discover your listing continuously.',
    promotion_duration: 'Permanent Highlight',
    reach: 'VIB Status & Highlight Viewers',
    placement: 'WhatsApp Status + Highlight',
    turnaround: 'Reviewed after payment confirmation',
    services: [
      '24-Hour WhatsApp Status Blast',
      'Permanent VIB Featured Highlight Slot',
      'Saved in Curated Account Showcase',
      'Extended Exposure to Active Buyers',
    ],
    benefits: [
      'Permanent highlight slot remains visible until your profile is marked sold.',
      'Saved in curated account showcase viewed regularly by profile buyers.',
      'Extended exposure generates steady buyer inquiries over multiple days.',
      'Middleman verification assistance included.',
    ],
    conditions: [
      'Specify your target selling price in INR.',
      'Inform VIB support once sold so we can update the highlight status.',
      'Feature clear collection screenshots with verified skin details.',
    ],
    faqs: [
      {
        question: 'How long does the featured highlight stay active?',
        answer:
          'Your featured highlight stays active until your account sells and you notify our support team.',
      },
      {
        question: 'Can I update my asking price later?',
        answer:
          'Yes, message our official WhatsApp support and the team will update your listing notes.',
      },
    ],
    heroIconType: 'sparkles',
  },

  'ad-post-210': {
    id: 'ad-post-210',
    name: 'Channel Showcase Post Promotion',
    price: 210,
    category: 'standard',
    categoryLabel: 'Standard Promotion',
    badge: 'FEED FEATURE',
    tagline: 'Permanent Channel Showcase Post Across Official VIB Buyer Feeds',
    description:
      'Dedicated high-resolution channel post promotion across official VIB WhatsApp Channels and Community Feed.',
    promotion_duration: 'Permanent Channel Post',
    reach: 'VIB Channel & Community Feed',
    placement: 'WhatsApp Channel Post',
    turnaround: 'Reviewed after payment confirmation',
    services: [
      'Dedicated High-Resolution Channel Post',
      'Permanent Placement on VIB Buyer Feed',
      'Broad Community & Channel Reach',
      'Direct Seller Contact Included',
    ],
    benefits: [
      'Permanent channel placement that stays searchable in feed history.',
      'High buyer trust from structured account breakdown posts.',
      'Includes full weapon skin inventory summary and rank highlights.',
      'Direct buyer routing to your preferred contact channel.',
    ],
    conditions: [
      'Clear screenshots required (1080p or readable full-grid view).',
      'Recommended to include at least 2 premium skins or notable rare items.',
    ],
    faqs: [
      {
        question: 'Will my channel post remain visible over time?',
        answer:
          'Yes, showcase posts stay on the VIB buyer channel feed. Once sold, we mark the listing as [SOLD].',
      },
      {
        question: 'What information is displayed in the showcase post?',
        answer:
          'Your competitive rank, premium skins summary, asking price in INR, and verified contact routing.',
      },
    ],
    heroIconType: 'megaphone',
  },

  'ad-post-2stories-315': {
    id: 'ad-post-2stories-315',
    name: 'Channel Post + 2 Status Boosts',
    price: 315,
    category: 'standard',
    categoryLabel: 'Standard Promotion',
    badge: 'BEST COMBO',
    tagline: 'Permanent Channel Post Paired With 2 Multi-Touch Status Boosts',
    description:
      'Dedicated channel post plus 2 scheduled WhatsApp status boosts for maximum buyer reach and multi-touch visibility.',
    promotion_duration: 'Permanent Post + 2 Boosts',
    reach: 'Multi-Touch VIB Broadcast',
    placement: 'Channel Post + 2 Status Boosts',
    turnaround: 'Reviewed after payment confirmation',
    services: [
      'Dedicated Permanent Channel Post',
      '2 Free WhatsApp Status Boosts (24h each)',
      'Multi-touch Buyer Retargeting',
      'Direct Seller Contact & Inquiry Link',
    ],
    benefits: [
      'Reaches both daily channel subscribers and status broadcast viewers.',
      'Second status boost follows up later to re-engage undecided buyers.',
      'Higher inquiry velocity than single-placement promotions.',
      'Full VIB middleman escrow coordination available.',
    ],
    conditions: [
      'Remember to ping VIB WhatsApp support when your scheduled follow-up status boost is due.',
      'Keep your primary contact channel active for incoming buyer messages.',
    ],
    faqs: [
      {
        question: 'When are the 2 status boosts scheduled?',
        answer:
          'Your initial status boost runs alongside the channel post, and you can request the follow-up status boost after 48 hours via WhatsApp reminder.',
      },
    ],
    heroIconType: 'sparkles',
  },

  'ad-web-listing-420': {
    id: 'ad-web-listing-420',
    name: 'Public Community Website Listing only',
    price: 420,
    category: 'standard',
    categoryLabel: 'Website Marketplace',
    badge: 'WEB EXCLUSIVE',
    tagline: 'Permanent Showcase on the VIB 2.0 Public Website Marketplace',
    description:
      'Permanent showcase on the VIB 2.0 public community website marketplace with searchable rank, skin, and escrow support.',
    promotion_duration: 'Active Website Listing',
    reach: 'VIB Public Web Marketplace',
    placement: 'Web Marketplace Showcase',
    turnaround: 'Published after review',
    services: [
      'Permanent VIB 2.0 Website Listing',
      'Live Search, Filter & Tag Indexing',
      'Full Inventory Showcase with Skin Badges',
      'Direct Buyer Escrow Inquiry Button',
    ],
    benefits: [
      'Appears in the main VIB Profiles directory with filterable skin tags.',
      'Buyers can click "Buy Now" or "Chat on WhatsApp" directly from your card.',
      'No expiration: Stays listed on the web platform until sold.',
      'Instant escrow mediation when a buyer initiates checkout.',
    ],
    conditions: [
      'Account credentials are not required upfront; submit clean inventory screenshots and details.',
      'Competitive pricing helps attract faster buyer inquiries on web search.',
    ],
    faqs: [
      {
        question: 'Can buyers purchase or inquire directly on the website?',
        answer:
          'Yes, buyers can initiate VIB escrow lock or contact support from your listing card.',
      },
    ],
    heroIconType: 'shield',
  },

  'ad-post-6stories-edit-525': {
    id: 'ad-post-6stories-edit-525',
    name: 'Channel Post + 6 Status Blasts + Inventory Editing',
    price: 525,
    category: 'standard',
    categoryLabel: 'Standard Promotion',
    badge: 'HIGH CONVERSION',
    tagline: '14-Day Multi-Blast Campaign With Professional Inventory Editing',
    description:
      'Channel post plus 6 recurring WhatsApp status blasts and professional graphic editing of your inventory showcase.',
    promotion_duration: '14 Days Campaign',
    reach: 'VIB Active Collector Network',
    placement: 'Channel Post + 6 Blasts + Design',
    turnaround: 'Designed & queued after review',
    services: [
      'Dedicated Permanent Channel Post',
      '6 Scheduled Status Blasts Over 14 Days',
      'Professional Graphic Editing of Inventory',
      'Priority Queue Placement & Support',
    ],
    benefits: [
      'Custom graphic layout highlights your rarest knives, Vandals, and bundles.',
      'Six status blasts maintain strong buyer visibility over two weeks.',
      'Clean visual presentation helps command serious buyer offers.',
      'Dedicated team support on campaign timing.',
    ],
    conditions: [
      'Upload raw inventory screenshots; our editing desk handles layout and callouts.',
      'Campaign covers 6 scheduled status blasts across 14 days or until sold.',
    ],
    faqs: [
      {
        question: 'What does inventory editing include?',
        answer:
          'Our editors organize your top knives, rifles, rank badge, and pricing into a clean showcase banner for higher conversion.',
      },
    ],
    heroIconType: 'sparkles',
  },

  'ad-weekly-unlimited-1035': {
    id: 'ad-weekly-unlimited-1035',
    name: 'Weekly Unlimited Status Blasts (once weekly) + Highlights + Inventory Editing + Public Community Website Listing',
    price: 1035,
    category: 'standard',
    categoryLabel: 'Standard Promotion',
    badge: 'ALL-IN-ONE MAX',
    tagline: 'Full Multi-Channel Campaign Weekly Until Sold',
    description:
      'Weekly WhatsApp status blasts (once weekly until sold) + featured highlights + inventory editing + public community website listing.',
    promotion_duration: 'Weekly Until Sold',
    reach: 'Full VIB Web & WhatsApp Ecosystem',
    placement: 'Weekly Blasts + Highlights + Website',
    turnaround: 'Scheduled after payment verification',
    services: [
      'Weekly Status Pushes (Once Weekly Until Sold)',
      'Permanent VIB Featured Highlight',
      'Public Community Website Marketplace Listing',
      'Professional Inventory Graphic Editing',
      'Dedicated Buyer Inquiry Forwarding',
    ],
    benefits: [
      'Recurring weekly promotion pushes until your profile sells.',
      'Combined reach across WhatsApp Status, Featured Highlights, and VIB Web Marketplace.',
      'Custom graphic creative included at no extra design charge.',
      'Active buyer forwarding through the VIB operations desk.',
    ],
    conditions: [
      'Recommended for accounts with multiple premium upgradable skins.',
      'Send a quick WhatsApp reminder when your weekly re-push window comes due.',
    ],
    faqs: [
      {
        question: 'How do weekly status pushes continue until sold?',
        answer:
          'Once a week until your profile sells, you remind our team on WhatsApp and we re-broadcast your showcase creative in the status queue.',
      },
    ],
    heroIconType: 'crown',
  },

  'ad-trade-story-55': {
    id: 'ad-trade-story-55',
    name: 'Trade / Exchange Status Promotion (24 hours)',
    price: 55,
    category: 'trade',
    categoryLabel: 'Trade / Exchange',
    badge: 'FAST TRADE',
    tagline: '24-Hour Trade Broadcast to Active Skin Traders Across India',
    description:
      '24-hour trade shoutout on official VIB WhatsApp Status & trade broadcast to find fast swap partners.',
    promotion_duration: '24 Hours',
    reach: 'VIB Trade & Swap Desk',
    placement: 'Trade Status (24h)',
    turnaround: 'Reviewed after payment confirmation',
    services: [
      '24-Hour Dedicated Trade Status',
      'Direct Seller Contact for Trade Offers',
      'Reaches Weapon Skin Traders Across India',
      'Escrow Coordination Option',
    ],
    benefits: [
      'Targeted reach to players actively seeking profile or skin swaps.',
      'Direct contact routing so traders can propose offers quickly.',
      'Execute final swaps through VIB middleman escrow for safer account handoffs.',
      'Affordable ₹55 trade broadcast entry.',
    ],
    conditions: [
      'Clearly state what skins/rank you offer and what trade targets you seek.',
      'Use official VIB middleman escrow when swapping accounts.',
    ],
    faqs: [
      {
        question: 'Can I specify exact skins I want in exchange?',
        answer:
          'Yes, include your desired swap targets in the notes so matching traders contact you directly.',
      },
      {
        question: 'How does VIB escrow help with trades?',
        answer:
          'Our middleman verifies both accounts before executing credential swaps so neither trader is exposed.',
      },
    ],
    heroIconType: 'repeat',
  },

  'ad-trade-highlight-105': {
    id: 'ad-trade-highlight-105',
    name: 'Trade / Exchange Status + Highlight Placement',
    price: 105,
    category: 'trade',
    categoryLabel: 'Trade / Exchange',
    badge: 'TRADE HIGHLIGHT',
    tagline: 'Trade Status Broadcast Plus Permanent Trade Highlight Placement',
    description:
      'Trade status broadcast plus permanent featured highlight placement for extended continuous trade exposure.',
    promotion_duration: 'Permanent Trade Highlight',
    reach: 'VIB Trade Highlight & Community',
    placement: 'Trade Status + Highlight',
    turnaround: 'Reviewed after payment confirmation',
    services: [
      '24-Hour Trade Status Blast',
      'Permanent VIB Trade Highlight Spot',
      'Continuous Inquiries Until Trade Closed',
      'Verified Middleman Escrow Support',
    ],
    benefits: [
      'Dedicated trade highlight stays active until your swap closes.',
      'Reaches both immediate status viewers and ongoing trade browsers.',
      'Full VIB middleman escrow coordination for account exchanges.',
      'High-value ₹105 trade visibility package.',
    ],
    conditions: [
      'Notify VIB support once your trade closes so the slot is marked traded.',
      'Account details and collection screenshots must be accurate.',
    ],
    faqs: [
      {
        question: 'How long does my trade listing stay in Highlights?',
        answer:
          'It remains featured in the trade highlight showcase until you finalize a trade and inform our support team.',
      },
    ],
    heroIconType: 'repeat',
  },

  'ad-premium-guaranteed-2050': {
    id: 'ad-premium-guaranteed-2050',
    name: 'Premium Guaranteed Sale Plan',
    price: 2050,
    category: 'premium',
    categoryLabel: 'Premium Guarantee',
    badge: 'GUARANTEED SALE',
    tagline: 'Dedicated VIB Sales Agent + Priority Multi-Channel Matchmaking',
    description:
      'High-priority feature across VIB channels, dedicated agent, and active buyer matchmaking until sold.',
    promotion_duration: 'Guaranteed Until Sold',
    reach: 'VIB Priority Collector & Escrow Network',
    placement: 'Full Priority Multi-Channel',
    turnaround: 'Priority onboarding after payment verification',
    services: [
      'Continuous Promotion Until Account Sells',
      'Dedicated Senior VIB Sales Agent',
      'Priority Multi-Status & Channel Campaigns',
      'Public Community Website Listing with VIP Badge',
      'Full Escrow & Verification Included',
    ],
    benefits: [
      'Dedicated agent screens buyers, fields questions, and coordinates fair negotiation.',
      'Direct pitching to verified repeat collectors on VIB WhatsApp & Discord.',
      'Featured visibility on the public website marketplace.',
      'Continuous campaign pushes until sale completion.',
    ],
    conditions: [
      'Recommended for high-tier inventories with rare bundles or strong market demand.',
      'Cooperate with VIB verification checks before buyer handoff.',
    ],
    faqs: [
      {
        question: 'What does the Premium Guaranteed Sale Plan include?',
        answer:
          'You receive multi-channel priority exposure plus dedicated agent matchmaking across VIB channels until your profile sells.',
      },
      {
        question: 'Does a dedicated agent coordinate buyer inquiries?',
        answer:
          'Yes, your assigned sales coordinator filters serious buyers and assists through escrow settlement.',
      },
    ],
    heroIconType: 'crown',
  },

  'ad-vip-luxury-3080': {
    id: 'ad-vip-luxury-3080',
    name: 'VIP Luxury Promotion Plan',
    price: 3080,
    category: 'premium',
    categoryLabel: 'VIP Luxury',
    badge: 'VIP LUXURY',
    tagline: 'White-Glove Omni-Channel Showcase Across Web, WhatsApp & Discord',
    description:
      'Elite promotion across Website, WhatsApp Channels, and Discord with unlimited pushes, VIP badge, and concierge handling.',
    promotion_duration: 'Full Concierge Until Sold',
    reach: 'All VIB Official Channels (Web, WhatsApp, Discord)',
    placement: 'VIP Luxury Omni-Channel',
    turnaround: 'Concierge onboarding after payment verification',
    services: [
      'Multi-Platform Omni-Blast (Web, WhatsApp, Discord)',
      'Unlimited Status Re-pushes & Channel Features',
      'Senior Executive 1-on-1 Escrow Concierge',
      'Professional 4K Graphic Showcase Edit',
      'Top Featured Spot on Website Homepage & Market',
    ],
    benefits: [
      'Studio-quality showcase graphic highlighting rare knives, finishers, and Champions sets.',
      'Priority featured visibility on VIB web storefront alongside channel & Discord pushes.',
      'Dedicated concierge coordination for serious collector offers.',
      'Structured escrow payout handling upon completed sale.',
    ],
    conditions: [
      'Tailored for vaulted collections, rare knife sets, or Immortal/Radiant profiles.',
      'Coordinate closely with your assigned senior executive on valuation and buyer offers.',
    ],
    faqs: [
      {
        question: 'Which platforms are included in VIP Luxury Promotion?',
        answer:
          'Your listing receives top priority across the VIB Website Marketplace, official WhatsApp Channels/Status broadcasts, and VIB Discord communities.',
      },
    ],
    heroIconType: 'crown',
  },

  'ad-bonus-free-18pct': {
    id: 'ad-bonus-free-18pct',
    name: 'VIB Bonus Plan — Free Community Listing (18% Service Fee After Sale)',
    price: 0,
    category: 'bonus',
    categoryLabel: 'Zero Upfront',
    badge: '₹0 UPFRONT',
    tagline: 'List Today With ₹0 Upfront — 18% Service Fee Only After Successful Sale',
    description:
      'Free public community advertisement with zero advance payment — pay only an 18% facilitation fee after your profile is sold via VIB escrow.',
    promotion_duration: 'Until Sold',
    reach: 'VIB Public Community Marketplace',
    placement: 'Web Listing (0 Advance)',
    turnaround: 'Reviewed after submission',
    services: [
      '100% Free Upfront - No Advance Payment',
      'Permanent Public Community Website Listing',
      '18% Service Fee ONLY Deducted on Successful Sale',
      'Zero Upfront Cost If Your Account Does Not Sell',
      'VIB Safe Escrow Payout Protection',
    ],
    benefits: [
      'Zero upfront listing payment required.',
      'Your profile stays searchable on the public VIB community marketplace.',
      'The 18% service fee applies strictly after a completed escrow sale.',
      'Managed buyer inquiry routing and escrow mediation.',
    ],
    conditions: [
      '18% facilitation fee is deducted from the final sale amount only after a completed transaction.',
      'Does not include paid WhatsApp status blasts or paid channel boosts (available in paid packages).',
    ],
    faqs: [
      {
        question: 'Do I pay anything upfront under the VIB BONUS PLAN?',
        answer:
          'No. Upfront checkout is ₹0. The 18% service fee applies only when a buyer purchases your profile through VIB escrow.',
      },
    ],
    heroIconType: 'shield',
  },
};

function getCategoryLabel(category?: string): string {
  switch (category) {
    case 'trade':
      return 'Trade / Exchange';
    case 'premium':
      return 'Premium Guarantee';
    case 'bonus':
      return 'Zero Upfront';
    default:
      return 'Standard Promotion';
  }
}

function getHeroIconType(category?: string): PackageDetailData['heroIconType'] {
  switch (category) {
    case 'trade':
      return 'repeat';
    case 'premium':
      return 'crown';
    case 'bonus':
      return 'shield';
    default:
      return 'megaphone';
  }
}

export function mergeAdvertisementPlanWithDetails(
  dbPlan?: LivePlanInput | null,
  fallbackId?: string | null
): PackageDetailData | null {
  const key = dbPlan?.id || fallbackId || '';
  const base = ADVERTISEMENT_PRODUCT_DETAILS[key];

  if (!base && !dbPlan) {
    return null;
  }

  if (!dbPlan) {
    return base || null;
  }

  const category = (
    dbPlan.category === 'trade' || dbPlan.category === 'premium' || dbPlan.category === 'bonus'
      ? dbPlan.category
      : base?.category || 'standard'
  ) as PackageDetailData['category'];

  const liveBenefits = Array.isArray(dbPlan.benefits) && dbPlan.benefits.length > 0
    ? dbPlan.benefits
    : base?.benefits || [];
  const liveConditions = Array.isArray(dbPlan.conditions) && dbPlan.conditions.length > 0
    ? dbPlan.conditions
    : base?.conditions || ['Provide accurate Valorant rank, skin list, and screenshots.'];
  const liveFaqs = Array.isArray(dbPlan.custom_faq) && dbPlan.custom_faq.length > 0
    ? dbPlan.custom_faq
    : base?.faqs || [];
  const liveHighlights = Array.isArray(dbPlan.ai_draft?.highlights) && dbPlan.ai_draft.highlights.length > 0
    ? dbPlan.ai_draft.highlights
    : liveBenefits;

  return {
    id: dbPlan.id,
    name: dbPlan.name?.trim() || base?.name || 'Advertisement Plan',
    price: typeof dbPlan.price === 'number' && !Number.isNaN(dbPlan.price) ? Number(dbPlan.price) : base?.price || 0,
    category,
    categoryLabel: base?.categoryLabel || getCategoryLabel(category),
    badge: dbPlan.badge !== undefined ? dbPlan.badge : base?.badge,
    tagline: dbPlan.ai_draft?.headline?.trim() || base?.tagline || dbPlan.description?.trim() || 'Official VIB Profile Promotion',
    description: dbPlan.description?.trim() || dbPlan.ai_draft?.summary?.trim() || base?.description || '',
    promotion_duration: dbPlan.promotion_duration?.trim() || base?.promotion_duration || 'Campaign Scheduled',
    reach: dbPlan.reach_estimate?.trim() || base?.reach || 'VIB Official Buyer Network',
    placement: dbPlan.placement_tag?.trim() || base?.placement || 'Official VIB Promotion Channels',
    turnaround: base?.turnaround || 'Reviewed after payment confirmation',
    services: liveHighlights,
    benefits: liveBenefits,
    conditions: liveConditions,
    faqs: liveFaqs,
    heroIconType: base?.heroIconType || getHeroIconType(category),
  };
}
