import React, { useState, useEffect } from 'react';
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
import { UserDashboard } from './components/dashboard/UserDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackingModal } from './components/orders/OrderTrackingModal';
import { DiscordModal } from './components/home/DiscordModal';
import { EscrowModal } from './components/home/EscrowModal';
import { ListingDetailPage } from './components/profiles/ListingDetailPage';
import { VP_PACKAGES } from './data/packages';
import { Currency, CartItem, VPPackage } from './types';
import { soundFx } from './utils/audio';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, isAdmin, isAuthModalOpen, authModalMode, openAuthModal, closeAuthModal } = useAuth();

  const getInitialPage = (): ClientPage => {
    try {
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
          'rankup',
          'rentals',
          'coaching',
          'auctions',
          'dashboard',
          'admin',
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

  const [currentPage, setCurrentPage] = useState<ClientPage>(getInitialPage);
  const [selectedListingId, setSelectedListingId] = useState<string>(getInitialListingId);
  const [currency, setCurrency] = useState<Currency>('INR');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle URL history state & back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const p = (params.get('page') as ClientPage) || 'home';
      if (
        [
          'home',
          'profiles',
          'listing',
          'vp',
          'vp-catalog',
          'services',
          'rankup',
          'rentals',
          'coaching',
          'auctions',
          'dashboard',
          'admin',
        ].includes(p)
      ) {
        setCurrentPage(p);
        if (p === 'listing') {
          setSelectedListingId(params.get('id') || '');
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

  // Protected route enforcement on auth state changes
  useEffect(() => {
    if (currentPage === 'admin' && user && !isAdmin) {
      setCurrentPage('dashboard');
    }
    if ((currentPage === 'dashboard' || currentPage === 'admin') && !user) {
      // If user logs out while on protected route, return to home
      setCurrentPage('home');
    }
  }, [user, isAdmin, currentPage]);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutPackage, setCheckoutPackage] = useState<VPPackage | null>(null);
  const [checkoutCustomItem, setCheckoutCustomItem] = useState<
    { title: string; priceINR: number; productId?: string; id?: string } | undefined
  >(undefined);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false);
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState('');

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

  const handleOpenCustomCheckout = (title: string, price: number, productId?: string) => {
    setCheckoutCustomItem({ title, priceINR: price, id: productId, productId });
    const matchedPkg = VP_PACKAGES.find(
      (p) => p.id === productId || p.vpLabel === title || title.includes(p.vpLabel)
    );
    setCheckoutPackage(matchedPkg || null);
    setIsCheckoutOpen(true);
  };

  const handleProceedFromCart = () => {
    if (cartItems.length === 0) return;
    const totalINR = cartItems.reduce((sum, item) => sum + item.priceINR * item.quantity, 0);
    const itemNames = cartItems.map((i) => `${i.title} (x${i.quantity})`).join(', ');
    setIsCartOpen(false);
    const singleProductId = cartItems.length === 1 && cartItems[0].quantity === 1 ? cartItems[0].id : undefined;
    handleOpenCustomCheckout(`Cart Checkout: ${itemNames}`, totalINR, singleProductId);
  };

  const handleNavigate = (page: ClientPage, id?: string) => {
    soundFx.playClickSound();

    if (page === 'community' || page === 'support') {
      setIsDiscordModalOpen(true);
      return;
    }

    // Role-based route guard: Dashboard requires authenticated session
    if (page === 'dashboard' && !user) {
      openAuthModal('login');
      return;
    }

    // Role-based route guard: Admin Console requires admin/superadmin role
    if (page === 'admin') {
      if (!user) {
        openAuthModal('login');
        return;
      }
      if (!isAdmin) {
        alert('Access Restricted: Administrative privileges required.');
        return;
      }
    }

    if (page === 'listing' && id) {
      setSelectedListingId(id);
    }

    setCurrentPage(page);
    try {
      const url = new URL(window.location.href);
      if (page === 'home') {
        url.searchParams.delete('page');
        url.searchParams.delete('id');
      } else {
        url.searchParams.set('page', page);
        if (page === 'listing' && id) {
          url.searchParams.set('id', id);
        } else if (page !== 'listing') {
          url.searchParams.delete('id');
        }
      }
      window.history.pushState({ page, id }, '', url.toString());
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            onOpenCheckout={handleOpenCustomCheckout}
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

        {currentPage === 'dashboard' && (
          <UserDashboard
            currency={currency}
            onNavigate={(p) => handleNavigate(p as ClientPage)}
            onOpenCheckout={handleOpenCustomCheckout}
            onOpenTracking={handleOpenTracking}
          />
        )}

        {currentPage === 'admin' && (
          <AdminDashboard
            onNavigate={(p) => handleNavigate(p as ClientPage)}
          />
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

      {/* Checkout / Payment Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setCheckoutCustomItem(undefined);
          setCheckoutPackage(null);
        }}
        pkg={checkoutPackage || undefined}
        customItem={checkoutCustomItem}
        currency={currency}
        onTrackOrder={handleOpenTracking}
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

      {/* Community Discord Modal */}
      <DiscordModal
        isOpen={isDiscordModalOpen}
        onClose={() => setIsDiscordModalOpen(false)}
      />

      {/* Escrow Middleman Modal */}
      <EscrowModal
        isOpen={isEscrowModalOpen}
        onClose={() => setIsEscrowModalOpen(false)}
      />
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