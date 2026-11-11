import React from 'react';

interface VIBLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const VIBLogo: React.FC<VIBLogoProps> = ({ 
  className = '', 
  size = 'md',
  showSubtitle = false 
}) => {
  const heightClasses = {
    sm: 'h-8',
    md: 'h-11',
    lg: 'h-14'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className={`relative flex items-center justify-center ${heightClasses[size]}`}>
        {/* Violet Neon Glow Effect */}
        <div className="absolute inset-0 bg-purple-600/30 blur-lg rounded-full pointer-events-none scale-125" />
        
        {/* 8K Liquid Metallic Chrome VIB Logo */}
        <img 
          src="/assets/hires/vib_logo_metallic_hires.png" 
          alt="VIB Logo" 
          className="h-full w-auto object-contain relative z-10 filter drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/assets/client/vib-logo.png';
          }}
        />
      </div>

      {showSubtitle && (
        <div className="hidden sm:flex flex-col">
          <span className="text-[11px] font-mono tracking-widest uppercase text-purple-400 font-bold leading-tight">
            DIGITAL SERVICES
          </span>
          <span className="text-[9px] font-mono tracking-wider text-white/50 leading-tight">
            DIGITAL MARKETPLACE &amp; ESCROW
          </span>
        </div>
      )}
    </div>
  );
};
