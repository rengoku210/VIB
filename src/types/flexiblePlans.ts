export type FlexibleServiceType = 'vp' | 'account';
export type FlexibleRegion = 'in' | 'php' | 'ap' | string;
export type FlexiblePaymentFrequency = 'weekly' | 'monthly';

export interface FlexiblePlanSelection {
  serviceType: FlexibleServiceType;
  region?: FlexibleRegion;
  // For VP:
  vpAmount?: number;
  vpPackageId?: string;
  // For Account:
  listingId?: string;
  listingTitle?: string;
  listingRank?: string;
  listingImage?: string;
  listingSeller?: string;

  // Financial parameters:
  productTitle: string;
  productPrice: number;
  downPaymentPercent: number;
  downPaymentAmount: number;
  financedAmount: number;
  fixedProfit: number;
  totalPayable: number;

  // Tenure & frequency:
  paymentFrequency: FlexiblePaymentFrequency;
  totalInstallments: number;
  installmentAmount: number;

  // Policy & Slabs:
  slabName?: string;
  weeklyLateFee: number;
  monthlyLateFee: number;
}

export interface FlexibleKycFormData {
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  primaryDocType: string;
  primaryDocNumber: string;
  primaryDocImage: string;
  secondaryDocType: string;
  secondaryDocNumber: string;
  secondaryDocImage: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianPhone?: string;
}
