import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdCustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackageName: string;
  selectedPackagePrice: number;
  onAuthenticated: () => void;
}

export const AdCustomerAuthModal: React.FC<AdCustomerAuthModalProps> = ({
  isOpen,
  onClose,
  selectedPackageName,
  selectedPackagePrice,
  onAuthenticated,
}) => {
  const { refreshUser } = useAuth();
  const [mode, setMode] = useState<'register' | 'login'>('register');

  // Registration Form State (Strictly the 8 required fields)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // OTP State
  const [registerOtp, setRegisterOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Existing Customer Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginCooldown, setLoginCooldown] = useState(0);
  const [isSendingLoginOtp, setIsSendingLoginOtp] = useState(false);
  const [isVerifyingLogin, setIsVerifyingLogin] = useState(false);

  // Cooldown timers
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    if (loginCooldown > 0) {
      const timer = setTimeout(() => setLoginCooldown(loginCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [loginCooldown]);

  if (!isOpen) return null;

  // Validation Helpers
  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  const validatePhone = (val: string) => /^[6-9]\d{9}$/.test(val.trim().replace(/[\s+-]/g, '').slice(-10));
  const validatePincode = (val: string) => /^\d{6}$/.test(val.trim());

  // 1. Send Registration OTP
  const handleSendRegisterOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Please enter both your First Name and Last Name.');
      return;
    }
    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!validatePhone(phone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!city.trim() || !state.trim()) {
      setErrorMessage('Please enter your City and State.');
      return;
    }
    if (!validatePincode(pincode)) {
      setErrorMessage('Please enter a valid 6-digit Indian PIN Code.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/auth/register-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }

      setOtpSent(true);
      setCooldown(60);
      setSuccessMessage(`A 6-digit verification code was sent to ${email.trim()}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP. Please check your details.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 2. Verify Registration OTP and Complete Account Creation
  const handleVerifyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!registerOtp || registerOtp.trim().length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch('/api/auth/register-with-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          otp: registerOtp.trim(),
          phone: phone.trim().replace(/[\s+-]/g, '').slice(-10),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Please try again.');
      }

      // Save token and sync user context
      localStorage.setItem('vib_auth_token', data.token);
      localStorage.setItem('vib_user', JSON.stringify(data.user));
      await refreshUser();

      setSuccessMessage('Account verified! Proceeding to manual payment checkout…');
      setTimeout(() => {
        onAuthenticated();
      }, 300);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 3. Send Existing Customer Login OTP
  const handleSendLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateEmail(loginEmail)) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsSendingLoginOtp(true);
    try {
      const res = await fetch('/api/auth/login-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send login code.');
      }

      setLoginOtpSent(true);
      setLoginCooldown(60);
      setSuccessMessage(`Sign-in code sent to ${loginEmail.trim()}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'No account found with this email. Please create an account.');
    } finally {
      setIsSendingLoginOtp(false);
    }
  };

  // 4. Verify Login OTP
  const handleVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginOtp || loginOtp.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit sign-in code.');
      return;
    }

    setIsVerifyingLogin(true);
    try {
      const res = await fetch('/api/auth/login-with-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          otp: loginOtp.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid sign-in code.');
      }

      localStorage.setItem('vib_auth_token', data.token);
      localStorage.setItem('vib_user', JSON.stringify(data.user));
      await refreshUser();

      setSuccessMessage('Signed in successfully! Continuing to checkout…');
      setTimeout(() => {
        onAuthenticated();
      }, 300);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired sign-in code.');
    } finally {
      setIsVerifyingLogin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0c0919] border border-purple-500/40 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.25)] overflow-hidden my-8">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 relative z-10 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30 text-[10px] font-mono font-bold uppercase tracking-wider text-purple-300">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              <span>Customer Verification</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-rajdhani uppercase tracking-wide">
              {mode === 'register' ? 'Create Customer Account' : 'Sign In to Proceed'}
            </h2>
            <p className="text-xs text-gray-400">
              Selected Package:{' '}
              <strong className="text-purple-300 font-semibold">{selectedPackageName}</strong>{' '}
              ({selectedPackagePrice === 0 ? 'FREE' : `₹${selectedPackagePrice}`})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 mx-5 mt-4 rounded-xl bg-white/5 border border-white/5 text-xs font-bold font-rajdhani uppercase tracking-wider">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            New Customer (Register)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Existing Customer (Sign In)
          </button>
        </div>

        {/* Status Alerts */}
        <div className="px-5 pt-3">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: NEW CUSTOMER REGISTRATION WITH EMAIL OTP                       */}
        {/* ===================================================================== */}
        {mode === 'register' && (
          <div className="p-5 sm:p-6 space-y-4">
            {!otpSent ? (
              <form onSubmit={handleSendRegisterOtp} className="space-y-3.5">
                {/* 1 & 2: First Name and Last Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sharma"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                {/* 3: Email Address */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                    Email Address (OTP Verification) *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                {/* 5: Mobile Number */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                    Mobile Number (10 digits) *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                {/* 6 & 7: City and State */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maharashtra"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                {/* 8: PIN Code */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                    PIN Code (6 digits) *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="400001"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Email OTP…</span>
                    </>
                  ) : (
                    <>
                      <span>Send Email Verification OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Step 2: Enter 6-digit OTP */
              <form onSubmit={handleVerifyRegister} className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="text-[11px] font-mono text-gray-400 uppercase">VERIFYING EMAIL</div>
                  <div className="text-sm font-bold text-white flex items-center justify-between">
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-xs text-purple-400 hover:text-purple-300 underline font-normal cursor-pointer"
                    >
                      Change Details
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                    Enter 6-Digit Email Verification Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={registerOtp}
                    onChange={(e) => setRegisterOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-12 px-4 rounded-xl bg-white/5 border border-purple-500/40 text-center font-mono text-xl tracking-[0.5em] text-white focus:outline-none focus:border-purple-400 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Code valid for 10 minutes</span>
                  {cooldown > 0 ? (
                    <span className="font-mono text-purple-300">Resend in {cooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendRegisterOtp()}
                      className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resend OTP</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || registerOtp.length !== 6}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying &amp; Initializing Checkout…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify OTP &amp; Proceed to Payment</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: EXISTING CUSTOMER SIGN-IN VIA EMAIL OTP                         */}
        {/* ===================================================================== */}
        {mode === 'login' && (
          <div className="p-5 sm:p-6 space-y-4">
            {!loginOtpSent ? (
              <form onSubmit={handleSendLoginOtp} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                    Registered Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 pt-1">
                    We will send a one-time 6-digit sign-in code directly to your email.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSendingLoginOtp}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingLoginOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Sign-in Code…</span>
                    </>
                  ) : (
                    <>
                      <span>Send Sign-in Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyLogin} className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="text-[11px] font-mono text-gray-400 uppercase">SIGN-IN EMAIL</div>
                  <div className="text-sm font-bold text-white flex items-center justify-between">
                    <span>{loginEmail}</span>
                    <button
                      type="button"
                      onClick={() => setLoginOtpSent(false)}
                      className="text-xs text-purple-400 hover:text-purple-300 underline font-normal cursor-pointer"
                    >
                      Change Email
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-gray-400 font-semibold">
                    Enter 6-Digit Sign-in Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-12 px-4 rounded-xl bg-white/5 border border-purple-500/40 text-center font-mono text-xl tracking-[0.5em] text-white focus:outline-none focus:border-purple-400 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Code valid for 10 minutes</span>
                  {loginCooldown > 0 ? (
                    <span className="font-mono text-purple-300">Resend in {loginCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendLoginOtp()}
                      className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resend Code</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingLogin || loginOtp.length !== 6}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingLogin ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying &amp; Signing In…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sign In &amp; Continue to Payment</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer Note */}
        <div className="p-4 bg-black/40 border-t border-white/5 text-center text-[11px] text-gray-400">
          Protected by VIB 2.0 Identity &amp; Escrow Gateway. Your details are securely encrypted.
        </div>
      </div>
    </div>
  );
};
