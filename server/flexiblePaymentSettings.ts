// Flexible Payment Plans Configuration & Calculation Engine
// Independent engines for VP Services and Lifetime Guaranteed Accounts
import crypto from 'node:crypto';
import { db } from './db.js';

export interface VpPaymentPlanOption {
  id: string;
  name: string;
  frequency: 'weekly' | 'monthly';
  duration: number; // in weeks or months
  installmentAmount: number;
  downPayment: number;
  balance: number;
  totalPayable: number;
}

export interface VpPackageFlexibleConfig {
  id: string;
  vpAmount: number;
  name: string;
  priceINR: number;
  downPaymentPct: number;
  downPaymentINR: number;
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
        id: 'vp-in-11000',
        vpAmount: 11000,
        name: '11,000 Valorant Points',
        priceINR: 7499,
        downPaymentPct: 30,
        downPaymentINR: 2250,
        plans: [
          { id: 'in-11k-w4', name: '4 Weeks Weekly Plan', frequency: 'weekly', duration: 4, installmentAmount: 1315, downPayment: 2250, balance: 5249, totalPayable: 7510 },
          { id: 'in-11k-m2', name: '2 Months Monthly Plan', frequency: 'monthly', duration: 2, installmentAmount: 2625, downPayment: 2250, balance: 5249, totalPayable: 7500 }
        ]
      },
      {
        id: 'vp-in-16500',
        vpAmount: 16500,
        name: '16,500 Valorant Points',
        priceINR: 10999,
        downPaymentPct: 30,
        downPaymentINR: 3300,
        plans: [
          { id: 'in-16k-w4', name: '4 Weeks Weekly Plan', frequency: 'weekly', duration: 4, installmentAmount: 1925, downPayment: 3300, balance: 7699, totalPayable: 11000 },
          { id: 'in-16k-m3', name: '3 Months Monthly Plan', frequency: 'monthly', duration: 3, installmentAmount: 2567, downPayment: 3300, balance: 7699, totalPayable: 11001 }
        ]
      },
      {
        id: 'vp-in-22000',
        vpAmount: 22000,
        name: '22,000 Valorant Points',
        priceINR: 14499,
        downPaymentPct: 30,
        downPaymentINR: 4350,
        plans: [
          { id: 'in-22k-w6', name: '6 Weeks Weekly Plan', frequency: 'weekly', duration: 6, installmentAmount: 1692, downPayment: 4350, balance: 10149, totalPayable: 14502 },
          { id: 'in-22k-m3', name: '3 Months Monthly Plan', frequency: 'monthly', duration: 3, installmentAmount: 3383, downPayment: 4350, balance: 10149, totalPayable: 14499 }
        ]
      },
      {
        id: 'vp-in-35000',
        vpAmount: 35000,
        name: '35,000 Valorant Points',
        priceINR: 22999,
        downPaymentPct: 35,
        downPaymentINR: 8050,
        plans: [
          { id: 'in-35k-w8', name: '8 Weeks Weekly Plan', frequency: 'weekly', duration: 8, installmentAmount: 1869, downPayment: 8050, balance: 14949, totalPayable: 23002 },
          { id: 'in-35k-m4', name: '4 Months Monthly Plan', frequency: 'monthly', duration: 4, installmentAmount: 3738, downPayment: 8050, balance: 14949, totalPayable: 23002 }
        ]
      }
    ]
  },
  php: {
    enabled: true,
    packages: [
      {
        id: 'vp-php-13750',
        vpAmount: 13750,
        name: '13,750 PHP Region VP',
        priceINR: 5499,
        downPaymentPct: 30,
        downPaymentINR: 1650,
        plans: [
          { id: 'php-13k-w4', name: '4 Weeks Weekly Plan', frequency: 'weekly', duration: 4, installmentAmount: 965, downPayment: 1650, balance: 3849, totalPayable: 5510 },
          { id: 'php-13k-m2', name: '2 Months Monthly Plan', frequency: 'monthly', duration: 2, installmentAmount: 1925, downPayment: 1650, balance: 3849, totalPayable: 5500 }
        ]
      },
      {
        id: 'vp-php-20500',
        vpAmount: 20500,
        name: '20,500 PHP Region VP',
        priceINR: 7999,
        downPaymentPct: 30,
        downPaymentINR: 2400,
        plans: [
          { id: 'php-20k-w4', name: '4 Weeks Weekly Plan', frequency: 'weekly', duration: 4, installmentAmount: 1400, downPayment: 2400, balance: 5599, totalPayable: 8000 },
          { id: 'php-20k-m3', name: '3 Months Monthly Plan', frequency: 'monthly', duration: 3, installmentAmount: 1867, downPayment: 2400, balance: 5599, totalPayable: 8001 }
        ]
      },
      {
        id: 'vp-php-28000',
        vpAmount: 28000,
        name: '28,000 PHP Region VP',
        priceINR: 10499,
        downPaymentPct: 30,
        downPaymentINR: 3150,
        plans: [
          { id: 'php-28k-w6', name: '6 Weeks Weekly Plan', frequency: 'weekly', duration: 6, installmentAmount: 1225, downPayment: 3150, balance: 7349, totalPayable: 10500 },
          { id: 'php-28k-m3', name: '3 Months Monthly Plan', frequency: 'monthly', duration: 3, installmentAmount: 2450, downPayment: 3150, balance: 7349, totalPayable: 10500 }
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
      return JSON.parse(row.settings_json);
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
