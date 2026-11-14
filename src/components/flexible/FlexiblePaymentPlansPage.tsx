import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  ChevronRight,
  Shield,
  Calendar,
  Layers,
  Coins,
  Check,
  Zap,
  FileText,
  UploadCloud,
  Search,
  Headphones,
  Users,
  MessageSquare,
  Info,
} from 'lucide-react';
import { Currency } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from '../client/Header';
import { FlagIcon } from '../common/FlagIcon';
import { FlexiblePlanSelection } from '../../types/flexiblePlans';

interface FlexiblePaymentPlansPageProps {
  currency: Currency;
  onNavigate: (page: ClientPage, sectionId?: string) => void;
  onSelectPlan: (plan: FlexiblePlanSelection) => void;
  initialCategory?: 'vp' | 'account';
  initialRegion?: 'in' | 'php';
  initialListingId?: string;
}

const FALLBACK_IN_PACKAGES = [
  {
    id: 'vp-in-1000',
    vpAmount: 1000,
    name: '1,000 Valorant Points',
    priceINR: 1190,
    downPaymentPct: 0,
    downPaymentINR: 0,
    payAfter15DaysPrice: 1190,
    plans: [
      {
        id: 'in-1k-w4',
        name: '₹398 × 4 Weeks',
        frequency: 'weekly',
        duration: 4,
        installmentAmount: 398,
        downPayment: 0,
        balance: 1592,
        totalPayable: 1592,
        description: 'Pay ₹398 every week for 4 weeks.',
      },
      {
        id: 'in-1k-m4',
        name: '₹597 × 4 Months',
        frequency: 'monthly',
        duration: 4,
        installmentAmount: 597,
        downPayment: 0,
        balance: 2388,
        totalPayable: 2388,
        description: 'Pay ₹597 every month for 4 months.',
      },
    ],
  },
  {
    id: 'vp-in-2050',
    vpAmount: 2050,
    name: '2,050 Valorant Points',
    priceINR: 2290,
    downPaymentPct: 0,
    downPaymentINR: 0,
    payAfter15DaysPrice: 2290,
    plans: [
      {
        id: 'in-2k-w6',
        name: '₹395 × 6 Weeks',
        frequency: 'weekly',
        duration: 6,
        installmentAmount: 395,
        downPayment: 0,
        balance: 2370,
        totalPayable: 2370,
        description: 'Pay ₹395 every week for 6 weeks.',
      },
      {
        id: 'in-2k-m3',
        name: '₹790 × 3 Months',
        frequency: 'monthly',
        duration: 3,
        installmentAmount: 790,
        downPayment: 0,
        balance: 2370,
        totalPayable: 2370,
        description: 'Pay ₹790 every month for 3 months.',
      },
    ],
  },
  {
    id: 'vp-in-5350',
    vpAmount: 5350,
    name: '5,350 Valorant Points',
    priceINR: 5490,
    downPaymentPct: 0,
    downPaymentINR: 0,
    payAfter15DaysPrice: 5490,
    plans: [
      {
        id: 'in-5k-w12',
        name: '₹506 × 12 Weeks',
        frequency: 'weekly',
        duration: 12,
        installmentAmount: 506,
        downPayment: 0,
        balance: 6072,
        totalPayable: 6072,
        description: 'Pay ₹506 every week for 12 weeks.',
      },
      {
        id: 'in-5k-m4',
        name: '₹1,490 × 4 Months',
        frequency: 'monthly',
        duration: 4,
        installmentAmount: 1490,
        downPayment: 0,
        balance: 5960,
        totalPayable: 5960,
        description: 'Pay ₹1,490 every month for 4 months.',
      },
    ],
  },
  {
    id: 'vp-in-11000',
    vpAmount: 11000,
    name: '11,000 Valorant Points',
    priceINR: 8990,
    downPaymentPct: 0,
    downPaymentINR: 0,
    badge: 'MOST POPULAR',
    payAfter15DaysPrice: 8990,
    plans: [
      {
        id: 'in-11k-w12',
        name: '₹747 × 12 Weeks',
        frequency: 'weekly',
        duration: 12,
        installmentAmount: 747,
        downPayment: 0,
        balance: 8964,
        totalPayable: 8964,
        description: 'Pay ₹747 every week for 12 weeks.',
      },
      {
        id: 'in-11k-m4',
        name: '₹2,190 × 4 Months',
        frequency: 'monthly',
        duration: 4,
        installmentAmount: 2190,
        downPayment: 0,
        balance: 8760,
        totalPayable: 8760,
        description: 'Pay ₹2,190 every month for 4 months.',
      },
    ],
  },
  {
    id: 'vp-in-16500',
    vpAmount: 16500,
    name: '16,500 Valorant Points',
    priceINR: 12490,
    downPaymentPct: 0,
    downPaymentINR: 0,
    payAfter15DaysPrice: 12490,
    plans: [
      {
        id: 'in-16k-w12',
        name: '₹990 × 12 Weeks',
        frequency: 'weekly',
        duration: 12,
        installmentAmount: 990,
        downPayment: 0,
        balance: 11880,
        totalPayable: 11880,
        description: 'Pay ₹990 every week for 12 weeks.',
      },
      {
        id: 'in-16k-m4',
        name: '₹2,890 × 4 Months',
        frequency: 'monthly',
        duration: 4,
        installmentAmount: 2890,
        downPayment: 0,
        balance: 11560,
        totalPayable: 11560,
        description: 'Pay ₹2,890 every month for 4 months.',
      },
    ],
  },
  {
    id: 'vp-in-22000',
    vpAmount: 22000,
    name: '22,000 Valorant Points',
    priceINR: 15990,
    downPaymentPct: 0,
    downPaymentINR: 0,
    payAfter15DaysPrice: 15990,
    plans: [
      {
        id: 'in-22k-w12',
        name: '₹1,290 × 12 Weeks',
        frequency: 'weekly',
        duration: 12,
        installmentAmount: 1290,
        downPayment: 0,
        balance: 15480,
        totalPayable: 15480,
        description: 'Pay ₹1,290 every week for 12 weeks.',
      },
      {
        id: 'in-22k-m4',
        name: '₹3,750 × 4 Months',
        frequency: 'monthly',
        duration: 4,
        installmentAmount: 3750,
        downPayment: 0,
        balance: 15000,
        totalPayable: 15000,
        description: 'Pay ₹3,750 every month for 4 months.',
      },
    ],
  },
  {
    id: 'vp-in-35000',
    vpAmount: 35000,
    name: '35,000 Valorant Points',
    priceINR: 24990,
    downPaymentPct: 0,
    downPaymentINR: 0,
    payAfter15DaysPrice: 24990,
    plans: [
      {
        id: 'in-35k-w14',
        name: '₹1,869 × 14 Weeks',
        frequency: 'weekly',
        duration: 14,
        installmentAmount: 1869,
        downPayment: 0,
        balance: 26166,
        totalPayable: 26166,
        description: 'Pay ₹1,869 every week for 14 weeks.',
      },
      {
        id: 'in-35k-m4',
        name: '₹5,490 × 4 Months',
        frequency: 'monthly',
        duration: 4,
        installmentAmount: 5490,
        downPayment: 0,
        balance: 21960,
        totalPayable: 21960,
        description: 'Pay ₹5,490 every month for 4 months.',
      },
    ],
  },
];

const FALLBACK_PHP_PACKAGES = [
  {
    id: 'vp-php-5400',
    vpAmount: 5400,
    name: '5,400 PHP Region VP',
    priceINR: 2800,
    downPaymentPct: 0,
    downPaymentINR: 0,
    payAfter15DaysPrice: 2800,
    plans: [
      {
        id: 'php-5k-w8',
        name: '₱350 × 8 Weeks',
        frequency: 'weekly',
        duration: 8,
        installmentAmount: 350,
        downPayment: 0,
        balance: 2800,
        totalPayable: 2800,
        description: 'Pay ₱350 every week for 8 weeks.',
      },
      {
        id: 'php-5k-m4',
        name: '₱700 × 4 Months',
        frequency: 'monthly',
        duration: 4,
        installmentAmount: 700,
        downPayment: 0,
        balance: 2800,
        totalPayable: 2800,
        description: 'Pay ₱700 every month for 4 months.',
      },
    ],
  },
  {
    id: 'vp-php-13750',
    vpAmount: 13750,
    name: '13,750 PHP Region VP',
    priceINR: 6200,
    downPaymentPct: 0,
    downPaymentINR: 0,
    payAfter15DaysPrice: 6200,
    plans: [
      {
        id: 'php-13k-w12',
        name: '₱550 × 12 Weeks',
        frequency: 'weekly',
        duration: 12,
        installmentAmount: 550,
        downPayment: 0,
        balance: 6600,
        totalPayable: 6600,
        description: 'Pay ₱550 every week for 12 weeks.',
      },
      {
        id: 'php-13k-m4',
        name: '₱1,650 × 4 Months',
        frequency: 'monthly',
        duration: 4,
        installmentAmount: 1650,
        downPayment: 0,
        balance: 6600,
        totalPayable: 6600,
        description: 'Pay ₱1,650 every month for 4 months.',
      },
    ],
  },
  {
    id: 'vp-php-20500',
    vpAmount: 20500,
    name: '20,500 PHP Region VP',
    priceINR: 8900,
    downPaymentPct: 0,
    downPaymentINR: 0,
    payAfter15DaysPrice: 8900,
    plans: [
      {
        id: 'php-20k-w12',
        name: '₱780 × 12 Weeks',
        frequency: 'weekly',
        duration: 12,
        installmentAmount: 780,
        downPayment: 0,
        balance: 9360,
        totalPayable: 9360,
        description: 'Pay ₱780 every week for 12 weeks.',
      },
      {
        id: 'php-20k-m4',
        name: '₱2,340 × 4 Months',
        frequency: 'monthly',
        duration: 4,
        installmentAmount: 2340,
        downPayment: 0,
        balance: 9360,
        totalPayable: 9360,
        description: 'Pay ₱2,340 every month for 4 months.',
      },
    ],
  },
  {
    id: 'vp-php-28000',
    vpAmount: 28000,
    name: '28,000 PHP Region VP',
    priceINR: 11900,
    downPaymentPct: 0,
    downPaymentINR: 0,
    payAfter15DaysPrice: 11900,
    plans: [
      {
        id: 'php-28k-w12',
        name: '₱990 × 12 Weeks',
        frequency: 'weekly',
        duration: 12,
        installmentAmount: 990,
        downPayment: 0,
        balance: 11880,
        totalPayable: 11880,
        description: 'Pay ₱990 every week for 12 weeks.',
      },
      {
        id: 'php-28k-m4',
        name: '₱2,970 × 4 Months',
        frequency: 'monthly',
        duration: 4,
        installmentAmount: 2970,
        downPayment: 0,
        balance: 11880,
        totalPayable: 11880,
        description: 'Pay ₱2,970 every month for 4 months.',
      },
    ],
  },
];

export const FlexiblePaymentPlansPage: React.FC<FlexiblePaymentPlansPageProps> = ({
  currency,
  onNavigate,
  onSelectPlan,
  initialCategory = 'vp',
  initialRegion = 'in',
  initialListingId = '',
}) => {
  const [activeCategory, setActiveCategory] = useState<'vp' | 'account'>(initialCategory);
  const [vpRegion, setVpRegion] = useState<'in' | 'php'>(initialRegion);
  const [paymentView, setPaymentView] = useState<'weekly' | 'monthly' | '15days'>('weekly');

  const [settings, setSettings] = useState<any>(null);
  const [guaranteedListings, setGuaranteedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // VP Selection state
  const [selectedVpPkgId, setSelectedVpPkgId] = useState<string>('vp-in-1000');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Account Selection state
  const [selectedAccountListingId, setSelectedAccountListingId] = useState<string>(initialListingId);
  const [selectedAccountFrequency, setSelectedAccountFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedAccountOptionIdx, setSelectedAccountOptionIdx] = useState<number>(0);

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setVpRegion(initialRegion);
    if (initialRegion === 'php') {
      setSelectedVpPkgId('vp-php-5400');
    } else {
      setSelectedVpPkgId('vp-in-1000');
    }
  }, [initialRegion]);

  useEffect(() => {
    if (initialListingId) {
      setSelectedAccountListingId(initialListingId);
    }
  }, [initialListingId]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [settingsRes, listingsRes] = await Promise.all([
          fetch('/api/emi/settings'),
          fetch('/api/listings?limit=100'),
        ]);

        let parsedSettings: any = null;
        if (settingsRes.ok && isMounted) {
          parsedSettings = await settingsRes.json();
          setSettings(parsedSettings);
        }

        if (listingsRes.ok && isMounted) {
          const lData = await listingsRes.json();
          const items = Array.isArray(lData.listings)
            ? lData.listings
            : Array.isArray(lData)
              ? lData
              : [];
          const minAmount = Number(parsedSettings?.account?.minAmount) || 1500;
          const guaranteed = items.filter(
            (item: any) =>
              (item.guarantee_type === 'lifetime_guaranteed' || item.guarantee_type === 'guaranteed') &&
              item.status === 'published' &&
              Number(item.price_inr || item.price) >= minAmount
          );
          if (initialListingId) {
            guaranteed.sort((a: any, b: any) =>
              a.id === initialListingId ? -1 : b.id === initialListingId ? 1 : 0
            );
          }
          setGuaranteedListings(guaranteed);
          if (guaranteed.length > 0 && !selectedAccountListingId) {
            setSelectedAccountListingId(guaranteed[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load flexible payment plans data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [initialListingId]);

  // Packages list resolution
  const vpConfig = settings?.vp?.[vpRegion];
  const vpPackages: any[] = useMemo(() => {
    const raw = vpConfig?.packages;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return vpRegion === 'in' ? FALLBACK_IN_PACKAGES : FALLBACK_PHP_PACKAGES;
  }, [vpConfig, vpRegion]);

  const vpWeeklyLateFee = settings?.vp?.weeklyLateFee ?? 300;
  const vpMonthlyLateFee = settings?.vp?.monthlyLateFee ?? 1500;

  const accountSlabs: any[] = settings?.account?.slabs || [
    {
      id: 'slab-1',
      name: 'Entry Tier (₹1,500 – ₹5,000)',
      minPrice: 1500,
      maxPrice: 5000,
      downPaymentPct: 30,
      fixedProfit: 450,
      options: [
        { name: '4 Weeks (Weekly)', frequency: 'weekly', installments: 4 },
        { name: '2 Months (Monthly)', frequency: 'monthly', installments: 2 },
      ],
    },
    {
      id: 'slab-2',
      name: 'Mid Tier (₹5,001 – ₹12,000)',
      minPrice: 5001,
      maxPrice: 12000,
      downPaymentPct: 30,
      fixedProfit: 950,
      options: [
        { name: '6 Weeks (Weekly)', frequency: 'weekly', installments: 6 },
        { name: '8 Weeks (Weekly)', frequency: 'weekly', installments: 8 },
        { name: '3 Months (Monthly)', frequency: 'monthly', installments: 3 },
      ],
    },
    {
      id: 'slab-3',
      name: 'High Tier (₹12,001 – ₹25,000)',
      minPrice: 12001,
      maxPrice: 25000,
      downPaymentPct: 35,
      fixedProfit: 1850,
      options: [
        { name: '8 Weeks (Weekly)', frequency: 'weekly', installments: 8 },
        { name: '3 Months (Monthly)', frequency: 'monthly', installments: 3 },
        { name: '4 Months (Monthly)', frequency: 'monthly', installments: 4 },
      ],
    },
    {
      id: 'slab-4',
      name: 'Elite Tier (₹25,001+)',
      minPrice: 25001,
      maxPrice: 999999,
      downPaymentPct: 40,
      fixedProfit: 2800,
      options: [
        { name: '3 Months (Monthly)', frequency: 'monthly', installments: 3 },
        { name: '4 Months (Monthly)', frequency: 'monthly', installments: 4 },
        { name: '6 Months (Monthly)', frequency: 'monthly', installments: 6 },
      ],
    },
  ];

  const accountWeeklyLateFee = settings?.account?.weeklyLateFee ?? 300;
  const accountMonthlyLateFee = settings?.account?.monthlyLateFee ?? 1500;

  // Currently selected VP package
  const selectedVpPkg = useMemo(() => {
    return (
      vpPackages.find((p) => p.id === selectedVpPkgId) ||
      vpPackages[0] ||
      FALLBACK_IN_PACKAGES[0]
    );
  }, [vpPackages, selectedVpPkgId]);

  // Plans of the selected VP package
  const selectedVpPlans: any[] = useMemo(() => {
    return selectedVpPkg?.plans || [];
  }, [selectedVpPkg]);

  // Ensure selected plan matches
  useEffect(() => {
    if (selectedVpPlans.length > 0) {
      if (paymentView === '15days') {
        setSelectedPlanId('15days');
      } else {
        const matching = selectedVpPlans.find((p) => p.frequency === paymentView);
        if (matching) {
          setSelectedPlanId(matching.id);
        } else if (!selectedVpPlans.some((p) => p.id === selectedPlanId)) {
          setSelectedPlanId(selectedVpPlans[0].id);
        }
      }
    }
  }, [selectedVpPlans, paymentView]);

  // Currently active plan option for VP
  const currentVpPlan = useMemo(() => {
    if (selectedPlanId === '15days') {
      const price = selectedVpPkg.payAfter15DaysPrice || selectedVpPkg.priceINR;
      return {
        id: '15days',
        name: 'Pay After 15 Days',
        frequency: 'weekly' as const,
        duration: 2,
        installmentAmount: price,
        downPayment: 0,
        balance: price,
        totalPayable: price,
        description: `Single payment of ${formatCurrencyPrice(price, currency)} due after 15 days.`,
        is15Days: true,
      };
    }
    return (
      selectedVpPlans.find((p) => p.id === selectedPlanId) ||
      selectedVpPlans[0] || {
        id: 'fallback-plan',
        name: '4 Weeks Weekly Plan',
        frequency: 'weekly' as const,
        duration: 4,
        installmentAmount: 398,
        downPayment: 0,
        balance: 1592,
        totalPayable: 1592,
        description: 'Pay ₹398 every week for 4 weeks.',
      }
    );
  }, [selectedPlanId, selectedVpPlans, selectedVpPkg, currency]);

  // Submit VP Plan
  const handleSelectVp = () => {
    const is15Days = selectedPlanId === '15days' || currentVpPlan.is15Days;
    const downPayment = is15Days ? 0 : (currentVpPlan.downPayment ?? 0);
    const totalPayable = is15Days
      ? (selectedVpPkg.payAfter15DaysPrice || selectedVpPkg.priceINR)
      : currentVpPlan.totalPayable;
    const financed = totalPayable - downPayment;
    const totalInstallments = is15Days ? 1 : currentVpPlan.duration;
    const installmentAmount = is15Days ? totalPayable : currentVpPlan.installmentAmount;
    const freq: 'weekly' | 'monthly' = currentVpPlan.frequency === 'monthly' ? 'monthly' : 'weekly';

    const selection: FlexiblePlanSelection = {
      serviceType: 'vp',
      region: vpRegion,
      vpAmount: selectedVpPkg.vpAmount,
      vpPackageId: selectedVpPkg.id,
      productTitle: `${Number(selectedVpPkg.vpAmount).toLocaleString()} Valorant Points (${
        vpRegion === 'in' ? 'Indian Region' : 'Philippines Region'
      })`,
      productPrice: selectedVpPkg.priceINR,
      downPaymentPercent: selectedVpPkg.downPaymentPct || 0,
      downPaymentAmount: downPayment,
      financedAmount: financed,
      fixedProfit: 0,
      totalPayable: totalPayable,
      paymentFrequency: freq,
      totalInstallments: totalInstallments,
      installmentAmount: installmentAmount,
      weeklyLateFee: vpWeeklyLateFee,
      monthlyLateFee: vpMonthlyLateFee,
    };
    onSelectPlan(selection);
  };

  // Selected Account details
  const selectedAccountListing = useMemo(() => {
    return (
      guaranteedListings.find((l) => l.id === selectedAccountListingId) ||
      guaranteedListings[0] ||
      null
    );
  }, [guaranteedListings, selectedAccountListingId]);

  const selectedAccountSchedule = useMemo(() => {
    if (!selectedAccountListing) return null;
    const priceINR = Number(
      selectedAccountListing.price_inr || selectedAccountListing.price || 0
    );
    const slab =
      accountSlabs.find((s) => priceINR >= s.minPrice && priceINR <= s.maxPrice) ||
      accountSlabs[accountSlabs.length - 1] || {
        name: 'Standard Slab',
        downPaymentPct: 30,
        fixedProfit: 950,
        options: [
          { name: '4 Weeks (Weekly)', frequency: 'weekly', installments: 4 },
          { name: '2 Months (Monthly)', frequency: 'monthly', installments: 2 },
        ],
      };

    const downPayment = Math.round(priceINR * (slab.downPaymentPct / 100));
    const principalBalance = priceINR - downPayment;
    const totalRemainingPayable = principalBalance + slab.fixedProfit;
    const totalPayable = downPayment + totalRemainingPayable;

    const availableOpts = (slab.options || []).filter(
      (o: any) => o.frequency === selectedAccountFrequency
    );
    const optionsToUse = availableOpts.length > 0 ? availableOpts : slab.options || [];
    const chosenOpt = optionsToUse[selectedAccountOptionIdx] || optionsToUse[0];
    const totalInstallments =
      chosenOpt?.installments ?? (selectedAccountFrequency === 'weekly' ? 4 : 2);
    const installmentAmount = Math.round(totalRemainingPayable / totalInstallments);

    return {
      priceINR,
      slabName: slab.name,
      downPaymentPct: slab.downPaymentPct,
      downPayment,
      principalBalance,
      fixedProfit: slab.fixedProfit,
      totalRemainingPayable,
      totalPayable,
      optionsToUse,
      chosenOpt,
      totalInstallments,
      installmentAmount,
      frequency: chosenOpt?.frequency || selectedAccountFrequency,
    };
  }, [
    selectedAccountListing,
    accountSlabs,
    selectedAccountFrequency,
    selectedAccountOptionIdx,
  ]);

  const handleSelectAccount = () => {
    if (!selectedAccountListing || !selectedAccountSchedule) return;
    const coverImage =
      (Array.isArray(selectedAccountListing.images) && selectedAccountListing.images[0]) ||
      selectedAccountListing.image_url ||
      selectedAccountListing.screenshot_url ||
      undefined;

    const selection: FlexiblePlanSelection = {
      serviceType: 'account',
      region: selectedAccountListing.region || 'ap',
      listingId: selectedAccountListing.id,
      listingTitle: selectedAccountListing.title,
      listingRank: selectedAccountListing.rank,
      listingImage: coverImage,
      listingSeller: selectedAccountListing.seller_name,
      productTitle: selectedAccountListing.title,
      productPrice: selectedAccountSchedule.priceINR,
      downPaymentPercent: selectedAccountSchedule.downPaymentPct,
      downPaymentAmount: selectedAccountSchedule.downPayment,
      financedAmount: selectedAccountSchedule.principalBalance,
      fixedProfit: selectedAccountSchedule.fixedProfit,
      totalPayable: selectedAccountSchedule.totalPayable,
      paymentFrequency: selectedAccountSchedule.frequency as 'weekly' | 'monthly',
      totalInstallments: selectedAccountSchedule.totalInstallments,
      installmentAmount: selectedAccountSchedule.installmentAmount,
      slabName: selectedAccountSchedule.slabName,
      weeklyLateFee: accountWeeklyLateFee,
      monthlyLateFee: accountMonthlyLateFee,
    };
    onSelectPlan(selection);
  };

  // Helper to find lowest weekly rate for left package card
  const getPackageWeeklyRate = (pkg: any) => {
    const weeklyPlan = pkg.plans?.find((p: any) => p.frequency === 'weekly');
    if (weeklyPlan) {
      return formatCurrencyPrice(weeklyPlan.installmentAmount, currency);
    }
    const lowest = pkg.plans?.[0]?.installmentAmount || Math.round(pkg.priceINR / 4);
    return formatCurrencyPrice(lowest, currency);
  };

  return (
    <div className="min-h-screen bg-[#06040d] text-white selection:bg-purple-500 selection:text-white pb-24">
      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-purple-900/20 via-fuchsia-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-400 mb-6 font-mono">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="hover:text-purple-300 transition-colors focus-visible:ring-2 focus-visible:ring-purple-400 rounded cursor-pointer"
          >
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-purple-400 font-semibold">Flexible Payment Plans</span>
        </nav>

        {/* Hero Section */}
        <div className="relative rounded-3xl bg-gradient-to-r from-purple-950/40 via-[#0d0e24] to-black/80 border border-purple-500/30 p-6 sm:p-10 mb-8 overflow-hidden shadow-2xl">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <h1 className="text-3xl sm:text-5xl font-black font-rajdhani uppercase tracking-wider text-white leading-tight">
                VIB FLEXIBLE PAYMENT{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400">
                  PLANS
                </span>
              </h1>

              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                Get Valorant Points (VP) or Lifetime Guaranteed Digital Profiles and pay in easy, flexible instalments.
                A secure, transparent and verified process by VIB.
              </p>

              {/* 4 Trust Micro Pills */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs font-mono text-gray-300">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Verified &amp; Secure</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200">
                  <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Flexible Tenures (Weekly / Monthly)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Mandatory KYC &amp; Agreement</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200">
                  <Zap className="w-4 h-4 text-fuchsia-400 shrink-0" />
                  <span>Quick Review (&le; 24 Hours)</span>
                </span>
              </div>
            </div>

            {/* 3D Neon Badge Graphic */}
            <div className="hidden lg:flex items-center justify-center shrink-0 pr-4">
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-70 transition duration-500" />
                <div className="relative rounded-2xl bg-gradient-to-br from-purple-900/60 via-[#130d32] to-[#0a071c] border-2 border-purple-400/50 p-6 flex flex-col items-center justify-center text-center shadow-2xl backdrop-blur-md min-w-[240px]">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-500 p-0.5 shadow-lg shadow-purple-500/50 mb-3 flex items-center justify-center">
                    <img
                      src="/assets/currencies/vp-large.png"
                      alt="VP Coins"
                      className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="text-xs font-mono uppercase tracking-widest text-purple-300 font-bold mb-1">
                    VIB
                  </div>
                  <div className="text-lg font-black font-rajdhani uppercase text-white leading-tight">
                    Flexible Payment Plans
                  </div>
                  <div className="mt-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-[10px] font-mono text-purple-300 font-bold uppercase">
                    VP &bull; Verified Escrow
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Category Switcher (Two Big Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={() => setActiveCategory('vp')}
            className={`p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 text-left cursor-pointer ${
              activeCategory === 'vp'
                ? 'bg-gradient-to-r from-purple-900/60 via-[#170e38] to-[#0f0b26] border-2 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.35)]'
                : 'bg-[#0c0d1e] border border-white/10 hover:border-purple-500/40 text-gray-400 hover:text-white'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                activeCategory === 'vp'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40'
                  : 'bg-white/5 text-gray-400'
              }`}
            >
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black font-rajdhani uppercase tracking-wider text-white">
                VP Flexible Payment Plans
              </div>
              <div className="text-xs text-purple-300 font-mono">
                Buy Valorant Points (VP) in instalments
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('account')}
            className={`p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 text-left cursor-pointer ${
              activeCategory === 'account'
                ? 'bg-gradient-to-r from-purple-900/60 via-[#170e38] to-[#0f0b26] border-2 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.35)]'
                : 'bg-[#0c0d1e] border border-white/10 hover:border-purple-500/40 text-gray-400 hover:text-white'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                activeCategory === 'account'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40'
                  : 'bg-white/5 text-gray-400'
              }`}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black font-rajdhani uppercase tracking-wider text-white">
                Digital Profile Flexible Plans
              </div>
              <div className="text-xs text-purple-300 font-mono">
                For Lifetime Guaranteed Profiles only
              </div>
            </div>
          </button>
        </div>

        {/* Filters Row: Region & Payment View */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 mb-8">
          {/* Select Region */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400 pl-1">Select Region:</span>
            {activeCategory === 'vp' ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVpRegion('in')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    vpRegion === 'in'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                      : 'bg-[#0c0d1e] text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  <FlagIcon country="IN" size="sm" />
                  <span>Indian VP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVpRegion('php')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    vpRegion === 'php'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                      : 'bg-[#0c0d1e] text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  <FlagIcon country="PH" size="sm" />
                  <span>Philippines VP</span>
                </button>
              </div>
            ) : (
              <span className="px-3 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-xs font-mono">
                All Regions (AP / Global)
              </span>
            )}
          </div>

          {/* Choose Payment View */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-gray-400">Choose Payment View:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentView('weekly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  paymentView === 'weekly'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'bg-[#0c0d1e] text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-purple-300" />
                <span>Weekly Plans</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentView('monthly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  paymentView === 'monthly'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'bg-[#0c0d1e] text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-fuchsia-300" />
                <span>Monthly Plans</span>
              </button>
              {activeCategory === 'vp' && (
                <button
                  type="button"
                  onClick={() => setPaymentView('15days')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    paymentView === '15days'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                      : 'bg-[#0c0d1e] text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-pink-300" />
                  <span>Pay After 15 Days</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TWO-COLUMN MASTER-DETAIL SECTION (Step 1 and Step 2)           */}
        {/* ============================================================== */}
        {loading ? (
          <div className="p-16 text-center text-gray-400 font-mono text-sm">
            Loading flexible payment packages...
          </div>
        ) : activeCategory === 'vp' ? (
          vpConfig?.enabled === false ? (
            <div className="p-12 text-center rounded-2xl bg-[#0c0d1e] border border-white/10 text-gray-400 space-y-2 mb-12">
              <CreditCard className="w-10 h-10 mx-auto text-purple-400" />
              <p className="text-base font-bold text-white font-rajdhani uppercase">
                {vpRegion === 'in' ? 'Indian VP' : 'Philippines VP'} Flexible Plans Temporarily Paused
              </p>
              <p className="text-xs text-gray-500">Please switch regions or check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12 items-start">
              {/* LEFT COLUMN: (1) Select a VP Package */}
              <div className="lg:col-span-5 rounded-2xl bg-[#0c0d1e] border border-purple-500/20 p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-purple-900/40">
                    1
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black font-rajdhani uppercase tracking-wider text-white">
                      Select a VP Package
                    </h2>
                    <p className="text-xs text-gray-400 font-mono">
                      Choose the VP amount you want to purchase.
                    </p>
                  </div>
                </div>

                {/* Vertical Packages List */}
                <div className="space-y-3">
                  {vpPackages.map((pkg) => {
                    const isSelected = pkg.id === selectedVpPkgId;
                    const weeklyRate = getPackageWeeklyRate(pkg);

                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => {
                          setSelectedVpPkgId(pkg.id);
                        }}
                        className={`w-full p-4 rounded-xl flex items-center justify-between gap-3 text-left transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-950/80 via-[#18113c] to-[#0e0b24] border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.35)]'
                            : 'bg-[#090817] border border-white/10 hover:border-purple-500/40 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Coins graphic */}
                          <div className="w-10 h-10 rounded-lg bg-purple-950/60 border border-purple-500/30 flex items-center justify-center shrink-0">
                            <img
                              src="/assets/currencies/vp-icon.png"
                              alt="VP"
                              className="w-6 h-6 object-contain"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <Coins className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <div className="text-base font-black font-rajdhani uppercase tracking-wider text-white">
                              {Number(pkg.vpAmount).toLocaleString()} VP
                            </div>
                            <div className="text-[11px] font-mono text-gray-400">
                              {pkg.name}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {pkg.badge && (
                            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-mono font-bold uppercase">
                              ★ {pkg.badge}
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-lg bg-purple-900/40 border border-purple-500/30 text-purple-200 text-xs font-mono font-bold whitespace-nowrap">
                            From {weeklyRate} / week
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${
                              isSelected ? 'text-purple-400 translate-x-1' : 'text-gray-500'
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT COLUMN: (2) Choose a Payment Plan for [Selected VP] */}
              <div className="lg:col-span-7 rounded-2xl bg-[#0c0d1e] border border-purple-500/20 p-5 space-y-5 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-purple-900/40">
                      2
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black font-rajdhani uppercase tracking-wider text-white">
                        Choose a Payment Plan for{' '}
                        <span className="text-purple-400">
                          {Number(selectedVpPkg?.vpAmount || 1000).toLocaleString()} VP
                        </span>
                      </h2>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-gray-300">
                    <FlagIcon country={vpRegion === 'in' ? 'IN' : 'PH'} size="sm" />
                    <span>{vpRegion === 'in' ? 'Indian VP' : 'Philippines VP'}</span>
                  </span>
                </div>

                {/* Top Highlight Summary Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/60 via-[#18113c] to-[#0e0b24] border border-purple-500/40 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-600/30 border border-purple-400/40 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-purple-300" />
                    </div>
                    <div>
                      <div className="text-xl font-black font-rajdhani uppercase text-white">
                        {Number(selectedVpPkg?.vpAmount || 1000).toLocaleString()} VP
                      </div>
                      <div className="text-[11px] font-mono text-purple-300">
                        Top-up direct to your Riot ID
                      </div>
                    </div>
                  </div>

                  <div className="border-l border-white/10 pl-4 text-right">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-gray-400 justify-end">
                      <Clock className="w-3.5 h-3.5 text-pink-400" />
                      <span>Pay After 15 Days</span>
                    </div>
                    <div className="text-lg font-black font-rajdhani text-white">
                      {formatCurrencyPrice(
                        selectedVpPkg?.payAfter15DaysPrice || selectedVpPkg?.priceINR || 1190,
                        currency
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-Frequency Tabs */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentView('weekly')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentView === 'weekly'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/40'
                        : 'bg-[#0a081a] border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-bold font-rajdhani uppercase">
                      Weekly Plans
                    </div>
                    <div className="text-[10px] font-mono opacity-80">
                      Pay in weekly instalments
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentView('monthly')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentView === 'monthly'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/40'
                        : 'bg-[#0a081a] border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-bold font-rajdhani uppercase">
                      Monthly Plans
                    </div>
                    <div className="text-[10px] font-mono opacity-80">
                      Pay in monthly instalments
                    </div>
                  </button>
                </div>

                {/* Selectable Plan Options (Radio Cards) */}
                <div className="space-y-3">
                  {selectedVpPlans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const durationLabel =
                      plan.frequency === 'weekly'
                        ? `${plan.duration} Weeks`
                        : `${plan.duration} Months`;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                        }}
                        className={`w-full p-4 rounded-xl flex items-center justify-between gap-4 text-left transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-950/70 via-[#170e3a] to-[#0e0b24] border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                            : 'bg-[#0a081a] border border-white/10 hover:border-purple-500/40 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Radio Indicator */}
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'border-purple-400 bg-purple-900/40'
                                : 'border-gray-600 bg-transparent'
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-base font-black font-rajdhani text-white">
                              {plan.name || `${formatCurrencyPrice(plan.installmentAmount, currency)} × ${durationLabel}`}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              {plan.description ||
                                `Pay ${formatCurrencyPrice(
                                  plan.installmentAmount,
                                  currency
                                )} every ${
                                  plan.frequency === 'weekly' ? 'week' : 'month'
                                } for ${durationLabel}.`}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-mono text-gray-400 uppercase">
                            Total Payable
                          </div>
                          <div className="text-base font-black font-rajdhani text-white">
                            {formatCurrencyPrice(plan.totalPayable, currency)}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* 15 Days Option */}
                  {selectedVpPkg?.payAfter15DaysPrice && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlanId('15days');
                      }}
                      className={`w-full p-4 rounded-xl flex items-center justify-between gap-4 text-left transition-all duration-200 cursor-pointer ${
                        selectedPlanId === '15days'
                          ? 'bg-gradient-to-r from-purple-950/70 via-[#170e3a] to-[#0e0b24] border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                          : 'bg-[#0a081a] border border-white/10 hover:border-purple-500/40 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selectedPlanId === '15days'
                              ? 'border-purple-400 bg-purple-900/40'
                              : 'border-gray-600 bg-transparent'
                          }`}
                        >
                          {selectedPlanId === '15days' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-base font-black font-rajdhani text-white flex items-center gap-2">
                            <span>Pay After 15 Days</span>
                            <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px] font-mono">
                              Single Settlement
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            Receive your VP now, pay the full balance after 15 calendar days.
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-mono text-gray-400 uppercase">
                          Total Payable
                        </div>
                        <div className="text-base font-black font-rajdhani text-white">
                          {formatCurrencyPrice(selectedVpPkg.payAfter15DaysPrice, currency)}
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Bottom Summary Bar (3 columns) */}
                <div className="p-4 rounded-xl bg-[#090717] border border-white/10 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-gray-400 mb-0.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      <span>Total Duration</span>
                    </div>
                    <div className="text-sm sm:text-base font-black font-rajdhani text-white">
                      {selectedPlanId === '15days'
                        ? '15 Days'
                        : `${currentVpPlan.duration} ${
                            currentVpPlan.frequency === 'weekly' ? 'Weeks' : 'Months'
                          }`}
                    </div>
                  </div>

                  <div className="border-x border-white/10 px-2">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-gray-400 mb-0.5">
                      <Coins className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span>Instalment Amount</span>
                    </div>
                    <div className="text-sm sm:text-base font-black font-rajdhani text-white">
                      {selectedPlanId === '15days'
                        ? formatCurrencyPrice(
                            selectedVpPkg?.payAfter15DaysPrice || selectedVpPkg?.priceINR,
                            currency
                          )
                        : `${formatCurrencyPrice(
                            currentVpPlan.installmentAmount,
                            currency
                          )} / ${currentVpPlan.frequency === 'weekly' ? 'Week' : 'Month'}`}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-gray-400 mb-0.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Total Payable</span>
                    </div>
                    <div className="text-sm sm:text-base font-black font-rajdhani text-emerald-400">
                      {formatCurrencyPrice(
                        selectedPlanId === '15days'
                          ? selectedVpPkg?.payAfter15DaysPrice || selectedVpPkg?.priceINR
                          : currentVpPlan.totalPayable,
                        currency
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Action Button */}
                <button
                  type="button"
                  onClick={handleSelectVp}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-pink-500 text-white font-black font-rajdhani uppercase tracking-wider text-base transition-all shadow-xl shadow-purple-900/50 flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <span>Select This Plan</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          )
        ) : (
          /* ============================================================== */
          /* DIGITAL PROFILE TWO-COLUMN MASTER-DETAIL SECTION              */
          /* ============================================================== */
          <div>
            {guaranteedListings.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0c0d1e] border border-white/10 text-gray-400 space-y-3 mb-12">
                <ShieldCheck className="w-12 h-12 mx-auto text-purple-400" />
                <p className="text-base font-bold text-white font-rajdhani uppercase">
                  No eligible guaranteed profiles currently available
                </p>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Flexible payment plans apply exclusively to Lifetime Guaranteed profiles priced at{' '}
                  {formatCurrencyPrice(1500, currency)} or above. Public community marketplace listings are
                  excluded.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12 items-start">
                {/* LEFT COLUMN: (1) Select a Digital Profile */}
                <div className="lg:col-span-5 rounded-2xl bg-[#0c0d1e] border border-purple-500/20 p-5 space-y-4 shadow-xl">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-purple-900/40">
                      1
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black font-rajdhani uppercase tracking-wider text-white">
                        Select a Digital Profile
                      </h2>
                      <p className="text-xs text-gray-400 font-mono">
                        Choose a verified Lifetime Guaranteed profile.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                    {guaranteedListings.map((listing) => {
                      const isSelected = listing.id === selectedAccountListingId;
                      const price = Number(listing.price_inr || listing.price || 0);
                      const approxWeekly = Math.round((price * 0.7) / 4);

                      return (
                        <button
                          key={listing.id}
                          type="button"
                          onClick={() => {
                            setSelectedAccountListingId(listing.id);
                            setSelectedAccountOptionIdx(0);
                          }}
                          className={`w-full p-4 rounded-xl flex items-center justify-between gap-3 text-left transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-950/80 via-[#18113c] to-[#0e0b24] border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.35)]'
                              : 'bg-[#090817] border border-white/10 hover:border-purple-500/40 text-gray-300'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 uppercase font-bold">
                                Guaranteed
                              </span>
                              <span className="text-[10px] font-mono text-gray-400 uppercase">
                                {listing.rank || 'Ranked'}
                              </span>
                            </div>
                            <div className="text-sm font-black font-rajdhani uppercase text-white truncate">
                              {listing.title}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              Price: {formatCurrencyPrice(price, currency)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2.5 py-1 rounded-lg bg-purple-900/40 border border-purple-500/30 text-purple-200 text-xs font-mono font-bold whitespace-nowrap">
                              From {formatCurrencyPrice(approxWeekly, currency)}/wk
                            </span>
                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${
                                isSelected ? 'text-purple-400 translate-x-1' : 'text-gray-500'
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT COLUMN: (2) Choose a Payment Plan for [Selected Profile] */}
                <div className="lg:col-span-7 rounded-2xl bg-[#0c0d1e] border border-purple-500/20 p-5 space-y-5 shadow-xl">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-purple-900/40">
                        2
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-black font-rajdhani uppercase tracking-wider text-white">
                          Choose a Payment Plan for{' '}
                          <span className="text-purple-400">
                            {selectedAccountListing?.title || 'Selected Profile'}
                          </span>
                        </h2>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Lifetime Protected</span>
                    </span>
                  </div>

                  {/* Profile Summary Box */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/60 via-[#18113c] to-[#0e0b24] border border-purple-500/40 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-mono text-purple-300 uppercase">
                        Service Price
                      </div>
                      <div className="text-2xl font-black font-rajdhani text-white">
                        {formatCurrencyPrice(selectedAccountSchedule?.priceINR || 0, currency)}
                      </div>
                      <div className="text-[11px] font-mono text-gray-400">
                        Tier: {selectedAccountSchedule?.slabName} &bull; Initial Down:{' '}
                        {selectedAccountSchedule?.downPaymentPct}%
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono text-gray-400 uppercase">
                        Initial Down Payment
                      </div>
                      <div className="text-xl font-black font-rajdhani text-emerald-400">
                        {formatCurrencyPrice(selectedAccountSchedule?.downPayment || 0, currency)}
                      </div>
                    </div>
                  </div>

                  {/* Frequency Switch */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAccountFrequency('weekly');
                        setSelectedAccountOptionIdx(0);
                      }}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedAccountFrequency === 'weekly'
                          ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/40'
                          : 'bg-[#0a081a] border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-bold font-rajdhani uppercase">
                        Weekly Plans
                      </div>
                      <div className="text-[10px] font-mono opacity-80">
                        Pay in weekly instalments
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAccountFrequency('monthly');
                        setSelectedAccountOptionIdx(0);
                      }}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedAccountFrequency === 'monthly'
                          ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/40'
                          : 'bg-[#0a081a] border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-bold font-rajdhani uppercase">
                        Monthly Plans
                      </div>
                      <div className="text-[10px] font-mono opacity-80">
                        Pay in monthly instalments
                      </div>
                    </button>
                  </div>

                  {/* Radio Plan Options */}
                  <div className="space-y-3">
                    {selectedAccountSchedule?.optionsToUse.map((opt: any, idx: number) => {
                      const isSelected = selectedAccountOptionIdx === idx;
                      const instAmount = Math.round(
                        selectedAccountSchedule.totalRemainingPayable / opt.installments
                      );
                      const unit = opt.frequency === 'weekly' ? 'week' : 'month';

                      return (
                        <button
                          key={`${opt.name}-${idx}`}
                          type="button"
                          onClick={() => setSelectedAccountOptionIdx(idx)}
                          className={`w-full p-4 rounded-xl flex items-center justify-between gap-4 text-left transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-950/70 via-[#170e3a] to-[#0e0b24] border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                              : 'bg-[#0a081a] border border-white/10 hover:border-purple-500/40 text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-purple-400 bg-purple-900/40'
                                  : 'border-gray-600 bg-transparent'
                              }`}
                            >
                              {isSelected && (
                                <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400" />
                              )}
                            </div>
                            <div>
                              <div className="text-base font-black font-rajdhani text-white">
                                {formatCurrencyPrice(instAmount, currency)} × {opt.installments}{' '}
                                {opt.frequency === 'weekly' ? 'Weeks' : 'Months'}
                              </div>
                              <div className="text-xs text-gray-400 font-mono">
                                Pay {formatCurrencyPrice(instAmount, currency)} every {unit} for{' '}
                                {opt.installments} {opt.frequency === 'weekly' ? 'weeks' : 'months'}.
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[10px] font-mono text-gray-400 uppercase">
                              Total Payable
                            </div>
                            <div className="text-base font-black font-rajdhani text-white">
                              {formatCurrencyPrice(selectedAccountSchedule.totalPayable, currency)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Summary Bar */}
                  <div className="p-4 rounded-xl bg-[#090717] border border-white/10 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-gray-400 mb-0.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <span>Total Duration</span>
                      </div>
                      <div className="text-sm sm:text-base font-black font-rajdhani text-white">
                        {selectedAccountSchedule?.totalInstallments}{' '}
                        {selectedAccountSchedule?.frequency === 'weekly' ? 'Weeks' : 'Months'}
                      </div>
                    </div>

                    <div className="border-x border-white/10 px-2">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-gray-400 mb-0.5">
                        <Coins className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span>Instalment Amount</span>
                      </div>
                      <div className="text-sm sm:text-base font-black font-rajdhani text-white">
                        {formatCurrencyPrice(
                          selectedAccountSchedule?.installmentAmount || 0,
                          currency
                        )}{' '}
                        / {selectedAccountSchedule?.frequency === 'weekly' ? 'Wk' : 'Mo'}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-gray-400 mb-0.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Total Payable</span>
                      </div>
                      <div className="text-sm sm:text-base font-black font-rajdhani text-emerald-400">
                        {formatCurrencyPrice(
                          selectedAccountSchedule?.totalPayable || 0,
                          currency
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Main Action Button */}
                  <button
                    type="button"
                    onClick={handleSelectAccount}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-pink-500 text-white font-black font-rajdhani uppercase tracking-wider text-base transition-all shadow-xl shadow-purple-900/50 flex items-center justify-center gap-2 cursor-pointer group"
                  >
                    <span>Select This Plan</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 5-STEP FLEXIBLE PAYMENT PLAN PROCESS (From Mockup)              */}
        {/* ============================================================== */}
        <div className="rounded-2xl bg-[#0c0d1e] border border-purple-500/20 p-6 sm:p-8 mb-10 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-400/40 flex items-center justify-center">
              <Layers className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black font-rajdhani uppercase tracking-wider text-white">
                Flexible Payment Plan Process
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                A complete step-by-step journey from plan selection to activation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-6">
            {/* Step 1 */}
            <div className="relative p-4 rounded-xl bg-[#090818] border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-purple-900/40">
                1
              </div>
              <div className="text-sm font-bold font-rajdhani uppercase text-white">
                Choose Plan
              </div>
              <p className="text-xs text-gray-400 font-mono leading-relaxed">
                Select your VP package and preferred payment schedule (Weekly / Monthly / 15 Days).
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative p-4 rounded-xl bg-[#090818] border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-purple-900/40">
                2
              </div>
              <div className="text-sm font-bold font-rajdhani uppercase text-white">
                Accept Terms
              </div>
              <p className="text-xs text-gray-400 font-mono leading-relaxed">
                Read and agree to the Flexible Payment Plan terms, including KYC and payment responsibilities.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative p-4 rounded-xl bg-[#090818] border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-purple-900/40">
                3
              </div>
              <div className="text-sm font-bold font-rajdhani uppercase text-white">
                Complete Application
              </div>
              <p className="text-xs text-gray-400 font-mono leading-relaxed">
                Provide your personal details and upload the required documents (KYC, selfie, signature and guardian details, if applicable).
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative p-4 rounded-xl bg-[#090818] border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-purple-900/40">
                4
              </div>
              <div className="text-sm font-bold font-rajdhani uppercase text-white">
                VIB Review
              </div>
              <p className="text-xs text-gray-400 font-mono leading-relaxed">
                Our team will verify your application and documents (usually within &le; 24 hours).
              </p>
            </div>

            {/* Step 5 */}
            <div className="relative p-4 rounded-xl bg-[#090818] border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-purple-900/40">
                5
              </div>
              <div className="text-sm font-bold font-rajdhani uppercase text-white">
                Approval &amp; Activation
              </div>
              <p className="text-xs text-gray-400 font-mono leading-relaxed">
                Once approved, you will receive the agreement and payment schedule, and your VP plan will be activated.
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3 POLICY CARDS GRID (KYC, Information, Late Policy)            */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1: KYC & Documents Required */}
          <div className="p-6 rounded-2xl bg-[#0c0d1e] border border-purple-500/20 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-purple-300 font-bold font-rajdhani text-base uppercase tracking-wider">
              <FileText className="w-5 h-5 text-purple-400" />
              <span>KYC &amp; Documents Required</span>
            </div>
            <ul className="space-y-3 text-xs text-gray-300 font-mono">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Two different government ID proofs (front and back, as applicable)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>A clear selfie holding your ID</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Your handwritten signature</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Parent/Guardian verification (if required).</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Important Information */}
          <div className="p-6 rounded-2xl bg-[#0c0d1e] border border-purple-500/20 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-purple-300 font-bold font-rajdhani text-base uppercase tracking-wider">
              <Info className="w-5 h-5 text-cyan-400" />
              <span>Important Information</span>
            </div>
            <ul className="space-y-3 text-xs text-gray-300 font-mono">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Application is subject to verification and approval by VIB.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Keep your payment schedule on time to maintain your plan.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>All details must be accurate and match your ID documents.</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Late Payment Policy (Weekly) */}
          <div className="p-6 rounded-2xl bg-[#0c0d1e] border border-purple-500/20 space-y-3 shadow-xl">
            <div className="flex items-center gap-2.5 text-purple-300 font-bold font-rajdhani text-base uppercase tracking-wider">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span>Late Payment Policy (Weekly)</span>
            </div>
            <div className="divide-y divide-white/5 text-xs font-mono">
              <div className="py-1 flex justify-between">
                <span className="text-gray-400">Day 1 &ndash; 2</span>
                <span className="text-gray-300">Grace may be considered (with prior approval)</span>
              </div>
              <div className="py-1 flex justify-between">
                <span className="text-gray-400">Day 3</span>
                <span className="text-amber-400 font-bold">&#8377;300 late fee</span>
              </div>
              <div className="py-1 flex justify-between">
                <span className="text-gray-400">Day 8</span>
                <span className="text-amber-400 font-bold">&#8377;600 total</span>
              </div>
              <div className="py-1 flex justify-between">
                <span className="text-gray-400">Day 15</span>
                <span className="text-amber-400 font-bold">&#8377;900 total</span>
              </div>
              <div className="py-1 flex justify-between">
                <span className="text-gray-400">Day 22</span>
                <span className="text-amber-400 font-bold">&#8377;1,200 total</span>
              </div>
              <div className="py-1 flex justify-between">
                <span className="text-gray-400">Day 29</span>
                <span className="text-amber-400 font-bold">&#8377;1,500 total</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 font-mono pt-1">
              Beyond one month: The weekly cycle restarts, adding &#8377;300 for each further overdue week.
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* APPROVAL IS MANDATORY BANNER (Golden / Amber Notice)           */}
        {/* ============================================================== */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#1a1408] to-[#0d0a04] border border-amber-500/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 mb-8 shadow-xl">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-base font-black font-rajdhani uppercase tracking-wider text-amber-400">
              Approval is Mandatory
            </span>
          </div>

          <div className="hidden sm:block w-px h-8 bg-amber-500/30" />

          <p className="text-xs sm:text-sm text-amber-200/90 font-mono leading-relaxed">
            Your plan will be activated only after successful verification and approval by the VIB team. Submitting an application does not guarantee automatic approval.
          </p>
        </div>

        {/* ============================================================== */}
        {/* FOOTER SUPPORT BANNER (Platform Stats & WhatsApp CTA)          */}
        {/* ============================================================== */}
        <div className="rounded-2xl bg-gradient-to-r from-purple-950/50 via-[#140e34] to-[#0c0920] border border-purple-500/30 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
          {/* Left Brand */}
          <div className="space-y-1">
            <div className="text-2xl font-black font-rajdhani tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400">
              VIB
            </div>
            <div className="text-sm font-bold font-rajdhani uppercase text-white">
              VIB Digital Services Platform
            </div>
            <div className="text-xs text-purple-300 font-mono">
              Trusted &bull; Secure &bull; Flexible Payments
            </div>
          </div>

          {/* Middle 4 Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <ShieldCheck className="w-5 h-5 mx-auto text-purple-400" />
              <div className="text-xs font-bold font-rajdhani uppercase text-white">
                Secure Process
              </div>
            </div>
            <div className="space-y-1">
              <Headphones className="w-5 h-5 mx-auto text-cyan-400" />
              <div className="text-xs font-bold font-rajdhani uppercase text-white">
                Dedicated Support
              </div>
            </div>
            <div className="space-y-1">
              <Zap className="w-5 h-5 mx-auto text-fuchsia-400" />
              <div className="text-xs font-bold font-rajdhani uppercase text-white">
                Flexible Options
              </div>
            </div>
            <div className="space-y-1">
              <Users className="w-5 h-5 mx-auto text-emerald-400" />
              <div className="text-xs font-bold font-rajdhani uppercase text-white">
                25,000+ Users Facilitated
              </div>
            </div>
          </div>

          {/* Right WhatsApp CTA */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-2 shrink-0">
            <div>
              <div className="text-xs font-bold font-rajdhani uppercase text-white">
                Need Assistance?
              </div>
              <div className="text-[11px] text-gray-400 font-mono">
                Contact our support team on WhatsApp.
              </div>
            </div>
            <a
              href="https://wa.me/918099641606"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-rajdhani uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/40 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat on WhatsApp &rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
