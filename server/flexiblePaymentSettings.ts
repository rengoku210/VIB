// Flexible Payment Plans Configuration & Calculation Engine
// Independent engines for VP Services and Lifetime Guaranteed Accounts
import crypto from 'node:crypto';
import { db } from './db.js';

export interface VpPaymentPlanOption {
  id: string;
  name: string;
  frequency: 'weekly' | 'monthly' | '15days';
  duration: number; // in weeks or months
  installmentAmount: number;
  downPayment: number;
  balance: number;
  totalPayable: number;
  description?: string;
}

export interface VpPackageFlexibleConfig {
  id: string;
  vpAmount: number;
  name: string;
  priceINR: number;
  downPaymentPct: number;
  downPaymentINR: number;
  badge?: string;
  payAfter15DaysPrice?: number;
  plans: VpPaymentPlanOption[];
}

export interface VpFlexibleSettings {
  category: 'vp';
  in: {
    enabled: boolean;
    packages: VpPackageFlexibleConfig[];
  };
  php: {
    enabled: boolean;
    packages: VpPackageFlexibleConfig[];
  };
  weeklyLateFee: number;
  monthlyLateFee: number;
}

export interface AccountSlabConfig {
  id: string;
  name: string;
  minPrice: number;
  maxPrice: number;
  downPaymentPct: number;
  fixedProfit: number;
  options: Array<{
    name: string;
    frequency: 'weekly' | 'monthly';
    installments: number;
  }>;
}

export interface AccountFlexibleSettings {
  category: 'account';
  enabled: boolean;
  minAmount: number;
  slabs: AccountSlabConfig[];
  weeklyLateFee: number;
  monthlyLateFee: number;
}

export const DEFAULT_VP_SETTINGS: VpFlexibleSettings = {
  category: 'vp',
  in: {
    enabled: true,
    packages: [
      {
        id: 'vp-in-1000',
        vpAmount: 1000,
        name: '1,000 Valorant Points',
        priceINR: 1190,
        downPaymentPct: 0,
        downPaymentINR: 0,
        payAfter15DaysPrice: 1190,
        plans: [
          {
            id: 'in-1k-w4',
            name: '₹398 × 4 Weeks',
            frequency: 'weekly',
            duration: 4,
            installmentAmount: 398,
            downPayment: 0,
            balance: 1592,
            totalPayable: 1592,
            description: 'Pay ₹398 every week for 4 weeks.'
          },
          {
            id: 'in-1k-m4',
            name: '₹597 × 4 Months',
            frequency: 'monthly',
            duration: 4,
            installmentAmount: 597,
            downPayment: 0,
            balance: 2388,
            totalPayable: 2388,
            description: 'Pay ₹597 every month for 4 months.'
          }
        ]
      },
      {
        id: 'vp-in-2050',
        vpAmount: 2050,
        name: '2,050 Valorant Points',
        priceINR: 2290,
        downPaymentPct: 0,
        downPaymentINR: 0,
        payAfter15DaysPrice: 2290,
        plans: [
          {
            id: 'in-2k-w6',
            name: '₹395 × 6 Weeks',
            frequency: 'weekly',
            duration: 6,
            installmentAmount: 395,
            downPayment: 0,
            balance: 2370,
            totalPayable: 2370,
            description: 'Pay ₹395 every week for 6 weeks.'
          },
          {
            id: 'in-2k-m3',
            name: '₹790 × 3 Months',
            frequency: 'monthly',
            duration: 3,
            installmentAmount: 790,
            downPayment: 0,
            balance: 2370,
            totalPayable: 2370,
            description: 'Pay ₹790 every month for 3 months.'
          }
        ]
      },
      {
        id: 'vp-in-5350',
        vpAmount: 5350,
        name: '5,350 Valorant Points',
        priceINR: 5490,
        downPaymentPct: 0,
        downPaymentINR: 0,
        payAfter15DaysPrice: 5490,
        plans: [
          {
            id: 'in-5k-w12',
            name: '₹506 × 12 Weeks',
            frequency: 'weekly',
            duration: 12,
            installmentAmount: 506,
            downPayment: 0,
            balance: 6072,
            totalPayable: 6072,
            description: 'Pay ₹506 every week for 12 weeks.'
          },
          {
            id: 'in-5k-m4',
            name: '₹1,490 × 4 Months',
            frequency: 'monthly',
            duration: 4,
            installmentAmount: 1490,
            downPayment: 0,
            balance: 5960,
            totalPayable: 5960,
            description: 'Pay ₹1,490 every month for 4 months.'
          }
        ]
      },
      {
        id: 'vp-in-11000',
        vpAmount: 11000,
        name: '11,000 Valorant Points',
        priceINR: 8990,
        downPaymentPct: 0,
        downPaymentINR: 0,
        badge: 'MOST POPULAR',
        payAfter15DaysPrice: 8990,
        plans: [
          {
            id: 'in-11k-w12',
            name: '₹747 × 12 Weeks',
            frequency: 'weekly',
            duration: 12,
            installmentAmount: 747,
            downPayment: 0,
            balance: 8964,
            totalPayable: 8964,
            description: 'Pay ₹747 every week for 12 weeks.'
          },
          {
            id: 'in-11k-m4',
            name: '₹2,190 × 4 Months',
            frequency: 'monthly',
            duration: 4,
            installmentAmount: 2190,
            downPayment: 0,
            balance: 8760,
            totalPayable: 8760,
            description: 'Pay ₹2,190 every month for 4 months.'
          }
        ]
      },
      {
        id: 'vp-in-16500',
        vpAmount: 16500,
        name: '16,500 Valorant Points',
        priceINR: 12490,
        downPaymentPct: 0,
        downPaymentINR: 0,
        payAfter15DaysPrice: 12490,
        plans: [
          {
            id: 'in-16k-w12',
            name: '₹990 × 12 Weeks',
            frequency: 'weekly',
            duration: 12,
            installmentAmount: 990,
            downPayment: 0,
            balance: 11880,
            totalPayable: 11880,
            description: 'Pay ₹990 every week for 12 weeks.'
          },
          {
            id: 'in-16k-m4',
            name: '₹2,890 × 4 Months',
            frequency: 'monthly',
            duration: 4,
            installmentAmount: 2890,
            downPayment: 0,
            balance: 11560,
            totalPayable: 11560,
            description: 'Pay ₹2,890 every month for 4 months.'
          }
        ]
      },
      {
        id: 'vp-in-22000',
        vpAmount: 22000,
        name: '22,000 Valorant Points',
        priceINR: 15990,
        downPaymentPct: 0,
        downPaymentINR: 0,
        payAfter15DaysPrice: 15990,
        plans: [
          {
            id: 'in-22k-w12',
            name: '₹1,290 × 12 Weeks',
            frequency: 'weekly',
            duration: 12,
            installmentAmount: 1290,
            downPayment: 0,
            balance: 15480,
            totalPayable: 15480,
            description: 'Pay ₹1,290 every week for 12 weeks.'
          },
          {
            id: 'in-22k-m4',
            name: '₹3,750 × 4 Months',
            frequency: 'monthly',
            duration: 4,
            installmentAmount: 3750,
            downPayment: 0,
            balance: 15000,
            totalPayable: 15000,
            description: 'Pay ₹3,750 every month for 4 months.'
          }
        ]
      },
      {
        id: 'vp-in-35000',
        vpAmount: 35000,
        name: '35,000 Valorant Points',
        priceINR: 24990,
        downPaymentPct: 0,
        downPaymentINR: 0,
        payAfter15DaysPrice: 24990,
        plans: [
          {
            id: 'in-35k-w14',
            name: '₹1,869 × 14 Weeks',
            frequency: 'weekly',
            duration: 14,
            installmentAmount: 1869,
            downPayment: 0,
            balance: 26166,
            totalPayable: 26166,
            description: 'Pay ₹1,869 every week for 14 weeks.'
          },
          {
            id: 'in-35k-m4',
            name: '₹5,490 × 4 Months',
            frequency: 'monthly',
            duration: 4,
            installmentAmount: 5490,
            downPayment: 0,
            balance: 21960,
            totalPayable: 21960,
            description: 'Pay ₹5,490 every month for 4 months.'
          }
        ]
      }
    ]
  },
  php: {
    enabled: true,
    packages: [
      {
        id: 'vp-php-5400',
        vpAmount: 5400,
        name: '5,400 PHP Region VP',
        priceINR: 2800,
        downPaymentPct: 0,
        downPaymentINR: 0,
        payAfter15DaysPrice: 2800,
        plans: [
          {
            id: 'php-5k-w8',
            name: '₱350 × 8 Weeks',
            frequency: 'weekly',
            duration: 8,
            installmentAmount: 350,
            downPayment: 0,
            balance: 2800,
            totalPayable: 2800,
            description: 'Pay ₱350 every week for 8 weeks.'
          },
          {
            id: 'php-5k-m4',
            name: '₱700 × 4 Months',
            frequency: 'monthly',
            duration: 4,
            installmentAmount: 700,
            downPayment: 0,
            balance: 2800,
            totalPayable: 2800,
            description: 'Pay ₱700 every month for 4 months.'
          }
        ]
      },
      {
        id: 'vp-php-13750',
        vpAmount: 13750,
        name: '13,750 PHP Region VP',
        priceINR: 6200,
        downPaymentPct: 0,
        downPaymentINR: 0,
        payAfter15DaysPrice: 6200,
        plans: [
          {
            id: 'php-13k-w12',
            name: '₱550 × 12 Weeks',
            frequency: 'weekly',
            duration: 12,
            installmentAmount: 550,
            downPayment: 0,
            balance: 6600,
            totalPayable: 6600,
            description: 'Pay ₱550 every week for 12 weeks.'
          },
          {
            id: 'php-13k-m4',
            name: '₱1,650 × 4 Months',
            frequency: 'monthly',
            duration: 4,
            installmentAmount: 1650,
            downPayment: 0,
            balance: 6600,
            totalPayable: 6600,
            description: 'Pay ₱1,650 every month for 4 months.'
          }
        ]
      },
      {
        id: 'vp-php-20500',
        vpAmount: 20500,
        name: '20,500 PHP Region VP',
        priceINR: 8900,
        downPaymentPct: 0,
        downPaymentINR: 0,
        payAfter15DaysPrice: 8900,
        plans: [
          {
            id: 'php-20k-w12',
            name: '₱780 × 12 Weeks',
            frequency: 'weekly',
            duration: 12,
            installmentAmount: 780,
            downPayment: 0,
            balance: 9360,
            totalPayable: 9360,
            description: 'Pay ₱780 every week for 12 weeks.'
          },
          {
            id: 'php-20k-m4',
            name: '₱2,340 × 4 Months',
            frequency: 'monthly',
            duration: 4,
            installmentAmount: 2340,
            downPayment: 0,
            balance: 9360,
            totalPayable: 9360,
            description: 'Pay ₱2,340 every month for 4 months.'
          }
        ]
      },
      {
        id: 'vp-php-28000',
        vpAmount: 28000,
        name: '28,000 PHP Region VP',
        priceINR: 11900,
        downPaymentPct: 0,
        downPaymentINR: 0,
        payAfter15DaysPrice: 11900,
        plans: [
          {
            id: 'php-28k-w12',
            name: '₱990 × 12 Weeks',
            frequency: 'weekly',
            duration: 12,
            installmentAmount: 990,
            downPayment: 0,
            balance: 11880,
            totalPayable: 11880,
            description: 'Pay ₱990 every week for 12 weeks.'
          },
          {
            id: 'php-28k-m4',
            name: '₱2,970 × 4 Months',
            frequency: 'monthly',
            duration: 4,
            installmentAmount: 2970,
            downPayment: 0,
            balance: 11880,
            totalPayable: 11880,
            description: 'Pay ₱2,970 every month for 4 months.'
          }
        ]
      }
    ]
  },
  weeklyLateFee: 300,
  monthlyLateFee: 1500
};

export const DEFAULT_ACCOUNT_SETTINGS: AccountFlexibleSettings = {
  category: 'account',
  enabled: true,
  minAmount: 1500,
  slabs: [
    {
      id: 'slab-1',
      name: 'Entry Tier (₹1,500 – ₹5,000)',
      minPrice: 1500,
      maxPrice: 5000,
      downPaymentPct: 30,
      fixedProfit: 450,
      options: [
        { name: '4 Weeks (Weekly)', frequency: 'weekly', installments: 4 },
        { name: '2 Months (Monthly)', frequency: 'monthly', installments: 2 }
      ]
    },
    {
      id: 'slab-2',
      name: 'Mid Tier (₹5,001 – ₹12,000)',
      minPrice: 5001,
      maxPrice: 12000,
      downPaymentPct: 30,
      fixedProfit: 950,
      options: [
        { name: '6 Weeks (Weekly)', frequency: 'weekly', installments: 6 },
        { name: '8 Weeks (Weekly)', frequency: 'weekly', installments: 8 },
        { name: '3 Months (Monthly)', frequency: 'monthly', installments: 3 }
      ]
    },
    {
      id: 'slab-3',
      name: 'High Tier (₹12,001 – ₹25,000)',
      minPrice: 12001,
      maxPrice: 25000,
      downPaymentPct: 35,
      fixedProfit: 1850,
      options: [
        { name: '8 Weeks (Weekly)', frequency: 'weekly', installments: 8 },
        { name: '3 Months (Monthly)', frequency: 'monthly', installments: 3 },
        { name: '4 Months (Monthly)', frequency: 'monthly', installments: 4 }
      ]
    },
    {
      id: 'slab-4',
      name: 'Elite Tier (₹25,001+)',
      minPrice: 25001,
      maxPrice: 999999,
      downPaymentPct: 40,
      fixedProfit: 2800,
      options: [
        { name: '3 Months (Monthly)', frequency: 'monthly', installments: 3 },
        { name: '4 Months (Monthly)', frequency: 'monthly', installments: 4 },
        { name: '6 Months (Monthly)', frequency: 'monthly', installments: 6 }
      ]
    }
  ],
  weeklyLateFee: 300,
  monthlyLateFee: 1500
};

// Seed or retrieve settings
export async function getVpFlexibleSettings(): Promise<VpFlexibleSettings> {
  try {
    const row = await db.prepare('SELECT settings_json FROM emi_settings WHERE category = ?').get('vp') as any;
    if (row?.settings_json) {
      const parsed = JSON.parse(row.settings_json);
      const existingInMap = new Map<string, any>((parsed.in?.packages || []).map((p: any) => [p.id, p]));
      const mergedIn = DEFAULT_VP_SETTINGS.in.packages.map((dp) => {
        const ep = existingInMap.get(dp.id);
        if (!ep) return dp;
        return {
          ...dp,
          ...ep,
          badge: dp.badge || ep.badge,
          payAfter15DaysPrice: dp.payAfter15DaysPrice || ep.payAfter15DaysPrice,
          plans: dp.plans,
        };
      });
      parsed.in = parsed.in || { enabled: true, packages: [] };
      parsed.in.packages = mergedIn;

      const existingPhpMap = new Map<string, any>((parsed.php?.packages || []).map((p: any) => [p.id, p]));
      const mergedPhp = DEFAULT_VP_SETTINGS.php.packages.map((dp) => {
        const ep = existingPhpMap.get(dp.id);
        if (!ep) return dp;
        return {
          ...dp,
          ...ep,
          badge: dp.badge || ep.badge,
          payAfter15DaysPrice: dp.payAfter15DaysPrice || ep.payAfter15DaysPrice,
          plans: dp.plans,
        };
      });
      parsed.php = parsed.php || { enabled: true, packages: [] };
      parsed.php.packages = mergedPhp;

      return parsed;
    }
    // Seed
    const now = new Date().toISOString();
    const id = 'set_' + crypto.randomBytes(6).toString('hex');
    await db.prepare('INSERT OR REPLACE INTO emi_settings (id, category, settings_json, updated_at) VALUES (?, ?, ?, ?)')
      .run(id, 'vp', JSON.stringify(DEFAULT_VP_SETTINGS), now);
    return DEFAULT_VP_SETTINGS;
  } catch (e) {
    console.error('[getVpFlexibleSettings error]:', e);
    return DEFAULT_VP_SETTINGS;
  }
}

export async function getAccountFlexibleSettings(): Promise<AccountFlexibleSettings> {
  try {
    const row = await db.prepare('SELECT settings_json FROM emi_settings WHERE category = ?').get('account') as any;
    if (row?.settings_json) {
      return JSON.parse(row.settings_json);
    }
    // Seed
    const now = new Date().toISOString();
    const id = 'set_' + crypto.randomBytes(6).toString('hex');
    await db.prepare('INSERT OR REPLACE INTO emi_settings (id, category, settings_json, updated_at) VALUES (?, ?, ?, ?)')
      .run(id, 'account', JSON.stringify(DEFAULT_ACCOUNT_SETTINGS), now);
    return DEFAULT_ACCOUNT_SETTINGS;
  } catch (e) {
    console.error('[getAccountFlexibleSettings error]:', e);
    return DEFAULT_ACCOUNT_SETTINGS;
  }
}

export async function saveVpFlexibleSettings(settings: VpFlexibleSettings, adminId: string): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.prepare('SELECT id FROM emi_settings WHERE category = ?').get('vp') as any;
  const id = existing?.id || ('set_' + crypto.randomBytes(6).toString('hex'));
  await db.prepare(`
    INSERT INTO emi_settings (id, category, settings_json, updated_at, updated_by)
    VALUES (?, 'vp', ?, ?, ?)
    ON CONFLICT(category) DO UPDATE SET
      settings_json = excluded.settings_json,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `).run(id, JSON.stringify(settings), now, adminId);
}

export async function saveAccountFlexibleSettings(settings: AccountFlexibleSettings, adminId: string): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.prepare('SELECT id FROM emi_settings WHERE category = ?').get('account') as any;
  const id = existing?.id || ('set_' + crypto.randomBytes(6).toString('hex'));
  await db.prepare(`
    INSERT INTO emi_settings (id, category, settings_json, updated_at, updated_by)
    VALUES (?, 'account', ?, ?, ?)
    ON CONFLICT(category) DO UPDATE SET
      settings_json = excluded.settings_json,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `).run(id, JSON.stringify(settings), now, adminId);
}

// Calculate account payment plans for a given account price
export interface CalculatedAccountPlan {
  id: string;
  name: string;
  frequency: 'weekly' | 'monthly';
  installments: number;
  serviceCost: number;
  downPaymentPct: number;
  downPaymentAmount: number;
  principalBalance: number;
  fixedProfit: number;
  totalPayable: number;
  installmentAmount: number;
  slabName: string;
}

export async function calculateAccountPlans(priceINR: number): Promise<CalculatedAccountPlan[]> {
  const cfg = await getAccountFlexibleSettings();
  if (!cfg.enabled || priceINR < cfg.minAmount) return [];

  const slab = cfg.slabs.find((s) => priceINR >= s.minPrice && priceINR <= s.maxPrice) || cfg.slabs[cfg.slabs.length - 1];
  if (!slab) return [];

  const downPaymentAmount = Math.round(priceINR * (slab.downPaymentPct / 100));
  const principalBalance = priceINR - downPaymentAmount;
  const totalPayable = principalBalance + slab.fixedProfit;

  return slab.options.map((opt, idx) => {
    const installmentAmount = Math.round(totalPayable / opt.installments);
    return {
      id: `acc-plan-${opt.frequency}-${opt.installments}-${idx}`,
      name: opt.name,
      frequency: opt.frequency,
      installments: opt.installments,
      serviceCost: priceINR,
      downPaymentPct: slab.downPaymentPct,
      downPaymentAmount,
      principalBalance,
      fixedProfit: slab.fixedProfit,
      totalPayable,
      installmentAmount,
      slabName: slab.name
    };
  });
}
