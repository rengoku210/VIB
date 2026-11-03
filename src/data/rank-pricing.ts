export interface RankTierRate {
  id: string;
  name: string;
  group: 'Iron' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Ascendant' | 'Immortal' | 'Radiant';
  division: number;
  tierIndex: number;
  costToNext: number;
  stdDeliveryHours: number;
  priorityDeliveryHours: number;
  icon: string;
}

const groups = [
  { group: 'Iron', prefix: 'iron', ranks: ['Iron 1', 'Iron 2', 'Iron 3'], rate: 70, std: 24, priority: 3, icon: 3 },
  { group: 'Bronze', prefix: 'bronze', ranks: ['Bronze 1', 'Bronze 2', 'Bronze 3'], rate: 150, std: 24, priority: 3, icon: 6 },
  { group: 'Silver', prefix: 'silver', ranks: ['Silver 1', 'Silver 2', 'Silver 3'], rate: 200, std: 24, priority: 4, icon: 9 },
  { group: 'Gold', prefix: 'gold', ranks: ['Gold 1', 'Gold 2', 'Gold 3'], rate: 300, std: 48, priority: 6, icon: 12 },
  { group: 'Platinum', prefix: 'plat', ranks: ['Platinum 1', 'Platinum 2', 'Platinum 3'], rate: 500, std: 72, priority: 6, icon: 15 },
  { group: 'Diamond', prefix: 'dia', ranks: ['Diamond 1', 'Diamond 2', 'Diamond 3'], rate: 750, std: 72, priority: 24, icon: 18 },
  { group: 'Ascendant', prefix: 'asc', ranks: ['Ascendant 1', 'Ascendant 2', 'Ascendant 3'], rates: [1000, 1000, 2000], std: 96, priority: 48, icons: [21, 22, 23] },
  { group: 'Immortal', prefix: 'immo', ranks: ['Immortal 1', 'Immortal 2', 'Immortal 3'], rates: [3499, 5499, 9999], std: 120, priority: 72, icons: [24, 25, 26] },
] as const;

export const VALORANT_RANKS: RankTierRate[] = groups.flatMap((entry, groupIndex) => entry.ranks.map((name, divisionIndex) => ({
  id: `${entry.prefix}_${divisionIndex + 1}`,
  name,
  group: entry.group,
  division: divisionIndex + 1,
  tierIndex: groupIndex * 3 + divisionIndex,
  costToNext: 'rates' in entry ? entry.rates[divisionIndex] : entry.rate,
  stdDeliveryHours: entry.std,
  priorityDeliveryHours: entry.priority,
  icon: `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${'icons' in entry ? entry.icons[divisionIndex] : entry.icon + divisionIndex}/largeicon.png`,
})));

VALORANT_RANKS.push({
  id: 'radiant', name: 'Radiant', group: 'Radiant', division: 0, tierIndex: 24,
  costToNext: 0, stdDeliveryHours: 0, priorityDeliveryHours: 0,
  icon: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/27/largeicon.png',
});
