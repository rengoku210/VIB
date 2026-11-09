import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CreditCard,
  ShieldCheck,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Download,
  Upload,
  User,
  MapPin,
  Phone,
  Mail,
  Lock,
  Eye,
  Loader2,
  Flag,
} from 'lucide-react';
import { formatCurrencyPrice } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export interface FlexiblePlanContext {
  serviceType: 'vp' | 'account';
  region?: 'in' | 'php';
  listing?: {
    id: string;
    title: string;
    price_inr: number;
    rank?: string;
    level?: number;
    guarantee_type?: string;
  };
  package?: {
    id: string;
    name: string;
    vpAmount: number;
    priceINR: number;
    region?: 'in' | 'php';
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  context?: FlexiblePlanContext;
  onNavigateToDashboard?: () => void;
}

type Step = 'select' | 'terms' | 'kyc' | 'agreement' | 'success';

interface PlanOption {
  id: string;
  name: string;
  frequency: 'weekly' | 'monthly';
  duration: number; // in weeks or months
  installmentAmount: number;
  downPayment: number;
  balance: number;
  totalPayable: number;
  fixedProfit?: number;
  slabName?: string;
}

const PRIMARY_DOC_TYPES = ['Aadhaar Card', 'Passport', 'Voter ID', 'Driving License'];
const SECONDARY_DOC_TYPES = ['PAN Card', 'Bank Statement', 'Utility Bill', 'Student ID Card'];

export const FlexiblePaymentPlanModal: React.FC<Props> = ({
  isOpen,
  onClose,
  context,
  onNavigateToDashboard,
}) => {
  const { user, openAuthModal } = useAuth();

  const [step, setStep] = useState<Step>('select');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Region and Service
  const [serviceType, setServiceType] = useState<'vp' | 'account'>('vp');
  const [region, setRegion] = useState<'in' | 'php'>('in');

  // Backend settings & packages
  const [vpPackages, setVpPackages] = useState<any[]>([]);
  const [selectedVpPackId, setSelectedVpPackId] = useState<string>('');
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);

  // Terms agreement checkbox
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Customer KYC Information
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');

  // Under 18 guardian information
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  // Identity document types & files
  const [primaryDocType, setPrimaryDocType] = useState('Aadhaar Card');
  const [secondaryDocType, setSecondaryDocType] = useState('PAN Card');
  const [primaryDocFront, setPrimaryDocFront] = useState<string | null>(null);
  const [primaryDocBack, setPrimaryDocBack] = useState<string | null>(null);
  const [secondaryDocFront, setSecondaryDocFront] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Submission result
  const [submittedRef, setSubmittedRef] = useState<string>('');
  const [generatedAgreementHtml, setGeneratedAgreementHtml] = useState<string>('');

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Sync context when opened
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setStep('select');
    setTermsAccepted(false);

    if (context) {
      setServiceType(context.serviceType);
      if (context.region) setRegion(context.region);
    }

    if (user) {
      if (user.name) setFullName(user.name);
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
    }

    fetchPlans();
  }, [isOpen, context, user]);

  // Fetch plan settings and calculate
  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const type = context?.serviceType || 'vp';
      const reg = context?.region || 'in';

      if (type === 'vp') {
        const res = await fetch('/api/emi/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceType: 'vp', region: reg }),
        });
        const data = await res.json();
        if (data.packages && data.packages.length > 0) {
          setVpPackages(data.packages);
          const defaultPack = data.packages[0];
          setSelectedVpPackId(defaultPack.id);
          setAvailablePlans(defaultPack.plans);
          setSelectedPlan(defaultPack.plans[0]);
        }
      } else {
        const price = context?.listing?.price_inr || 5000;
        const res = await fetch('/api/emi/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceType: 'account', priceINR: price }),
        });
        const data = await res.json();
        if (data.plans && data.plans.length > 0) {
          const plans: PlanOption[] = data.plans.map((p: any) => ({
            id: p.id,
            name: p.name,
            frequency: p.frequency,
            duration: p.installments,
            installmentAmount: p.installmentAmount,
            downPayment: p.downPaymentAmount,
            balance: p.principalBalance,
            totalPayable: p.totalPayable,
            fixedProfit: p.fixedProfit,
            slabName: p.slabName,
          }));
          setAvailablePlans(plans);
          setSelectedPlan(plans[0]);
        }
      }
    } catch (e: any) {
      setError('Unable to load flexible payment plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Switch VP package
  const handleSelectVpPack = (packId: string) => {
    setSelectedVpPackId(packId);
    const pack = vpPackages.find((p) => p.id === packId);
    if (pack) {
      setAvailablePlans(pack.plans);
      setSelectedPlan(pack.plans[0]);
    }
  };

  // Switch VP region
  const handleSwitchVpRegion = (newReg: 'in' | 'php') => {
    setRegion(newReg);
    fetch('/api/emi/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceType: 'vp', region: newReg }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.packages && data.packages.length > 0) {
          setVpPackages(data.packages);
          setSelectedVpPackId(data.packages[0].id);
          setAvailablePlans(data.packages[0].plans);
          setSelectedPlan(data.packages[0].plans[0]);
        }
      })
      .catch(() => {});
  };

  // File to base64 helper with 5MB validation
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Selected file exceeds the maximum 5MB size limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setter(String(reader.result));
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // Canvas signature
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  // Primary vs Secondary doc duplicate check
  const handlePrimaryDocChange = (val: string) => {
    setPrimaryDocType(val);
    if (val === secondaryDocType) {
      const alt = SECONDARY_DOC_TYPES.find((d) => d !== val) || 'PAN Card';
      setSecondaryDocType(alt);
    }
  };

  const handleSecondaryDocChange = (val: string) => {
    if (val === primaryDocType) {
      setError('Primary and Secondary identity documents cannot be the same document type.');
      return;
    }
    setError(null);
    setSecondaryDocType(val);
  };

  // Step 2 validation
  const handleProceedFromTerms = () => {
    if (!termsAccepted) {
      setError('Please acknowledge and accept the terms and conditions to proceed.');
      return;
    }
    if (!user) {
      openAuthModal('login');
      return;
    }
    setError(null);
    setStep('kyc');
  };

  // Step 3 validation & agreement preview
  const handleProceedFromKyc = () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !address.trim() || !city.trim() || !stateName.trim()) {
      setError('Please fill out all required customer information fields.');
      return;
    }
    if (primaryDocType === secondaryDocType) {
      setError('Primary and secondary documents must be distinct document types.');
      return;
    }
    if (!primaryDocFront) {
      setError('Please upload the front image of your primary identity document.');
      return;
    }
    if (!signatureData) {
      setError('Please provide your electronic signature to proceed.');
      return;
    }

    setError(null);
    setStep('agreement');
  };

  // Final submit application
  const handleSubmitApplication = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    setError(null);

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('vib_auth_token') : null;
    const isVP = serviceType === 'vp';
    const currentPack = isVP ? vpPackages.find((p) => p.id === selectedVpPackId) : null;

    const serviceTitle = isVP
      ? currentPack?.name || 'Valorant Points Top-Up'
      : context?.listing?.title || 'Valorant Profile Listing';

    const serviceCost = isVP ? currentPack?.priceINR || 0 : context?.listing?.price_inr || 0;

    const payload = {
      productTitle: serviceTitle,
      totalAmount: serviceCost,
      initialPayment: selectedPlan.downPayment,
      tenureMonths: selectedPlan.duration,
      serviceType,
      region: isVP ? region : undefined,
      listingId: !isVP ? context?.listing?.id : undefined,
      planType: selectedPlan.name,
      paymentFrequency: selectedPlan.frequency,
      fixedProfit: selectedPlan.fixedProfit || 0,
      totalPayable: selectedPlan.totalPayable,
      emiAmount: selectedPlan.installmentAmount,
      customerSignature: signatureData,
      customerDetails: {
        fullName,
        dob,
        phone,
        email,
        address,
        city,
        state: stateName,
        pincode,
        country: 'India',
        guardianName: isMinor ? guardianName : undefined,
        guardianRelation: isMinor ? guardianRelation : undefined,
      },
    };

    try {
      const res = await fetch('/api/emi/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application.');
      }

      setSubmittedRef(data.application?.agreementRef || data.application?.id || 'VIB-FPP-2026');
      setStep('success');
    } catch (e: any) {
      setError(e.message || 'An error occurred while submitting your application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fpp-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-[#0c0a1a] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-purple-950/40 via-[#100b24] to-[#0c0a1a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-md flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="fpp-title" className="font-black text-base sm:text-lg text-white font-rajdhani tracking-wide">
                  VIB FLEXIBLE PAYMENT PLANS
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase">
                  {serviceType === 'vp' ? `${region === 'php' ? 'PHP' : 'IN'} VP Plans` : 'Account Plans'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Transparent installments • Verified Escrow Guarantee • Low Initial Payment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="px-5 py-2.5 bg-black/40 border-b border-white/5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar w-full">
            <span className={`flex items-center gap-1.5 ${step === 'select' ? 'text-purple-400 font-bold' : 'text-gray-400'}`}>
              <span className="w-5 h-5 rounded-full bg-purple-900/60 border border-purple-500/50 flex items-center justify-center text-[10px]">1</span>
              <span>Select Plan</span>
            </span>
            <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <span className={`flex items-center gap-1.5 ${step === 'terms' ? 'text-purple-400 font-bold' : 'text-gray-400'}`}>
              <span className="w-5 h-5 rounded-full bg-purple-900/60 border border-purple-500/50 flex items-center justify-center text-[10px]">2</span>
              <span>Terms &amp; Notice</span>
            </span>
            <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <span className={`flex items-center gap-1.5 ${step === 'kyc' ? 'text-purple-400 font-bold' : 'text-gray-400'}`}>
              <span className="w-5 h-5 rounded-full bg-purple-900/60 border border-purple-500/50 flex items-center justify-center text-[10px]">3</span>
              <span>KYC &amp; E-Sign</span>
            </span>
            <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <span className={`flex items-center gap-1.5 ${step === 'agreement' ? 'text-purple-400 font-bold' : 'text-gray-400'}`}>
              <span className="w-5 h-5 rounded-full bg-purple-900/60 border border-purple-500/50 flex items-center justify-center text-[10px]">4</span>
              <span>Agreement</span>
            </span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: SELECT PLAN & CALCULATE */}
          {step === 'select' && (
            <div className="space-y-6">
              {/* If VP: Package & Region Switcher */}
              {serviceType === 'vp' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-gray-300 font-bold">
                      Select Regional VP Package
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSwitchVpRegion('in')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold font-rajdhani transition-all cursor-pointer flex items-center gap-1.5 ${
                          region === 'in'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Flag className="w-3.5 h-3.5 text-amber-400" />
                        <span>Indian VP</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchVpRegion('php')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold font-rajdhani transition-all cursor-pointer flex items-center gap-1.5 ${
                          region === 'php'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Flag className="w-3.5 h-3.5 text-sky-400" />
                        <span>Philippines VP</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {vpPackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => handleSelectVpPack(pkg.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          selectedVpPackId === pkg.id
                            ? 'bg-purple-950/50 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                            : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="font-extrabold text-sm text-white font-rajdhani">{pkg.vpAmount.toLocaleString()} VP</div>
                        <div className="text-xs text-purple-400 font-bold mt-1">₹{pkg.priceINR.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-gray-400 mt-2 font-mono">
                          Down: ₹{pkg.downPaymentINR.toLocaleString('en-IN')}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* If Account: Service Info Banner */}
              {serviceType === 'account' && context?.listing && (
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      Lifetime Guaranteed Account
                    </span>
                    <h3 className="font-black text-base text-white font-rajdhani mt-1.5">
                      {context.listing.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Listing #{context.listing.id} • {context.listing.rank} • Level {context.listing.level}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-gray-400 uppercase">Service Price</div>
                    <div className="text-xl font-black text-white font-rajdhani">
                      ₹{context.listing.price_inr.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              )}

              {/* Plans Comparison Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-gray-300 font-bold">
                    Available Flexible Payment Plans
                  </span>
                  <span className="text-xs text-purple-300 font-mono">
                    {availablePlans.length} eligible options
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availablePlans.map((plan) => {
                    const isSelected = selectedPlan?.id === plan.id;
                    return (
                      <div
                        key={plan.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-b from-purple-950/50 to-[#120a24] border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                            : 'bg-[#100c22] border-white/10 hover:border-purple-500/40'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 mb-1">
                                {plan.frequency === 'weekly' ? 'Weekly Installments' : 'Monthly Installments'}
                              </span>
                              <h4 className="font-black text-base text-white font-rajdhani">{plan.name}</h4>
                              {plan.slabName && <p className="text-[11px] text-gray-400">{plan.slabName}</p>}
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-mono text-gray-400 uppercase">Per Installment</div>
                              <div className="text-xl font-black text-purple-300 font-rajdhani">
                                ₹{plan.installmentAmount.toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-center text-xs font-mono">
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase">Initial Down</div>
                              <div className="font-bold text-white mt-0.5">₹{plan.downPayment.toLocaleString('en-IN')}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase">Balance</div>
                              <div className="font-bold text-white mt-0.5">₹{plan.balance.toLocaleString('en-IN')}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase">Duration</div>
                              <div className="font-bold text-emerald-400 mt-0.5">{plan.duration} {plan.frequency === 'weekly' ? 'Weeks' : 'Months'}</div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 mt-2 border-t border-white/5 flex items-center justify-between">
                          <div className="text-[11px] text-gray-400">
                            Total: <strong className="text-gray-200">₹{plan.totalPayable.toLocaleString('en-IN')}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedPlan(plan)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold font-rajdhani uppercase tracking-wider transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Choose This Plan'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedPlan}
                  onClick={() => {
                    setError(null);
                    setStep('terms');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-rajdhani uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30 disabled:opacity-50"
                >
                  <span>Continue to Notice</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: TERMS, CONDITIONS & NOTICE (Phase 6) */}
          {step === 'terms' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30">
                <h3 className="font-black text-base text-white font-rajdhani tracking-wide uppercase flex items-center gap-2 text-purple-300">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <span>VIB FLEXIBLE PAYMENT PLAN — TERMS, CONDITIONS &amp; IMPORTANT NOTICE</span>
                </h3>
                <p className="text-xs text-gray-300 mt-1">
                  Please review the mandatory customer requirements and late-fee schedules before submitting your application.
                </p>
              </div>

              <div className="space-y-3.5 text-xs text-gray-300 leading-relaxed bg-[#100c22] p-5 rounded-2xl border border-white/10 max-h-[380px] overflow-y-auto">
                <div className="space-y-1.5">
                  <strong className="text-white uppercase font-mono block">1. Mandatory KYC &amp; Verification Review</strong>
                  <p>
                    All flexible payment plans require mandatory government identity document verification and internal review by VIB Risk &amp; Escrow staff. Submission of an application does not guarantee instant automatic approval.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <strong className="text-white uppercase font-mono block">2. Down Payment &amp; Delivery Obligation</strong>
                  <p>
                    The agreed initial down payment must be verified before account credentials or VP delivery is initiated. For Lifetime Guaranteed digital profiles, full recovery email transfer is executed upon down-payment verification.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <strong className="text-white uppercase font-mono block">3. Strict Late-Payment Fee Schedule</strong>
                  <p>
                    In accordance with contractual terms, installment payments must be submitted on or before each scheduled due date:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-400">
                    <li><strong className="text-amber-400">Weekly Plans:</strong> Late fee of <strong>₹300 per week</strong> applies on overdue balances.</li>
                    <li><strong className="text-amber-400">Monthly Plans:</strong> Late fee of <strong>₹1,500 per month / occurrence</strong> applies on overdue balances in accordance with the documented cumulative schedule.</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <strong className="text-white uppercase font-mono block">4. Default Consequences &amp; Recovery</strong>
                  <p>
                    In the event an installment remains unpaid past 7 calendar days after formal notice, VIB reserves the contractual right to revoke digital credentials, void lifetime replacement guarantees, and escalate to legal recovery.
                  </p>
                </div>
              </div>

              {/* Mandatory Acceptance Checkbox */}
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 flex items-start gap-3">
                <input
                  id="fpp-terms-checkbox"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-white/20 bg-black/60 cursor-pointer"
                />
                <label htmlFor="fpp-terms-checkbox" className="text-xs text-gray-200 cursor-pointer font-medium leading-relaxed">
                  I have read, understood, and agree to the VIB Flexible Payment Plan Terms &amp; Conditions.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Plans</span>
                </button>
                <button
                  type="button"
                  disabled={!termsAccepted}
                  onClick={handleProceedFromTerms}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-rajdhani uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30 disabled:opacity-50"
                >
                  <span>Proceed to Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: KYC & E-SIGN (Phase 7) */}
          {step === 'kyc' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30">
                <h3 className="font-black text-base text-white font-rajdhani tracking-wide uppercase">
                  Identity Verification &amp; Electronic Signature
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Provide genuine identification details for contract execution. Documents are stored privately with strict encryption.
                </p>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="text-gray-300 font-bold uppercase block mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="As stated on Government ID"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold uppercase block mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => {
                      setDob(e.target.value);
                      if (e.target.value) {
                        const birthYear = new Date(e.target.value).getFullYear();
                        const nowYear = new Date().getFullYear();
                        setIsMinor(nowYear - birthYear < 18);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold uppercase block mb-1">Mobile / WhatsApp Number *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold uppercase block mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-gray-300 font-bold uppercase block mb-1">Residential Address *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, House / Flat number, Landmark"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold uppercase block mb-1">City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold uppercase block mb-1">State *</label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold uppercase block mb-1">PIN Code *</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g. 400001"
                    maxLength={6}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>
              </div>

              {/* Minor Guardian Info */}
              {isMinor && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    Guardian Required (Customer Under 18)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div>
                      <label className="text-gray-300 font-bold uppercase block mb-1">Guardian Name *</label>
                      <input
                        type="text"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="Parent / Legal Guardian"
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 font-bold uppercase block mb-1">Relationship *</label>
                      <input
                        type="text"
                        value={guardianRelation}
                        onChange={(e) => setGuardianRelation(e.target.value)}
                        placeholder="Mother, Father, Guardian"
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 font-bold uppercase block mb-1">Guardian Phone *</label>
                      <input
                        type="tel"
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        placeholder="+91..."
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Document Selection & Uploads */}
              <div className="space-y-4 pt-2 border-t border-white/10">
                <h4 className="text-xs font-mono uppercase tracking-wider text-purple-300 font-bold">
                  Identity Document Uploads (Max 5MB per file)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Primary Doc */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                    <label className="text-xs font-bold text-gray-200 block">Primary Identity Document *</label>
                    <select
                      value={primaryDocType}
                      onChange={(e) => handlePrimaryDocChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#140f28] border border-white/15 text-white text-xs outline-none"
                    >
                      {PRIMARY_DOC_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">Front Side *</span>
                        <label className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-white/20 hover:border-purple-400 cursor-pointer bg-white/[0.02]">
                          <Upload className="w-4 h-4 text-purple-400 mb-1" />
                          <span className="text-[10px] text-gray-400 truncate max-w-[90px]">
                            {primaryDocFront ? 'Front Uploaded' : 'Upload Front'}
                          </span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileUpload(e, setPrimaryDocFront)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">Back Side (Optional)</span>
                        <label className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-white/20 hover:border-purple-400 cursor-pointer bg-white/[0.02]">
                          <Upload className="w-4 h-4 text-purple-400 mb-1" />
                          <span className="text-[10px] text-gray-400 truncate max-w-[90px]">
                            {primaryDocBack ? 'Back Uploaded' : 'Upload Back'}
                          </span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileUpload(e, setPrimaryDocBack)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Doc */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                    <label className="text-xs font-bold text-gray-200 block">Secondary Document (Must be different) *</label>
                    <select
                      value={secondaryDocType}
                      onChange={(e) => handleSecondaryDocChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#140f28] border border-white/15 text-white text-xs outline-none"
                    >
                      {SECONDARY_DOC_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>

                    <div className="pt-1">
                      <span className="text-[10px] text-gray-400 block mb-1">Upload Document *</span>
                      <label className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-white/20 hover:border-purple-400 cursor-pointer bg-white/[0.02]">
                        <Upload className="w-4 h-4 text-purple-400 mb-1" />
                        <span className="text-[10px] text-gray-400 truncate max-w-[140px]">
                          {secondaryDocFront ? 'Doc Uploaded' : 'Upload Document'}
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload(e, setSecondaryDocFront)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Digital E-Signature */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-purple-300 font-bold">
                    Customer Electronic Signature *
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const canvas = canvasRef.current;
                        if (canvas) {
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            ctx.font = 'italic 28px cursive, sans-serif';
                            ctx.fillStyle = '#c084fc';
                            ctx.fillText(fullName || 'Electronic Signature', 30, 65);
                            setSignatureData(canvas.toDataURL('image/png'));
                            setError(null);
                          }
                        }
                      }}
                      className="text-[11px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                    >
                      Generate Signature
                    </button>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[11px] text-gray-400 hover:text-white underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-black border border-purple-500/30">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={(e) => {
                      const touch = e.touches[0];
                      if (touch) startDrawing({ clientX: touch.clientX, clientY: touch.clientY } as any);
                    }}
                    onTouchMove={(e) => {
                      const touch = e.touches[0];
                      if (touch) draw({ clientX: touch.clientX, clientY: touch.clientY } as any);
                    }}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[100px] bg-black rounded-lg cursor-crosshair touch-none"
                  />
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  Sign above using mouse, stylus, or touch.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('terms')}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleProceedFromKyc}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-rajdhani uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  <span>Review Agreement</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: AGREEMENT REVIEW (Phase 8) */}
          {step === 'agreement' && selectedPlan && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-base text-white font-rajdhani tracking-wide uppercase">
                    Review Formal Contract &amp; Schedule
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {serviceType === 'vp'
                      ? 'VP Services Flexible Payment Plan Agreement'
                      : 'Digital Profile Services Flexible Payment Plan Agreement'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const win = window.open('', '_blank');
                    if (win) {
                      win.document.write(generatedAgreementHtml || '<h1>VIB Flexible Payment Plan Agreement</h1>');
                      win.document.close();
                      win.print();
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-gray-200 font-bold font-rajdhani uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Print / Download</span>
                </button>
              </div>

              {/* Agreement Summary Box */}
              <div className="p-5 rounded-2xl bg-[#100c22] border border-white/10 space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-gray-500 uppercase text-[10px] block">Customer</span>
                    <strong className="text-white">{fullName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase text-[10px] block">Service</span>
                    <strong className="text-purple-300">
                      {serviceType === 'vp' ? 'VP Package Top-Up' : context?.listing?.title || 'Account Profile'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase text-[10px] block">Down Payment</span>
                    <strong className="text-emerald-400">₹{selectedPlan.downPayment.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase text-[10px] block">Total Payable</span>
                    <strong className="text-white">₹{selectedPlan.totalPayable.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-gray-400 uppercase text-[10px] font-bold block">
                    Installment Breakdown ({selectedPlan.duration} {selectedPlan.frequency === 'weekly' ? 'Weeks' : 'Months'})
                  </span>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                    <span>{selectedPlan.duration} installments of ₹{selectedPlan.installmentAmount.toLocaleString('en-IN')}</span>
                    <span className="text-purple-400 font-bold uppercase">{selectedPlan.frequency}</span>
                  </div>
                </div>

                {signatureData && (
                  <div className="pt-2">
                    <span className="text-gray-500 uppercase text-[10px] block mb-1">Attached Electronic Signature</span>
                    <img src={signatureData} alt="Signature Preview" className="h-10 bg-black/60 p-1 rounded border border-white/15" />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('kyc')}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to KYC</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitApplication}
                  className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs font-rajdhani uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xl shadow-purple-600/30 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Sign &amp; Submit Application</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS CONFIRMATION */}
          {step === 'success' && (
            <div className="text-center py-8 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-900/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-black text-2xl text-white font-rajdhani uppercase tracking-wide">
                Application Submitted Successfully
              </h3>
              <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
                Your Flexible Payment Plan application has been assigned reference ID:
              </p>
              <div className="inline-block px-4 py-2 rounded-xl bg-purple-950/40 border border-purple-500/40 font-mono font-bold text-sm text-purple-300 tracking-wider">
                {submittedRef}
              </div>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Our verification team is reviewing your documentation. Once approved, the payment schedule will activate and you can submit your initial down payment from your dashboard.
              </p>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer"
                >
                  Close
                </button>
                {onNavigateToDashboard && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToDashboard();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-rajdhani uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-600/30"
                  >
                    View in My Dashboard →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
