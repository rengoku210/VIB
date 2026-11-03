export interface AuctionTimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

export const getAuctionTimeLeft = (endsAt: string | null): AuctionTimeLeft => {
  if (!endsAt) return { hours: 0, minutes: 0, seconds: 0 };

  const endTime = Date.parse(endsAt);
  if (!Number.isFinite(endTime)) return { hours: 0, minutes: 0, seconds: 0 };

  const remainingSeconds = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
  return {
    hours: Math.floor(remainingSeconds / 3600),
    minutes: Math.floor((remainingSeconds % 3600) / 60),
    seconds: remainingSeconds % 60,
  };
};
