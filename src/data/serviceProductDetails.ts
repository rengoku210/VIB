import { CartItem } from '../types';

export interface ServiceItemSelection {
  id: string;
  title: string;
  priceINR: number;
  productId?: string;
  category:
    | 'vp'
    | 'regional_vp'
    | 'profile'
    | 'rankup'
    | 'rental'
    | 'coaching'
    | 'derank'
    | 'valuation'
    | 'service'
    | 'cart';
  regionLabel?: string;
  backPage?: string;
  rankup?: {
    fromRankId: string;
    toRankId: string;
    mode: 'solo' | 'duo';
    queueType: 'standard' | 'priority';
  };
  rentalDuration?: string;
  cartItems?: Array<Pick<CartItem, 'id' | 'quantity'>>;
}

export interface ServiceProductDetail {
  selection: ServiceItemSelection;
  name: string;
  tagline: string;
  categoryLabel: string;
  breadcrumbParent: string;
  badge?: string;
  priceINR: number;
  description: string;
  deliverySpeed: string;
  fulfillmentMethod: string;
  regionScope: string;
  protectionLabel: string;
  iconType: 'megaphone' | 'repeat' | 'crown' | 'shield' | 'sparkles';
  services: string[];
  benefits: string[];
  conditions: string[];
  faqs: Array<{ question: string; answer: string }>;
}

export function buildServiceSelection(
  title: string,
  priceINR: number,
  productId?: string,
  extra?:
    | {
        fromRankId: string;
        toRankId: string;
        mode: 'solo' | 'duo';
        queueType: 'standard' | 'priority';
      }
    | string,
  cartItems?: Array<Pick<CartItem, 'id' | 'quantity'>>,
  backPage?: string
): ServiceItemSelection {
  const lower = title.toLowerCase();
  const rentalDuration = typeof extra === 'string' ? extra : undefined;
  const rankup = typeof extra === 'object' ? extra : undefined;

  const isCart = Boolean(cartItems?.length) || lower.startsWith('cart checkout:');
  const isProfile = Boolean(productId?.startsWith('lst_') || productId?.startsWith('p-'));
  const isValuation = priceINR === 0 || lower.includes('valuation') || lower.includes('appraisal');
  const isRegional =
    !isProfile &&
    (Boolean(productId?.startsWith('vp-ph')) ||
      lower.includes('php') ||
      lower.includes('philippines') ||
      lower.includes('regional'));
  const isRental = !isProfile && (Boolean(rentalDuration) || lower.startsWith('rent ') || lower.includes('rental'));
  const isCoaching = !isProfile && (lower.includes('coaching') || lower.includes('bootcamp'));
  const isDerank = !isProfile && lower.includes('derank');
  const isRankup = !isProfile && (Boolean(rankup) || ((lower.includes('rank') || lower.includes('progression')) && !isDerank));
  const isService =
    !isProfile &&
    (lower.includes('region conversion') ||
      lower.includes('fresh philippines') ||
      lower.includes('urgent sale') ||
      lower.includes('exchange'));
  const isVp = !isProfile && !isService && !isValuation && (lower.includes('vp') || productId?.startsWith('vp-'));

  let category: ServiceItemSelection['category'] = 'profile';
  if (isCart) category = 'cart';
  else if (isProfile) category = 'profile';
  else if (isValuation) category = 'valuation';
  else if (isRental) category = 'rental';
  else if (isCoaching) category = 'coaching';
  else if (isDerank) category = 'derank';
  else if (isRankup) category = 'rankup';
  else if (isService) category = 'service';
  else if (isRegional) category = 'regional_vp';
  else if (isVp) category = 'vp';

  const id =
    productId ||
    `${category}-${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`;

  return {
    id,
    title,
    priceINR,
    productId,
    category,
    regionLabel: isRegional ? 'Philippines (PHP)' : isVp ? 'India (INR)' : 'Global / AP',
    backPage,
    rankup,
    rentalDuration,
    cartItems,
  };
}

export function buildServiceProductDetail(sel: ServiceItemSelection): ServiceProductDetail {
  switch (sel.category) {
    case 'vp':
      return {
        selection: sel,
        name: sel.title,
        tagline: 'Official Indian Region Valorant Points Prepaid Digital PIN Delivery',
        categoryLabel: 'Indian VP Top-Up',
        breadcrumbParent: 'VP Packs',
        badge: sel.priceINR >= 3800 ? 'BEST VALUE' : 'INSTANT DISPATCH',
        priceINR: sel.priceINR,
        description:
          'Genuine Riot-authorized prepaid PIN codes for Indian region Valorant accounts. Verified against live stock upon payment confirmation and dispatched directly to your VIB dashboard and registered email.',
        deliverySpeed: '5 - 15 Minutes',
        fulfillmentMethod: 'Prepaid PIN Code',
        regionScope: 'India (INR)',
        protectionLabel: '100% Replacement Warranty',
        iconType: 'sparkles',
        services: [
          'Genuine official Riot Prepaid PIN code issued exclusively to your account',
          'Full transaction invoice & dashboard delivery tracking',
          'Live Riot ID verification prior to order placement',
          '24/7 WhatsApp verification & fulfillment desk support',
        ],
        benefits: [
          'Zero account password sharing required for Indian PIN orders',
          'Permanent record inside your VIB Customer Dashboard',
          'Protected against invalid or duplicate code issues',
        ],
        conditions: [
          'Indian region PIN codes can only be redeemed on Indian-currency Valorant accounts.',
          'Digital prepaid codes are single-use and non-refundable once revealed.',
          'Double check your Riot ID and registered email prior to checkout.',
        ],
        faqs: [
          {
            question: 'How quickly will I receive my VP code after payment?',
            answer:
              'Once you upload your UPI screenshot and 12-digit UTR reference, our staff verifies the transfer within 5 to 15 minutes and releases your PIN immediately.',
          },
          {
            question: 'Do I need to share my Valorant password?',
            answer:
              'No. Indian region VP packs are fulfilled via digital prepaid PIN codes that you redeem safely in your own Valorant client.',
          },
        ],
      };

    case 'regional_vp':
      return {
        selection: sel,
        name: sel.title,
        tagline: 'Discounted Philippines & Regional VP Top-Up via Verified Operations Desk',
        categoryLabel: 'Regional VP Top-Up',
        breadcrumbParent: 'VP Packs',
        badge: 'UP TO 40% SAVINGS',
        priceINR: sel.priceINR,
        description:
          'Save significantly on Valorant Points through Philippines & regional provisioning. Orders are processed carefully 1-on-1 by our verified WhatsApp operations specialists without third-party automated scripts.',
        deliverySpeed: '15 - 30 Minutes',
        fulfillmentMethod: 'Manual Operations Desk',
        regionScope: sel.regionLabel || 'Philippines (PHP)',
        protectionLabel: 'Full Account Escrow Safety',
        iconType: 'sparkles',
        services: [
          'Direct top-up provisioning by verified VIB regional operators',
          'Real-time status coordination over official WhatsApp (+91 80996 41606)',
          'Full purchase receipt & dashboard order room logs',
          'Identical Mumbai / Singapore matchmaking latency after recharge',
        ],
        benefits: [
          '25% to 40% lower effective cost per VP compared to Indian pricing',
          'Safe compliance handling with zero unauthorized chargeback risk',
          'Priority resolution desk if you have active store bundles expiring soon',
        ],
        conditions: [
          'Your Riot account store region must match the selected regional pack (e.g. Philippines PHP).',
          'Keep your WhatsApp phone number accessible during fulfillment.',
        ],
        faqs: [
          {
            question: 'How is Philippines VP provisioned onto my account?',
            answer:
              'After your UPI payment is verified, our regional desk connects with you on your provided WhatsApp number to complete the official regional top-up safely within 15-30 minutes.',
          },
          {
            question: 'Does changing or topping up PHP region change server ping?',
            answer:
              'No. Store billing currency only affects VP prices; you can queue Mumbai or Singapore servers normally with identical ping.',
          },
        ],
      };

    case 'rankup':
      return {
        selection: sel,
        name: sel.title,
        tagline: 'Professional Radiant & Immortal Rank Progression Program',
        categoryLabel: 'Rank Progression',
        breadcrumbParent: 'Rankup',
        badge: sel.rankup?.queueType === 'priority' ? 'PRIORITY QUEUE' : 'VERIFIED BOOSTER',
        priceINR: sel.priceINR,
        description:
          'Achieve your desired competitive rank cleanly with verified Immortal/Radiant VIB roster players. Supports solo supervised play or duo queue sessions with full privacy protection.',
        deliverySpeed: 'Starts in 30 Mins',
        fulfillmentMethod: sel.rankup?.mode === 'duo' ? 'Duo Queue Session' : 'Solo Supervised Queue',
        regionScope: 'APAC / India',
        protectionLabel: 'VPN & Hardware Protected',
        iconType: 'crown',
        services: [
          'Hand-played progression exclusively by vetted high-Elo VIB players',
          sel.rankup?.mode === 'duo'
            ? 'Play alongside a Radiant duo partner using live voice comms'
            : 'Offline appearance & agent preference controls available',
          'Live progress tracking and milestone screenshots inside your Order Room',
          'Zero third-party cheats, scripts, or win-trading',
        ],
        benefits: [
          'Save dozens of solo-queue hours every competitive act',
          'Optional agent selection and stream-safe discrete login options',
          'Escrow holds payment until target rank is confirmed on your Riot profile',
        ],
        conditions: [
          'Ensure two-factor authentication notifications can be approved during onboarding.',
          'Avoid queuing competitive solo while an active solo progression slot is running.',
        ],
        faqs: [
          {
            question: 'Is my Riot account safe during progression?',
            answer:
              'Yes. All boosters are verified staff playing manually with regional network matching, strict offline settings, and escrow accountability.',
          },
        ],
      };

    case 'rental':
      return {
        selection: sel,
        name: sel.title,
        tagline: 'Try Top-Tier Skin Collections Without Permanent Commitment',
        categoryLabel: 'VIB Experience Rental',
        breadcrumbParent: 'Rentals',
        badge: sel.rentalDuration ? `${sel.rentalDuration.toUpperCase()} ACCESS` : 'TIMED RENTAL',
        priceINR: sel.priceINR,
        description:
          'Play competitive or unrated matches with vaulted Kuronami, Champions, Primordium, or Sovereign skin inventories for the exact rental duration you choose.',
        deliverySpeed: '10 - 20 Minutes',
        fulfillmentMethod: 'Temporary Timed Access',
        regionScope: 'Mumbai / APAC',
        protectionLabel: 'Automated Time-Lock Escrow',
        iconType: 'shield',
        services: [
          'Full unlocked skin variants and finishers during your active rental window',
          `Timed session duration: ${sel.rentalDuration || 'Selected Rental Window'}`,
          'Direct handover instructions via WhatsApp & Order Room',
          'Verified working inventory audited before every slot handover',
        ],
        benefits: [
          'Test ultra-rare skins in real matches before buying or committing to Night Market purchases',
          'Zero long-term purchase price needed',
          'Clean rotation protocol after slot expiration',
        ],
        conditions: [
          'Strictly no cheats, toxic chat violations, or account tampering during rental windows.',
          'Acceptance of the VIB Fair Play Rental Pledge is required during checkout.',
        ],
        faqs: [
          {
            question: 'When does my rental timer start?',
            answer:
              'Your rental duration timer only begins once your credentials are handed over and confirmed working.',
          },
        ],
      };

    case 'coaching':
      return {
        selection: sel,
        name: sel.title,
        tagline: 'Personalized Live Aim, Game-Sense & VOD Coaching with Radiant Mentors',
        categoryLabel: 'Radiant Coaching',
        breadcrumbParent: 'Coaching',
        badge: 'LIVE MENTORSHIP',
        priceINR: sel.priceINR,
        description:
          'Accelerate your mechanical aim, crosshair placement, utility timing, and macro calling through private 1-on-1 Discord screenshare coaching and structured VOD breakdowns.',
        deliverySpeed: 'Flexible Scheduling',
        fulfillmentMethod: 'Private Discord Session',
        regionScope: 'Global / India',
        protectionLabel: 'Satisfaction Guaranteed',
        iconType: 'crown',
        services: [
          '1-on-1 private Discord voice and live match screenshare review',
          'Custom aim routine, sensitivity audit & agent pool optimization',
          'Written post-session improvement checklist delivered via dashboard',
          '24/7 Discord & WhatsApp scheduling flexibility',
        ],
        benefits: [
          'Identify recurring positioning errors you miss in solo queue',
          'Actionable drills tailored specifically to your current rank tier',
          'Direct follow-up Q&A access with your assigned mentor',
        ],
        conditions: [
          'Provide your active Discord username & tag so your mentor can add you promptly.',
        ],
        faqs: [
          {
            question: 'How do I schedule my coaching time slot?',
            answer:
              'After payment verification, your mentor contacts you via Discord and WhatsApp within 30 minutes to lock a time that suits you.',
          },
        ],
      };

    case 'service':
      return {
        selection: sel,
        name: sel.title,
        tagline: 'Specialized VIB Account Configuration & Arbitrage Services',
        categoryLabel: 'Special Service',
        breadcrumbParent: 'Services',
        badge: 'OFFICIAL SERVICE',
        priceINR: sel.priceINR,
        description:
          'Dedicated technical and operational assistance for regional store setup, fresh PHP unranked profile delivery, or custom account fulfillment requests.',
        deliverySpeed: '15 - 45 Minutes',
        fulfillmentMethod: 'Concierge Operations',
        regionScope: 'India -> PHP / Global',
        protectionLabel: '100% Escrow Warranty',
        iconType: 'repeat',
        services: [
          'End-to-end execution by senior VIB specialists',
          'Full email & region verification log provided upon completion',
          'Compatible with Mumbai and Singapore matchmaking servers',
          'Dedicated after-service support on WhatsApp (+91 80996 41606)',
        ],
        benefits: [
          'Eliminates region mismatch errors permanently when performed properly',
          'Immediate access to cheaper store currencies',
          'Zero risky third-party scripts',
        ],
        conditions: [
          'Ensure accurate Riot ID and contact details during checkout.',
        ],
        faqs: [
          {
            question: 'How long does region setup or fresh profile delivery take?',
            answer:
              'Most requests are fulfilled completely within 15 to 45 minutes following payment verification.',
          },
        ],
      };

    default:
      return {
        selection: sel,
        name: sel.title,
        tagline: 'Escrow-Protected VIB Digital Service Order',
        categoryLabel: 'VIB Verified Service',
        breadcrumbParent: 'Marketplace',
        priceINR: sel.priceINR,
        description:
          'Verified digital transaction protected under official VIB escrow protocols. Full receipt, transaction verification, and dedicated resolution desk included.',
        deliverySpeed: '10 - 30 Minutes',
        fulfillmentMethod: 'Verified Fulfillment Desk',
        regionScope: sel.regionLabel || 'Global / AP',
        protectionLabel: 'VIB Escrow Protected',
        iconType: 'shield',
        services: [
          'Escrow fund protection until delivery confirmation',
          'Live Order Tracking room and email notification alerts',
          '24/7 executive resolution access via WhatsApp (+91 80996 41606)',
        ],
        benefits: [
          'Zero direct counterparty scam exposure',
          'Complete transaction history & GST/service records in your dashboard',
        ],
        conditions: [
          'Provide accurate Riot ID and delivery receipt email at checkout.',
        ],
        faqs: [
          {
            question: 'How does VIB protect my purchase?',
            answer:
              'Every payment goes through verified manual inspection before fulfillment or escrow release, ensuring complete accountability.',
          },
        ],
      };
  }
}
