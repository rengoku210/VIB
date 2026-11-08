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

export const ADVERTISEMENT_PRODUCT_DETAILS: Record<string, PackageDetailData> = {
  'ad-story-95': {
    id: 'ad-story-95',
    name: 'Instagram Story Promotion',
    price: 95,
    category: 'standard',
    categoryLabel: 'Standard Promotion',
    badge: 'STARTER',
    tagline: 'Fast 24-Hour Story Broadcast to Indian Valorant Community',
    description: 'Get immediate eyes on your Valorant account with a dedicated 24-hour Instagram story shoutout on the official VIB esports channel. Direct seller handle tagging allows interested buyers to slide right into your DMs.',
    promotion_duration: '24 Hours',
    reach: '50K+ Community Members',
    placement: 'Instagram Story (24h)',
    turnaround: '15-45 minutes queue activation',
    services: [
      '24-Hour Instagram Story Promotion',
      'Direct Seller Instagram Handle Tag',
      'Clickable DM Link for Fast Buyer Outreach',
      'Queue Scheduling within 15 Minutes',
    ],
    benefits: [
      'Immediate exposure to active Indian gamers looking to buy profiles.',
      'Direct communication: Buyers message your Instagram directly.',
      'Transparent verification: Our team verifies and publishes within 45 minutes.',
      'Optional middleman escrow support once an interested buyer messages you.',
    ],
    conditions: [
      'Only list accounts with premium/exclusive skins. Battle pass-only accounts are not accepted.',
      'Keep your Instagram account public and direct messages open for buyer outreach.',
      'Provide a single clean screenshot showing the collection grid clearly.',
    ],
    faqs: [
      {
        question: 'When will my Instagram story be posted?',
        answer: 'After payment verification and inventory detail submission, your promotion is queued and published within 15 to 45 minutes during operational hours (10 AM - 12 Midnight IST).',
      },
      {
        question: 'How do interested buyers contact me?',
        answer: 'We tag your exact Instagram handle (@username) and add a direct tap-to-DM link so buyers can chat with you immediately.',
      },
      {
        question: 'Is escrow mediation included?',
        answer: 'Yes. Once a buyer contacts you, both of you can conduct the deal through VIB middleman escrow on WhatsApp for complete scam protection.',
      },
    ],
    heroIconType: 'megaphone',
  },

  'ad-story-highlight-150': {
    id: 'ad-story-highlight-150',
    name: 'Story + Highlight',
    price: 150,
    category: 'standard',
    categoryLabel: 'Standard Promotion',
    badge: 'POPULAR',
    tagline: '24H Story Blast Plus Permanent Profile Showcase Highlight',
    description: 'Double your visibility. Your profile is broadcast as an active story and permanently saved to our curated VIB Instagram Story Highlights so buyers browsing our feed can view and inquire anytime.',
    promotion_duration: 'Permanent Highlight',
    reach: '50K+ Active Buyers & Profile Seekers',
    placement: 'Instagram Story + Permanent Highlight',
    turnaround: '20-45 minutes activation',
    services: [
      '24-Hour Instagram Story Broadcast',
      'Permanent Highlight Placement on @thevibofficial',
      'Direct Seller Tag in Story & Highlight',
      'Continuous Visibility to New Profile Seekers',
    ],
    benefits: [
      'Permanent highlight spot: Stays visible until your profile is marked sold.',
      'Saves to curated account showcase viewed daily by new visitors.',
      'Prolonged exposure generates steady inquiries over weeks, not just hours.',
      'Middleman verification assistance included.',
    ],
    conditions: [
      'Must specify your target selling price in INR.',
      'Notify VIB once sold so we can update the highlight tag.',
      'Only high-demand knife and weapon skins featured in the highlight graphic.',
    ],
    faqs: [
      {
        question: 'How long does the highlight stay active?',
        answer: 'The highlight remains permanently visible on our Instagram profile until you sell the account and notify our team.',
      },
      {
        question: 'Can I change my asking price later?',
        answer: 'Yes, simply message our official WhatsApp support and our team will update your listing notes in the highlight.',
      },
    ],
    heroIconType: 'sparkles',
  },

  'ad-post-210': {
    id: 'ad-post-210',
    name: 'Instagram Post Promotion',
    price: 210,
    category: 'standard',
    categoryLabel: 'Standard Promotion',
    badge: 'HIGH REACH',
    tagline: 'Permanent High-Res Instagram Grid Post for Broad Explore Reach',
    description: 'Showcase your high-tier account on our main Instagram grid feed. Grid posts leverage Instagram algorithmic distribution, hashtags, and explore feed reach to reach serious esports collectors across India.',
    promotion_duration: 'Permanent Grid Post',
    reach: '75K+ Algorithmic & Grid Reach',
    placement: 'Instagram Grid Post Feed',
    turnaround: '30-60 minutes queue scheduling',
    services: [
      'Permanent High-Resolution Grid Post',
      'Algorithm-Optimized Caption & Tags',
      'Direct Seller Tagging in Post Caption',
      'Broad Explore Page & Hashtag Distribution',
    ],
    benefits: [
      'Permanent feed placement that never expires.',
      'Higher credibility: Buyers trust verified grid posts over fleeting stories.',
      'Includes full weapon skin inventory breakdown in caption.',
      'Direct buyer redirection to your Instagram DM.',
    ],
    conditions: [
      'High-resolution screenshots required (minimum 1080p).',
      'Must contain at least 2 premium skins (Kuronami, Reaver, Prime, Champions, etc.).',
    ],
    faqs: [
      {
        question: 'Will the post ever be deleted?',
        answer: 'No, grid posts remain permanently on our page. Once sold, we update the caption to [SOLD] to establish track record.',
      },
      {
        question: 'What information is included in the post caption?',
        answer: 'Your current competitive rank, premium skins list, region, VP balance, asking price, and your direct Instagram username.',
      },
    ],
    heroIconType: 'megaphone',
  },

  'ad-post-2stories-315': {
    id: 'ad-post-2stories-315',
    name: 'Post + 2 Free Stories',
    price: 315,
    category: 'standard',
    categoryLabel: 'Standard Promotion',
    badge: 'BEST VALUE',
    tagline: 'Permanent Grid Post Plus 2 Multi-Touch Story Boosts',
    description: 'The sweet spot for selling profiles quickly. Get a permanent Instagram feed post combined with 2 strategic story boosts (day 1 launch boost + retargeting boost) to capture maximum buyer attention.',
    promotion_duration: 'Permanent Post + 2 Boosts',
    reach: '85K+ Multi-Touch Reach',
    placement: 'Grid Post + 2 Dedicated Stories',
    turnaround: '15-30 minutes activation',
    services: [
      'Dedicated Permanent Grid Post',
      '2 Free 24-Hour Story Boosts',
      'Multi-Touch Buyer Retargeting',
      'Direct Seller Tag & Link in Both Placements',
    ],
    benefits: [
      'Maximum visibility: Reaches both story viewers and feed scrollers.',
      '2nd story boost timed 48 hours later to capture buyers who missed the first blast.',
      'Higher inquiry conversion rate than single placement.',
      'Full middleman escrow protection included.',
    ],
    conditions: [
      'Second story boost is triggered 48-72 hours after initial post unless marked sold sooner.',
      'Keep Instagram account open to receive messages.',
    ],
    faqs: [
      {
        question: 'When is the second story boost scheduled?',
        answer: 'The first story goes live simultaneously with the post. The second story boost is dispatched 48 hours later during peak evening gaming hours.',
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
    tagline: 'Permanent Showcase on India’s #1 Valorant Marketplace',
    description: 'Feature your account directly on the VIB 2.0 public community marketplace. Hundreds of daily organic buyers filter by rank, region, and weapon skins to purchase verified accounts with instant escrow checkout.',
    promotion_duration: 'Active Website Listing',
    reach: 'Thousands of Daily Website Visitors',
    placement: 'VIB 2.0 Website Marketplace',
    turnaround: 'Instant live indexing after approval',
    services: [
      'Permanent VIB 2.0 Website Marketplace Listing',
      'Live Search, Filter & Tag Indexing',
      'Interactive Full Inventory Showcase',
      'Direct Buyer Escrow Inquiry Button',
    ],
    benefits: [
      'Appears in the main VIB Profiles directory with filterable skin tags.',
      'Buyers can click "Buy Now" or "Chat on WhatsApp" directly from your card.',
      'No expiration: Stays listed on the web platform until sold.',
      'Instant escrow mediation when a buyer initiates checkout.',
    ],
    conditions: [
      'Account credentials are not required for listing; only public screenshot and inventory breakdown.',
      'Must keep price competitive with live marketplace valuations.',
    ],
    faqs: [
      {
        question: 'Can buyers buy my account directly on the website?',
        answer: 'Buyers can initiate escrow locking through VIB or message you directly. Funds are held safely in escrow before you hand over credentials.',
      },
    ],
    heroIconType: 'shield',
  },

  'ad-post-6stories-edit-525': {
    id: 'ad-post-6stories-edit-525',
    name: 'Post + 6 Stories + Inventory Editing',
    price: 525,
    category: 'standard',
    categoryLabel: 'Standard Promotion',
    badge: 'HIGH CONVERSION',
    tagline: '14-Day Strategic Campaign with Professional Graphic Design',
    description: 'Transform raw account screenshots into a studio-grade marketing asset. Our graphics team edits your best skins into a high-converting carousel, paired with 1 permanent grid post and 6 recurring story pushes across 14 days.',
    promotion_duration: '14 Days Campaign',
    reach: '120K+ High-Intent Buyers',
    placement: 'Grid Post + 6 Stories + Graphic Editing',
    turnaround: 'Same-day custom design & rollout',
    services: [
      'Professional Graphic Editing of Inventory Showcase',
      'Dedicated Permanent Grid Post',
      '6 Scheduled Story Blasts Over 14 Days',
      'Priority Queue Placement & Support',
    ],
    benefits: [
      'Professional design highlights your most expensive skins (Vandals, Melees, Bundles).',
      '6 recurring story blasts keep your listing at the top of mind for 2 full weeks.',
      'Higher selling price: Professional presentation commands top dollar.',
      'Dedicated agent assistance on pricing appraisal.',
    ],
    conditions: [
      'Send raw screenshots of your collection; our design team handles cropping and layout.',
      'Campaign runs for 14 days or until sold.',
    ],
    faqs: [
      {
        question: 'What does inventory editing include?',
        answer: 'Our professional designers composite your top knives and vandal skins into a branded, clean metallic graphic with badges and stats.',
      },
    ],
    heroIconType: 'sparkles',
  },

  'ad-weekly-unlimited-1035': {
    id: 'ad-weekly-unlimited-1035',
    name: 'Weekly Unlimited Stories + Highlights + Inventory Editing + Public Community Website Listing',
    price: 1035,
    category: 'standard',
    categoryLabel: 'Standard Promotion',
    badge: 'ALL-IN-ONE',
    tagline: 'Complete Full-Service Multi-Channel Marketing Until Sold',
    description: 'Our most comprehensive standard promotional package. Combines weekly story pushes (re-posted once every week until sold), permanent highlight placement, custom graphic editing, and official website listing all in one.',
    promotion_duration: 'Weekly Until Sold',
    reach: '200K+ Complete Cross-Channel Audience',
    placement: 'Stories + Highlight + Web + Graphic Edit',
    turnaround: 'VIP priority queueing',
    services: [
      'Weekly Story Pushes (Once Weekly Until Sold)',
      'Permanent VIB Instagram Highlight Spot',
      'Public Community Website Marketplace Listing',
      'Professional Inventory Graphic Editing',
      'Dedicated Buyer Inquiry Forwarding',
    ],
    benefits: [
      'Zero effort: We promote your account weekly until you confirm it is sold.',
      'Multi-channel: Instagram Stories + Permanent Highlight + VIB Web Marketplace.',
      'Maximum credibility: High-tier badge on website and priority support.',
      'Guaranteed active buyer matchmaking assistance.',
    ],
    conditions: [
      'Account must have minimum 3 premium upgradable skins.',
      'Seller must reply to buyer inquiries within 12 hours.',
    ],
    faqs: [
      {
        question: 'How does the "weekly until sold" feature work?',
        answer: 'Every Monday or Friday, our marketing team re-posts your profile creative to our story rotation until you inform us that the account has been sold.',
      },
    ],
    heroIconType: 'crown',
  },

  'ad-trade-story-55': {
    id: 'ad-trade-story-55',
    name: 'Story Promotion (24 hours)',
    price: 55,
    category: 'trade',
    categoryLabel: 'Trade / Exchange',
    badge: 'FAST TRADE',
    tagline: '24-Hour Dedicated Trade Shoutout to Skin Traders Across India',
    description: 'Looking to swap, trade, or exchange your Valorant account or weapon skins? Broadcast your trade offer directly to thousands of active traders across India for just ₹55.',
    promotion_duration: '24 Hours',
    reach: 'Weapon Skin Traders Across India',
    placement: 'Instagram Trade Story (24h)',
    turnaround: '15-minute queue scheduling',
    services: [
      '24-Hour Dedicated Trade Story',
      'Direct Tag to Your Instagram Handle',
      'Reaches Weapon Skin Traders Across India',
      'Instant Verification & Placement',
    ],
    benefits: [
      'Targeted audience: Reaches players actively looking to trade weapon skins.',
      'Direct contact: Interested traders message you on Instagram directly.',
      'Middleman safety: Execute the trade through VIB middleman escrow for 100% scam immunity.',
      'Budget-friendly ₹55 flat pricing.',
    ],
    conditions: [
      'Specify what skins you have and what skins/accounts you want in return.',
      'Never trade without verified middleman escrow.',
    ],
    faqs: [
      {
        question: 'Can I trade my account for another account?',
        answer: 'Yes! The trade story mentions your current inventory and your desired trade target (e.g. "Trading Kuronami Vandal account for Champions 2024").',
      },
      {
        question: 'How do we safely swap accounts?',
        answer: 'Once you find a trader, contact VIB WhatsApp escrow. Our middleman holds both accounts, verifies emails, and swaps credentials securely.',
      },
    ],
    heroIconType: 'repeat',
  },

  'ad-trade-highlight-105': {
    id: 'ad-trade-highlight-105',
    name: 'Story + Highlight Placement',
    price: 105,
    category: 'trade',
    categoryLabel: 'Trade / Exchange',
    badge: 'TRADE HIGHLIGHT',
    tagline: 'Permanent Trade Highlight Spot for Continuous Trade Offers',
    description: 'Keep your trade offer active until the perfect partner is found. Includes a 24-hour launch story plus a permanent spot in our Instagram Trade Highlights with continuous inbound inquiries.',
    promotion_duration: 'Permanent Trade Highlight',
    reach: 'Continuous Trade Community Exposure',
    placement: 'Trade Story + Permanent Trade Highlight',
    turnaround: '20-45 minutes activation',
    services: [
      '24-Hour Trade Story Blast',
      'Permanent VIB Trade Highlight Spot',
      'Continuous Inquiries Until Trade Closed',
      'Verified Middleman Escrow Support',
    ],
    benefits: [
      'Permanent highlight spot dedicated exclusively to skin swaps and trade deals.',
      'Continuous inquiries from traders who check highlights daily.',
      'Full middleman escrow facilitation when finalizing the swap.',
      'Best trade visibility at just ₹105.',
    ],
    conditions: [
      'Notify VIB once trade is completed to mark highlight as traded.',
      'Accounts must have verified Riot IDs.',
    ],
    faqs: [
      {
        question: 'How long will my trade offer stay in highlights?',
        answer: 'Until you complete your trade and inform our support team.',
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
    tagline: 'Dedicated VIB Agent + Guaranteed Buyer Matchmaking',
    description: 'High-priority executive promotion for premium collections. Includes unlimited multi-channel story pushes, dedicated VIB sales broker, private Discord VIP buyer pitching, and guaranteed sale commitment.',
    promotion_duration: 'Guaranteed Until Sold',
    reach: '150,000+ Verified Buyers & Private VIP Network',
    placement: 'Multi-Channel Unlimited Pushes + Dedicated Agent',
    turnaround: 'Executive 10-minute priority onboarding',
    services: [
      'Unlimited Story Promotions until sold',
      'Dedicated VIB Personal Sales Executive',
      'Private VIP Discord & WhatsApp Pitching',
      'Priority Homepage Placement on VIB 2.0',
      'Zero Service Fee on Completed Sale',
    ],
    benefits: [
      'Dedicated agent handles buyer inquiries, questions, and price negotiation.',
      'Private matchmaking: Pitched directly to high-net-worth skin collectors in our private circles.',
      'Featured at top of VIB marketplace with verified gold badge.',
      '100% Guaranteed sale commitment: We keep promoting until your account is sold.',
    ],
    conditions: [
      'Account valuation must exceed ₹8,000 in skin inventory value.',
      'First-party original email (OGE) details verified by our security audit team.',
    ],
    faqs: [
      {
        question: 'What is guaranteed sale?',
        answer: 'We commit our full marketing resources and dedicated broker until your profile sells at your agreed valuation.',
      },
      {
        question: 'Does the agent negotiate on my behalf?',
        answer: 'Yes! Your assigned VIB broker filters out lowballers and only brings qualified buyers willing to pay your asking price.',
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
    tagline: 'White-Glove Concierge Sales for Vaulted & Collector Inventories',
    description: 'The pinnacle of esports asset brokerage. Tailored for accounts containing vaulted Champions bundles, rare knives, and radiant/immortal accounts. Full video showcase, multi-channel marketing, and white-glove escrow.',
    promotion_duration: 'White-Glove Until Sold',
    reach: '250,000+ Broad Cross-Platform Network',
    placement: 'Full Video Reel + Multi-Story + Top Web Banner + Broker',
    turnaround: 'VIP Concierge Turnaround',
    services: [
      'Custom 4K Video Reel / TikTok / Shorts Production',
      'Prominent Hero Banner Feature on VIB Homepage',
      'Dedicated Senior Broker Available 24/7 on WhatsApp',
      'Lifetime Guaranteed Escrow Certification',
      'Weekly Targeted Buyer Retargeting Campaigns',
    ],
    benefits: [
      'Studio video showcase: 4K video showing inspect animations and finisher effects.',
      'Top-of-page hero banner feature seen by 10,000+ daily visitors.',
      'Fastest turnaround: High-end accounts sell on average within 48 to 72 hours.',
      'White-glove instant settlement directly to your bank account upon sale.',
    ],
    conditions: [
      'Designed for vaulted collections, rare knife combos, or high competitive ranks.',
      'Pre-listing phone consultation with senior VIB account broker.',
    ],
    faqs: [
      {
        question: 'What video production is included?',
        answer: 'Our motion graphics team records in-game 4K inspect clips, finishers, and sound effects to produce a high-impact Instagram Reel and YouTube Short.',
      },
    ],
    heroIconType: 'crown',
  },

  'ad-bonus-free-18pct': {
    id: 'ad-bonus-free-18pct',
    name: 'Free Public Community Advertisement (18% Service Fee After Sale)',
    price: 0,
    category: 'bonus',
    categoryLabel: 'Zero Upfront',
    badge: '₹0 UPFRONT',
    tagline: 'List Today for Free — Pay Only 18% Fee After Successful Sale',
    description: 'List your Valorant profile on our public community website with zero advance payment. You only pay an 18% facilitation fee deducted from the final sale amount after your account is sold safely through escrow.',
    promotion_duration: 'Active Until Sold',
    reach: 'Community Website Visitors',
    placement: 'VIB Public Community Directory',
    turnaround: 'Instant approval after review',
    services: [
      'Zero Upfront Advance Payment Required',
      'Public Community Website Listing',
      'Standard Escrow Verification on Sale',
      '18% Service Fee Deducted Only After Completion',
    ],
    benefits: [
      'Completely risk-free: Pay ₹0 today.',
      'If your account does not sell, you owe nothing.',
      'Safe escrow protection for both buyer and seller upon sale.',
      'Includes basic community search listing.',
    ],
    conditions: [
      '18% service fee is automatically deducted from buyer funds upon successful transaction completion.',
      'Does not include Instagram post or story boosts (available as paid add-ons).',
    ],
    faqs: [
      {
        question: 'Do I need to pay anything right now?',
        answer: 'No! The listing is 100% free upfront. The 18% service fee is only deducted from the payout when a buyer purchases your account.',
      },
    ],
    heroIconType: 'shield',
  },
};
