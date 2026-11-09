// Agreement Generator for VIB 2.0 Flexible Payment Plans
// Supports VP Services Agreement & Digital Profile Services Agreement

export interface CustomerAgreementData {
  fullName: string;
  dob?: string;
  phone?: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  guardianName?: string;
  guardianRelation?: string;
}

export interface ServiceAgreementData {
  serviceType: 'vp' | 'account';
  title: string;
  region?: 'in' | 'php';
  listingId?: string;
  specsSummary?: string;
}

export interface FinancialAgreementData {
  serviceCost: number;
  downPayment: number;
  downPaymentPct?: number;
  principalBalance: number;
  fixedProfit: number;
  totalPayable: number;
  installmentAmount: number;
  installmentsCount: number;
  paymentFrequency: 'weekly' | 'monthly';
  weeklyLateFee?: number;
  monthlyLateFee?: number;
}

export interface ScheduleItem {
  installmentNo: number;
  dueDate: string;
  amount: number;
}

export interface AgreementContext {
  agreementRef: string;
  orderId?: string;
  version: string;
  dateStr: string;
  customer: CustomerAgreementData;
  service: ServiceAgreementData;
  financials: FinancialAgreementData;
  schedule: ScheduleItem[];
  signatureDataUrl?: string;
  ipAddress?: string;
}

function escapeHtml(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const formatINR = (n: number): string =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function generateFlexiblePaymentAgreementHtml(ctx: AgreementContext): string {
  const isVP = ctx.service.serviceType === 'vp';
  const agreementTitle = isVP
    ? 'FLEXIBLE PAYMENT PLAN AGREEMENT — VP SERVICES'
    : 'FLEXIBLE PAYMENT PLAN AGREEMENT — DIGITAL PROFILE SERVICES';
  const serviceCategoryLabel = isVP
    ? `Valorant Points Top-Up (${ctx.service.region === 'php' ? 'Philippines Region' : 'Indian Region'})`
    : 'Digital Profile & Valorant Account Services';

  const weeklyLateFee = ctx.financials.weeklyLateFee || 300;
  const monthlyLateFee = ctx.financials.monthlyLateFee || 1500;

  const scheduleRows = ctx.schedule.map((item) => `
    <tr>
      <td style="padding: 10px 14px; border: 1px solid #33294d; font-family: monospace;">#${item.installmentNo}</td>
      <td style="padding: 10px 14px; border: 1px solid #33294d;">${escapeHtml(item.dueDate)}</td>
      <td style="padding: 10px 14px; border: 1px solid #33294d; font-weight: bold; color: #a855f7;">${formatINR(item.amount)}</td>
      <td style="padding: 10px 14px; border: 1px solid #33294d; color: #f59e0b; font-size: 11px; text-transform: uppercase;">Scheduled</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(agreementTitle)}</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: #0c0a18;
    color: #e2e8f0;
    line-height: 1.6;
    margin: 0;
    padding: 32px 20px;
  }
  .agreement-container {
    max-width: 860px;
    margin: 0 auto;
    background-color: #120e24;
    border: 1px solid #33294d;
    border-radius: 12px;
    padding: 36px 40px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .header-brand {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #581c87;
    padding-bottom: 18px;
    margin-bottom: 24px;
  }
  .logo-title {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #a855f7;
    margin: 0;
  }
  .logo-sub {
    font-size: 11px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
  }
  .ref-box {
    text-align: right;
    font-family: monospace;
    font-size: 12px;
    color: #cbd5e1;
  }
  h1 {
    font-size: 20px;
    font-weight: 800;
    color: #ffffff;
    text-align: center;
    margin: 24px 0 20px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .meta-table {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0 28px;
    font-size: 13px;
  }
  .meta-table th, .meta-table td {
    padding: 8px 12px;
    border: 1px solid #2e2648;
    text-align: left;
  }
  .meta-table th {
    background: #1a1435;
    color: #c084fc;
    width: 35%;
  }
  .section-title {
    font-size: 14px;
    font-weight: 700;
    color: #c084fc;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-left: 4px solid #a855f7;
    padding-left: 10px;
    margin: 28px 0 14px;
  }
  p, li {
    font-size: 13px;
    color: #cbd5e1;
  }
  .financial-grid {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 24px;
    font-size: 13px;
  }
  .financial-grid th, .financial-grid td {
    padding: 10px 14px;
    border: 1px solid #33294d;
  }
  .financial-grid th {
    background: #1e173e;
    color: #f3e8ff;
    text-align: left;
  }
  .schedule-table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 24px;
    font-size: 13px;
  }
  .schedule-table th {
    background: #1e173e;
    color: #f3e8ff;
    padding: 10px 14px;
    border: 1px solid #33294d;
    text-align: left;
  }
  .notice-box {
    background: #25122f;
    border: 1px solid #86198f;
    border-radius: 8px;
    padding: 16px 20px;
    margin: 20px 0;
    font-size: 12px;
    line-height: 1.6;
  }
  .signature-area {
    margin-top: 36px;
    padding-top: 20px;
    border-top: 1px solid #33294d;
    display: flex;
    justify-content: space-between;
    gap: 20px;
  }
  .sig-block {
    flex: 1;
    background: #16112e;
    border: 1px dashed #4c3870;
    border-radius: 8px;
    padding: 16px;
  }
  .sig-img {
    max-height: 60px;
    max-width: 180px;
    display: block;
    margin-top: 10px;
  }
  @media print {
    body { background: #ffffff; color: #111827; }
    .agreement-container { background: #ffffff; border: none; box-shadow: none; color: #111827; }
    .header-brand { border-bottom-color: #6b21a8; }
    .logo-title { color: #6b21a8; }
    .meta-table th { background: #f3f4f6; color: #1f2937; }
    .meta-table th, .meta-table td, .financial-grid th, .financial-grid td, .schedule-table th, .schedule-table td {
      border-color: #d1d5db; color: #111827;
    }
    .financial-grid th, .schedule-table th { background: #f3f4f6; color: #111827; }
    .notice-box { background: #faf5ff; border-color: #d8b4fe; color: #3b0764; }
    .sig-block { background: #f9fafb; border-color: #9ca3af; }
  }
</style>
</head>
<body>
<div class="agreement-container">
  <div class="header-brand">
    <div>
      <div class="logo-title">VIB 2.0</div>
      <div class="logo-sub">Digital Services &amp; Escrow Platform</div>
    </div>
    <div class="ref-box">
      <div><strong>Ref:</strong> ${escapeHtml(ctx.agreementRef)}</div>
      <div><strong>Date:</strong> ${escapeHtml(ctx.dateStr)}</div>
      <div><strong>Version:</strong> ${escapeHtml(ctx.version)}</div>
      ${ctx.orderId ? `<div><strong>Order:</strong> ${escapeHtml(ctx.orderId)}</div>` : ''}
    </div>
  </div>

  <h1>${escapeHtml(agreementTitle)}</h1>

  <div class="section-title">Part 1 — Parties &amp; Recitals</div>
  <table class="meta-table">
    <tr>
      <th>Platform Provider</th>
      <td><strong>VIB Digital Services Platform</strong> (thevibofficial@gmail.com / teamvibofficial@gmail.com)</td>
    </tr>
    <tr>
      <th>Customer Legal Name</th>
      <td><strong>${escapeHtml(ctx.customer.fullName)}</strong></td>
    </tr>
    <tr>
      <th>Email Address</th>
      <td>${escapeHtml(ctx.customer.email)}</td>
    </tr>
    <tr>
      <th>Mobile Number</th>
      <td>${escapeHtml(ctx.customer.phone || 'Recorded on Profile')}</td>
    </tr>
    <tr>
      <th>Residential Address</th>
      <td>${escapeHtml(ctx.customer.address || 'Address provided during KYC')}, ${escapeHtml(ctx.customer.city || '')} ${escapeHtml(ctx.customer.state || '')} ${escapeHtml(ctx.customer.country || 'India')}</td>
    </tr>
    ${ctx.customer.guardianName ? `
    <tr>
      <th>Guardian Name &amp; Relation</th>
      <td>${escapeHtml(ctx.customer.guardianName)} (${escapeHtml(ctx.customer.guardianRelation || 'Legal Guardian')})</td>
    </tr>` : ''}
  </table>

  <div class="section-title">Part 2 — Service Scope &amp; Identification</div>
  <table class="meta-table">
    <tr>
      <th>Service Category</th>
      <td>${escapeHtml(serviceCategoryLabel)}</td>
    </tr>
    <tr>
      <th>Service Title / Product</th>
      <td><strong>${escapeHtml(ctx.service.title)}</strong></td>
    </tr>
    ${ctx.service.listingId ? `
    <tr>
      <th>Listing / Inventory ID</th>
      <td>${escapeHtml(ctx.service.listingId)}</td>
    </tr>` : ''}
    ${ctx.service.specsSummary ? `
    <tr>
      <th>Specifications</th>
      <td>${escapeHtml(ctx.service.specsSummary)}</td>
    </tr>` : ''}
  </table>

  <div class="section-title">Part 3 — Financial Structure &amp; Installment Obligations</div>
  <table class="financial-grid">
    <tr>
      <th>Total Contract Service Cost</th>
      <td><strong>${formatINR(ctx.financials.serviceCost)}</strong></td>
    </tr>
    <tr>
      <th>Initial Down Payment</th>
      <td><strong>${formatINR(ctx.financials.downPayment)}</strong> ${ctx.financials.downPaymentPct ? `(${ctx.financials.downPaymentPct}%)` : ''}</td>
    </tr>
    <tr>
      <th>Remaining Principal Balance</th>
      <td>${formatINR(ctx.financials.principalBalance)}</td>
    </tr>
    <tr>
      <th>Fixed Profit / Platform Fee</th>
      <td>${formatINR(ctx.financials.fixedProfit)}</td>
    </tr>
    <tr style="background: rgba(168,85,247,0.12);">
      <th>Total Payable Balance</th>
      <td><strong style="color: #c084fc; font-size: 15px;">${formatINR(ctx.financials.totalPayable)}</strong></td>
    </tr>
    <tr>
      <th>Installment Frequency &amp; Count</th>
      <td>${ctx.financials.installmentsCount} ${ctx.financials.paymentFrequency === 'weekly' ? 'Weekly' : 'Monthly'} Installments</td>
    </tr>
    <tr>
      <th>Amount Per Installment</th>
      <td><strong>${formatINR(ctx.financials.installmentAmount)}</strong> / ${ctx.financials.paymentFrequency === 'weekly' ? 'week' : 'month'}</td>
    </tr>
  </table>

  <div class="section-title">Part 4 — Approved Installment Schedule</div>
  <table class="schedule-table">
    <thead>
      <tr>
        <th>Inst. #</th>
        <th>Scheduled Due Date</th>
        <th>Amount Payable</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${scheduleRows}
    </tbody>
  </table>

  <div class="notice-box">
    <div style="font-weight: bold; color: #f472b6; margin-bottom: 6px; text-transform: uppercase;">
      Important Notice: Late Payment Policy &amp; Default Consequences
    </div>
    <ul style="margin: 0; padding-left: 18px;">
      <li><strong>Installment Discipline:</strong> Every installment must be paid on or prior to the specified due date through authorized VIB UPI QR verification channels.</li>
      <li><strong>Late-Payment Policy:</strong> For weekly payment plans, a late-payment fee of <strong>₹${weeklyLateFee} per week</strong> applies. For monthly payment plans, a late-payment fee of <strong>₹${monthlyLateFee} per monthly occurrence</strong> applies on overdue balances in accordance with the documented cumulative schedule.</li>
      <li><strong>Default &amp; Access Revocation:</strong> Failure to settle overdue installments within 7 calendar days of notice will result in immediate suspension of account credentials, forfeiture of warranties, and initiation of dispute and recovery procedures.</li>
      <li><strong>Non-Transferability:</strong> Flexible Payment Plans cannot be transferred, assigned, or sold to third parties without prior written consent from VIB Digital Services.</li>
    </ul>
  </div>

  <div class="section-title">Part 5 — Electronic Acceptance &amp; Declarations</div>
  <p>
    By executing this Agreement electronically, the Customer acknowledges that they have read, understood, and voluntarily agree to all terms, covenants, and schedule obligations set forth herein.
  </p>

  <div class="signature-area">
    <div class="sig-block">
      <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8;">For VIB Digital Services Platform</div>
      <div style="font-weight: bold; color: #ffffff; margin-top: 4px;">Authorized Administrator</div>
      <div style="font-family: monospace; font-size: 11px; color: #a855f7; margin-top: 6px;">ELECTRONICALLY VERIFIED &amp; SEALED</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">VIB Trust &amp; Escrow Infrastructure</div>
    </div>
    <div class="sig-block">
      <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8;">Customer Electronic Acceptance</div>
      <div style="font-weight: bold; color: #ffffff; margin-top: 4px;">${escapeHtml(ctx.customer.fullName)}</div>
      ${ctx.signatureDataUrl ? `<img src="${ctx.signatureDataUrl}" alt="Customer Signature" class="sig-img" />` : '<div style="font-style: italic; color: #94a3b8; font-size: 12px; margin-top: 8px;">[Electronically Signed &amp; Accepted]</div>'}
      <div style="font-size: 10px; color: #64748b; margin-top: 6px; font-family: monospace;">
        Timestamp: ${escapeHtml(ctx.dateStr)}<br/>
        IP Reference: ${escapeHtml(ctx.ipAddress || 'Verified User Session')}
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}
