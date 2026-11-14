import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  User,
  MessageCircle,
  Clock,
  Gamepad2,
} from 'lucide-react';
import { Currency } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { verifyRiotIdOnServer, RiotVerificationResponse } from '../../lib/riot';
import { ServiceProductDetail } from '../../data/serviceProductDetails';
import { ManualPaymentGateway } from '../payment/ManualPaymentGateway';
import { ClientPage } from '../client/Header';

interface ServiceCheckoutPageProps {
  product: ServiceProductDetail | null;
  currency: Currency;
  onBack: () => void;
  onNavigate: (page: ClientPage, id?: string) => void;
  onTrackOrder: (orderId?: string) => void;
  onClearCart?: () => void;
}

export const ServiceCheckoutPage: React.FC<ServiceCheckoutPageProps> = ({
  product,
  currency,
  onBack,
  onNavigate,
  onTrackOrder,
  onClearCart,
}) => {
  const { user, token, openAuthModal } = useAuth();

  const [riotId, setRiotId] = useState(() => user?.riot_id?.split('#')[0] || '');
  const [tagline, setTagline] = useState(() => user?.riot_id?.split('#')[1] || '');
  const [email, setEmail] = useState(() => user?.email || '');
  const [contactPhone, setContactPhone] = useState(() => user?.phone || '');
  const [discordTag, setDiscordTag] = useState(() => user?.discord_tag || '');
  const [rentalTermsAccepted, setRentalTermsAccepted] = useState(false);
  const [generalTermsAccepted, setGeneralTermsAccepted] = useState(true);

  const [riotVerification, setRiotVerification] = useState<RiotVerificationResponse | null>(null);
  const [isVerifyingRiot, setIsVerifyingRiot] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const [createdOrder, setCreatedOrder] = useState<any | null>(() => {
    try {
      const urlOrder = new URLSearchParams(window.location.search).get('orderId');
      const saved = localStorage.getItem('vib_active_checkout_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (!urlOrder || parsed.id === urlOrder)) return parsed;
      }
    } catch {}
    return null;
  });
  const [checkoutStage, setCheckoutStage] = useState<'details' | 'payment' | 'valuation_done'>(() => {
    try {
      const saved = localStorage.getItem('vib_active_checkout_order');
      if (saved) return 'payment';
    } catch {}
    return 'details';
  });

  // Keep createdOrder state synchronized with backend
  useEffect(() => {
    if (!createdOrder?.id) return;
    let active = true;
    fetch(`/api/orders/track/${encodeURIComponent(createdOrder.id)}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (active && data?.order) {
          setCreatedOrder(data.order);
          try {
            localStorage.setItem('vib_active_checkout_order', JSON.stringify(data.order));
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [createdOrder?.id]);

  const [paymentSettings, setPaymentSettings] = useState({
    upi_id: '',
    payee_name: 'VIB Digital Services Platform',
    qr_image_url: '',
    instructions: '',
    support_whatsapp: '+918099641606',
  });

  useEffect(() => {
    fetch('/api/payment/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.upi_id) {
          setPaymentSettings((prev) => ({
            ...prev,
            upi_id: data.upi_id || prev.upi_id,
            payee_name: data.payee_name || prev.payee_name,
            qr_image_url: data.qr_image_url || prev.qr_image_url,
            instructions: data.instructions || prev.instructions,
            support_whatsapp: data.support_whatsapp || prev.support_whatsapp,
          }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      if (user.riot_id) {
        const parts = user.riot_id.split('#');
        setRiotId((prev) => prev || parts[0] || '');
        setTagline((prev) => prev || parts[1] || '');
      }
      setEmail((prev) => prev || user.email || '');
      setContactPhone((prev) => prev || user.phone || '');
      setDiscordTag((prev) => prev || user.discord_tag || '');
    }
  }, [user]);

  useEffect(() => {
    const cleanName = riotId.trim();
    const cleanTag = tagline.trim();
    if (!cleanName || !cleanTag) {
      setRiotVerification(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsVerifyingRiot(true);
      const res = await verifyRiotIdOnServer(cleanName, cleanTag);
      setIsVerifyingRiot(false);
      setRiotVerification(res);
    }, 450);

    return () => clearTimeout(timer);
  }, [riotId, tagline]);

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <ShoppingCart className="w-12 h-12 text-purple-400" />
        <h2 className="text-2xl font-black font-rajdhani uppercase text-white tracking-wider">
          No Service Selected
        </h2>
        <p className="text-sm text-gray-400 max-w-md font-mono">
          Choose a VP pack, profile listing, or service first to continue checkout.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('vp')}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-rajdhani uppercase text-xs tracking-wider cursor-pointer"
        >
          Browse Storefront
        </button>
      </div>
    );
  }

  const sel = product.selection;
  const isValuation = sel.category === 'valuation';
  const isRegional = sel.category === 'regional_vp';
  const isRental = sel.category === 'rental';
  const isCoaching = sel.category === 'coaching';
  const isCart = sel.category === 'cart';
  const rentalDuration = sel.rentalDuration || '24h';

  const priceFormatted =
    sel.priceINR === 0 ? 'FREE' : formatCurrencyPrice(sel.priceINR, currency);

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!token || !user) {
      openAuthModal('login');
      return;
    }

    if (!riotId.trim() || !tagline.trim()) {
      setFormError('Your Valorant Riot ID and #Tagline are required to register the order.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('A valid delivery receipt email address is required.');
      return;
    }
    if (isRegional && !contactPhone.trim()) {
      setFormError('WhatsApp phone number is required for regional VP delivery coordination.');
      return;
    }
    if (isCoaching && !discordTag.trim()) {
      setFormError('Your Discord username & tag is required for 1-on-1 coaching sessions.');
      return;
    }
    if (isRental && !rentalTermsAccepted) {
      setFormError('Please accept the Rental Escrow Terms and fair play pledge before proceeding.');
      return;
    }
    if (!generalTermsAccepted) {
      setFormError('Please accept the Terms of Service & Refund Policy to continue.');
      return;
    }

    setIsVerifyingRiot(true);
    const check = await verifyRiotIdOnServer(riotId.trim(), tagline.trim());
    setIsVerifyingRiot(false);
    setRiotVerification(check);

    if (!check.exists) {
      setFormError(check.error || 'Please provide a legitimate, existing Valorant Riot ID before ordering.');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const res = await fetch('/api/user/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          package_id: sel.category === 'vp' && sel.productId ? sel.productId : undefined,
          product_id: sel.category === 'rankup' ? undefined : sel.productId || undefined,
          title: sel.title,
          amount: isValuation ? 0 : sel.priceINR,
          currency,
          type: sel.category,
          paymentMethod: isValuation ? 'Free Valuation / Appraisal' : 'UPI Manual QR Verification',
          details: {
            riotId: `${check.gameName || riotId}#${check.tagLine || tagline}`,
            email: email.trim(),
            contactPhone: contactPhone.trim() || undefined,
            discordTag: discordTag.trim() || undefined,
            rentalDuration: isRental ? rentalDuration : undefined,
            cartItems: sel.cartItems,
            rankup: sel.rankup,
            category: sel.category,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Order creation failed. Please verify your details.');
      }

      const data = await res.json();
      setCreatedOrder(data.order);
      try {
        localStorage.setItem('vib_active_checkout_order', JSON.stringify(data.order));
      } catch {}

      try {
        window.dispatchEvent(new Event('vib-stock-refresh'));
      } catch {}

      if (data?.order?.id) {
        fetch('/api/legal/consent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            policySlug: 'terms-and-conditions',
            consentType: 'explicit_checkbox',
            contextType: 'order_checkout',
            contextId: data.order.id,
          }),
        }).then((r) => r.text().catch(() => {})).catch(() => {});

        if (isRental) {
          fetch('/api/legal/consent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              policySlug: 'rental-terms',
              consentType: 'explicit_checkbox',
              contextType: 'rental_checkout',
              contextId: data.order.id,
            }),
          }).then((r) => r.text().catch(() => {})).catch(() => {});
        }
      }

      if (isCart && onClearCart) {
        onClearCart();
      }

      if (isValuation) {
        setCheckoutStage('valuation_done');
      } else {
        setCheckoutStage('payment');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setFormError(err.message || 'Network communication failure. Please retry.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // =========================================================================
  // STAGE 2 & 3: MANUAL PAYMENT GATEWAY (EXACT ADVERTISEMENT CHECKOUT FORMAT)
  // =========================================================================
  if (checkoutStage === 'payment' && createdOrder) {
    const isSubmittedOrder = Boolean(
      createdOrder.payment_status === 'SUBMITTED_FOR_VERIFICATION' ||
      createdOrder.status === 'pending_verification' ||
      createdOrder.payment_evidence_ref ||
      createdOrder.payment_reference
    );

    return (
      <ManualPaymentGateway
        orderId={createdOrder.id}
        itemTitle={product.name}
        itemCategory={product.categoryLabel}
        itemDescription={product.description}
        itemPrice={sel.priceINR}
        currency={currency}
        itemImageUrl={product.imageUrl || ((product.categoryLabel?.toLowerCase().includes('vp') || product.name?.toLowerCase().includes('vp')) ? '/assets/hires/vp_coins_stack.png' : undefined)}
        specs={[
          { label: 'Riot ID', value: `${riotId}#${tagline}` },
          { label: 'Delivery', value: product.deliverySpeed },
          { label: 'Region', value: product.regionScope },
          { label: 'Receipt Email', value: email },
        ]}
        iconType={product.iconType}
        breadcrumbService={product.breadcrumbParent || 'Store'}
        onBack={() => {
          try {
            localStorage.removeItem('vib_active_checkout_order');
          } catch {}
          onNavigate((sel.backPage as ClientPage) || 'home');
        }}
        backButtonLabel={`Back to ${product.breadcrumbParent || 'Store'}`}
        onTrackOrder={() => onTrackOrder(createdOrder.id)}
        onViewOrders={() => (user ? onNavigate('dashboard', 'tab:orders') : onTrackOrder(createdOrder.id))}
        upiId={paymentSettings.upi_id}
        payeeName={paymentSettings.payee_name}
        qrImageUrl={paymentSettings.qr_image_url}
        instructions={paymentSettings.instructions ? [paymentSettings.instructions] : undefined}
        supportWhatsapp={paymentSettings.support_whatsapp || '+918099641606'}
        issuedCode={createdOrder?.issued_code || null}
        initialSubmitted={isSubmittedOrder}
        initialSubmittedAt={createdOrder?.updated_at || createdOrder?.created_at || null}
        initialUtr={createdOrder?.payment_evidence_ref || createdOrder?.payment_reference || null}
        orderStatus={createdOrder?.status || createdOrder?.payment_status}
        orderStatusEndpoint={`/api/orders/track/${encodeURIComponent(createdOrder.id)}`}
        verificationStartAt={createdOrder?.updated_at || createdOrder?.created_at || null}
        highTrafficDelayMs={60000}
        onOrderStatusChange={(updatedOrder) => {
          setCreatedOrder(updatedOrder);
          try {
            localStorage.setItem('vib_active_checkout_order', JSON.stringify(updatedOrder));
          } catch {}
        }}
        onSubmitProof={async (utr, screenshotData) => {
          const res = await fetch(`/api/orders/${encodeURIComponent(createdOrder.id)}/payment-evidence`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              ref: utr,
              screenshot: screenshotData,
            }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data?.error || 'Failed to submit payment verification reference.');
          }
          const updated = data.order || {
            ...createdOrder,
            payment_status: 'SUBMITTED_FOR_VERIFICATION',
            payment_evidence_ref: utr,
            status: 'pending_verification',
            updated_at: new Date().toISOString(),
          };
          setCreatedOrder(updated);
          try {
            localStorage.setItem('vib_active_checkout_order', JSON.stringify(updated));
            window.dispatchEvent(new Event('vib-stock-refresh'));
          } catch {}
          return true;
        }}
      />
    );
  }

  // =========================================================================
  // VALUATION / FREE APPRAISAL SUBMITTED VIEW
  // =========================================================================
  if (checkoutStage === 'valuation_done' && createdOrder) {
    return (
      <div className="min-h-screen bg-[#05040a] text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto rounded-3xl bg-[#0d091e] border border-purple-500/40 p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-[11px] font-mono font-bold text-purple-300 uppercase">
              <Clock className="w-3.5 h-3.5" />
              <span>Submitted For Appraisal</span>
            </span>
            <h2 className="text-3xl font-black font-rajdhani uppercase">Request Received!</h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Your free account appraisal has been logged with Reference{' '}
              <strong className="font-mono text-purple-300">{createdOrder.id}</strong> for{' '}
              <strong>{riotId}#{tagline}</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onTrackOrder(createdOrder.id)}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs cursor-pointer"
            >
              Track Live Request
            </button>
            <a
              href={`https://wa.me/918099641606?text=${encodeURIComponent(
                `Hello VIB Valuation Desk, I submitted appraisal request #${createdOrder.id} for Riot ID ${riotId}#${tagline}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Desk</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STAGE 1: ORDER DETAILS (DEDICATED FULL-PAGE PRE-PAYMENT CONFIGURATION)
  // =========================================================================
  return (
    <div className="w-full bg-[#05040a] text-white selection:bg-purple-600 selection:text-white pb-20 font-sans min-h-screen">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-400 font-mono">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="hover:text-purple-300 transition-colors cursor-pointer"
          >
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <button
            type="button"
            onClick={onBack}
            className="hover:text-purple-300 transition-colors cursor-pointer"
          >
            {product.name}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-purple-400 font-semibold">Checkout</span>
        </nav>

        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-rajdhani">
              COMPLETE YOUR{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400">
                ORDER
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              Confirm your Riot ID and delivery details below to proceed to the official VIB UPI &amp; QR checkout gateway.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono text-gray-300 flex items-center gap-2 w-fit cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Product</span>
          </button>
        </div>

        {/* 3-Step Progress Indicator matching ManualPaymentGateway */}
        <div className="py-2">
          <div className="flex items-center justify-between max-w-xl mx-auto relative">
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 border-2 border-fuchsia-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(217,70,239,0.5)]">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-fuchsia-300 font-rajdhani uppercase">Order Details</div>
                <div className="text-[10px] text-gray-400 font-mono">Riot ID &amp; Delivery</div>
              </div>
            </div>

            <div className="flex-1 h-0.5 bg-white/10 mx-2 -mt-5" />

            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-gray-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-gray-400 font-rajdhani uppercase">Make Payment</div>
                <div className="text-[10px] text-gray-500 font-mono">Pay via UPI / QR</div>
              </div>
            </div>

            <div className="flex-1 h-0.5 bg-white/10 mx-2 -mt-5" />

            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-gray-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-gray-400 font-rajdhani uppercase">Verification</div>
                <div className="text-[10px] text-gray-500 font-mono">Admin Confirmation</div>
              </div>
            </div>
          </div>
        </div>

        {/* Unauthenticated Prompt */}
        {!user && (
          <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <div className="font-bold text-white text-sm font-rajdhani uppercase">
                  Sign In Required Before Payment
                </div>
                <div className="text-xs text-gray-300 font-mono">
                  Sign in or create a free VIB account so your order, invoice, and VP codes are permanently secured to
                  your profile.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold font-rajdhani uppercase text-xs tracking-wider cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold font-rajdhani uppercase text-xs tracking-wider cursor-pointer border border-white/15"
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* Two-Column Checkout Grid */}
        <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Delivery & Account Form */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0c0919] border border-purple-500/30 p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center gap-2 text-white border-b border-white/10 pb-4">
              <Gamepad2 className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold uppercase tracking-wider font-rajdhani">
                Delivery &amp; Account Information
              </h2>
            </div>

            {formError && (
              <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Riot ID & Tagline */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-gray-300 font-semibold block">
                Riot ID &amp; Tagline *
              </label>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Game Name (e.g. PhoenixAim)"
                  value={riotId}
                  onChange={(e) => setRiotId(e.target.value)}
                  className="col-span-8 h-11 px-4 rounded-xl bg-black/50 border border-white/15 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                />
                <div className="col-span-4 relative flex items-center">
                  <span className="absolute left-3 text-gray-400 font-mono text-sm">#</span>
                  <input
                    type="text"
                    required
                    placeholder="IND1"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value.replace('#', ''))}
                    className="w-full h-11 pl-7 pr-3 rounded-xl bg-black/50 border border-white/15 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              {isVerifyingRiot && (
                <div className="flex items-center gap-2 text-xs text-purple-300 font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Valorant Riot ID…</span>
                </div>
              )}
              {!isVerifyingRiot && riotVerification?.exists && (
                <div className={`flex items-center gap-1.5 text-xs font-mono ${riotVerification.verified ? 'text-emerald-400' : 'text-cyan-300'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {riotVerification.verified
                      ? `Valorant ID Verified (${riotVerification.gameName || riotId}#${riotVerification.tagLine || tagline})`
                      : `Valid Riot ID format (${riotVerification.gameName || riotId}#${riotVerification.tagLine || tagline}) — confirmed before delivery`}
                  </span>
                </div>
              )}
              {!isVerifyingRiot && riotVerification && !riotVerification.exists && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-mono">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{riotVerification.error || 'Invalid Riot ID or Tagline'}</span>
                </div>
              )}
            </div>

            {/* Delivery Receipt Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-gray-300 font-semibold block">
                Delivery Receipt Email *
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-black/50 border border-white/15 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Regional VP WhatsApp Number */}
            {isRegional && (
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold block">
                  WhatsApp Phone Number (For Regional Provisioning) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-black/50 border border-white/15 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 font-mono"
                />
                <p className="text-[11px] text-gray-400 font-mono">
                  Our regional operations desk coordinates 1-on-1 delivery via WhatsApp within 15-30 minutes.
                </p>
              </div>
            )}

            {/* Coaching Discord Tag */}
            {isCoaching && (
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold block">
                  Discord Username / Tag *
                </label>
                <input
                  type="text"
                  required
                  placeholder="username#0000 or @handle"
                  value={discordTag}
                  onChange={(e) => setDiscordTag(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-black/50 border border-white/15 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            )}

            {/* Rental Duration & Escrow Terms */}
            {isRental && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="uppercase text-purple-300 font-bold">Rental Window &amp; Fair Play Pledge</span>
                  <span className="px-2 py-0.5 rounded bg-purple-950/70 border border-purple-500/30 text-purple-200 uppercase">
                    {rentalDuration}
                  </span>
                </div>
                <label className="flex items-start gap-2.5 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rentalTermsAccepted}
                    onChange={(e) => setRentalTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded accent-purple-600 cursor-pointer"
                  />
                  <span>
                    I accept the Rental Escrow Terms and agree to play fairly with zero third-party cheats or tampering.
                  </span>
                </label>
              </div>
            )}

            {/* Escrow & Legal Terms */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>VIB Escrow Desk • Secure Verified Payment &amp; Identity Protection</span>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-gray-300 cursor-pointer p-3 rounded-xl bg-white/[0.02] border border-white/10">
              <input
                type="checkbox"
                checked={generalTermsAccepted}
                onChange={(e) => setGeneralTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded accent-purple-600 cursor-pointer"
              />
              <span>
                I agree to VIB&apos;s{' '}
                <a
                  href="/?page=legal&slug=terms-and-conditions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 underline hover:text-purple-300"
                >
                  Terms of Service
                </a>
                ,{' '}
                <a
                  href="/?page=legal&slug=refund-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 underline hover:text-purple-300"
                >
                  Refund Policy
                </a>{' '}
                and acknowledge transactions are protected under official VIB middleman escrow.
              </span>
            </label>
          </div>

          {/* Right Column (5 cols): Order Summary Card */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0c0919] border border-purple-500/30 p-6 space-y-5 shadow-xl lg:sticky lg:top-24">
            <div className="flex items-center gap-2 text-white border-b border-white/10 pb-4">
              <ShoppingCart className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold uppercase tracking-wider font-rajdhani">Order Summary</h2>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
              <div className="font-bold text-base text-white font-rajdhani uppercase">{product.name}</div>
              <span className="inline-block px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-[10px] font-semibold text-purple-300 font-mono">
                {product.categoryLabel}
              </span>
              <p className="text-xs text-gray-400 pt-1 leading-relaxed">{product.tagline}</p>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between text-gray-400">
                <span>Delivery Speed</span>
                <span className="text-white">{product.deliverySpeed}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Fulfillment Method</span>
                <span className="text-white">{product.fulfillmentMethod}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Region</span>
                <span className="text-purple-300">{product.regionScope}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Payment Mode</span>
                <span className="text-emerald-400">Instant UPI / QR</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-200 font-rajdhani uppercase">Total Payable</span>
              <span className="text-2xl font-black text-white font-rajdhani tracking-wide">{priceFormatted}</span>
            </div>

            <button
              type="submit"
              disabled={isCreatingOrder || isVerifyingRiot}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-sm uppercase tracking-wider font-rajdhani shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isCreatingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initializing Order…</span>
                </>
              ) : (
                <>
                  <span>
                    {isValuation ? 'Submit Valuation Request' : `Proceed to Payment — ${priceFormatted}`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <a
              href={`https://wa.me/918099641606?text=${encodeURIComponent(
                `Hi VIB Support, I need assistance ordering ${product.name} (${priceFormatted}).`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold font-rajdhani uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat on WhatsApp (+91 80996 41606)</span>
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};
