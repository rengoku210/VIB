import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup' | 'forgot';
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}) => {
  const { login, register, error: authContextError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [riotId, setRiotId] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(true);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // UI status
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync mode when initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
    setLocalError(null);
    setSuccessMessage(null);
  }, [initialMode, isOpen]);

  // Lock body scroll and Escape key close
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle Sign In submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setLocalError(result.error || 'Authentication failed. Please verify credentials.');
    }
  };

  // Handle Registration submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please provide a valid email address.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must contain at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }
    if (!termsAgreed) {
      setLocalError('You must acknowledge the VIB Marketplace Escrow & Platform Terms.');
      return;
    }

    setLoading(true);
    const result = await register({
      name: name.trim(),
      email: email.trim(),
      password,
      phone: phone.trim() || undefined,
      riot_id: riotId.trim() || undefined,
    });
    setLoading(false);

    if (result.success) {
      setSuccessMessage('Welcome! Your verified account has been created.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } else {
      setLocalError(result.error || 'Registration failed.');
    }
  };

  // Handle Password Recovery request
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email) {
      setLocalError('Please enter your account email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setLoading(false);
      setSuccessMessage(data.message || 'Password reset token dispatched.');
    } catch {
      setLoading(false);
      setLocalError('Network error requesting password reset.');
    }
  };

  // Quick fill demo helper for immediate verification
  const fillDemoAccount = (role: 'superadmin' | 'moderator' | 'seller' | 'customer') => {
    setMode('login');
    setLocalError(null);
    if (role === 'superadmin') {
      setEmail('admin@vib.gg');
      setPassword('AdminPassword@123');
    } else if (role === 'moderator') {
      setEmail('moderator@vib.gg');
      setPassword('Moderator@123');
    } else if (role === 'seller') {
      setEmail('seller@vib.gg');
      setPassword('SellerPassword@123');
    } else {
      setEmail('customer@vib.gg');
      setPassword('CustomerPassword@123');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-lg rounded-2xl bg-[#0b0c16] border border-purple-500/30 p-6 sm:p-8 shadow-[0_0_50px_rgba(147,51,234,0.35)] overflow-hidden"
      >
        {/* Glow ambient decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 id="auth-modal-title" className="text-xl sm:text-2xl font-black font-rajdhani text-white uppercase tracking-wider">
              {mode === 'login' && 'ACCESS ACCOUNT PORTAL'}
              {mode === 'signup' && 'CREATE VIB ACCOUNT'}
              {mode === 'forgot' && 'PASSWORD RECOVERY'}
            </h2>
            <p className="text-xs text-gray-400 font-sans">
              {mode === 'login' && 'Sign in to access your orders, rank journeys, and dashboard'}
              {mode === 'signup' && 'Join 50,000+ verified players on the secure VIB marketplace'}
              {mode === 'forgot' && 'Reset your password with your verified email address'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl mb-6 relative z-10 border border-white/5">
          <button
            type="button"
            onClick={() => { setMode('login'); setLocalError(null); }}
            className={`py-2 rounded-lg font-bold text-xs font-rajdhani uppercase tracking-wider transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setLocalError(null); }}
            className={`py-2 rounded-lg font-bold text-xs font-rajdhani uppercase tracking-wider transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error / Success Notifications */}
        {(localError || authContextError) && (
          <div role="alert" className="mb-4 p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{localError || authContextError}</span>
          </div>
        )}

        {successMessage && (
          <div role="status" className="mb-4 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 1: LOGIN                                                 */}
        {/* ============================================================== */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-gray-300 font-semibold tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black font-rajdhani text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating Credentials...</span>
              ) : (
                <>
                  <span>Sign In To Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick Demo Accounts Helper */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 text-center">
                Instant One-Click Demo Credentials
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-rajdhani">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('superadmin')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-900/40 border border-purple-500/20 text-purple-300 font-bold transition-all text-center"
                >
                  Super Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('moderator')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-900/40 border border-purple-500/20 text-purple-300 font-bold transition-all text-center"
                >
                  Staff Mod
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('seller')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-900/40 border border-purple-500/20 text-purple-300 font-bold transition-all text-center"
                >
                  Verified Seller
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('customer')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-900/40 border border-purple-500/20 text-purple-300 font-bold transition-all text-center"
                >
                  Customer User
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: REGISTRATION                                          */}
        {/* ============================================================== */}
        {mode === 'signup' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 relative z-10 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <label className="text-xs font-mono uppercase text-gray-300 font-semibold tracking-wider">
                Full Name / In-Game Alias *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#141224] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono uppercase text-gray-300 font-semibold tracking-wider">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#141224] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold tracking-wider">
                  Riot ID &amp; Tag
                </label>
                <input
                  type="text"
                  value={riotId}
                  onChange={(e) => setRiotId(e.target.value)}
                  placeholder="ValorantPlayer#1234"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141224] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold tracking-wider">
                  WhatsApp / Phone
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 99999 99999"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#141224] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold tracking-wider">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#141224] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold tracking-wider">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#141224] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-start gap-2.5 pt-1 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="accent-purple-500 rounded mt-0.5"
              />
              <span>
                I agree to the <span className="text-purple-300 font-semibold">VIB Platform Escrow Terms</span> and acknowledge that orders are verified and protected through official middleman security.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-3 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black font-rajdhani text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Registering Account &amp; Provisioning Profile...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>Create Free Account</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: FORGOT PASSWORD                                       */}
        {/* ============================================================== */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4 relative z-10">
            <p className="text-xs text-gray-300 leading-relaxed">
              Enter your registered email address and we will generate a secure verification recovery token to restore your account access.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-gray-300 font-semibold tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141224] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black font-rajdhani text-sm uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Sending Recovery Code...' : 'Send Recovery Code'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-purple-400 hover:text-purple-300 underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
