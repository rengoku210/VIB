import React, { useState, useEffect } from 'react';
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
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedAccountOptions, setSelectedAccountOptions] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<any>(null);
  const [guaranteedListings, setGuaranteedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setVpRegion(initialRegion);
  }, [initialRegion]);

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

  const vpConfig = settings?.vp?.[vpRegion];
  const vpPackages: any[] = vpConfig?.packages || [];
  const vpWeeklyLateFee = settings?.vp?.weeklyLateFee ?? 300;
  const vpMonthlyLateFee = settings?.vp?.monthlyLateFee ?? 1500;

  const accountMinAmount = Number(settings?.account?.minAmount) || 1500;
  const accountSlabs: any[] = settings?.account?.slabs || [];
  const accountWeeklyLateFee = settings?.account?.weeklyLateFee ?? 300;
  const accountMonthlyLateFee = settings?.account?.monthlyLateFee ?? 1500;

  const resolveVpSchedule = (pkg: any) => {
    const downPayment =
      pkg.downPaymentINR ?? Math.round(pkg.priceINR * ((pkg.downPaymentPct || 30) / 100));
    const financed = pkg.priceINR - downPayment;
    const matchedPlan =
      pkg.plans?.find((p: any) => p.frequency === frequency) || pkg.plans?.[0];
    const totalInstallments = matchedPlan?.duration ?? (frequency === 'weekly' ? 4 : 2);
    const installmentAmount =
      matchedPlan?.installmentAmount ?? Math.round(financed / totalInstallments);
    const totalPayable = matchedPlan?.totalPayable ?? pkg.priceINR;

    return {
      downPayment,
      financed,
      totalInstallments,
      installmentAmount,
      totalPayable,
      frequency: (matchedPlan?.frequency || frequency) as 'weekly' | 'monthly',
    };
  };

  const resolveAccountSchedule = (listing: any) => {
    const priceINR = Number(listing.price_inr || listing.price || 0);
    const slab =
      accountSlabs.find((s) => priceINR >= s.minPrice && priceINR <= s.maxPrice) ||
      accountSlabs[accountSlabs.length - 1] || {
        name: 'Standard Slab',
        downPaymentPct: 40,
        fixedProfit: 1200,
        options: [{ frequency: 'weekly', installments: 4 }],
      };

    const downPaymentPct = slab.downPaymentPct;
    const downPayment = Math.round(priceINR * (downPaymentPct / 100));
    const financed = priceINR - downPayment;
    const fixedProfit = slab.fixedProfit;
    const remainingPayable = financed + fixedProfit;
    const totalPayable = downPayment + remainingPayable;

    const matchingOpts = (slab.options || []).filter((o: any) => o.frequency === frequency);
    const availableOptions = matchingOpts.length > 0 ? matchingOpts : slab.options || [];
    const chosenIdx = selectedAccountOptions[listing.id] ?? 0;
    const matchedOpt = availableOptions[chosenIdx] || availableOptions[0];
    const totalInstallments = matchedOpt?.installments ?? (frequency === 'weekly' ? 4 : 3);
    const actualFreq = (matchedOpt?.frequency || frequency) as 'weekly' | 'monthly';
    const installmentAmount = Math.round(remainingPayable / totalInstallments);

    return {
      priceINR,
      slabName: slab.name,
      downPaymentPct,
      downPayment,
      financed,
      fixedProfit,
      totalPayable,
      totalInstallments,
      installmentAmount,
      frequency: actualFreq,
      availableOptions,
      chosenIdx,
    };
  };

  const handleSelectVpPlan = (pkg: any) => {
    const sched = resolveVpSchedule(pkg);
    const selection: FlexiblePlanSelection = {
      serviceType: 'vp',
      region: vpRegion,
      vpAmount: pkg.vpAmount,
      vpPackageId: pkg.id,
      productTitle: pkg.name,
      productPrice: pkg.priceINR,
      downPaymentPercent: pkg.downPaymentPct,
      downPaymentAmount: sched.downPayment,
      financedAmount: sched.financed,
      fixedProfit: 0,
      totalPayable: sched.totalPayable,
      paymentFrequency: sched.frequency,
      totalInstallments: sched.totalInstallments,
      installmentAmount: sched.installmentAmount,
      weeklyLateFee: vpWeeklyLateFee,
      monthlyLateFee: vpMonthlyLateFee,
    };
    onSelectPlan(selection);
  };

  const handleSelectAccountPlan = (listing: any) => {
    const sched = resolveAccountSchedule(listing);
    const coverImage =
      (Array.isArray(listing.images) && listing.images[0]) ||
      listing.image_url ||
      listing.screenshot_url ||
      undefined;

    const selection: FlexiblePlanSelection = {
      serviceType: 'account',
      region: listing.region || 'ap',
      listingId: listing.id,
      listingTitle: listing.title,
      listingRank: listing.rank,
      listingImage: coverImage,
      listingSeller: listing.seller_name,
      productTitle: listing.title,
      productPrice: sched.priceINR,
      downPaymentPercent: sched.downPaymentPct,
      downPaymentAmount: sched.downPayment,
      financedAmount: sched.financed,
      fixedProfit: sched.fixedProfit,
      totalPayable: sched.totalPayable,
      paymentFrequency: sched.frequency,
      totalInstallments: sched.totalInstallments,
      installmentAmount: sched.installmentAmount,
      slabName: sched.slabName,
      weeklyLateFee: accountWeeklyLateFee,
      monthlyLateFee: accountMonthlyLateFee,
    };
    onSelectPlan(selection);
  };

  return (
    <div className="min-h-screen bg-[#06040d] text-white selection:bg-purple-500 selection:text-white pb-24">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-purple-900/20 via-fuchsia-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
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
        <div className="relative rounded-3xl bg-gradient-to-r from-purple-950/40 via-[#0d0e24] to-black/80 border border-purple-500/30 p-6 sm:p-10 mb-10 overflow-hidden shadow-2xl">
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>VIB Flexible Payment Plans</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black font-rajdhani uppercase tracking-wider text-white">
              NEED VP OR PROFILES?{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400">
                PAY FLEXIBLY.
              </span>
            </h1>

            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
              Acquire Valorant Points packs or Lifetime Guaranteed profile collections through transparent weekly or
              monthly installments. All plans are protected by VIB escrow with clear upfront totals.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-gray-300">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Zero Hidden Interest
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                100% Escrow Guarantee
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                Quick Compliance Verification
              </span>
            </div>
          </div>
        </div>

        {/* Category & Frequency Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 w-fit">
            <button
              type="button"
              onClick={() => setActiveCategory('vp')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-rajdhani uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeCategory === 'vp'
                  ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>VP Flexible Payment Plans</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('account')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-rajdhani uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeCategory === 'account'
                  ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Digital Profile Flexible Plans</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {activeCategory === 'vp' && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setVpRegion('in')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-2 ${
                    vpRegion === 'in' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FlagIcon country="IN" size="sm" />
                  <span>Indian VP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVpRegion('php')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-2 ${
                    vpRegion === 'php' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FlagIcon country="PH" size="sm" />
                  <span>Philippines VP</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
              <span className="text-gray-500 pl-2 text-[11px] uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule:</span>
              </span>
              <button
                type="button"
                onClick={() => setFrequency('weekly')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  frequency === 'weekly' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setFrequency('monthly')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  frequency === 'monthly' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="p-16 text-center text-gray-400 font-mono text-sm">
            Loading flexible payment packages...
          </div>
        ) : activeCategory === 'vp' ? (
          vpConfig?.enabled === false ? (
            <div className="p-12 text-center rounded-2xl bg-[#0c0d1e] border border-white/10 text-gray-400 space-y-2">
              <CreditCard className="w-10 h-10 mx-auto text-purple-400" />
              <p className="text-base font-bold text-white font-rajdhani uppercase">
                {vpRegion === 'in' ? 'Indian VP' : 'Philippines VP'} Flexible Plans Temporarily Paused
              </p>
              <p className="text-xs text-gray-500">
                Please switch regions or check back later.
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {vpPackages.map((pkg) => {
              const sched = resolveVpSchedule(pkg);

              return (
                <div
                  key={pkg.id}
                  className="relative rounded-2xl bg-[#0c0d1e] border border-purple-500/20 hover:border-purple-500/60 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 uppercase font-bold tracking-wider inline-flex items-center gap-1.5">
                        <FlagIcon country={vpRegion === 'in' ? 'IN' : 'PH'} size="sm" />
                        <span>{vpRegion === 'in' ? 'Indian Region' : 'Philippines Region'}</span>
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">{pkg.downPaymentPct}% Down</span>
                    </div>

                    <h3 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider mb-1 group-hover:text-purple-300 transition-colors">
                      {pkg.name}
                    </h3>
                    <div className="text-xs text-gray-400 font-mono mb-4">
                      Service Price:{' '}
                      <span className="text-white font-bold">{formatCurrencyPrice(pkg.priceINR, currency)}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2 mb-5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-gray-400 font-mono uppercase">Initial Payment</span>
                        <span className="text-lg font-black font-rajdhani text-emerald-400">
                          {formatCurrencyPrice(sched.downPayment, currency)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between border-t border-white/10 pt-2">
                        <span className="text-xs text-gray-400 font-mono uppercase">
                          {sched.totalInstallments} {sched.frequency === 'weekly' ? 'Weekly' : 'Monthly'}
                        </span>
                        <span className="text-base font-bold font-rajdhani text-white">
                          {formatCurrencyPrice(sched.installmentAmount, currency)}{' '}
                          <span className="text-[10px] text-gray-400">
                            /{sched.frequency === 'weekly' ? 'wk' : 'mo'}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-[11px] font-mono text-purple-300 pt-1">
                        <span>Total Payable:</span>
                        <span className="font-bold">{formatCurrencyPrice(sched.totalPayable, currency)}</span>
                      </div>
                    </div>

                    <ul className="space-y-2 text-xs text-gray-300 mb-6 font-mono">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <span>VP quantity: {Number(pkg.vpAmount).toLocaleString()} VP</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <span>Direct regional top-up after verification &amp; down payment</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <span>Zero banking loans or CIBIL impact</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectVpPlan(pkg)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold font-rajdhani uppercase tracking-wider text-sm transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.02]"
                  >
                    <span>Select Plan</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              );
            })}
          </div>
          )
        ) : settings?.account?.enabled === false ? (
          <div className="p-12 text-center rounded-2xl bg-[#0c0d1e] border border-white/10 text-gray-400 space-y-2">
            <ShieldCheck className="w-10 h-10 mx-auto text-purple-400" />
            <p className="text-base font-bold text-white font-rajdhani uppercase">
              Digital Profile Flexible Plans Temporarily Paused
            </p>
          </div>
        ) : (
          <div>
            {guaranteedListings.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0c0d1e] border border-white/10 text-gray-400 space-y-3">
                <ShieldCheck className="w-12 h-12 mx-auto text-purple-400" />
                <p className="text-base font-bold text-white font-rajdhani uppercase">
                  No eligible guaranteed profiles currently available
                </p>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Flexible payment plans apply exclusively to Lifetime Guaranteed profiles priced at{' '}
                  {formatCurrencyPrice(accountMinAmount, currency)} or above. Public community marketplace listings are
                  excluded.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guaranteedListings.map((listing) => {
                  const sched = resolveAccountSchedule(listing);
                  const isFocused = Boolean(initialListingId && listing.id === initialListingId);

                  return (
                    <div
                      key={listing.id}
                      className={`relative rounded-2xl bg-[#0c0d1e] p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group ${
                        isFocused
                          ? 'border-2 border-purple-400 shadow-[0_0_35px_rgba(168,85,247,0.3)]'
                          : 'border border-purple-500/20 hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 uppercase font-bold tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            Lifetime Guaranteed
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-300 uppercase">
                            {isFocused ? 'Selected Profile' : listing.rank || 'Ranked'}
                          </span>
                        </div>

                        <h3 className="text-xl font-black font-rajdhani text-white uppercase tracking-wider mb-1 group-hover:text-purple-300 transition-colors line-clamp-2">
                          {listing.title}
                        </h3>
                        <div className="text-xs text-gray-400 font-mono mb-4 flex items-center justify-between">
                          <span>
                            Service Price:{' '}
                            <span className="text-white font-bold">
                              {formatCurrencyPrice(sched.priceINR, currency)}
                            </span>
                          </span>
                          <span className="uppercase text-purple-300">{listing.region || 'AP'}</span>
                        </div>

                        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2 mb-5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-gray-400 font-mono uppercase">
                              Initial Payment ({sched.downPaymentPct}%)
                            </span>
                            <span className="text-lg font-black font-rajdhani text-emerald-400">
                              {formatCurrencyPrice(sched.downPayment, currency)}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between border-t border-white/10 pt-2">
                            <span className="text-xs text-gray-400 font-mono uppercase">
                              {sched.totalInstallments} {sched.frequency === 'weekly' ? 'Weekly' : 'Monthly'}
                            </span>
                            <span className="text-base font-bold font-rajdhani text-white">
                              {formatCurrencyPrice(sched.installmentAmount, currency)}{' '}
                              <span className="text-[10px] text-gray-400">
                                /{sched.frequency === 'weekly' ? 'wk' : 'mo'}
                              </span>
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between text-[11px] font-mono text-gray-400 pt-1">
                            <span>Fixed Plan Margin:</span>
                            <span>+{formatCurrencyPrice(sched.fixedProfit, currency)}</span>
                          </div>
                          <div className="flex items-baseline justify-between text-[11px] font-mono text-purple-300">
                            <span>Total Payable:</span>
                            <span className="font-bold">{formatCurrencyPrice(sched.totalPayable, currency)}</span>
                          </div>
                          {sched.availableOptions.length > 1 && (
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                              {sched.availableOptions.map((opt: any, optIdx: number) => (
                                <button
                                  key={`${opt.frequency}-${opt.installments}`}
                                  type="button"
                                  onClick={() =>
                                    setSelectedAccountOptions((prev) => ({
                                      ...prev,
                                      [listing.id]: optIdx,
                                    }))
                                  }
                                  className={`px-2 py-1 rounded-md text-[10px] font-mono cursor-pointer border transition-colors ${
                                    sched.chosenIdx === optIdx
                                      ? 'bg-purple-600 text-white border-purple-400'
                                      : 'bg-black/40 text-gray-300 border-white/10 hover:border-purple-500/40'
                                  }`}
                                >
                                  {opt.installments} {opt.frequency === 'weekly' ? 'Wks' : 'Mos'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <ul className="space-y-2 text-xs text-gray-300 mb-6 font-mono">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span>Lifetime recovery guarantee &amp; escrow credentials lock</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span>Tier: {sched.slabName}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span>Dashboard tracking for every installment receipt</span>
                          </li>
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectAccountPlan(listing)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold font-rajdhani uppercase tracking-wider text-sm transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.02]"
                      >
                        <span>Select Plan</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Security & Statutory Notice Section */}
        <div className="mt-16 p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center gap-2.5 text-purple-400 font-bold font-rajdhani text-lg uppercase tracking-wider">
            <Shield className="w-5 h-5" />
            <span>Important Terms &amp; Statutory Notice</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-400 font-mono leading-relaxed">
            <div>
              <span className="font-bold text-white block mb-1">Non-Loan Financial Facility</span>
              VIB Flexible Payment Plans are escrow-backed staged installment agreements, NOT banking loans or NBFC
              credit instruments. No compounding interest is charged.
            </div>
            <div>
              <span className="font-bold text-white block mb-1">Late Fee Disclosures</span>
              Timely payments preserve active service status. Overdue weekly installments incur a{' '}
              {formatCurrencyPrice(
                activeCategory === 'vp' ? vpWeeklyLateFee : accountWeeklyLateFee,
                currency
              )}{' '}
              fee; monthly installments incur{' '}
              {formatCurrencyPrice(
                activeCategory === 'vp' ? vpMonthlyLateFee : accountMonthlyLateFee,
                currency
              )}
              .
            </div>
            <div>
              <span className="font-bold text-white block mb-1">Identity &amp; Minor Verification</span>
              KYC verification requires two distinct government IDs integrated right inside checkout. Applicants under 18
              must provide parent or guardian authorization.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
