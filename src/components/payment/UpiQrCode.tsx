import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ExternalLink, Loader2, Sparkles, Smartphone, Check, Copy } from 'lucide-react';

export interface UpiQrCodeProps {
  upiId: string;
  payeeName?: string;
  amount: number;
  orderId?: string;
  note?: string;
  currency?: string;
  size?: number;
  showBrandBadges?: boolean;
  showDeepLink?: boolean;
  className?: string;
}

export const UpiQrCode: React.FC<UpiQrCodeProps> = ({
  upiId,
  payeeName = 'VIB Digital Services Platform',
  amount,
  orderId,
  note,
  currency = 'INR',
  size = 240,
  showBrandBadges = true,
  showDeepLink = true,
  className = '',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const cleanUpi = (upiId || 'thevibofficial@okhdfcbank').trim();
  const cleanPayee = (payeeName || 'VIB Digital Services Platform').trim();
  const numAmount = Math.max(0, Number(amount) || 0);
  const amountStr = numAmount > 0 ? numAmount.toFixed(2) : '0.00';
  const cleanOrder = (orderId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  const cleanNote = (
    note || (cleanOrder ? `VIB Order ${cleanOrder}` : 'VIB Digital Services')
  )
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .slice(0, 45);

  // Standard NPCI UPI URI specification
  const upiUri = `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(
    cleanPayee
  )}&am=${encodeURIComponent(amountStr)}&cu=${encodeURIComponent(
    currency || 'INR'
  )}&tn=${encodeURIComponent(cleanNote)}${
    cleanOrder ? `&tr=${encodeURIComponent(cleanOrder)}` : ''
  }`;

  useEffect(() => {
    let active = true;
    setError(null);

    QRCode.toDataURL(upiUri, {
      width: Math.max(280, size * 2),
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#080415',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to generate UPI QR code:', err);
          setError('Failed to render dynamic QR code.');
        }
      });

    return () => {
      active = false;
    };
  }, [upiUri, size]);

  const handleCopyUri = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(upiUri);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {}
  };

  return (
    <div className={`flex flex-col items-center text-center space-y-3.5 ${className}`}>
      {/* High-Contrast White Container for 100% Reliable Camera Scanner Recognition */}
      <div className="p-3 sm:p-3.5 bg-white rounded-2xl shadow-[0_0_35px_rgba(168,85,247,0.38)] relative group border-2 border-purple-400/40">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`Scan UPI QR code to pay Rs ${amountStr} to ${cleanUpi}`}
            className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl select-none"
          />
        ) : error ? (
          <div className="w-48 h-48 sm:w-52 sm:h-52 flex flex-col items-center justify-center text-rose-800 bg-rose-50 rounded-xl p-4">
            <span className="text-xs font-bold text-center">{error}</span>
          </div>
        ) : (
          <div className="w-48 h-48 sm:w-52 sm:h-52 flex flex-col items-center justify-center text-purple-900 bg-purple-50/80 rounded-xl">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="text-xs font-mono font-bold mt-2 text-purple-900">
              Generating dynamic QR...
            </span>
          </div>
        )}

        {/* Center VIB Metallic Logo Badge Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-lg bg-[#0b0818] border-2 border-purple-500 flex items-center justify-center shadow-lg">
            <span className="font-rajdhani font-black text-xs text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-indigo-300 tracking-wider">
              VIB
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Amount Guarantee Subtitle */}
      <div className="space-y-1">
        <div className="text-xs font-semibold text-gray-200">
          Scan &amp; Pay with any UPI App
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-300 shadow-sm">
          <span>✓</span>
          <span>Auto-fills exact amount: ₹{numAmount > 0 ? numAmount : amountStr}</span>
        </div>
      </div>

      {/* Supported UPI Apps Pills */}
      {showBrandBadges && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
          <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-[10px] font-mono text-blue-300 font-bold shadow-sm">
            GPay
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-[10px] font-mono text-purple-300 font-bold shadow-sm">
            PhonePe
          </span>
          <span className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-500/40 text-[10px] font-mono text-sky-300 font-bold shadow-sm">
            Paytm
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-[10px] font-mono text-amber-300 font-bold shadow-sm">
            BHIM
          </span>
          <span className="px-2 py-0.5 rounded bg-fuchsia-950/80 border border-fuchsia-500/40 text-[10px] font-mono text-fuchsia-300 font-bold shadow-sm">
            Cred
          </span>
        </div>
      )}

      {/* Mobile 1-Tap Pay Link Button */}
      {showDeepLink && (
        <div className="w-full pt-1 flex flex-col items-center gap-1.5">
          <a
            href={upiUri}
            className="w-full max-w-[240px] py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600/30 via-fuchsia-600/25 to-purple-600/30 hover:from-purple-600/50 hover:to-fuchsia-600/50 border border-purple-400/40 text-purple-200 hover:text-white text-xs font-bold font-rajdhani flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            title="Open directly inside your mobile UPI App"
          >
            <Smartphone className="w-3.5 h-3.5 text-purple-300" />
            <span>Tap to Pay in UPI App</span>
            <ExternalLink className="w-3 h-3 text-purple-300" />
          </a>
          <button
            type="button"
            onClick={handleCopyUri}
            className="text-[10px] font-mono text-gray-400 hover:text-purple-300 transition-colors cursor-pointer flex items-center gap-1"
          >
            {copiedLink ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300">UPI intent link copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy direct UPI link</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
