import React from 'react';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  FileText,
  AlertCircle,
  Phone,
} from 'lucide-react';
import { ClientPage } from '../client/Header';

interface FlexibleConfirmationPageProps {
  applicationRef: string;
  onNavigate: (page: ClientPage, sectionId?: string) => void;
}

export const FlexibleConfirmationPage: React.FC<FlexibleConfirmationPageProps> = ({
  applicationRef,
  onNavigate,
}) => {
  return (
    <div className="min-h-screen bg-[#06040d] text-white selection:bg-purple-500 selection:text-white pb-24">
      {/* Background Atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-purple-900/20 via-fuchsia-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-mono">
          <button onClick={() => onNavigate('home')} className="hover:text-purple-300">
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <button onClick={() => onNavigate('flexible-payment-plans')} className="hover:text-purple-300">
            Flexible Payment Plans
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-emerald-400 font-semibold">Application Received</span>
        </nav>

        {/* Status Confirmation Card */}
        <div className="rounded-3xl bg-[#0c0d1e] border border-amber-500/40 p-6 sm:p-10 space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
                  Pending Staff Verification
                </span>
                <h1 className="text-2xl sm:text-3xl font-black font-rajdhani uppercase tracking-wider text-white mt-1">
                  Application Submitted
                </h1>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono">
              <div className="text-xs text-gray-400">Application Reference:</div>
              <div className="text-base sm:text-lg font-bold text-purple-300 tracking-wider">
                {applicationRef || 'Pending Reference'}
              </div>
            </div>
          </div>

          {/* Compliance & Approval Notice */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs font-mono text-amber-200/90 leading-relaxed space-y-1">
              <div className="font-bold text-white uppercase tracking-wider">Awaiting Verification &amp; Approval</div>
              <div>
                Your application has been received into our compliance queue. In accordance with VIB Escrow policies,{' '}
                <strong>services are not yet active or delivered</strong>. Our staff verification desk will review your
                submitted KYC documents and schedule parameters within 15–30 minutes.
              </div>
            </div>
          </div>

          {/* Step-by-Step Fulfillment Timeline */}
          <div className="space-y-4">
            <div className="font-bold font-rajdhani uppercase text-sm tracking-wider text-gray-300">
              What Happens Next:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-xs">
                  1
                </div>
                <div className="font-bold text-white">KYC Verification Desk</div>
                <div className="text-gray-400 text-[11px] leading-relaxed">
                  Compliance officers verify your uploaded documents and minor authorization status.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs">
                  2
                </div>
                <div className="font-bold text-white">Down Payment Confirmation</div>
                <div className="text-gray-400 text-[11px] leading-relaxed">
                  Upon approval, your initial down payment is recorded into the VIB Escrow vault.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold text-xs">
                  3
                </div>
                <div className="font-bold text-white">Service Delivery &amp; Tracking</div>
                <div className="text-gray-400 text-[11px] leading-relaxed">
                  VP top-up or profile credentials handover commences immediately with live dashboard installment tracking.
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => onNavigate('dashboard', 'tab:emi')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-rajdhani uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-900/40 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Track in Customer Dashboard</span>
            </button>

            <a
              href={`https://wa.me/918099641606?text=${encodeURIComponent(
                `Hello VIB Compliance Desk, I submitted Flexible Payment Plan application (${applicationRef}).`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold font-rajdhani uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Phone className="w-4 h-4" />
              <span>WhatsApp Verification Desk</span>
            </a>

            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold font-rajdhani uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>Return to Storefront</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
