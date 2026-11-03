/**
 * Official VALORANT Competitive Tier Rank Mapping Service
 * Fetches latest tier icons from valorant-api.com with local storage caching
 * and instant high-res fallback from VALORANT_RANKS.
 */

import { useState, useEffect } from 'react';

export type ValorantRankGroup =
  | 'Iron'
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Ascendant'
  | 'Immortal'
  | 'Radiant';

// Reliable high-resolution fallback icons matching RankProgressionCalculator
export const FALLBACK_RANK_ICONS: Record<ValorantRankGroup, string> = {
  Iron: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/4/largeicon.png',
  Bronze: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/7/largeicon.png',
  Silver: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/10/largeicon.png',
  Gold: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/13/largeicon.png',
  Platinum: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/16/largeicon.png',
  Diamond: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/19/largeicon.png',
  Ascendant: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/22/largeicon.png',
  Immortal: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/25/largeicon.png',
  Radiant: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/27/largeicon.png',
};

const CACHE_KEY = 'vib_valorant_rank_icons_v1';
let memoryCache: Record<ValorantRankGroup, string> | null = null;
let fetchPromise: Promise<Record<ValorantRankGroup, string>> | null = null;

// Helper to get from local/session storage if available
function getStoredCache(): Record<ValorantRankGroup, string> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY) || sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.Iron && parsed.Radiant) {
        return parsed as Record<ValorantRankGroup, string>;
      }
    }
  } catch {}
  return null;
}

// Helper to persist in storage
function saveStoredCache(data: Record<ValorantRankGroup, string>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {}
  }
}

/**
 * Fetch rank icons from official Valorant API with deduplication & caching
 */
export async function fetchRankBadges(): Promise<Record<ValorantRankGroup, string>> {
  if (memoryCache) return memoryCache;

  const stored = getStoredCache();
  if (stored) {
    memoryCache = stored;
    return stored;
  }

  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch('https://valorant-api.com/v1/competitivetiers');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const latest = json.data && json.data.length > 0 ? json.data[json.data.length - 1] : null;

      if (!latest || !Array.isArray(latest.tiers)) {
        throw new Error('Invalid API response shape');
      }

      const groups: ValorantRankGroup[] = [
        'Iron',
        'Bronze',
        'Silver',
        'Gold',
        'Platinum',
        'Diamond',
        'Ascendant',
        'Immortal',
        'Radiant',
      ];

      const mapped: Partial<Record<ValorantRankGroup, string>> = {};

      for (const group of groups) {
        // Find mid division (division 2) or Radiant
        const tier = latest.tiers.find(
          (t: any) =>
            t.divisionName &&
            t.divisionName.toUpperCase() === group.toUpperCase() &&
            (t.tier % 3 === 1 || group === 'Radiant')
        );

        if (tier && (tier.largeIcon || tier.smallIcon)) {
          mapped[group] = tier.largeIcon || tier.smallIcon;
        } else {
          mapped[group] = FALLBACK_RANK_ICONS[group];
        }
      }

      const finalMapping = { ...FALLBACK_RANK_ICONS, ...mapped } as Record<ValorantRankGroup, string>;
      memoryCache = finalMapping;
      saveStoredCache(finalMapping);
      return finalMapping;
    } catch (err) {
      console.warn('VALORANT rank API fetch failed, using fallback rank icons:', err);
      memoryCache = { ...FALLBACK_RANK_ICONS };
      return memoryCache;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Synchronous getter returning immediate icon URL (memoryCache -> storedCache -> FALLBACK_RANK_ICONS)
 */
export function getRankBadgeUrl(group: string): string {
  const normGroup = (group.charAt(0).toUpperCase() + group.slice(1).toLowerCase()) as ValorantRankGroup;
  if (memoryCache && memoryCache[normGroup]) {
    return memoryCache[normGroup];
  }
  const stored = getStoredCache();
  if (stored && stored[normGroup]) {
    memoryCache = stored;
    return stored[normGroup];
  }
  return FALLBACK_RANK_ICONS[normGroup] || FALLBACK_RANK_ICONS.Iron;
}

/**
 * React hook to access live/cached rank icons
 */
export function useRankBadges(): Record<ValorantRankGroup, string> {
  const [badges, setBadges] = useState<Record<ValorantRankGroup, string>>(() => {
    return memoryCache || getStoredCache() || { ...FALLBACK_RANK_ICONS };
  });

  useEffect(() => {
    let isMounted = true;
    fetchRankBadges().then((result) => {
      if (isMounted) {
        setBadges(result);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return badges;
}
