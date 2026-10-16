/**
 * VIB Digital Services Platform - Riot Games / Valorant ID Verification Utility
 * Connects frontend forms to backend verification engine.
 * Never requests, handles, or reveals user emails or sensitive credentials.
 */

export interface RiotVerificationResponse {
  exists: boolean;
  verified: boolean;
  gameName?: string;
  tagLine?: string;
  riotId?: string;
  region?: string;
  accountLevel?: number;
  cardSmall?: string;
  message?: string;
  error?: string;
  source?: string;
}

/**
 * Client helper to verify if a Riot ID (Name#TAG or separate Name & Tag) is a real, legitimate Valorant ID.
 */
export async function verifyRiotIdOnServer(
  gameName: string,
  tagLine?: string
): Promise<RiotVerificationResponse> {
  const trimmedName = (gameName || '').trim();
  const trimmedTag = (tagLine || '').trim();

  if (!trimmedName) {
    return {
      exists: false,
      verified: false,
      error: 'Please enter a Riot username.',
    };
  }

  try {
    const res = await fetch('/api/riot/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameName: trimmedName,
        tagLine: trimmedTag || undefined,
        riotId: !trimmedTag && trimmedName.includes('#') ? trimmedName : undefined,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.exists) {
      return {
        exists: true,
        verified: true,
        gameName: data.gameName,
        tagLine: data.tagLine,
        riotId: data.riotId,
        region: data.region,
        accountLevel: data.accountLevel,
        cardSmall: data.cardSmall,
        message: data.message || 'Legitimate Valorant Riot ID verified.',
        source: data.source,
      };
    }

    return {
      exists: false,
      verified: true,
      error: data?.error || 'Valorant account not found on official Riot servers.',
      message: data?.message,
    };
  } catch (err: any) {
    console.error('Riot verification network error:', err);
    return {
      exists: false,
      verified: false,
      error: 'Unable to reach Riot verification service. Please try again.',
    };
  }
}
