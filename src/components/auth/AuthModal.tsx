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
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { verifyRiotIdOnServer, RiotVerificationResponse } from '../../lib/riot';

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
  const { login, register, loginWithGoogle, resetPassword, error: authContextError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [riotId, setRiotId] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(true);
  const [riotVerification, setRiotVerification] = useState<RiotVerificationResponse | null>(null);
  const [isVerifyingRiot, setIsVerifyingRiot] = useState(false);

  // Debounced Riot ID verification on registration
  useEffect(() => {
    if (!isOpen || mode !== 'signup' || !riotId.trim()) {
      setRiotVerification(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsVerifyingRiot(true);
      const res = await verifyRiotIdOnServer(riotId.trim());
      setIsVerifyingRiot(false);
      setRiotVerification(res);
    }, 450);

    return () => clearTimeout(timer);
  }, [riotId, isOpen, mode]);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // UI status
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setLoading(true);
    const result = await loginWithGoogle();
    setLoading(false);
    if (result.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else if (result.error) {
      setLocalError(result.error);
    }
  };

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

    // Verify Riot ID if supplied
    if (riotId.trim()) {
      setIsVerifyingRiot(true);
      const check = await verifyRiotIdOnServer(riotId.trim());
      setIsVerifyingRiot(false);
      setRiotVerification(check);
      if (!check.exists) {
        setLocalError(check.error || 'The provided Riot ID is not a legitimate Valorant account. Please check your username and tag.');
        return;
      }
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
    const result = await resetPassword(email.trim().toLowerCase());
    setLoading(false);
    if (result.success) {
      setSuccessMessage(result.message || 'Password reset instructions have been dispatched.');
    } else {
      setLocalError(result.error || 'Network error requesting password reset.');
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
          <div className="space-y-4 relative z-10">
            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs font-rajdhani tracking-wider transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>CONTINUE WITH GOOGLE</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-mono uppercase text-gray-400 tracking-widest font-semibold">
                OR SIGN IN WITH EMAIL
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
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
          </form>
        </div>
      )}

        {/* ============================================================== */}
        {/* VIEW 2: REGISTRATION                                          */}
        {/* ============================================================== */}
        {mode === 'signup' && (
          <div className="space-y-4 relative z-10 max-h-[75vh] overflow-y-auto pr-1">
            {/* Google Sign Up Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs font-rajdhani tracking-wider transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>SIGN UP INSTANTLY WITH GOOGLE</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-mono uppercase text-gray-400 tracking-widest font-semibold">
                OR REGISTER WITH EMAIL
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold tracking-wider">
                    Riot ID &amp; Tag
                  </label>
                  {isVerifyingRiot && (
                    <span className="text-[10px] text-purple-400 font-mono flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Checking...
                    </span>
                  )}
                  {riotVerification?.exists && (
                    <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={riotId}
                  onChange={(e) => setRiotId(e.target.value)}
                  placeholder="ValorantPlayer#1234"
                  className={`w-full px-3.5 py-2 rounded-xl bg-[#141224] border text-white text-sm focus:outline-none transition-colors ${
                    riotVerification?.exists
                      ? 'border-emerald-500/60 focus:border-emerald-400'
                      : riotVerification?.exists === false
                      ? 'border-rose-500/60 focus:border-rose-400'
                      : 'border-white/10 focus:border-purple-500'
                  }`}
                />
                {riotVerification?.exists === false && (
                  <span className="text-[10px] text-rose-400 block leading-tight font-mono">
                    {riotVerification.error || 'Invalid or non-existent Riot ID'}
                  </span>
                )}
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
        </div>
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
