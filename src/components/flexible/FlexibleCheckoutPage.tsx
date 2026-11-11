import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Shield,
  FileText,
  User,
  CreditCard,
  Check,
  Lock,
  Download,
  Phone,
  Gamepad2,
} from 'lucide-react';
import { Currency } from '../../types';
import { formatCurrencyPrice } from '../../utils/format';
import { ClientPage } from '../client/Header';
import { FlexiblePlanSelection, FlexibleKycFormData } from '../../types/flexiblePlans';
import { useAuth } from '../../context/AuthContext';
import { generateVpAgreementHtml, generateAccountAgreementHtml } from '../../data/flexibleAgreementTemplates';

interface FlexibleCheckoutPageProps {
  currency: Currency;
  selectedPlan: FlexiblePlanSelection | null;
  onNavigate: (page: ClientPage, sectionId?: string) => void;
  onSuccess: (applicationRef: string) => void;
  onBackToPlans: () => void;
}

const AGREEMENT_VERSION = '2.0-FPP-2026';

export const FlexibleCheckoutPage: React.FC<FlexibleCheckoutPageProps> = ({
  currency,
  selectedPlan,
  onNavigate,
  onSuccess,
  onBackToPlans,
}) => {
  const { user, token, openAuthModal } = useAuth();

  // Stable agreement reference & display date per checkout session
  const [agreementRef] = useState(
    () => `VIB-FPP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
  );
  const [agreementDate] = useState(() =>
    new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  );

  // Customer KYC & Service Fields
  const [formData, setFormData] = useState<FlexibleKycFormData & { riotId: string }>({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dob: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    riotId: user?.riot_id || '',
    primaryDocType: 'Aadhaar Card',
    primaryDocNumber: '',
    primaryDocImage: '',
    secondaryDocType: 'PAN Card',
    secondaryDocNumber: '',
    secondaryDocImage: '',
    guardianName: '',
    guardianRelation: 'Father',
    guardianPhone: '',
  });

  const [primaryFileName, setPrimaryFileName] = useState('');
  const [secondaryFileName, setSecondaryFileName] = useState('');
  const [isMinor, setIsMinor] = useState(false);

  // E-Sign Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');

  // Agreement Checkboxes
  const [agreedSchedule, setAgreedSchedule] = useState(false);
  const [agreedStatutory, setAgreedStatutory] = useState(false);
  const [agreedAuthentic, setAgreedAuthentic] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!formData.dob) {
      setIsMinor(false);
      return;
    }
    const birthDate = new Date(formData.dob);
    if (Number.isNaN(birthDate.getTime())) return;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    setIsMinor(age < 18);
  }, [formData.dob]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        riotId: prev.riotId || user.riot_id || '',
      }));
    }
  }, [user]);

  if (!selectedPlan) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <CreditCard className="w-12 h-12 text-purple-400" />
        <h2 className="text-2xl font-black font-rajdhani uppercase text-white tracking-wider">
          No Payment Plan Selected
        </h2>
        <p className="text-sm text-gray-400 max-w-md font-mono">
          Choose a VP package or Lifetime Guaranteed profile from our Flexible Payment Plans catalog first to begin
          checkout.
        </p>
        <button
          type="button"
          onClick={onBackToPlans}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-rajdhani uppercase text-xs tracking-wider cursor-pointer"
        >
          Browse Flexible Payment Plans
        </button>
      </div>
    );
  }

  // Compute progress indicator milestones
  const step1Done = Boolean(
    formData.fullName.trim() &&
      formData.email.trim() &&
      formData.phone.trim() &&
      formData.dob &&
      formData.address.trim() &&
      formData.city.trim() &&
      formData.state.trim() &&
      formData.pincode.trim()
  );
  const step2Done = Boolean(
    formData.primaryDocNumber.trim() &&
      formData.secondaryDocNumber.trim() &&
      formData.primaryDocType !== formData.secondaryDocType
  );
  const step3Done = Boolean(formData.primaryDocImage && formData.secondaryDocImage);
  const step4Done = !isMinor || Boolean(formData.guardianName?.trim() && formData.guardianPhone?.trim());
  const step5Done = Boolean(hasSignature && agreedSchedule && agreedStatutory && agreedAuthentic);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent<HTMLCanvasElement>).clientX - rect.left,
      y: (e as React.MouseEvent<HTMLCanvasElement>).clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureDataUrl('');
  };

  const generateSignatureScript = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'italic 28px "Brush Script MT", "Caveat", cursive';
    ctx.fillStyle = '#c084fc';
    const nameToSign = formData.fullName.trim() || 'VIB Customer';
    ctx.fillText(nameToSign, 25, 45);
    setHasSignature(true);
    setSignatureDataUrl(canvas.toDataURL('image/png'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'primary' | 'secondary') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFormError('Document file size exceeds 10MB limit. Please upload a smaller image or PDF.');
      return;
    }

    setFormError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      if (target === 'primary') {
        setFormData((prev) => ({ ...prev, primaryDocImage: b64 }));
        setPrimaryFileName(file.name);
      } else {
        setFormData((prev) => ({ ...prev, secondaryDocImage: b64 }));
        setSecondaryFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const scheduleRows = Array.from({ length: selectedPlan.totalInstallments }, (_, i) => ({
    installmentNo: i + 1,
    dueDate: `${selectedPlan.paymentFrequency === 'weekly' ? 'Week' : 'Month'} ${i + 1}`,
    amount: selectedPlan.installmentAmount,
  }));

  const renderedAgreementHtml =
    selectedPlan.serviceType === 'vp'
      ? generateVpAgreementHtml({
          agreementRef,
          customer: {
            fullName: formData.fullName || 'APPLICANT LEGAL NAME',
            dob: formData.dob || 'DOB',
            phone: formData.phone || 'PHONE',
            email: formData.email || 'EMAIL',
            address: formData.address || 'ADDRESS',
            city: formData.city || 'CITY',
            state: formData.state || 'STATE',
            guardianName: formData.guardianName,
            guardianRelation: formData.guardianRelation,
          },
          service: {
            serviceType: 'vp',
            title: selectedPlan.productTitle,
            region: selectedPlan.region,
          },
          financials: {
            serviceCost: selectedPlan.productPrice,
            downPayment: selectedPlan.downPaymentAmount,
            downPaymentPct: selectedPlan.downPaymentPercent,
            principalBalance: selectedPlan.financedAmount,
            fixedProfit: 0,
            totalPayable: selectedPlan.totalPayable,
            installmentAmount: selectedPlan.installmentAmount,
            installmentsCount: selectedPlan.totalInstallments,
            paymentFrequency: selectedPlan.paymentFrequency,
            weeklyLateFee: selectedPlan.weeklyLateFee,
            monthlyLateFee: selectedPlan.monthlyLateFee,
          },
          schedule: scheduleRows,
          signatureDataUrl,
        })
      : generateAccountAgreementHtml({
          agreementRef,
          customer: {
            fullName: formData.fullName || 'APPLICANT LEGAL NAME',
            dob: formData.dob || 'DOB',
            phone: formData.phone || 'PHONE',
            email: formData.email || 'EMAIL',
            address: formData.address || 'ADDRESS',
            city: formData.city || 'CITY',
            state: formData.state || 'STATE',
            guardianName: formData.guardianName,
            guardianRelation: formData.guardianRelation,
          },
          service: {
            serviceType: 'account',
            title: selectedPlan.productTitle,
            listingId: selectedPlan.listingId,
          },
          financials: {
            serviceCost: selectedPlan.productPrice,
            downPayment: selectedPlan.downPaymentAmount,
            downPaymentPct: selectedPlan.downPaymentPercent,
            principalBalance: selectedPlan.financedAmount,
            fixedProfit: selectedPlan.fixedProfit,
            totalPayable: selectedPlan.totalPayable,
            installmentAmount: selectedPlan.installmentAmount,
            installmentsCount: selectedPlan.totalInstallments,
            paymentFrequency: selectedPlan.paymentFrequency,
            weeklyLateFee: selectedPlan.weeklyLateFee,
            monthlyLateFee: selectedPlan.monthlyLateFee,
          },
          schedule: scheduleRows,
          signatureDataUrl,
        });

  const handleDownloadAgreement = () => {
    const blob = new Blob([renderedAgreementHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${agreementRef}-Agreement.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!token || !user) {
      openAuthModal('login');
      return;
    }

    if (!formData.fullName.trim()) return setFormError('Please enter your full legal name.');
    if (!formData.email.trim()) return setFormError('Please enter your registered email address.');
    if (!formData.phone.trim()) return setFormError('Please enter your mobile phone number.');
    if (!formData.dob) return setFormError('Please provide your date of birth.');
    if (!formData.address.trim()) return setFormError('Please provide your residential address.');
    if (!formData.city.trim() || !formData.state.trim() || !formData.pincode.trim()) {
      return setFormError('Please provide complete city, state and PIN code.');
    }
    if (selectedPlan.serviceType === 'vp' && !formData.riotId.trim()) {
      return setFormError('Please provide the target Riot ID (e.g. Player#TAG) for VP top-up fulfillment.');
    }
    if (!formData.primaryDocNumber.trim()) return setFormError('Please enter your primary document number.');
    if (!formData.secondaryDocNumber.trim()) return setFormError('Please enter your secondary document number.');
    if (formData.primaryDocType === formData.secondaryDocType) {
      return setFormError('Primary and secondary documents must be different document types.');
    }
    if (formData.primaryDocNumber.trim() === formData.secondaryDocNumber.trim()) {
      return setFormError('Primary and secondary document numbers cannot be identical.');
    }
    if (!formData.primaryDocImage || !formData.secondaryDocImage) {
      return setFormError('Please upload both Primary and Secondary identity documents.');
    }

    if (isMinor && (!formData.guardianName?.trim() || !formData.guardianPhone?.trim())) {
      return setFormError('Applicant is under 18: Parent or legal guardian details are required.');
    }

    if (!hasSignature || !signatureDataUrl) {
      return setFormError('Please provide your electronic signature before submitting.');
    }

    if (!agreedSchedule || !agreedStatutory || !agreedAuthentic) {
      return setFormError('Please review and accept all legal declarations before submitting.');
    }

    setSubmitting(true);
    const acceptanceTimestamp = new Date().toISOString();

    try {
      const payload = {
        productTitle: selectedPlan.productTitle,
        totalAmount: selectedPlan.productPrice,
        initialPayment: selectedPlan.downPaymentAmount,
        tenureMonths: selectedPlan.totalInstallments,
        emiAmount: selectedPlan.installmentAmount,
        interestRatePct: 0,
        serviceType: selectedPlan.serviceType,
        region: selectedPlan.region,
        listingId: selectedPlan.listingId,
        paymentFrequency: selectedPlan.paymentFrequency,
        fixedProfit: selectedPlan.fixedProfit,
        totalPayable: selectedPlan.totalPayable,
        agreementRef,
        agreementVersion: AGREEMENT_VERSION,
        agreementHtml: renderedAgreementHtml,
        customerSignature: signatureDataUrl,
        signatureDataUrl,
        customerDetails: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          dob: formData.dob,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          riotId: formData.riotId,
          primaryDocType: formData.primaryDocType,
          primaryDocNumber: formData.primaryDocNumber,
          primaryDocImage: formData.primaryDocImage,
          secondaryDocType: formData.secondaryDocType,
          secondaryDocNumber: formData.secondaryDocNumber,
          secondaryDocImage: formData.secondaryDocImage,
          guardianName: isMinor ? formData.guardianName : undefined,
          guardianRelation: isMinor ? formData.guardianRelation : undefined,
          guardianPhone: isMinor ? formData.guardianPhone : undefined,
          agreementAcceptedAt: acceptanceTimestamp,
          agreementVersion: AGREEMENT_VERSION,
          agreementRef,
        },
      };

      const res = await fetch('/api/emi/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application. Please try again.');
      }

      const generatedRef = data.application?.agreementRef || data.application?.id || agreementRef;
      onSuccess(generatedRef);
    } catch (err: any) {
      setFormError(err.message || 'Network error while submitting your application.');
    } finally {
      setSubmitting(false);
    }
  };

  const allStepsReady = Boolean(step1Done && step2Done && step3Done && step4Done && step5Done);

  const progressSteps = [
    { num: 1, targetId: 'fpp-step-1', label: 'Order Details', done: true },
    { num: 2, targetId: 'fpp-step-2', label: 'Customer Info', done: step1Done },
    { num: 3, targetId: 'fpp-step-3', label: 'KYC Verification', done: step2Done && step3Done && step4Done },
    { num: 4, targetId: 'fpp-step-4', label: 'Agreement', done: step5Done },
    { num: 5, targetId: 'fpp-step-5', label: 'Review & Submit', done: allStepsReady },
  ];

  const scrollToStep = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#06040d] text-white selection:bg-purple-500 selection:text-white pb-24">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-purple-900/20 via-fuchsia-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-400 mb-6 font-mono">
          <button type="button" onClick={() => onNavigate('home')} className="hover:text-purple-300 cursor-pointer">
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <button type="button" onClick={onBackToPlans} className="hover:text-purple-300 cursor-pointer">
            Flexible Payment Plans
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-purple-400 font-semibold">Checkout Application</span>
        </nav>

        {/* Page Header */}
        <div className="border-b border-white/10 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold uppercase mb-2">
              <CreditCard className="w-3.5 h-3.5 text-purple-400" />
              <span>Application &amp; KYC Checkout Desk</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black font-rajdhani uppercase tracking-wider text-white">
              Complete Your Flexible Plan Checkout
            </h1>
          </div>

          <button
            type="button"
            onClick={onBackToPlans}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 flex items-center gap-2 w-fit cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change Selected Plan</span>
          </button>
        </div>

        {/* Structured 5-Step Checkout Progress Indicator */}
        <div className="mb-8 p-4 rounded-2xl bg-[#0c0d1e] border border-white/10 overflow-x-auto">
          <div className="flex items-center justify-between gap-3 min-w-[640px]">
            {progressSteps.map((step, idx) => (
              <React.Fragment key={step.num}>
                <button
                  type="button"
                  onClick={() => scrollToStep(step.targetId)}
                  className="flex items-center gap-2.5 text-left cursor-pointer group focus:outline-none"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${
                      step.done
                        ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                        : 'bg-purple-500/20 border border-purple-500/40 text-purple-300 group-hover:border-purple-400'
                    }`}
                  >
                    {step.done ? <Check className="w-3.5 h-3.5" /> : step.num}
                  </div>
                  <span
                    className={`text-xs font-mono whitespace-nowrap ${
                      step.done ? 'text-white font-semibold' : 'text-gray-400 group-hover:text-gray-200'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {idx < progressSteps.length - 1 && <div className="flex-1 h-px bg-white/10" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Unauthenticated Alert Banner */}
        {!user && (
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <div className="font-bold text-white text-sm font-rajdhani uppercase tracking-wider">
                  Sign In Required to Submit Application
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  Your form details remain preserved. Sign in or create a verified VIB account to submit your
                  application.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold font-rajdhani uppercase text-xs tracking-wider cursor-pointer shadow-lg shrink-0"
            >
              Sign In / Register
            </button>
          </div>
        )}

        {/* Two-Column Responsive Layout */}
        <form onSubmit={handleSubmitApplication} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            {formError && (
              <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs font-mono flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Step 1: Selected Product & Plan Breakdown */}
            <div id="fpp-step-1" className="p-6 rounded-2xl bg-[#0c0d1e] border border-purple-500/25 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2.5 text-white font-bold font-rajdhani text-lg uppercase tracking-wider">
                  <CreditCard className="w-5 h-5 text-purple-400" />
                  <span>1. Order Details &amp; Installment Breakdown</span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-950/70 border border-purple-500/30 text-purple-300 uppercase">
                  {selectedPlan.serviceType === 'vp' ? 'VP Service Plan' : 'Lifetime Guaranteed Profile Plan'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] text-gray-500 uppercase block">Selected Product</span>
                  <span className="text-white font-bold line-clamp-2 mt-0.5">{selectedPlan.productTitle}</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] text-gray-500 uppercase block">Service Price</span>
                  <span className="text-white font-bold mt-0.5 block">
                    {formatCurrencyPrice(selectedPlan.productPrice, currency)}
                  </span>
                  {selectedPlan.region && (
                    <span className="text-[10px] text-purple-300 uppercase">Region: {selectedPlan.region}</span>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] text-gray-500 uppercase block">Initial Payment</span>
                  <span className="text-emerald-400 font-bold mt-0.5 block">
                    {formatCurrencyPrice(selectedPlan.downPaymentAmount, currency)} ({selectedPlan.downPaymentPercent}%)
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] text-gray-500 uppercase block">Installment Plan</span>
                  <span className="text-fuchsia-300 font-bold mt-0.5 block">
                    {selectedPlan.totalInstallments} ×{' '}
                    {formatCurrencyPrice(selectedPlan.installmentAmount, currency)}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase">{selectedPlan.paymentFrequency}</span>
                </div>
              </div>
            </div>

            {/* Step 2: Customer Information */}
            <div id="fpp-step-2" className="p-6 rounded-2xl bg-[#0c0d1e] border border-white/10 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/10 text-white font-bold font-rajdhani text-lg uppercase tracking-wider">
                <User className="w-5 h-5 text-purple-400" />
                <span>2. Customer Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="block text-gray-400 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Rohan Sharma"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g., rohan@vib.gg"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Mobile / WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g., +91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-gray-400 mb-1 flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>
                      {selectedPlan.serviceType === 'vp'
                        ? 'Target Riot ID & Tagline (For VP Provisioning) *'
                        : 'Preferred Riot Username / Contact Note'}
                    </span>
                  </label>
                  <input
                    type="text"
                    required={selectedPlan.serviceType === 'vp'}
                    placeholder="e.g., TenZ#NA1 or Agent#IND"
                    value={formData.riotId}
                    onChange={(e) => setFormData({ ...formData, riotId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-gray-400 mb-1">Residential Street Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Flat / House No., Society, Landmark"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Mumbai"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Maharashtra"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-gray-400 mb-1">PIN Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g., 400001"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: KYC Verification & Document Uploads */}
            <div id="fpp-step-3" className="p-6 rounded-2xl bg-[#0c0d1e] border border-white/10 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/10 text-white font-bold font-rajdhani text-lg uppercase tracking-wider">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>3. KYC Verification &amp; Document Uploads</span>
              </div>
              <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/25 text-xs font-mono text-gray-300 space-y-1.5">
                <div className="font-bold text-cyan-300 uppercase">Why These Documents Are Required</div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  <strong>Primary Identity Document:</strong> Confirms applicant legal identity and date of birth to
                  enforce age &amp; guardian rules. <strong>Secondary Document:</strong> Cross-verifies identity against
                  multiple fraud/chargeback claims so digital profiles and VP balances remain escrow-protected.
                  Files are stored privately for compliance desk review only.
                </p>
              </div>

              {/* Primary Document */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="font-bold text-xs font-mono text-purple-300 uppercase">Primary Identity Document</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <label className="block text-gray-400 mb-1">Document Type *</label>
                    <select
                      value={formData.primaryDocType}
                      onChange={(e) => setFormData({ ...formData, primaryDocType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none"
                    >
                      <option>Aadhaar Card</option>
                      <option>Passport</option>
                      <option>Voter ID</option>
                      <option>Driver License</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Document Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., 5544-3322-1100"
                      value={formData.primaryDocNumber}
                      onChange={(e) => setFormData({ ...formData, primaryDocNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-mono mb-1">Upload Primary Document *</label>
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-white/20 hover:border-purple-500/60 rounded-xl cursor-pointer bg-black/40 transition-colors">
                    <UploadCloud className="w-5 h-5 text-purple-400 mb-1" />
                    <span className="text-[11px] font-mono text-gray-300">
                      {primaryFileName ? primaryFileName : 'Click to upload Primary ID scan / photo (Max 10MB)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, 'primary')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Secondary Document */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="font-bold text-xs font-mono text-cyan-300 uppercase">Secondary Identity Document</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <label className="block text-gray-400 mb-1">Document Type *</label>
                    <select
                      value={formData.secondaryDocType}
                      onChange={(e) => setFormData({ ...formData, secondaryDocType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none"
                    >
                      <option>PAN Card</option>
                      <option>Student ID</option>
                      <option>Utility Bill</option>
                      <option>Bank Statement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Document Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., ABCDE1234F"
                      value={formData.secondaryDocNumber}
                      onChange={(e) => setFormData({ ...formData, secondaryDocNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-mono mb-1">Upload Secondary Document *</label>
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-white/20 hover:border-cyan-500/60 rounded-xl cursor-pointer bg-black/40 transition-colors">
                    <UploadCloud className="w-5 h-5 text-cyan-400 mb-1" />
                    <span className="text-[11px] font-mono text-gray-300">
                      {secondaryFileName ? secondaryFileName : 'Click to upload Secondary ID scan / photo (Max 10MB)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, 'secondary')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Section 3B: Minor Guardian Authorization */}
            {isMinor && (
              <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-amber-500/20 text-amber-300 font-bold font-rajdhani text-lg uppercase tracking-wider">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>3B. Minor Guardian Authorization (Applicant under 18)</span>
                </div>
                <p className="text-xs text-amber-200/80 font-mono">
                  Because the applicant is under 18 years of age, legal parent or guardian authorization is required.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div>
                    <label className="block text-gray-400 mb-1">Guardian Full Name *</label>
                    <input
                      type="text"
                      required={isMinor}
                      placeholder="Parent / Guardian Name"
                      value={formData.guardianName}
                      onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Relationship *</label>
                    <select
                      value={formData.guardianRelation}
                      onChange={(e) => setFormData({ ...formData, guardianRelation: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none"
                    >
                      <option>Father</option>
                      <option>Mother</option>
                      <option>Legal Guardian</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Guardian Phone *</label>
                    <input
                      type="tel"
                      required={isMinor}
                      placeholder="+91 98765 00000"
                      value={formData.guardianPhone}
                      onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Agreement Review, Download & E-Signature */}
            <div id="fpp-step-4" className="p-6 rounded-2xl bg-[#0c0d1e] border border-white/10 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2.5 text-white font-bold font-rajdhani text-lg uppercase tracking-wider">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <span>4. Formal Legal Agreement &amp; Electronic Signature</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                    {agreementRef} • v{AGREEMENT_VERSION}
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadAgreement}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-[11px] font-mono text-gray-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-400" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Readable Agreement Box */}
              <div className="max-h-60 overflow-y-auto p-4 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-gray-300 leading-relaxed space-y-3 pr-3">
                <div className="font-bold text-white text-center border-b border-white/10 pb-2">
                  {selectedPlan.serviceType === 'vp'
                    ? 'VP SERVICES FLEXIBLE PAYMENT PLAN AGREEMENT'
                    : 'DIGITAL PROFILE SERVICES FLEXIBLE PAYMENT PLAN AGREEMENT'}
                </div>
                <p>
                  This Flexible Payment Plan Agreement (Version {AGREEMENT_VERSION}, Ref {agreementRef}) is executed on{' '}
                  {agreementDate} between <strong>VIB Digital Services Platform</strong> and{' '}
                  <strong>{formData.fullName || '[Applicant Full Name]'}</strong> residing at{' '}
                  {formData.address || '[Street Address]'}, {formData.city || '[City]'},{' '}
                  {formData.state || '[State]'}.
                </p>
                <p>
                  <strong>Service Covered:</strong> {selectedPlan.productTitle} (Service Price:{' '}
                  {formatCurrencyPrice(selectedPlan.productPrice, currency)}).
                </p>
                <p>
                  <strong>Payment Breakdown:</strong> Initial Down Payment of{' '}
                  {formatCurrencyPrice(selectedPlan.downPaymentAmount, currency)} ({selectedPlan.downPaymentPercent}%)
                  upon compliance verification and approval, followed by {selectedPlan.totalInstallments}{' '}
                  {selectedPlan.paymentFrequency} installments of{' '}
                  {formatCurrencyPrice(selectedPlan.installmentAmount, currency)} (Total Payable:{' '}
                  {formatCurrencyPrice(selectedPlan.totalPayable, currency)}).
                </p>
                <p>
                  <strong>Late Fee Policy:</strong> Overdue weekly installments incur{' '}
                  {formatCurrencyPrice(selectedPlan.weeklyLateFee, currency)}; overdue monthly installments incur{' '}
                  {formatCurrencyPrice(selectedPlan.monthlyLateFee, currency)}.
                </p>
                <p>
                  <strong>Escrow &amp; Ownership:</strong> VIB holds assets under protected escrow terms until full
                  installment settlement is completed.
                </p>
              </div>

              {/* Electronic Signature Pad */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-300 uppercase font-bold">
                    Applicant Electronic Signature *
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={generateSignatureScript}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-[11px] font-mono text-purple-200 cursor-pointer"
                    >
                      Generate Signature
                    </button>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-gray-400 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-purple-500/40 bg-black/60 p-2 flex flex-col items-center">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={110}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full max-w-[500px] h-[110px] cursor-crosshair touch-none"
                  />
                  <span className="text-[10px] font-mono text-gray-500 mt-1">
                    Draw your signature above or use Generate Signature.
                  </span>
                </div>
              </div>

              {/* Declarations */}
              <div className="space-y-3 pt-2 text-xs font-mono text-gray-300">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={agreedSchedule}
                    onChange={(e) => setAgreedSchedule(e.target.checked)}
                    className="mt-0.5 rounded accent-purple-600 cursor-pointer"
                  />
                  <span>
                    I have reviewed the complete Flexible Payment Plan Agreement ({agreementRef}) and accept the{' '}
                    {selectedPlan.paymentFrequency} installment payment schedule.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={agreedStatutory}
                    onChange={(e) => setAgreedStatutory(e.target.checked)}
                    className="mt-0.5 rounded accent-purple-600 cursor-pointer"
                  />
                  <span>
                    I understand this is an escrow-backed split payment purchase facility, NOT an institutional banking
                    loan or NBFC credit line.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={agreedAuthentic}
                    onChange={(e) => setAgreedAuthentic(e.target.checked)}
                    className="mt-0.5 rounded accent-purple-600 cursor-pointer"
                  />
                  <span>
                    I certify that all submitted KYC details and identity documents are authentic and belong to me.
                  </span>
                </label>
              </div>
            </div>

            {/* Step 5: Pre-Submission Review */}
            <div id="fpp-step-5" className="p-6 rounded-2xl bg-[#0c0d1e] border border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2.5 text-white font-bold font-rajdhani text-lg uppercase tracking-wider">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                  <span>5. Review Application Details</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase ${
                    allStepsReady
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/5 border-white/15 text-gray-400'
                  }`}
                >
                  {allStepsReady ? 'Ready to Submit' : 'Complete All Sections Above'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <div className="text-[10px] text-gray-500 uppercase">Applicant</div>
                  <div className="text-white font-bold">{formData.fullName || 'Not entered'}</div>
                  <div className="text-gray-400 text-[11px]">{formData.email || '—'}</div>
                  <div className="text-gray-400 text-[11px]">{formData.phone || '—'}</div>
                  {selectedPlan.serviceType === 'vp' && (
                    <div className="text-purple-300 text-[11px]">Riot ID: {formData.riotId || '—'}</div>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <div className="text-[10px] text-gray-500 uppercase">KYC &amp; Agreement</div>
                  <div className="text-gray-300 text-[11px]">
                    Primary: {formData.primaryDocType} {formData.primaryDocNumber ? `(${formData.primaryDocNumber})` : '(Pending)'}
                  </div>
                  <div className="text-gray-300 text-[11px]">
                    Secondary: {formData.secondaryDocType} {formData.secondaryDocNumber ? `(${formData.secondaryDocNumber})` : '(Pending)'}
                  </div>
                  <div className="text-gray-300 text-[11px]">
                    Docs Uploaded: {formData.primaryDocImage && formData.secondaryDocImage ? 'Both Ready' : 'Missing'}
                  </div>
                  <div className="text-gray-300 text-[11px]">
                    E-Signature &amp; Consent: {step5Done ? 'Signed & Accepted' : 'Pending'}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Submit */}
            <div className="lg:hidden">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold font-rajdhani uppercase tracking-wider text-base transition-all shadow-xl shadow-purple-900/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Application</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Sticky Application & Payment Breakdown Summary (5 cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            <div className="rounded-2xl bg-[#0c0d1e] border border-purple-500/30 p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="font-bold text-white font-rajdhani text-lg uppercase tracking-wider">
                  Order &amp; Plan Summary
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                  {selectedPlan.serviceType === 'vp' ? 'VP Service' : 'Lifetime Guaranteed Profile'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                <div className="text-sm font-black font-rajdhani uppercase text-white tracking-wider">
                  {selectedPlan.productTitle}
                </div>
                {selectedPlan.region && (
                  <div className="text-[11px] font-mono text-gray-400">
                    Region: <span className="text-purple-300 font-bold uppercase">{selectedPlan.region}</span>
                  </div>
                )}
                <div className="text-xs font-mono text-gray-400">
                  Schedule:{' '}
                  <span className="text-white font-bold uppercase">
                    {selectedPlan.paymentFrequency} ({selectedPlan.totalInstallments} Installments)
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between text-gray-400">
                  <span>Service Price</span>
                  <span className="text-white">{formatCurrencyPrice(selectedPlan.productPrice, currency)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Initial Down Payment ({selectedPlan.downPaymentPercent}%)</span>
                  <span>{formatCurrencyPrice(selectedPlan.downPaymentAmount, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Principal Remaining</span>
                  <span>{formatCurrencyPrice(selectedPlan.financedAmount, currency)}</span>
                </div>
                {selectedPlan.fixedProfit > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Fixed Plan Administration Margin</span>
                    <span>+{formatCurrencyPrice(selectedPlan.fixedProfit, currency)}</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-3 flex justify-between text-sm font-bold font-rajdhani">
                  <span className="text-white uppercase">Total Payable</span>
                  <span className="text-purple-300 text-base">
                    {formatCurrencyPrice(selectedPlan.totalPayable, currency)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-1.5 text-center">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                  Installment Amount
                </div>
                <div className="text-2xl font-black font-rajdhani text-white">
                  {formatCurrencyPrice(selectedPlan.installmentAmount, currency)}{' '}
                  <span className="text-xs text-purple-300">
                    / {selectedPlan.paymentFrequency === 'weekly' ? 'week' : 'month'}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-gray-400">
                  for {selectedPlan.totalInstallments}{' '}
                  {selectedPlan.paymentFrequency === 'weekly' ? 'weekly' : 'monthly'} cycles
                </div>
              </div>

              {/* Payment Method & Settlement Disclosure */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] font-mono text-gray-400 space-y-1.5">
                <div className="font-bold text-gray-200 uppercase">Payment Method &amp; Verification</div>
                <div>
                  No payment is charged until our compliance desk verifies your KYC details and approves your
                  application. Once approved, your Initial Down Payment and subsequent installments are settled via
                  VIB Official UPI / Bank Transfer with receipt upload in your dashboard.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] font-mono text-gray-400 space-y-1">
                <div className="font-bold text-gray-300">Late Fee Policy:</div>
                <div>
                  Weekly schedules: <span className="text-amber-400">{formatCurrencyPrice(selectedPlan.weeklyLateFee, currency)}</span> late fee.
                </div>
                <div>
                  Monthly schedules: <span className="text-amber-400">{formatCurrencyPrice(selectedPlan.monthlyLateFee, currency)}</span> late fee.
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono text-gray-300 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>100% VIB Escrow Protection</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span>Encrypted KYC Verification Storage</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Agreement Ref: {agreementRef}</span>
                </div>
              </div>

              <div className="hidden lg:block pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold font-rajdhani uppercase tracking-wider text-base transition-all shadow-xl shadow-purple-900/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

              <a
                href={`https://wa.me/918099641606?text=${encodeURIComponent(
                  `Hi VIB Team, I have a question while submitting Flexible Payment Plan application (${agreementRef}) for ${selectedPlan.productTitle}.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs font-rajdhani uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Need Help? Chat on WhatsApp (+91 80996 41606)</span>
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
