import React, { useState, useEffect, useCallback } from 'react';
import { VP_PACKAGES } from '../data/packages';
import { Currency, VPPackage } from '../types';
import { AgentBackground } from './AgentBackground';
import { CyberBorders } from './CyberBorders';
import { CharacterStage } from './CharacterStage';
import { ProductInfo } from './ProductInfo';
import { PackageCardsBar } from './PackageCardsBar';
import { ComparisonModal } from './ComparisonModal';
import { soundFx } from '../utils/audio';

interface VPSelectorProps {
  currency: Currency;
  onOpenCheckoutGlobal?: (pkg: VPPackage) => void;
  onActiveChange?: (pkg: VPPackage) => void;
  initialIndex?: number;
}

export const VPSelector: React.FC<VPSelectorProps> = ({ currency, onOpenCheckoutGlobal, onActiveChange, initialIndex = 0 }) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (initialIndex !== undefined && initialIndex >= 0 && initialIndex < VP_PACKAGES.length) {
      setActiveIndex(initialIndex);
    }
  }, [initialIndex]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const currentPkg = VP_PACKAGES[activeIndex];

  useEffect(() => {
    onActiveChange?.(currentPkg);
  }, [activeIndex, currentPkg, onActiveChange]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => {
      const nextIdx = prev === 0 ? VP_PACKAGES.length - 1 : prev - 1;
      soundFx.playTransitionSound(VP_PACKAGES[nextIdx].theme.primaryColor);
      return nextIdx;
    });
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => {
      const nextIdx = prev === VP_PACKAGES.length - 1 ? 0 : prev + 1;
      soundFx.playTransitionSound(VP_PACKAGES[nextIdx].theme.primaryColor);
      return nextIdx;
    });
  }, []);

  // Keyboard navigation: Left / Right arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isComparisonOpen) return;
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, isComparisonOpen]);

  return (
    <section className="relative w-full min-h-[calc(100vh-68px)] flex flex-col justify-between overflow-hidden">
      {/* 1. Cinematic Background Layer with Smooth Color Dissolve */}
      <AgentBackground packages={VP_PACKAGES} activeIndex={activeIndex} />

      {/* 2. Sci-Fi Cyber Frame, Navigation Chevrons, Graffiti Overlays */}
      <CyberBorders
        currentPkg={currentPkg}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      {/* 3. Main Stage Layout (Character + VP Product Information) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 flex-1 flex flex-col lg:flex-row items-center justify-between py-2 lg:py-4">
        {/* Left / Center-Left: High-Resolution Character Display - Fluidly Sized */}
        <div className="w-full lg:w-3/5 h-[360px] sm:h-[440px] lg:h-[calc(100vh-270px)] min-h-[380px] max-h-[540px] relative flex items-center justify-center">
          <CharacterStage currentPkg={currentPkg} />
        </div>

        {/* Right / Center-Right: VP Package Product Information */}
        <div className="w-full lg:w-2/5 flex items-center justify-center lg:justify-end mt-2 lg:mt-0">
          <ProductInfo
            currentPkg={currentPkg}
            currency={currency}
            onBuyNow={() => onOpenCheckoutGlobal?.(currentPkg)}
            onViewAll={() => setIsComparisonOpen(true)}
          />
        </div>
      </div>

      {/* 4. Bottom 6 Package Cards Bar */}
      <PackageCardsBar
        packages={VP_PACKAGES}
        activeIndex={activeIndex}
        onSelect={(index) => setActiveIndex(index)}
        currency={currency}
      />

      {/* Interactive Comparison Modal */}
      <ComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        packages={VP_PACKAGES}
        selectedIndex={activeIndex}
        onSelectTier={(index) => {
          soundFx.playTransitionSound(VP_PACKAGES[index].theme.primaryColor);
          setActiveIndex(index);
        }}
        currency={currency}
      />
    </section>
  );
};
