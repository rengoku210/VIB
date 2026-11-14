import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  CreditCard,
  Zap,
  ArrowRight,
  Globe,
  Clock,
  Sparkles,
  UploadCloud,
  ChevronRight,
  Copy,
  Info,
  Layers,
  Award,
  Users,
  Search,
  ExternalLink,
  MessageCircle,
  FileImage,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lock,
  Repeat,
} from 'lucide-react';
import { Currency } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from './Header';
import { useAuth } from '../../context/AuthContext';
import {
  ADVERTISEMENT_PRODUCT_DETAILS,
  mergeAdvertisementPlanWithDetails,
  PackageDetailData,
} from '../../data/advertisementProductDetails';
import { AdvertisementProductPage } from '../advertise/AdvertisementProductPage';
import { AdvertisementSubmissionPage } from '../advertise/AdvertisementSubmissionPage';
import { AdCustomerAuthModal } from '../auth/AdCustomerAuthModal';
import { ManualPaymentGateway } from '../payment/ManualPaymentGateway';

export interface AdvertisementPlan {
  id: string;
  category: 'standard' | 'trade' | 'premium' | 'bonus';
  name: string;
  price: number;
  description: string;
  badge?: string;
  display_order: number;
  is_active: boolean;
  instagram_story: boolean;
  instagram_post: boolean;
  highlight_placement: boolean;
  story_count: string;
  website_listing: boolean;
  inventory_editing: boolean;
  promotion_duration: string;
  buyer_assistance: boolean;
  priority_placement: boolean;
  dedicated_agent: boolean;
  lifetime_guaranteed: boolean;
  reach_estimate?: string;
  placement_tag?: string;
  conditions?: string[];
  custom_faq?: { question: string; answer: string }[];
  ai_draft?: { headline?: string; summary?: string; highlights?: string[] } | null;
  benefits: string[];
}

interface ClientAdvertisePageProps {
  currency: Currency;
  onNavigate: (page: ClientPage, id?: string) => void;
  initialOrderId?: string;
  initialToken?: string;
  initialStep?: 'plans' | 'submit';
}

export const ClientAdvertisePage: React.FC<ClientAdvertisePageProps> = ({
  currency,
  onNavigate,
  initialOrderId,
  initialToken,
  initialStep = 'plans',
}) => {
  const [plans, setPlans] = useState<AdvertisementPlan[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'standard' | 'trade' | 'premium' | 'bonus'>('all');
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  // Active view: 'plans' | 'product' | 'checkout' | 'submit'
  const [activeView, setActiveView] = useState<'plans' | 'product' | 'checkout' | 'submit'>(initialStep);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductPackage, setSelectedProductPackage] = useState<PackageDetailData | null>(null);

  // Dedicated Checkout state
  const [activeCheckoutOrderId, setActiveCheckoutOrderId] = useState<string | null>(initialOrderId || null);
  const [activeCheckoutOrder, setActiveCheckoutOrder] = useState<any | null>(null);
  const [isAdAuthOpen, setIsAdAuthOpen] = useState(false);
  const [pendingPackageToBuy, setPendingPackageToBuy] = useState<PackageDetailData | null>(null);

  // Customer contact fields used during post-approval advertisement details submission
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Payment settings state loaded dynamically from /api/payment/settings
  const [paymentSettings, setPaymentSettings] = useState({
    upi_id: '',
    payee_name: 'VIB Digital Services',
    qr_image_url: '',
    instructions: 'Scan QR with any UPI app (GPay, PhonePe, Paytm, BHIM) or transfer to UPI ID.',
  });

  // Submission Form State (for step 5 customer form)
  const [submitOrderId, setSubmitOrderId] = useState(initialOrderId || '');
  const [submitToken, setSubmitToken] = useState(initialToken || '');
  const [verifiedOrder, setVerifiedOrder] = useState<any | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [formInstagram, setFormInstagram] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formRank, setFormRank] = useState('Diamond 2');
  const [formPremiumSkins, setFormPremiumSkins] = useState('');
  const [formOtherItems, setFormOtherItems] = useState('');
  const [formInventoryScreenshot, setFormInventoryScreenshot] = useState<string | null>(null);
  const [formInventoryFilename, setFormInventoryFilename] = useState<string | null>(null);
  const [inventoryUploadProgress, setInventoryUploadProgress] = useState<number | null>(null);
  const [isSubmittingDetails, setIsSubmittingDetails] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const inventoryInputRef = useRef<HTMLInputElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const tradeExchangeRef = useRef<HTMLDivElement>(null);
  const bonusPlanRef = useRef<HTMLDivElement>(null);

  const scrollToTradeExchange = () => {
    setActiveView('plans');
    setTimeout(() => {
      const el = document.getElementById('trade-exchange-plans') || tradeExchangeRef.current;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const scrollToBonusPlan = () => {
    setActiveView('plans');
    setTimeout(() => {
      const el = document.getElementById('vib-bonus-plan') || bonusPlanRef.current;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Handle direct anchor link or parameter to Trade / Exchange or Bonus section
  useEffect(() => {
    const checkHashAndScroll = () => {
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(window.location.search);
        const section = params.get('section');
        if (hash === '#trade-exchange-plans' || section === 'trade-exchange-plans') {
          setActiveView('plans');
          let retries = 0;
          const attempt = () => {
            const el = document.getElementById('trade-exchange-plans') || tradeExchangeRef.current;
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (retries < 10) {
              retries++;
              setTimeout(attempt, 80);
            }
          };
          setTimeout(attempt, 100);
        } else if (hash === '#vib-bonus-plan' || section === 'vib-bonus-plan') {
          setActiveView('plans');
          let retries = 0;
          const attempt = () => {
            const el = document.getElementById('vib-bonus-plan') || bonusPlanRef.current;
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (retries < 10) {
              retries++;
              setTimeout(attempt, 80);
            }
          };
          setTimeout(attempt, 100);
        }
      } catch {}
    };

    checkHashAndScroll();
    window.addEventListener('hashchange', checkHashAndScroll);
    return () => window.removeEventListener('hashchange', checkHashAndScroll);
  }, []);

  // Load plans from API
  useEffect(() => {
    fetch('/api/advertisement/plans')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.plans) && data.plans.length > 0) {
          setPlans(data.plans);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/payment/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.upi_id) setPaymentSettings(data);
      })
      .catch(() => {});
  }, []);

  // Parse URL pathname and parameters for deep routes
  useEffect(() => {
    const handleUrlRoute = () => {
      try {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);

        // 1. Direct submission link check: /advertise/submit/:orderId?token=... or ?orderId=...&token=...
        const submitMatch = path.match(/^\/advertise\/submit\/([^/]+)/);
        const isSubmitPath = path.startsWith('/advertise/submit');
        const stepParam = params.get('step');
        const orderParam = params.get('orderId') || (submitMatch ? decodeURIComponent(submitMatch[1]) : '');
        const tokenParam = params.get('token');
        if (stepParam === 'submit' || (orderParam && tokenParam) || isSubmitPath) {
          setActiveView('submit');
          if (orderParam) setSubmitOrderId(orderParam);
          if (tokenParam) setSubmitToken(tokenParam);
          return;
        }

        // 2. Product details route check: /advertise/product/:id or ?product=:id
        const productMatch = path.match(/^\/advertise\/product\/([^/]+)/);
        const productParam = params.get('product');
        const targetPlanId = decodeURIComponent((productMatch ? productMatch[1] : productParam) || '');
        if (targetPlanId) {
          setSelectedProductId(targetPlanId);
          const pkg = mergeAdvertisementPlanWithDetails(
            plans.find((p) => p.id === targetPlanId) || null,
            targetPlanId
          );
          if (pkg) setSelectedProductPackage(pkg);
          setActiveView('product');
          return;
        }

        // 3. Checkout route check: /advertise/checkout/:id or ?checkout=:id
        const checkoutMatch = path.match(/^\/advertise\/checkout\/([^/]+)/);
        const checkoutParam = params.get('checkout');
        const targetOrderId = decodeURIComponent((checkoutMatch ? checkoutMatch[1] : checkoutParam) || '');
        if (targetOrderId) {
          setActiveCheckoutOrderId(targetOrderId);
          setActiveView('checkout');
          return;
        }

        // Default: plans view
        if (activeView !== 'plans' && !initialOrderId) {
          setActiveView('plans');
        }
      } catch {}
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  // Keep selectedProductPackage synced with live DB plans on reload/update
  useEffect(() => {
    if (!selectedProductId) return;
    const livePlan = plans.find((p) => p.id === selectedProductId) || null;
    if (livePlan) {
      const merged = mergeAdvertisementPlanWithDetails(livePlan, selectedProductId);
      if (merged) setSelectedProductPackage(merged);
      return;
    }
    if (!loading) {
      fetch(`/api/advertisement/plans/${encodeURIComponent(selectedProductId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data.plan) {
            const merged = mergeAdvertisementPlanWithDetails(data.plan, selectedProductId);
            if (merged) setSelectedProductPackage(merged);
          }
        })
        .catch(() => {});
    }
  }, [plans, selectedProductId, loading]);

  // Fetch active checkout order and live plan specs if viewing checkout
  useEffect(() => {
    if (activeView === 'checkout' && activeCheckoutOrderId) {
      fetch(`/api/advertisement/orders/${encodeURIComponent(activeCheckoutOrderId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.order) {
            setActiveCheckoutOrder(data.order);
            const livePlan = data.plan || plans.find((p) => p.id === data.order.plan_id) || null;
            const merged = mergeAdvertisementPlanWithDetails(livePlan, data.order.plan_id);
            if (merged) {
              setSelectedProductPackage(merged);
            }
            if (data.paymentSettings) {
              setPaymentSettings((prev) => ({
                ...prev,
                ...data.paymentSettings,
              }));
            }
          }
        })
        .catch((e) => console.error('[Fetch Checkout Order Error]:', e));
    }
  }, [activeView, activeCheckoutOrderId, plans]);

  // Verify submission token if present
  useEffect(() => {
    if (activeView === 'submit' && submitOrderId && submitToken) {
      setVerifyLoading(true);
      setVerifyError(null);
      fetch(`/api/advertisement/orders/verify?orderId=${encodeURIComponent(submitOrderId)}&token=${encodeURIComponent(submitToken)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.eligible) {
            setVerifiedOrder(data.order);
            if (data.order.customer_name) setCustomerName(data.order.customer_name);
            if (data.order.customer_email) setCustomerEmail(data.order.customer_email);
            if (data.order.customer_phone) setCustomerPhone(data.order.customer_phone);
            if (data.order.instagram_username) setFormInstagram(data.order.instagram_username);
            if (data.order.selling_price) setFormPrice(data.order.selling_price);
            if (data.order.current_rank) setFormRank(data.order.current_rank);
            if (data.order.premium_skins) setFormPremiumSkins(data.order.premium_skins);
            if (data.order.other_valuable_items) setFormOtherItems(data.order.other_valuable_items);
            if (data.order.inventory_screenshot) setFormInventoryScreenshot(data.order.inventory_screenshot);
          } else {
            setVerifyError(data.message || 'Unable to verify advertisement order. Payment may still be pending admin review.');
          }
        })
        .catch((err) => {
          setVerifyError('Network error checking order verification status.');
        })
        .finally(() => setVerifyLoading(false));
    }
  }, [activeView, submitOrderId, submitToken]);

  const bonusPlan = plans.find((p) => p.category === 'bonus') || null;
  const salesGridPlans = plans.filter((p) => p.category !== 'trade' && p.category !== 'bonus');
  const filteredPlans = salesGridPlans.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  const handleOpenProduct = (planId: string) => {
    const livePlan = plans.find((p) => p.id === planId) || null;
    const pkg = mergeAdvertisementPlanWithDetails(livePlan, planId);
    setSelectedProductId(planId);
    setSelectedProductPackage(pkg);
    setActiveView('product');
    try {
      window.history.pushState({ view: 'product', planId }, '', `/advertise/product/${planId}`);
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToPlans = () => {
    setActiveView('plans');
    setSelectedProductId(null);
    setSelectedProductPackage(null);
    setActiveCheckoutOrderId(null);
    setActiveCheckoutOrder(null);
    try {
      window.history.pushState({ view: 'plans' }, '', '/advertise');
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBuyProduct = async (pkg: PackageDetailData) => {
    setPendingPackageToBuy(pkg);
    if (!user) {
      // Scenario A: Customer is not logged in -> Prompt registration / sign in
      setIsAdAuthOpen(true);
      return;
    }
    // Scenario B: Customer is already logged in -> Continue directly to checkout
    await proceedToOrderDraft(pkg, user);
  };

  const proceedToOrderDraft = async (pkg: PackageDetailData, currentUser: any) => {
    try {
      setLoading(true);
      const res = await fetch('/api/advertisement/orders/create-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: pkg.id,
          firstName: currentUser.first_name || '',
          lastName: currentUser.last_name || '',
          customerName: currentUser.displayName || `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'VIB Customer',
          customerEmail: currentUser.email || '',
          customerAccountNumber: currentUser.account_number || '',
          customerPhone: currentUser.phone || '',
          customerCity: currentUser.city || '',
          customerState: currentUser.state || '',
          customerPincode: currentUser.pincode || '',
          userId: currentUser.id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize purchase.');
      }

      setActiveCheckoutOrderId(data.orderId);
      setActiveCheckoutOrder(data.order);
      setSelectedProductPackage(pkg);
      setActiveView('checkout');
      try {
        window.history.pushState({ view: 'checkout', orderId: data.orderId }, '', `/advertise/checkout/${data.orderId}`);
      } catch {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('[Draft Order Error]:', err);
      alert(err.message || 'Unable to proceed to checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPurchase = (plan: AdvertisementPlan) => {
    handleOpenProduct(plan.id);
  };

  const scrollToComparison = () => {
    if (comparisonRef.current) {
      comparisonRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Inventory Screenshot handler for submission form
  const handleInventoryScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpe?g|webp)$/i)) {
      setSubmitError('Please upload an image file (PNG, JPG, or WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Inventory screenshot exceeds maximum allowed size (5MB).');
      return;
    }

    setFormInventoryFilename(file.name);
    setInventoryUploadProgress(0);
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        setInventoryUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    reader.onload = () => {
      setFormInventoryScreenshot(reader.result as string);
      setSubmitError(null);
      setInventoryUploadProgress(null);
    };
    reader.onerror = () => {
      setSubmitError('Failed to read inventory screenshot file.');
      setInventoryUploadProgress(null);
    };
    reader.readAsDataURL(file);
  };

  // Handle Advertisement Details Submission (Post-Payment Form)
  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formPrice.trim()) {
      setSubmitError('Please enter your desired selling price in INR.');
      return;
    }
    if (!formRank.trim()) {
      setSubmitError('Please specify the current Valorant rank.');
      return;
    }
    if (!formPremiumSkins.trim()) {
      setSubmitError('Please list your premium/exclusive weapon skins.');
      return;
    }
    if (!formInventoryScreenshot) {
      setSubmitError('Please upload one clear screenshot of the main account inventory.');
      return;
    }

    setIsSubmittingDetails(true);
    try {
      const res = await fetch(`/api/advertisement/orders/${encodeURIComponent(submitOrderId)}/submit-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: submitToken,
          instagramUsername: formInstagram.trim().replace(/^@/, ''),
          sellingPrice: formPrice.trim(),
          currentRank: formRank.trim(),
          premiumSkins: formPremiumSkins.trim(),
          otherValuableItems: formOtherItems.trim(),
          inventoryScreenshot: formInventoryScreenshot,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit advertisement details.');
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit details. Please try again.');
    } finally {
      setIsSubmittingDetails(false);
    }
  };

  if (activeView === 'product' && selectedProductPackage) {
    return (
      <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white font-sans min-h-screen">
        <AdvertisementProductPage
          packageData={selectedProductPackage}
          currency={currency}
          onBuyNow={() => handleBuyProduct(selectedProductPackage)}
          onBackToPlans={handleBackToPlans}
          onComparePlans={() => {
            handleBackToPlans();
            setTimeout(scrollToComparison, 100);
          }}
        />
        <AdCustomerAuthModal
          isOpen={isAdAuthOpen}
          onClose={() => setIsAdAuthOpen(false)}
          selectedPackageName={pendingPackageToBuy?.name || selectedProductPackage.name}
          selectedPackagePrice={pendingPackageToBuy?.price ?? selectedProductPackage.price}
          onAuthenticated={(authUser?: any) => {
            setIsAdAuthOpen(false);
            if (authUser && pendingPackageToBuy) {
              proceedToOrderDraft(pendingPackageToBuy, authUser);
              return;
            }
            const token = localStorage.getItem('vib_auth_token') || '';
            fetch('/api/auth/me', {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
              .then((r) => r.json())
              .then((userData) => {
                let fallbackUser = null;
                try {
                  fallbackUser = JSON.parse(localStorage.getItem('vib_user') || 'null');
                } catch {}
                const u = userData?.user || fallbackUser;
                if (u && pendingPackageToBuy) {
                  proceedToOrderDraft(pendingPackageToBuy, u);
                }
              })
              .catch(() => {});
          }}
        />
      </div>
    );
  }

  if (activeView === 'checkout' && activeCheckoutOrderId) {
    const orderStatus = activeCheckoutOrder?.status || null;
    const isSubmittedOrder = Boolean(
      orderStatus &&
        ['submitted_for_verification', 'approved', 'details_submitted', 'live', 'completed'].includes(
          orderStatus
        )
    );
    const submitTok = activeCheckoutOrder?.submission_token || activeCheckoutOrder?.approval_token;
    const approvedSubmitUrl =
      orderStatus === 'approved' && submitTok
        ? `/advertise/submit/${encodeURIComponent(activeCheckoutOrderId)}?token=${encodeURIComponent(submitTok)}`
        : null;

    return (
      <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white font-sans min-h-screen">
        <ManualPaymentGateway
          orderId={activeCheckoutOrderId}
          itemTitle={selectedProductPackage?.name || activeCheckoutOrder?.plan_name || 'Advertisement Package'}
          itemCategory={selectedProductPackage?.categoryLabel || 'Advertisement Plan'}
          itemDescription={selectedProductPackage?.description || ''}
          itemPrice={selectedProductPackage?.price ?? activeCheckoutOrder?.plan_price ?? 0}
          currency={currency}
          specs={[
            { label: 'Duration', value: selectedProductPackage?.promotion_duration || '24 Hours' },
            { label: 'Channel', value: selectedProductPackage?.reach || 'VIB Official Promotion Channel' },
            { label: 'Placement', value: selectedProductPackage?.placement || 'VIB Official Promotion Channels' },
            { label: 'Processing', value: 'After Payment Verification' },
          ]}
          iconType={selectedProductPackage?.heroIconType || 'megaphone'}
          breadcrumbService="Advertise"
          upiId={paymentSettings.upi_id}
          payeeName={paymentSettings.payee_name}
          qrImageUrl={paymentSettings.qr_image_url}
          supportWhatsapp="+918099641606"
          onBack={handleBackToPlans}
          onViewOrders={() => onNavigate('dashboard', 'tab:my_ads')}
          initialSubmitted={isSubmittedOrder}
          initialSubmittedAt={activeCheckoutOrder?.updated_at || activeCheckoutOrder?.created_at || null}
          initialUtr={activeCheckoutOrder?.payment_reference || null}
          orderStatus={orderStatus}
          orderStatusEndpoint={`/api/advertisement/orders/${encodeURIComponent(activeCheckoutOrderId)}`}
          verificationStartAt={activeCheckoutOrder?.updated_at || activeCheckoutOrder?.created_at || null}
          approvedRedirectUrl={approvedSubmitUrl}
          continueButtonLabel="Continue to Promotion Submission"
          onOrderStatusChange={(updatedOrder) => setActiveCheckoutOrder(updatedOrder)}
          onSubmitProof={async (utr, screenshotData) => {
            const res = await fetch(`/api/advertisement/orders/${activeCheckoutOrderId}/submit-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentReference: utr,
                paymentScreenshot: screenshotData,
              }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
              throw new Error(data.error || 'Failed to submit payment verification.');
            }
            if (data.order) {
              setActiveCheckoutOrder(data.order);
            }
            return true;
          }}
          onComplete={() => {}}
        />
        <AdCustomerAuthModal
          isOpen={isAdAuthOpen}
          onClose={() => setIsAdAuthOpen(false)}
          selectedPackageName={selectedProductPackage?.name || 'Advertisement Package'}
          selectedPackagePrice={selectedProductPackage?.price ?? 0}
          onAuthenticated={() => setIsAdAuthOpen(false)}
        />
      </div>
    );
  }

  if (activeView === 'submit') {
    return (
      <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white font-sans min-h-screen">
        <AdvertisementSubmissionPage
          orderId={submitOrderId}
          token={submitToken}
          onNavigateHome={() => onNavigate('home')}
          onNavigatePlans={() => setActiveView('plans')}
        />
      </div>
    );
  }

  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white pb-24 font-sans min-h-screen">
      {/* ========================================================================= */}
      {/* 1. HERO HEADER                                                            */}
      {/* ========================================================================= */}
      <section className="relative w-full min-h-[300px] sm:min-h-[360px] flex items-center pt-8 pb-8 border-b border-white/5 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[300px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[450px] h-[260px] bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-purple-300 transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-purple-400 font-semibold">Advertisement Plans</span>
          </div>

          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Official VIB Promotion Network</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none font-rajdhani">
              PROMOTE YOUR PROFILE.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400">
                SELL WITH CONFIDENCE.
              </span>
            </h1>

            <p className="text-gray-300 text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl">
              Broadcast your Valorant inventory directly to active Indian gamers through official VIB WhatsApp Status promotions, Channel posts, Website Marketplace listings, Discord pushes, or concierge matchmaking.
            </p>
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={scrollToComparison}
              className="px-5 py-2.5 rounded-xl font-bold font-rajdhani uppercase tracking-wider text-xs bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 transition-all cursor-pointer min-h-[44px] flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Compare All Plans</span>
            </button>

            <button
              onClick={scrollToTradeExchange}
              className="px-5 py-2.5 rounded-xl font-bold font-rajdhani uppercase tracking-wider text-xs bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer min-h-[44px] flex items-center gap-2"
            >
              <Repeat className="w-4 h-4 text-emerald-400" />
              <span>Trade / Exchange Plans</span>
            </button>

            {/* Check Existing Order Submission Button */}
            <button
              onClick={() => setActiveView('submit')}
              className={`px-5 py-2.5 rounded-xl font-bold font-rajdhani uppercase tracking-wider text-xs transition-all cursor-pointer min-h-[44px] flex items-center gap-2 ${
                activeView === 'submit'
                  ? 'bg-fuchsia-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.4)]'
                  : 'bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30'
              }`}
            >
              <FileImage className="w-4 h-4 text-fuchsia-400" />
              <span>Submit Advertisement Details Form</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* VIEW A: PACKAGES AND COMPARISON                                           */}
      {/* ========================================================================= */}
      {activeView === 'plans' && (
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pt-8">
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
            {[
              { id: 'all', label: `All Sales Plans (${salesGridPlans.length})` },
              {
                id: 'standard',
                label: `Standard Sales (${salesGridPlans.filter((p) => p.category === 'standard').length})`,
              },
              {
                id: 'premium',
                label: `Premium & VIP (${salesGridPlans.filter((p) => p.category === 'premium').length})`,
              },
              {
                id: 'trade',
                label: `Trade / Exchange Plans (${plans.filter((p) => p.category === 'trade').length})`,
              },
              {
                id: 'bonus',
                label: `VIB Bonus Plan (${plans.filter((p) => p.category === 'bonus').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'trade') {
                    scrollToTradeExchange();
                  } else if (tab.id === 'bonus') {
                    scrollToBonusPlan();
                  } else {
                    setSelectedCategory(tab.id as any);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
                  tab.id === 'trade'
                    ? 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30'
                    : tab.id === 'bonus'
                    ? 'bg-fuchsia-950/40 hover:bg-fuchsia-900/60 text-fuchsia-300 border border-fuchsia-500/30'
                    : selectedCategory === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'bg-[#0d0a1a] hover:bg-[#16122a] text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {tab.id === 'trade' && <Repeat className="w-3.5 h-3.5 text-emerald-400" />}
                {tab.id === 'bonus' && <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Section Heading for Profile Sales Plans */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pt-2">
            <div>
              <div className="text-[10px] font-mono tracking-widest text-purple-400 uppercase font-bold">
                ACCOUNT SALES &amp; INVENTORY PROMOTION
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white font-rajdhani tracking-wide">
                PROFILE SALES PACKAGES
              </h2>
            </div>
            <div className="text-xs text-gray-400">
              Looking for weapon swaps? Jump to <button type="button" onClick={scrollToTradeExchange} className="text-emerald-400 underline font-semibold cursor-pointer hover:text-emerald-300">Trade / Exchange Plans below</button>.
            </div>
          </div>

          {/* Package Cards Grid */}
          <div id="ad-plans-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredPlans.map((plan) => {
              const isFree = plan.price === 0;
              const isVip = plan.category === 'premium';
              const priceDisplay = isFree
                ? 'FREE (18% Fee)'
                : formatCurrencyPrice(plan.price, currency);

              return (
                <div
                  key={plan.id}
                  className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group shadow-lg ${
                    isVip
                      ? 'bg-gradient-to-b from-[#190d2e] to-[#0c0818] border-fuchsia-500/50 hover:border-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.15)]'
                      : isFree
                      ? 'bg-[#0f0b1e] border-emerald-500/40 hover:border-emerald-400'
                      : 'bg-[#0c0918] border-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header Pill & Name */}
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isVip
                            ? 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/40'
                            : isFree
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {plan.badge || plan.category}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">
                        {plan.promotion_duration}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-white font-rajdhani uppercase tracking-wide leading-tight group-hover:text-purple-300 transition-colors">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-gray-400 leading-relaxed pt-1.5 min-h-[36px]">
                        {plan.description}
                      </p>
                    </div>

                    {/* Price Section */}
                    <div className="pt-2 border-t border-white/5">
                      <div className="text-[10px] font-mono text-gray-400 uppercase">PRICE</div>
                      <div className="text-2xl sm:text-3xl font-black text-white font-rajdhani">
                        {priceDisplay}
                      </div>
                    </div>

                    {/* Benefits Checklist */}
                    <ul className="space-y-2 pt-2 text-xs text-gray-300">
                      {plan.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="leading-tight">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Buy / Book Button */}
                  <div className="pt-6 mt-4 border-t border-white/10">
                    <button
                      onClick={() => handleStartPurchase(plan)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold font-rajdhani uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
                        isVip
                          ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-fuchsia-600/30'
                          : isFree
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                          : 'bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white shadow-md shadow-purple-600/20'
                      }`}
                    >
                      <span>Select Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* 2B. DEDICATED TRADE / EXCHANGE PROMOTION PLANS SECTION                    */}
          {/* ========================================================================= */}
          <section
            id="trade-exchange-plans"
            ref={tradeExchangeRef}
            className="scroll-mt-24 sm:scroll-mt-28 pt-8 space-y-6"
          >
            {/* Header banner */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-emerald-500/20 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
                  <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                  <span>COMMUNITY WEAPON TRADE &amp; SWAP PACKAGES</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-white font-rajdhani tracking-wide flex items-center gap-3">
                  <span>TRADE / EXCHANGE PROMOTION PLANS</span>
                </h2>
              </div>
              <p className="text-xs text-gray-300 max-w-md">
                Dedicated WhatsApp status &amp; featured highlight shoutout campaigns engineered specifically for weapon skin traders and profile swaps across India. Direct contact &amp; optional escrow.
              </p>
            </div>

            {/* 2 Dedicated Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Plan 1: Trade Status Promotion - ₹55 */}
              {(() => {
                const plan55 = plans.find((p) => p.id === 'ad-trade-story-55');
                if (!plan55) return null;
                const price55 = formatCurrencyPrice(plan55.price, currency);

                return (
                  <div className="p-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-[#0a1c14] via-[#081510] to-[#050e0a] hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group shadow-xl">
                    <div className="space-y-4">
                      {/* Badge & Duration */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                          {plan55.badge || 'FAST TRADE'}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400/80">
                          {plan55.promotion_duration}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-white font-rajdhani uppercase tracking-wide leading-tight group-hover:text-emerald-300 transition-colors">
                          {price55} — {plan55.name}
                        </h3>
                        <p className="text-xs text-gray-300 leading-relaxed pt-2 min-h-[36px]">
                          {plan55.description}
                        </p>
                      </div>

                      {/* Price Section */}
                      <div className="pt-2 border-t border-emerald-500/20">
                        <div className="text-[10px] font-mono text-gray-400 uppercase">PACKAGE PRICE</div>
                        <div className="text-3xl font-black text-white font-rajdhani">
                          {price55}
                        </div>
                      </div>

                      {/* Benefits Checklist */}
                      <ul className="space-y-2 pt-2 text-xs text-gray-200">
                        {plan55.benefits.map((b, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="leading-tight">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* View Plan Button */}
                    <div className="pt-6 mt-4 border-t border-emerald-500/20">
                      <button
                        onClick={() => handleOpenProduct(plan55.id)}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold font-rajdhani uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                      >
                        <span>Select Plan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Plan 2: Trade Status + Highlight Placement - ₹105 */}
              {(() => {
                const plan105 = plans.find((p) => p.id === 'ad-trade-highlight-105');
                if (!plan105) return null;
                const price105 = formatCurrencyPrice(plan105.price, currency);

                return (
                  <div className="p-6 rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-[#081a24] via-[#06141c] to-[#040e14] hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.2)] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group shadow-xl">
                    <div className="space-y-4">
                      {/* Badge & Duration */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider">
                          {plan105.badge || 'TRADE HIGHLIGHT'}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400/80">
                          {plan105.promotion_duration}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-white font-rajdhani uppercase tracking-wide leading-tight group-hover:text-cyan-300 transition-colors">
                          {price105} — {plan105.name}
                        </h3>
                        <p className="text-xs text-gray-300 leading-relaxed pt-2 min-h-[36px]">
                          {plan105.description}
                        </p>
                      </div>

                      {/* Price Section */}
                      <div className="pt-2 border-t border-cyan-500/20">
                        <div className="text-[10px] font-mono text-gray-400 uppercase">PACKAGE PRICE</div>
                        <div className="text-3xl font-black text-white font-rajdhani">
                          {price105}
                        </div>
                      </div>

                      {/* Benefits Checklist */}
                      <ul className="space-y-2 pt-2 text-xs text-gray-200">
                        {plan105.benefits.map((b, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                            <span className="leading-tight">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* View Plan Button */}
                    <div className="pt-6 mt-4 border-t border-cyan-500/20">
                      <button
                        onClick={() => handleOpenProduct(plan105.id)}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold font-rajdhani uppercase tracking-wider bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                      >
                        <span>Select Plan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Escrow Guarantee Strip */}
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-emerald-300">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-gray-200 leading-relaxed">
                  <strong className="text-emerald-300 font-rajdhani uppercase tracking-wide">100% Escrow Mediation:</strong> When potential traders contact you through VIB promotions, execute the item swap through our verified WhatsApp middleman service for safer handoffs.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('profiles')}
                className="px-4 py-2 rounded-lg bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-500/40 text-emerald-200 text-xs font-bold font-rajdhani uppercase tracking-wider flex-shrink-0 transition-all cursor-pointer min-h-[36px]"
              >
                Browse Available Skins
              </button>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 2C. DEDICATED HORIZONTAL SECTION: VIB BONUS PLAN (BELOW PLAN SECTIONS)    */}
          {/* ========================================================================= */}
          <section
            id="vib-bonus-plan"
            ref={bonusPlanRef}
            className="scroll-mt-24 sm:scroll-mt-28 pt-2"
          >
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-950/60 via-[#180e2b] to-[#0c0919] border border-fuchsia-500/35 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xl">
              <div className="flex items-start gap-4 max-w-3xl">
                <div className="w-11 h-11 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-300 flex-shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-black text-xl sm:text-2xl text-white font-rajdhani uppercase tracking-wide">
                      VIB BONUS PLAN
                    </h2>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/40 uppercase">
                      {bonusPlan?.badge || '₹0 UPFRONT'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    {bonusPlan?.description ||
                      'Free public community advertisement with zero upfront fee — 18% service fee charged only after a successful sale through VIB escrow.'}
                  </p>
                  <p className="text-[11px] text-fuchsia-300/90 font-mono">
                    List on the public VIB community website with ₹0 upfront payment. The 18% service fee is deducted only if your account sells.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenProduct(bonusPlan?.id || 'ad-bonus-free-18pct')}
                className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-xs font-bold font-rajdhani uppercase tracking-wider transition-all shadow-lg shadow-fuchsia-600/25 flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer min-h-[44px]"
              >
                <span>Select Plan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 3. PROFESSIONAL PLAN COMPARISON TABLE                                     */}
          {/* ========================================================================= */}
          <section ref={comparisonRef} className="pt-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#e879f9] uppercase font-bold">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>TRANSPARENT FEATURE AUDIT</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani tracking-wide">
                  COMPARE ALL ADVERTISEMENT PLANS
                </h2>
              </div>
              <p className="text-xs text-gray-400 max-w-md">
                Detailed feature breakdown across Status Blasts, Channel Showcase Posts, Featured Highlights, and Website Marketplace listings.
              </p>
            </div>

            {/* Desktop & Tablet Comparison Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#090714] shadow-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-[#120d24]">
                    <th className="p-3.5 font-black text-white font-rajdhani uppercase tracking-wider sticky left-0 bg-[#120d24] z-10 min-w-[180px]">
                      Package Name
                    </th>
                    <th className="p-3.5 font-black text-purple-300 font-rajdhani uppercase tracking-wider min-w-[90px]">
                      Price
                    </th>
                    <th className="p-3.5 font-bold text-gray-300 uppercase tracking-wider text-center min-w-[75px]">
                      Status Blast
                    </th>
                    <th className="p-3.5 font-bold text-gray-300 uppercase tracking-wider text-center min-w-[75px]">
                      Channel Post
                    </th>
                    <th className="p-3.5 font-bold text-gray-300 uppercase tracking-wider text-center min-w-[75px]">
                      Highlight
                    </th>
                    <th className="p-3.5 font-bold text-gray-300 uppercase tracking-wider min-w-[110px]">
                      Story Count
                    </th>
                    <th className="p-3.5 font-bold text-gray-300 uppercase tracking-wider text-center min-w-[85px]">
                      Website Listing
                    </th>
                    <th className="p-3.5 font-bold text-gray-300 uppercase tracking-wider text-center min-w-[80px]">
                      Inventory Edit
                    </th>
                    <th className="p-3.5 font-bold text-gray-300 uppercase tracking-wider min-w-[110px]">
                      Duration
                    </th>
                    <th className="p-3.5 font-bold text-gray-300 uppercase tracking-wider text-center min-w-[85px]">
                      Buyer Assist
                    </th>
                    <th className="p-3.5 font-bold text-gray-300 uppercase tracking-wider text-center min-w-[85px]">
                      Priority
                    </th>
                    <th className="p-3.5 font-bold text-gray-300 uppercase tracking-wider text-center min-w-[85px]">
                      Dedicated Agent
                    </th>
                    <th className="p-3.5 font-bold text-gray-300 uppercase tracking-wider text-center min-w-[85px]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {plans.map((p) => {
                    const priceStr = p.price === 0 ? 'FREE' : `₹${p.price.toLocaleString('en-IN')}`;
                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5 font-bold text-white font-rajdhani sticky left-0 bg-[#090714] z-10">
                          <div className="flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.badge && (
                              <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/20">
                                {p.badge}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 font-extrabold text-purple-300 font-rajdhani">
                          {priceStr}
                        </td>
                        <td className="p-3.5 text-center">
                          {p.instagram_story ? (
                            <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {p.instagram_post ? (
                            <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {p.highlight_placement ? (
                            <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-gray-300 font-mono text-[11px]">
                          {p.story_count}
                        </td>
                        <td className="p-3.5 text-center">
                          {p.website_listing ? (
                            <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {p.inventory_editing ? (
                            <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-gray-300 text-[11px]">
                          {p.promotion_duration}
                        </td>
                        <td className="p-3.5 text-center">
                          {p.buyer_assistance ? (
                            <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {p.priority_placement ? (
                            <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {p.dedicated_agent ? (
                            <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleOpenProduct(p.id)}
                            className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] uppercase font-rajdhani cursor-pointer"
                          >
                            Select Plan
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: POST-APPROVAL CUSTOMER ADVERTISEMENT SUBMISSION FORM (MOVED TO DEDICATED COMPONENT) */}
      {false && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-8">
          <div className="p-6 rounded-2xl bg-[#0c0919] border border-purple-500/30 space-y-6 shadow-2xl">
            <div className="space-y-2 border-b border-white/10 pb-4">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-fuchsia-400 uppercase font-bold">
                <FileImage className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>CUSTOMER ADVERTISEMENT SUBMISSION</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-white font-rajdhani">
                SUBMIT YOUR ACCOUNT INVENTORY DETAILS
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed">
                Provide accurate details and a single high-resolution screenshot of your main Valorant inventory. This information will be used to format and publish your verified advertisement campaign.
              </p>
            </div>

            {/* Token / Order ID verification banner if verifying */}
            {verifyLoading && (
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center gap-3 text-xs text-purple-200">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>Verifying order authorization &amp; payment status...</span>
              </div>
            )}

            {verifyError && (
              <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Verification Notice:</div>
                  <div>{verifyError}</div>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveView('plans')}
                      className="text-xs text-rose-300 underline font-semibold hover:text-white"
                    >
                      Return to packages list
                    </button>
                  </div>
                </div>
              </div>
            )}

            {verifiedOrder && (
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase">ORDER ID</div>
                  <div className="font-mono font-bold text-white">{verifiedOrder.id}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase">PACKAGE</div>
                  <div className="font-bold text-purple-300 font-rajdhani">{verifiedOrder.plan_name}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase">PRICE</div>
                  <div className="font-bold text-white font-rajdhani">₹{Number(verifiedOrder.plan_price).toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase">STATUS</div>
                  <div className="font-mono font-bold text-emerald-400 uppercase">{verifiedOrder.status}</div>
                </div>
              </div>
            )}

            {/* Clear Instructions Card (Requirement 5) */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#140f28] border border-amber-500/30 space-y-2.5 text-xs text-gray-200">
              <div className="flex items-center gap-2 text-amber-300 font-bold font-rajdhani uppercase text-sm">
                <Info className="w-4 h-4 text-amber-400" />
                <span>IMPORTANT SUBMISSION INSTRUCTIONS</span>
              </div>
              <ul className="space-y-1.5 text-gray-300 text-xs list-disc list-inside">
                <li><strong className="text-white">Only mention premium, exclusive, and valuable skins</strong> (e.g. Kuronami, Prime, Reaver, Champions, Glitchpop).</li>
                <li><strong className="text-white">Do not include cheap or ordinary Battle Pass skins</strong> in your description.</li>
                <li><strong className="text-white">Upload one clear screenshot showing the main account inventory</strong> collection or weapon grid.</li>
                <li><strong className="text-white">Do not upload separate screenshots</strong> of every individual skin.</li>
                <li><strong className="text-white">Keep your contact channel reachable</strong> so interested buyers can message you directly.</li>
                <li><strong className="text-white">Respond promptly to VIB coordinator messages</strong> once buyer interest is confirmed.</li>
              </ul>
            </div>

            {/* Submission Form */}
            {submitSuccess ? (
              <div className="p-8 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black uppercase text-white font-rajdhani">
                    ADVERTISEMENT DETAILS RECEIVED!
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 max-w-md mx-auto">
                    Your account showcase is now queued with our operations team. We will review your inventory, format your graphics, and schedule your promotion on official VIB broadcast channels.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('home')}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-rajdhani cursor-pointer min-h-[44px]"
                >
                  Return to Home
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitDetails} className="space-y-5">
                {submitError && (
                  <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* 1. Customer Contact Details (prefilled/verified) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-[#0a0714] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                      placeholder="e.g. rahul@example.com"
                      className="w-full bg-[#0a0714] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      WhatsApp Number *
                    </label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                      placeholder="e.g. +91 9876543210"
                      className="w-full bg-[#0a0714] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 min-h-[44px]"
                    />
                  </div>
                </div>

                {/* 2. Optional Social Handle & Selling Price */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Social Handle (Optional)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-500 text-xs">@</span>
                      <input
                        type="text"
                        value={formInstagram}
                        onChange={(e) => setFormInstagram(e.target.value)}
                        placeholder="optional_handle"
                        className="w-full bg-[#0a0714] border border-white/10 rounded-xl pl-7 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 min-h-[44px]"
                      />
                    </div>
                    <span className="text-[10px] text-gray-500">Optional backup handle if any</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Selling Price (INR) *
                    </label>
                    <input
                      type="number"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      required
                      placeholder="e.g. 12500"
                      className="w-full bg-[#0a0714] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                      Current Rank *
                    </label>
                    <input
                      type="text"
                      value={formRank}
                      onChange={(e) => setFormRank(e.target.value)}
                      required
                      placeholder="e.g. Ascendant 2"
                      className="w-full bg-[#0a0714] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 min-h-[44px]"
                    />
                  </div>
                </div>

                {/* 3. List of Premium Skins */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    List of Premium Skins * (Exclusive &amp; High Tier Only)
                  </label>
                  <textarea
                    rows={4}
                    value={formPremiumSkins}
                    onChange={(e) => setFormPremiumSkins(e.target.value)}
                    required
                    placeholder="e.g.&#10;• Kuronami Vandal (Max Level, Cyan variant)&#10;• Prime 2.0 Phantom&#10;• Reaver Operator&#10;• Champions 2023 Karambit (Limited edition)&#10;• Sovereign Sword"
                    className="w-full bg-[#0a0714] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 font-mono leading-relaxed"
                  />
                  <span className="text-[10px] text-gray-500">Only list high-tier skins. Do NOT include ordinary Battle Pass skins.</span>
                </div>

                {/* 4. Other Valuable Items */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Other Valuable Inventory Items (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formOtherItems}
                    onChange={(e) => setFormOtherItems(e.target.value)}
                    placeholder="e.g. 160 Radianite Points, Season 1 VCT Gun Buddy, Riot Fist Bump Buddy, Arcane Sheriff Card"
                    className="w-full bg-[#0a0714] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 font-mono text-xs"
                  />
                </div>

                {/* 5. Main Account Inventory Screenshot */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Main Account Inventory Screenshot * (One Clear Overview Image)
                  </label>
                  <div
                    onClick={() => inventoryInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      formInventoryScreenshot
                        ? 'border-emerald-500/50 bg-emerald-950/20'
                        : 'border-white/20 hover:border-purple-500/50 bg-[#0a0714]'
                    }`}
                  >
                    <input
                      ref={inventoryInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleInventoryScreenshotChange}
                      className="hidden"
                    />

                    {inventoryUploadProgress !== null ? (
                      <div className="flex flex-col items-center justify-center gap-2 text-xs text-gray-300">
                        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                        <span>Reading inventory screenshot… {inventoryUploadProgress}%</span>
                        <div className="w-44 h-1 rounded bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all duration-150"
                            style={{ width: `${inventoryUploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : formInventoryScreenshot ? (
                      <div className="space-y-3">
                        <img
                          src={formInventoryScreenshot}
                          alt="Inventory Preview"
                          className="max-h-56 mx-auto rounded-lg border border-white/10 object-contain shadow-md"
                        />
                        <div className="text-xs text-emerald-300 font-mono flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>{formInventoryFilename || 'Inventory Screenshot Loaded'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormInventoryScreenshot(null);
                            setFormInventoryFilename(null);
                          }}
                          className="text-[11px] text-rose-400 hover:text-rose-300 underline font-mono cursor-pointer"
                        >
                          Remove and replace screenshot
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <UploadCloud className="w-8 h-8 text-purple-400 mx-auto" />
                        <div className="text-xs text-gray-200 font-bold font-rajdhani uppercase">
                          Upload Main Inventory Screenshot
                        </div>
                        <div className="text-[11px] text-gray-400">
                          PNG, JPG, or WebP up to 5MB. Must show the collection grid clearly.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <button
                    type="submit"
                    disabled={isSubmittingDetails}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm uppercase font-rajdhani tracking-wider shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px] disabled:opacity-50"
                  >
                    {isSubmittingDetails ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Submitting Details to Operations Team...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Advertisement Details to VIB</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Authentication Modal with 8 Required Registration Fields & Email OTP */}
      <AdCustomerAuthModal
        isOpen={isAdAuthOpen}
        onClose={() => setIsAdAuthOpen(false)}
        selectedPackageName={pendingPackageToBuy?.name || selectedProductPackage?.name || 'Advertisement Package'}
        selectedPackagePrice={pendingPackageToBuy?.price ?? selectedProductPackage?.price ?? 0}
        onAuthenticated={(authUser?: any) => {
          setIsAdAuthOpen(false);
          if (authUser && pendingPackageToBuy) {
            proceedToOrderDraft(pendingPackageToBuy, authUser);
            return;
          }
          const token = localStorage.getItem('vib_auth_token') || '';
          fetch('/api/auth/me', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
            .then((r) => r.json())
            .then((userData) => {
              let fallbackUser = null;
              try {
                fallbackUser = JSON.parse(localStorage.getItem('vib_user') || 'null');
              } catch {}
              const u = userData?.user || fallbackUser;
              if (u && pendingPackageToBuy) {
                proceedToOrderDraft(pendingPackageToBuy, u);
              }
            })
            .catch(() => {});
        }}
      />
    </div>
  );
};
