import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  ChevronDown,
  Volume2,
  VolumeX,
  Menu,
  X,
  User,
  Sparkles,
  Flame,
  Radio,
  HelpCircle,
  MessageSquare,
  Shield,
  Zap,
  LogOut,
  Award,
  LayoutDashboard,
  Clock,
} from 'lucide-react';
import { Currency } from '../../types';
import { soundFx } from '../../utils/audio';
import { useAuth } from '../../context/AuthContext';

export type ClientPage =
  | 'home'
  | 'profiles'
  | 'listing'
  | 'vp'
  | 'vp-catalog'
  | 'services'
  | 'rankup'
  | 'rentals'
  | 'coaching'
  | 'auctions'
  | 'community'
  | 'support'
  | 'dashboard'
  | 'admin';

interface HeaderProps {
  currentPage: ClientPage;
  onNavigate: (page: ClientPage) => void;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSearch: (q: string) => void;
  onOpenTracking?: (orderId?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  currency,
  onCurrencyChange,
  cartCount,
  onOpenCart,
  onOpenAuth,
  soundEnabled,
  onToggleSound,
  onSearch,
  onOpenTracking,
}) => {
  const { user, logout, openAuthModal, isAdmin } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [closedHeaderHeight, setClosedHeaderHeight] = useState(64);
  const headerRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Measure closed header height dynamically on mount & resize
  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current && !mobileMenuOpen) {
        setClosedHeaderHeight(headerRef.current.offsetHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [mobileMenuOpen]);

  // Direction-aware auto-hiding scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY || document.documentElement.scrollTop;
          const delta = currentScrollY - lastScrollY.current;

          // If mobile drawer is open, keep header visible
          if (mobileMenuOpen) {
            setIsHeaderVisible(true);
            lastScrollY.current = Math.max(0, currentScrollY);
            ticking.current = false;
            return;
          }

          // Top of page: always visible
          if (currentScrollY <= 40) {
            setIsHeaderVisible(true);
          }
          // Scrolled down beyond threshold (> 12px downward movement past 60px): smoothly hide
          else if (delta > 12 && currentScrollY > 60) {
            setIsHeaderVisible(false);
          }
          // Scrolled up beyond threshold (> 10px upward movement anywhere on page): smoothly show
          else if (delta < -10) {
            setIsHeaderVisible(true);
          }

          lastScrollY.current = Math.max(0, currentScrollY);
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNav = (p: ClientPage) => {
    soundFx.playClickSound();
    onNavigate(p);
    setMobileMenuOpen(false);
    setMoreOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
      onNavigate('profiles');
      setMobileMenuOpen(false);
    }
  };

  const cycleCurrency = () => {
    soundFx.playClickSound();
    const cycleMap: Record<Currency, Currency> = { INR: 'USD', USD: 'EUR', EUR: 'INR' };
    onCurrencyChange(cycleMap[currency]);
  };

  return (
    <>
      <header
        ref={headerRef}
        aria-hidden={!isHeaderVisible}
        className={`fixed top-0 left-0 right-0 z-50 w-full bg-[#07070d]/95 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 lg:px-8 py-2.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
          isHeaderVisible ? 'translate-y-0 shadow-lg' : '-translate-y-full pointer-events-none'
        }`}
      >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand & Navigation Links grouped together */}
        <div className="flex items-center gap-3 sm:gap-4 xl:gap-6">
          {/* Hamburger & Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-fuchsia-400" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* 3D Metallic VIB Logo */}
            <div
              onClick={() => handleNav('home')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNav('home')}
              role="button"
              tabIndex={0}
              aria-label="VIB Home"
              className="flex items-center gap-2.5 cursor-pointer group select-none flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg p-1"
            >
              <div className="relative flex items-center justify-center h-8 sm:h-9">
                <div className="absolute inset-0 bg-purple-600/30 blur-md rounded-full pointer-events-none scale-125" />
                <img
                  src="/assets/hires/vib_logo_metallic_hires.png"
                  alt="VIB Logo"
                  className="h-8 sm:h-9 w-auto object-contain relative z-10 drop-shadow-[0_0_12px_rgba(168,85,247,0.7)] group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/client/vib-logo.png';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Navigation Links positioned close to the logo */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-[12.5px] font-medium text-gray-300">
            <button
              type="button"
              onClick={() => handleNav('home')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                currentPage === 'home'
                  ? 'bg-[#8a2be2]/30 text-white font-semibold border border-[#9333ea]/50 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                  : 'hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => handleNav('profiles')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                currentPage === 'profiles'
                  ? 'bg-[#8a2be2]/30 text-white font-semibold border border-[#9333ea]/50 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                  : 'hover:text-white hover:bg-white/5'
              }`}
            >
              Profiles
            </button>

            <button
              type="button"
              onClick={() => handleNav('vp')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                currentPage === 'vp' || currentPage === 'vp-catalog'
                  ? 'bg-[#8a2be2]/30 text-white font-semibold border border-[#9333ea]/50 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                  : 'hover:text-white hover:bg-white/5'
              }`}
            >
              VP Packs
            </button>

            <button
              type="button"
              onClick={() => handleNav('rankup')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                currentPage === 'rankup'
                  ? 'bg-[#8a2be2]/30 text-white font-semibold border border-[#9333ea]/50 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                  : 'hover:text-white hover:bg-white/5'
              }`}
            >
              Rankup
            </button>

            <button
              type="button"
              onClick={() => handleNav('rentals')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                currentPage === 'rentals'
                  ? 'bg-[#8a2be2]/30 text-white font-semibold border border-[#9333ea]/50 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                  : 'hover:text-white hover:bg-white/5'
              }`}
            >
              Rentals
            </button>

            <button
              type="button"
              onClick={() => handleNav('coaching')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                currentPage === 'coaching'
                  ? 'bg-[#8a2be2]/30 text-white font-semibold border border-[#9333ea]/50 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                  : 'hover:text-white hover:bg-white/5'
              }`}
            >
              Coaching
            </button>

            <button
              type="button"
              onClick={() => handleNav('auctions')}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                currentPage === 'auctions'
                  ? 'bg-gradient-to-r from-fuchsia-600/30 to-pink-600/30 text-white font-semibold border border-fuchsia-500/50 shadow-[0_0_10px_rgba(217,70,239,0.4)]'
                  : 'hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>Auctions</span>
            </button>

            {/* More Services Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((prev) => !prev)}
                aria-expanded={moreOpen}
                aria-haspopup="true"
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                  currentPage === 'services' || moreOpen
                    ? 'bg-[#8a2be2]/30 text-white font-semibold border border-[#9333ea]/50'
                    : 'hover:text-white hover:bg-white/5'
                }`}
              >
                <span>More</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180 text-fuchsia-400' : ''}`} />
              </button>

              {moreOpen && (
                <div
                  role="menu"
                  className="absolute top-full left-0 mt-2 w-56 rounded-2xl bg-[#0c0d18] border border-fuchsia-500/30 p-2 shadow-2xl backdrop-blur-xl z-50 space-y-1"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNav('services')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 text-xs text-gray-200 hover:text-fuchsia-300 transition-colors flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    <span className="font-bold">All Services</span>
                    <span className="text-[10px] text-gray-400">Complete VIB ecosystem overview</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNav('community')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 text-xs text-gray-200 hover:text-fuchsia-300 transition-colors flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    <span className="font-bold">Community Discord</span>
                    <span className="text-[10px] text-gray-400">Join 50,000+ members</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreOpen(false);
                      if (onOpenTracking) onOpenTracking();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 text-xs text-gray-200 hover:text-emerald-300 transition-colors flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Track Live Order</span>
                    </span>
                    <span className="text-[10px] text-gray-400">Lookup escrow order PINs &amp; status</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNav('support')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 text-xs text-gray-200 hover:text-fuchsia-300 transition-colors flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    <span className="font-bold">Dedicated Support</span>
                    <span className="text-[10px] text-gray-400">24/7 executive assistance</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right Controls: Search, Sound, Currency, Cart, Login, Sign Up */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Glass Search Input */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center relative rounded-full border border-white/15 bg-black/40 hover:border-white/25 focus-within:border-purple-500/80 focus-within:shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all w-44 xl:w-56"
          >
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search profiles, VP..."
              aria-label="Search profiles and services"
              className="w-full pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 bg-transparent focus:outline-none"
            />
          </form>

          {/* Sound FX Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            title={soundEnabled ? 'SFX: On (click to mute)' : 'SFX: Off (click to enable)'}
            className="hidden sm:flex min-w-[44px] min-h-[44px] items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-fuchsia-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* Currency Switcher */}
          <button
            type="button"
            onClick={cycleCurrency}
            aria-label={`Currency: ${currency}. Click to switch.`}
            title="Switch Currency (INR / USD / EUR)"
            className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 hover:border-purple-500/40 text-gray-200 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 flex items-center justify-center gap-1.5 text-xs font-mono font-bold"
          >
            <span className="text-purple-400 font-extrabold text-sm">
              {currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '€'}
            </span>
            <span>{currency}</span>
          </button>

          {/* Shopping Cart Button */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Shopping cart, ${cartCount} items`}
            className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-300 hover:text-white transition-all hover:bg-white/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 group"
          >
            <ShoppingCart className="w-4 h-4 text-gray-300 group-hover:text-purple-300 transition-colors" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full bg-purple-600 text-white shadow-[0_0_8px_#9333ea] px-1 animate-in zoom-in-75">
                {cartCount}
              </span>
            )}
          </button>

          {/* User Authenticated Controls vs Login/Sign Up */}
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNav('admin')}
                  className={`min-h-[44px] text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                    currentPage === 'admin'
                      ? 'bg-amber-600 text-white border-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.5)]'
                      : 'border-amber-500/30 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Admin Console</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleNav('dashboard')}
                className={`min-h-[44px] text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-2 ${
                  currentPage === 'dashboard'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.5)]'
                    : 'border-purple-500/30 bg-[#120f26] text-purple-200 hover:bg-purple-950/70 hover:border-purple-500/60'
                }`}
              >
                <div className="w-5 h-5 rounded-full overflow-hidden border border-purple-400/40 flex-shrink-0">
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span>{user.name.split(' ')[0]}</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-900/80 text-purple-300 uppercase">
                  {user.role}
                </span>
              </button>

              <button
                type="button"
                onClick={logout}
                aria-label="Logout"
                title="Logout"
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Login Button */}
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="min-h-[44px] text-xs font-semibold px-4 py-2 rounded-lg border border-white/15 bg-[#121020] hover:bg-[#1a172e] hover:border-white/25 text-gray-200 transition-colors cursor-pointer hidden sm:flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                Login
              </button>

              {/* Sign Up Button (solid purple pill matching reference) */}
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                className="min-h-[44px] text-xs font-bold px-4 py-2 rounded-lg text-white bg-[#8b5cf6] hover:bg-[#7c3aed] shadow-[0_0_15px_rgba(139,92,246,0.45)] transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
              >
                <span>Sign Up</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          role="navigation"
          aria-label="Mobile Navigation"
          className="lg:hidden mt-3 pt-3 border-t border-white/10 space-y-3 pb-3 max-h-[calc(100dvh-75px)] overflow-y-auto pr-1 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Mobile Search Bar - text-base prevents iOS Safari auto-zoom */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search profiles, VP, coaching..."
              aria-label="Search profiles and services"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-base sm:text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            />
          </form>

          {/* Navigation Grid (all items, 44px min height touch target) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleNav('home')}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                currentPage === 'home'
                  ? 'bg-purple-600/30 text-white font-bold border border-purple-500/40'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('profiles')}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                currentPage === 'profiles'
                  ? 'bg-purple-600/30 text-white font-bold border border-purple-500/40'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>Profiles</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('vp')}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                currentPage === 'vp' || currentPage === 'vp-catalog'
                  ? 'bg-purple-600/30 text-white font-bold border border-purple-500/40'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>VP Packs</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('rankup')}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                currentPage === 'rankup'
                  ? 'bg-purple-600/30 text-white font-bold border border-purple-500/40'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Rankup</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('rentals')}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                currentPage === 'rentals'
                  ? 'bg-purple-600/30 text-white font-bold border border-purple-500/40'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>Rentals</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('coaching')}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                currentPage === 'coaching'
                  ? 'bg-purple-600/30 text-white font-bold border border-purple-500/40'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>Coaching</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('auctions')}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer col-span-2 ${
                currentPage === 'auctions'
                  ? 'bg-gradient-to-r from-fuchsia-600/30 to-pink-600/30 text-white font-bold border border-fuchsia-500/40'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Radio className="w-4 h-4 text-red-500 animate-pulse flex-shrink-0" />
              <span>Live Auctions & Mystery Boxes</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('services')}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                currentPage === 'services'
                  ? 'bg-purple-600/30 text-white font-bold border border-purple-500/40'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span>All Services</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('community')}
              className="min-h-[44px] px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center gap-2 text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>Discord</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenTracking) onOpenTracking();
              }}
              className="min-h-[44px] px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center gap-2 text-emerald-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer col-span-2 border border-emerald-500/20 bg-emerald-950/20"
            >
              <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Track Live Order &amp; Code Delivery</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('support')}
              className="min-h-[44px] px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center gap-2 text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer col-span-2"
            >
              <HelpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Support & MSME Verification</span>
            </button>
          </div>

          {/* Mobile Auth & Settings Footer */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleSound}
                className="min-h-[44px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white flex items-center gap-1.5"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4 text-fuchsia-400" />
                    <span>SFX On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-gray-500" />
                    <span>SFX Off</span>
                  </>
                )}
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleNav('admin')}
                    className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-bold font-rajdhani uppercase"
                  >
                    Admin
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleNav('dashboard')}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs font-bold font-rajdhani uppercase flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-rose-300 text-xs font-bold font-rajdhani uppercase"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('login');
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-white/5 border border-white/15 text-xs font-semibold text-gray-200"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('signup');
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-[#8b5cf6] text-xs font-bold text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
    {/* Flow spacer so page content never jumps or shifts during auto-hide transitions */}
    <div
      style={{ height: closedHeaderHeight }}
      aria-hidden="true"
      className="w-full flex-shrink-0 pointer-events-none"
    />
  </>
  );
};