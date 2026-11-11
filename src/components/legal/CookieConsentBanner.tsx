import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ClientPage } from '../client/Header';

interface CookieConsentBannerProps {
  onNavigate: (page: ClientPage, slug?: string) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('vib_cookie_consent');
      if (!stored) {
        setIsVisible(true);
      }
    } catch {}
  }, []);

  const handleConsent = async (type: 'all' | 'essential') => {
    try {
      localStorage.setItem('vib_cookie_consent', type);
      setIsVisible(false);

      // Record consent on backend under DPDPA 2023 compliance
      const savedToken = localStorage.getItem('vib_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (savedToken) headers.Authorization = `Bearer ${savedToken}`;
      await fetch('/api/legal/consent', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          policy_slug: 'cookie-policy',
          policy_version: '1.0',
          consent_type: type === 'all' ? 'cookie_banner_all' : 'cookie_banner_essential',
          context_type: 'cookie_banner',
          context_id: type,
        }),
      });
    } catch (e) {
      console.warn('Failed to record cookie consent:', e);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 p-4 sm:p-5 bg-[#090a16]/95 backdrop-blur-md border-t border-purple-500/30 shadow-[0_-10px_35px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom duration-300">
      <div className="max-w-[1360px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Cookie &amp; Privacy Notice (DPDPA 2023)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30">
                Statutory Compliance
              </span>
            </div>
            <p className="text-xs text-gray-300 max-w-3xl leading-relaxed">
              In compliance with India&apos;s Digital Personal Data Protection Act (DPDPA 2023), VIB uses essential session tokens and anti-fraud telemetry cookies to secure orders, prevent account hijacking, and guarantee transaction integrity.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('legal' as any, 'cookie-policy')}
            className="text-xs text-gray-400 hover:text-purple-300 underline underline-offset-4 px-2 py-1.5 transition-colors cursor-pointer"
          >
            Review Cookie Policy
          </button>
          <button
            type="button"
            onClick={() => handleConsent('essential')}
            className="px-3.5 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white text-xs font-bold font-rajdhani uppercase tracking-wider cursor-pointer transition-colors"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={() => handleConsent('all')}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-rajdhani uppercase tracking-wider shadow-lg shadow-purple-600/30 cursor-pointer transition-all"
          >
            Accept All Cookies
          </button>
        </div>
      </div>
    </div>
  );
};
