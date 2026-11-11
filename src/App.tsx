import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Header, ClientPage } from './components/client/Header';
import { Footer } from './components/client/Footer';
import { ClientHomePage } from './components/client/ClientHomePage';
import { ClientProfilesPage } from './components/client/ClientProfilesPage';
import { ClientVPOverviewPage } from './components/client/ClientVPOverviewPage';
import { ClientIndianVPPage } from './components/client/ClientIndianVPPage';
import { ClientServicesPage } from './components/client/ClientServicesPage';
import { ClientRankupPage } from './components/client/ClientRankupPage';
import { ClientRentalsPage } from './components/client/ClientRentalsPage';
import { ClientCoachingPage } from './components/client/ClientCoachingPage';
import { ClientAuctionsPage } from './components/client/ClientAuctionsPage';
import { ClientAdvertisePage } from './components/client/ClientAdvertisePage';
import { UserDashboard } from './components/dashboard/UserDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { OrderTrackingModal } from './components/orders/OrderTrackingModal';
import { EscrowModal } from './components/home/EscrowModal';
import { ListingDetailPage } from './components/profiles/ListingDetailPage';
import { LegalPage } from './components/legal/LegalPage';
import { CookieConsentBanner } from './components/legal/CookieConsentBanner';
import { FlexiblePaymentPlansPage } from './components/flexible/FlexiblePaymentPlansPage';
import { FlexibleCheckoutPage } from './components/flexible/FlexibleCheckoutPage';
import { FlexibleConfirmationPage } from './components/flexible/FlexibleConfirmationPage';
import { ServiceProductPage } from './components/checkout/ServiceProductPage';
import { ServiceCheckoutPage } from './components/checkout/ServiceCheckoutPage';
import { FlexiblePlanSelection } from './types/flexiblePlans';
import {
  ServiceProductDetail,
  buildServiceSelection,
  buildServiceProductDetail,
} from './data/serviceProductDetails';
import { Currency, CartItem } from './types';
import { soundFx } from './utils/audio';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, loading, isStaff, isAuthModalOpen, authModalMode, openAuthModal, closeAuthModal } = useAuth();

  const getInitialPage = (): ClientPage => {
    try {
      const path = window.location.pathname;
      if (path === '/advertise' || path.startsWith('/advertise')) {
        return 'advertise';
      }
      if (path === '/flexible-payment-plans' || path.startsWith('/flexible-payment-plans')) {
        return 'flexible-payment-plans';
      }
      if (path === '/flexible-checkout' || path.startsWith('/flexible-checkout')) {
        return 'flexible-checkout';
      }
      if (path === '/flexible-confirmation' || path.startsWith('/flexible-confirmation')) {
        return 'flexible-confirmation';
      }
      if (path === '/product' || path.startsWith('/product')) {
        return 'service-product';
      }
      if (path === '/checkout' || path.startsWith('/checkout')) {
        return 'service-checkout';
      }
      const params = new URLSearchParams(window.location.search);
      const p = params.get('page') as ClientPage;
      if (
        p &&
        [
          'home',
          'profiles',
          'listing',
          'vp',
          'vp-catalog',
          'services',
          'advertise',
          'rankup',
          'rentals',
          'coaching',
          'auctions',
          'legal',
          'dashboard',
          'admin',
          'flexible-payment-plans',
          'flexible-checkout',
          'flexible-confirmation',
          'service-product',
          'service-checkout',
        ].includes(p)
      ) {
        return p;
      }
    } catch {}
    return 'home';
  };

  const getInitialListingId = (): string => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('id') || '';
    } catch {}
    return '';
  };

  const getInitialLegalSlug = (): string => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('slug') || 'terms-and-conditions';
    } catch {}
    return 'terms-and-conditions';
  };

  const [currentPage, setCurrentPage] = useState<ClientPage>(getInitialPage);
  const [selectedListingId, setSelectedListingId] = useState<string>(getInitialListingId);
  const [selectedLegalSlug, setSelectedLegalSlug] = useState<string>(getInitialLegalSlug);
  const [currency, setCurrency] = useState<Currency>('INR');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Flexible Payment Plans Page & Checkout state
  const [flexibleCategory, setFlexibleCategory] = useState<'vp' | 'account'>(() => {
    try {
      const cat = new URLSearchParams(window.location.search).get('category');
      if (cat === 'account' || new URLSearchParams(window.location.search).get('listingId')) {
        return 'account';
      }
    } catch {}
    return 'vp';
  });
  const [flexibleRegion, setFlexibleRegion] = useState<'in' | 'php'>(() => {
    try {
      return new URLSearchParams(window.location.search).get('region') === 'php' ? 'php' : 'in';
    } catch {}
    return 'in';
  });
  const [flexibleListingId, setFlexibleListingId] = useState<string>(() => {
    try {
      return new URLSearchParams(window.location.search).get('listingId') || '';
    } catch {}
    return '';
  });
  const [selectedFlexiblePlan, setSelectedFlexiblePlan] = useState<FlexiblePlanSelection | null>(() => {
    try {
      const saved = localStorage.getItem('vib_selected_flexible_plan');
      return saved ? JSON.parse(saved) : null;
    } catch {}
    return null;
  });
  const [flexibleApplicationRef, setFlexibleApplicationRef] = useState<string>(() => {
    try {
      return new URLSearchParams(window.location.search).get('ref') || '';
    } catch {}
    return '';
  });

  const [selectedServiceProduct, setSelectedServiceProduct] = useState<ServiceProductDetail | null>(() => {
    try {
      const saved = localStorage.getItem('vib_selected_service_product');
      return saved ? JSON.parse(saved) : null;
    } catch {}
    return null;
  });

  // Handle URL history state & back/forward navigation
  useEffect(() => {
    // Sanitize any malformed duplicate slashes in pathname (e.g. //?page=...)
    try {
      if (window.location.pathname.includes('//')) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.pathname = cleanUrl.pathname.replace(/\/+/g, '/') || '/';
        window.history.replaceState(null, '', cleanUrl.toString());
      }
    } catch {}

    const onPopState = () => {
      const path = window.location.pathname;
      if (path === '/advertise' || path.startsWith('/advertise')) {
        setCurrentPage('advertise');
        return;
      }
      const params = new URLSearchParams(window.location.search);
      if (path === '/flexible-payment-plans' || path.startsWith('/flexible-payment-plans')) {
        setFlexibleCategory(params.get('category') === 'account' || params.get('listingId') ? 'account' : 'vp');
        setFlexibleRegion(params.get('region') === 'php' ? 'php' : 'in');
        setFlexibleListingId(params.get('listingId') || '');
        setCurrentPage('flexible-payment-plans');
        return;
      }
      if (path === '/flexible-checkout' || path.startsWith('/flexible-checkout')) {
        setCurrentPage('flexible-checkout');
        return;
      }
      if (path === '/flexible-confirmation' || path.startsWith('/flexible-confirmation')) {
        setFlexibleApplicationRef(params.get('ref') || '');
        setCurrentPage('flexible-confirmation');
        return;
      }
      if (path === '/product' || path.startsWith('/product')) {
        setCurrentPage('service-product');
        return;
      }
      if (path === '/checkout' || path.startsWith('/checkout')) {
        setCurrentPage('service-checkout');
        return;
      }
      const p = (params.get('page') as ClientPage) || 'home';
      if (
        [
          'home',
          'profiles',
          'listing',
          'vp',
          'vp-catalog',
          'services',
          'advertise',
          'rankup',
          'rentals',
          'coaching',
          'auctions',
          'dashboard',
          'admin',
          'flexible-payment-plans',
          'flexible-checkout',
          'flexible-confirmation',
          'service-product',
          'service-checkout',
        ].includes(p)
      ) {
        setCurrentPage(p);
        if (p === 'listing') {
          setSelectedListingId(params.get('id') || '');
        }
        if (p === 'flexible-payment-plans') {
          setFlexibleCategory(params.get('category') === 'account' || params.get('listingId') ? 'account' : 'vp');
          setFlexibleRegion(params.get('region') === 'php' ? 'php' : 'in');
          setFlexibleListingId(params.get('listingId') || '');
        }
        if (p === 'flexible-confirmation') {
          setFlexibleApplicationRef(params.get('ref') || '');
        }
      } else {
        setCurrentPage('home');
      }

      const trackId = params.get('orderId') || params.get('track');
      if (trackId) {
        setTrackingOrderId(trackId);
        setIsTrackingOpen(true);
      }
    };
    window.addEventListener('popstate', onPopState);

    // Initial query check for tracking
    try {
      const params = new URLSearchParams(window.location.search);
      const trackId = params.get('orderId') || params.get('track');
      if (trackId) {
        setTrackingOrderId(trackId);
        setIsTrackingOpen(true);
      }
    } catch {}

    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Protected route enforcement on auth state changes (waits for initial auth check)
  useEffect(() => {
    if (loading) return;
    if (currentPage === 'admin' && user && !isStaff) {
      setCurrentPage('dashboard');
      try {
        const url = new URL(window.location.href);
        url.pathname = url.pathname.replace(/\/+/g, '/') || '/';
        url.searchParams.set('page', 'dashboard');
        url.searchParams.delete('id');
        window.history.replaceState({ page: 'dashboard' }, '', url.toString());
      } catch {}
    }
    if (currentPage === 'dashboard' && !user) {
      // If user logs out while on protected dashboard, return to home
      setCurrentPage('home');
      try {
        const url = new URL(window.location.href);
        url.pathname = url.pathname.replace(/\/+/g, '/') || '/';
        url.searchParams.delete('page');
        url.searchParams.delete('id');
        window.history.replaceState({ page: 'home' }, '', url.toString());
      } catch {}
    }
  }, [user, isStaff, currentPage, loading]);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modals state
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState('');

  const handleSelectFlexiblePlan = (plan: FlexiblePlanSelection) => {
    soundFx.playClickSound();
    setSelectedFlexiblePlan(plan);
    try {
      localStorage.setItem('vib_selected_flexible_plan', JSON.stringify(plan));
    } catch {}
    handleNavigate('flexible-checkout');
  };

  const handleOpenTracking = (orderId?: string) => {
    soundFx.playClickSound();
    setTrackingOrderId(orderId || '');
    setIsTrackingOpen(true);
  };

  const handleAddToCart = (item: CartItem) => {
    soundFx.playClickSound();
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, item];
    });
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (id: string) => {
    soundFx.playClickSound();
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleOpenCustomCheckout = (
    title: string,
    price: number,
    productId?: string,
    rankup?: { fromRankId: string; toRankId: string; mode: 'solo' | 'duo'; queueType: 'standard' | 'priority' } | string
  ) => {
    const isListingPurchase =
      currentPage === 'listing' ||
      (productId ? productId.startsWith('lst_') || productId.startsWith('p-') : false);
    const backPage = currentPage === 'listing' ? 'listing' : currentPage;
    const selection = buildServiceSelection(title, price, productId, rankup, undefined, backPage);
    const detail = buildServiceProductDetail(selection);
    setSelectedServiceProduct(detail);
    try {
      localStorage.setItem('vib_selected_service_product', JSON.stringify(detail));
    } catch {}
    // Account listings already open on ListingDetailPage; go directly to checkout
    if (isListingPurchase) {
      handleNavigate('service-checkout');
    } else {
      handleNavigate('service-product');
    }
  };

  const handleProceedFromCart = () => {
    if (cartItems.length === 0) return;
    const totalINR = cartItems.reduce((sum, item) => sum + item.priceINR * item.quantity, 0);
    const itemNames = cartItems.map((i) => `${i.title} (x${i.quantity})`).join(', ');
    setIsCartOpen(false);
    const selection = buildServiceSelection(
      `Cart Checkout: ${itemNames}`,
      totalINR,
      'cart',
      undefined,
      cartItems.map(({ id, quantity }) => ({ id, quantity })),
      currentPage
    );
    const detail = buildServiceProductDetail(selection);
    setSelectedServiceProduct(detail);
    try {
      localStorage.setItem('vib_selected_service_product', JSON.stringify(detail));
    } catch {}
    handleNavigate('service-checkout');
  };

  const handleNavigate = (page: ClientPage, id?: string) => {
    soundFx.playClickSound();

    if (page === 'community' || page === 'support') {
      window.open(
        `https://wa.me/918099641606?text=${encodeURIComponent('Hello VIB Support, I need assistance.')}`,
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }

    // Role-based route guard: Dashboard requires authenticated session
    if (page === 'dashboard' && !user) {
      openAuthModal('login');
      return;
    }

    // Staff console is available to moderators, admins, and superadmins.
    if (page === 'admin') {
      if (!user) {
        openAuthModal('login');
        return;
      }
      if (!isStaff) {
        alert('Access Restricted: Staff privileges required.');
        return;
      }
    }

    if (page === 'listing' && id) {
      setSelectedListingId(id);
    }
    if (page === 'legal' && id) {
      setSelectedLegalSlug(id);
    }
    if (page === 'flexible-payment-plans') {
      if (id?.startsWith('listing:')) {
        const lid = id.replace('listing:', '');
        setFlexibleCategory('account');
        setFlexibleListingId(lid);
      } else if (id === 'category:vp-php') {
        setFlexibleCategory('vp');
        setFlexibleRegion('php');
        setFlexibleListingId('');
      } else if (id === 'category:vp-in' || id === 'category:vp') {
        setFlexibleCategory('vp');
        setFlexibleRegion('in');
        setFlexibleListingId('');
      } else if (id === 'category:account') {
        setFlexibleCategory('account');
        setFlexibleListingId('');
      }
    }
    if (page === 'flexible-confirmation' && id) {
      setFlexibleApplicationRef(id);
    }

    setCurrentPage(page);
    try {
      const url = new URL(window.location.href);
      url.pathname = url.pathname.replace(/\/+/g, '/') || '/';
      if (page === 'home') {
        url.pathname = '/';
        url.searchParams.delete('page');
        url.searchParams.delete('id');
        url.searchParams.delete('slug');
        url.searchParams.delete('category');
        url.searchParams.delete('region');
        url.searchParams.delete('listingId');
        url.searchParams.delete('ref');
      } else if (page === 'flexible-payment-plans') {
        url.pathname = '/flexible-payment-plans';
        url.searchParams.delete('page');
        url.searchParams.delete('id');
        url.searchParams.delete('slug');
        url.searchParams.delete('ref');
        url.searchParams.delete('tab');
        if (id?.startsWith('listing:')) {
          url.searchParams.set('category', 'account');
          url.searchParams.set('listingId', id.replace('listing:', ''));
          url.searchParams.delete('region');
        } else if (id === 'category:vp-php') {
          url.searchParams.set('category', 'vp');
          url.searchParams.set('region', 'php');
          url.searchParams.delete('listingId');
        } else if (id === 'category:account') {
          url.searchParams.set('category', 'account');
          url.searchParams.delete('listingId');
          url.searchParams.delete('region');
        } else {
          url.searchParams.set('category', id === 'category:vp-in' || id === 'category:vp' ? 'vp' : flexibleCategory);
          if (flexibleCategory === 'vp' || id === 'category:vp-in' || id === 'category:vp') {
            url.searchParams.set('region', id === 'category:vp-in' || id === 'category:vp' ? 'in' : flexibleRegion);
          }
          url.searchParams.delete('listingId');
        }
      } else if (page === 'flexible-checkout') {
        url.pathname = '/flexible-checkout';
        url.searchParams.delete('page');
        url.searchParams.delete('id');
        url.searchParams.delete('slug');
        url.searchParams.delete('category');
        url.searchParams.delete('region');
        url.searchParams.delete('listingId');
        url.searchParams.delete('ref');
      } else if (page === 'flexible-confirmation') {
        url.pathname = '/flexible-confirmation';
        url.searchParams.delete('page');
        url.searchParams.delete('id');
        url.searchParams.delete('slug');
        url.searchParams.delete('category');
        url.searchParams.delete('region');
        url.searchParams.delete('listingId');
        if (id) url.searchParams.set('ref', id);
      } else if (page === 'service-product') {
        url.pathname = '/product';
        url.searchParams.delete('page');
        url.searchParams.delete('id');
        url.searchParams.delete('slug');
        url.searchParams.delete('category');
        url.searchParams.delete('region');
        url.searchParams.delete('listingId');
        url.searchParams.delete('ref');
        url.searchParams.delete('tab');
      } else if (page === 'service-checkout') {
        url.pathname = '/checkout';
        url.searchParams.delete('page');
        url.searchParams.delete('id');
        url.searchParams.delete('slug');
        url.searchParams.delete('category');
        url.searchParams.delete('region');
        url.searchParams.delete('listingId');
        url.searchParams.delete('ref');
        url.searchParams.delete('tab');
      } else if (page === 'advertise') {
        url.pathname = '/advertise';
        url.searchParams.delete('page');
        url.searchParams.delete('id');
        url.searchParams.delete('slug');
        if (id) {
          if (id.startsWith('product:')) {
            url.pathname = `/advertise/product/${id.replace('product:', '')}`;
            url.hash = '';
          } else if (id.startsWith('checkout:')) {
            url.pathname = `/advertise/checkout/${id.replace('checkout:', '')}`;
            url.hash = '';
          } else {
            url.hash = id.startsWith('#') ? id : '#' + id;
          }
        } else {
          url.hash = '';
        }
      } else {
        url.pathname = '/';
        url.searchParams.set('page', page);
        url.searchParams.delete('category');
        url.searchParams.delete('region');
        url.searchParams.delete('listingId');
        url.searchParams.delete('ref');
        if (page === 'listing' && id) {
          url.searchParams.set('id', id);
        } else if (page !== 'listing') {
          url.searchParams.delete('id');
        }
        if (page === 'legal' && id) {
          url.searchParams.set('slug', id);
        } else if (page !== 'legal') {
          url.searchParams.delete('slug');
        }
        if (page === 'dashboard' && id?.startsWith('tab:')) {
          url.searchParams.set('tab', id.replace('tab:', ''));
        } else if (page !== 'dashboard') {
          url.searchParams.delete('tab');
        }
      }
      window.history.pushState({ page, id }, '', url.toString());
    } catch {}
    if (
      id &&
      page !== 'listing' &&
      page !== 'legal' &&
      page !== 'flexible-payment-plans' &&
      page !== 'flexible-confirmation' &&
      !id.startsWith('tab:')
    ) {
      const cleanId = id.startsWith('#') ? id.slice(1) : id;
      let attempts = 0;
      const attemptScroll = () => {
        const el = document.getElementById(cleanId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (attempts < 10) {
          attempts++;
          setTimeout(attemptScroll, 80);
        }
      };
      setTimeout(attemptScroll, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#07070d] text-white flex flex-col justify-between relative overflow-x-hidden font-inter selection:bg-fuchsia-600 selection:text-white">
      {/* Accessibility Skip-to-content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2.5 focus:bg-purple-600 focus:text-white focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-white font-semibold text-xs uppercase tracking-wider"
      >
        Skip to main content
      </a>

      {/* Top Header Navigation matching exact mockups & auto-hide behavior */}
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        currency={currency}
        onCurrencyChange={setCurrency}
        cartCount={cartItems.reduce((s, i) => s + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={(mode) => openAuthModal(mode)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onSearch={(q) => {
          setSearchQuery(q);
          handleNavigate('profiles');
        }}
        onOpenTracking={handleOpenTracking}
      />

      {/* Main Page Content */}
      <main id="main-content" className="flex-1 w-full" tabIndex={-1}>
        {currentPage === 'home' && (
          <ClientHomePage
            currency={currency}
            onNavigate={handleNavigate}
            onAddToCart={handleAddToCart}
            onOpenCheckout={handleOpenCustomCheckout}
          />
        )}

        {currentPage === 'profiles' && (
          <ClientProfilesPage
            currency={currency}
            onNavigate={handleNavigate}
            onAddToCart={handleAddToCart}
            onOpenCheckout={handleOpenCustomCheckout}
            searchQuery={searchQuery}
          />
        )}

        {currentPage === 'listing' && (
          <ListingDetailPage
            listingId={selectedListingId}
            currency={currency}
            onNavigate={handleNavigate}
            onAddToCart={handleAddToCart}
            onOpenCheckout={handleOpenCustomCheckout}
          />
        )}

        {currentPage === 'vp' && (
          <ClientVPOverviewPage
            currency={currency}
            onNavigate={handleNavigate}
            onAddToCart={handleAddToCart}
            onOpenCheckout={handleOpenCustomCheckout}
          />
        )}

        {currentPage === 'flexible-payment-plans' && (
          <FlexiblePaymentPlansPage
            currency={currency}
            onNavigate={handleNavigate}
            onSelectPlan={handleSelectFlexiblePlan}
            initialCategory={flexibleCategory}
            initialRegion={flexibleRegion}
            initialListingId={flexibleListingId}
          />
        )}

        {currentPage === 'flexible-checkout' && (
          <FlexibleCheckoutPage
            currency={currency}
            selectedPlan={selectedFlexiblePlan}
            onNavigate={handleNavigate}
            onBackToPlans={() => handleNavigate('flexible-payment-plans')}
            onSuccess={(appRef) => handleNavigate('flexible-confirmation', appRef)}
          />
        )}

        {currentPage === 'flexible-confirmation' && (
          <FlexibleConfirmationPage
            applicationRef={flexibleApplicationRef}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'vp-catalog' && (
          <ClientIndianVPPage
            currency={currency}
            onNavigate={handleNavigate}
            onAddToCart={handleAddToCart}
            onOpenCheckout={handleOpenCustomCheckout}
          />
        )}

        {currentPage === 'rankup' && (
          <ClientRankupPage
            currency={currency}
            onNavigate={handleNavigate}
            onOpenCheckout={handleOpenCustomCheckout}
          />
        )}

        {currentPage === 'rentals' && (
          <ClientRentalsPage
            currency={currency}
            onNavigate={handleNavigate}
            onOpenCheckout={handleOpenCustomCheckout}
          />
        )}

        {currentPage === 'coaching' && (
          <ClientCoachingPage
            currency={currency}
            onNavigate={handleNavigate}
            onOpenCheckout={handleOpenCustomCheckout}
          />
        )}

        {currentPage === 'auctions' && (
          <ClientAuctionsPage
            currency={currency}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'legal' && (
          <LegalPage
            initialSlug={selectedLegalSlug}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'services' && (
          <ClientServicesPage
            currency={currency}
            onNavigate={handleNavigate}
            onAddToCart={handleAddToCart}
            onOpenCheckout={handleOpenCustomCheckout}
          />
        )}

        {currentPage === 'advertise' && (
          <ClientAdvertisePage
            currency={currency}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'service-product' && (
          selectedServiceProduct ? (
            <ServiceProductPage
              product={selectedServiceProduct}
              currency={currency}
              onBuyNow={() => handleNavigate('service-checkout')}
              onBack={() => handleNavigate((selectedServiceProduct.selection.backPage as ClientPage) || 'vp')}
              onNavigateHome={() => handleNavigate('home')}
            />
          ) : (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
              <p className="text-gray-400 text-sm">No product selected. Browse a service or VP pack first.</p>
              <button
                type="button"
                onClick={() => handleNavigate('vp')}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-rajdhani uppercase text-xs cursor-pointer"
              >
                Browse VP & Services
              </button>
            </div>
          )
        )}

        {currentPage === 'service-checkout' && (
          <ServiceCheckoutPage
            product={selectedServiceProduct}
            currency={currency}
            onBack={() => {
              if (!selectedServiceProduct) {
                handleNavigate('vp');
                return;
              }
              if (selectedServiceProduct.selection.category === 'profile' && selectedServiceProduct.selection.productId) {
                handleNavigate('listing', selectedServiceProduct.selection.productId);
                return;
              }
              if (selectedServiceProduct.selection.category === 'cart') {
                handleNavigate((selectedServiceProduct.selection.backPage as ClientPage) || 'profiles');
                return;
              }
              handleNavigate('service-product');
            }}
            onNavigate={handleNavigate}
            onTrackOrder={handleOpenTracking}
            onClearCart={handleClearCart}
          />
        )}

        {currentPage === 'dashboard' && (
          loading ? (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-gray-400 font-mono text-xs">Authenticating user session...</p>
            </div>
          ) : user ? (
            <UserDashboard
              currency={currency}
              onNavigate={(p, id) => handleNavigate(p as ClientPage, id)}
              onOpenCheckout={handleOpenCustomCheckout}
              onOpenTracking={handleOpenTracking}
            />
          ) : (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
              <ShieldAlert className="w-16 h-16 text-purple-400 animate-pulse" />
              <h2 className="text-2xl font-black font-rajdhani uppercase text-white tracking-wider">
                Authentication Required
              </h2>
              <p className="text-gray-400 max-w-md text-xs sm:text-sm">
                Please log in to access your persistent orders, wallet balance, and secure escrow dashboard.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-rajdhani uppercase text-xs cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('home')}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold font-rajdhani uppercase text-xs cursor-pointer"
                >
                  Return to Home
                </button>
              </div>
            </div>
          )
        )}

        {currentPage === 'admin' && (
          loading ? (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-gray-400 font-mono text-xs">Verifying staff credentials...</p>
            </div>
          ) : isStaff ? (
            <AdminDashboard
              onNavigate={(p) => handleNavigate(p as ClientPage)}
            />
          ) : (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
              <ShieldAlert className="w-16 h-16 text-rose-500 animate-pulse" />
              <h2 className="text-2xl font-black font-rajdhani uppercase text-white tracking-wider">
                Access Restricted • Staff Authorization Required
              </h2>
              <p className="text-gray-400 max-w-md text-xs sm:text-sm">
                Administrative authorization is required to access the VIB Control Console. Please authenticate with an authorized staff account.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-rajdhani uppercase text-xs cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  Staff Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('home')}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold font-rajdhani uppercase text-xs cursor-pointer"
                >
                  Return to Home
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* Client Footer */}
      <Footer onNavigate={handleNavigate} onOpenTracking={handleOpenTracking} />

      {/* Slide-over Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onProceedToCheckout={handleProceedFromCart}
        currency={currency}
      />

      {/* Live Order Tracking Modal (Persistent Escrow & Genuine VP Delivery) */}
      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => {
          setIsTrackingOpen(false);
          setTrackingOrderId('');
        }}
        orderId={trackingOrderId}
      />

      {/* Authentication Modal (Login / Sign Up / Forgot Password) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={closeAuthModal}
        onSuccess={() => {
          closeAuthModal();
        }}
      />

      {/* Escrow Middleman Modal */}
      <EscrowModal
        isOpen={isEscrowModalOpen}
        onClose={() => setIsEscrowModalOpen(false)}
      />

      {/* Statutory Cookie & DPDPA Consent Banner */}
      <CookieConsentBanner onNavigate={handleNavigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
