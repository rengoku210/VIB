// Client-side Agreement Templates for Flexible Payment Plans

export interface AgreementData {
  agreementRef: string;
  customer: {
    fullName: string;
    dob?: string;
    phone?: string;
    email: string;
    address?: string;
    city?: string;
    state?: string;
    guardianName?: string;
    guardianRelation?: string;
  };
  service: {
    serviceType: 'vp' | 'account';
    title: string;
    region?: string;
    listingId?: string;
  };
  financials: {
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
  };
  schedule: Array<{
    installmentNo: number;
    dueDate: string;
    amount: number;
  }>;
  signatureDataUrl?: string;
}

export function generateVpAgreementHtml(data: AgreementData): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>VP Services Flexible Payment Plan Agreement - ${data.agreementRef}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; }
    h1 { color: #581c87; font-size: 22px; border-bottom: 2px solid #a855f7; padding-bottom: 10px; }
    h2 { color: #6b21a8; font-size: 16px; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #f3e8ff; color: #6b21a8; }
    .sig-box { margin-top: 30px; border: 1px dashed #94a3b8; padding: 16px; border-radius: 8px; width: 300px; }
    .sig-img { max-height: 60px; }
  </style>
</head>
<body>
  <h1>VP SERVICES FLEXIBLE PAYMENT PLAN AGREEMENT</h1>
  <p><strong>Agreement Reference:</strong> ${data.agreementRef} &bull; <strong>Execution Date:</strong> ${dateStr}</p>
  <p>This Flexible Payment Plan Agreement ("Agreement") is executed by and between <strong>VIB Digital Services Platform</strong> ("Platform" / "VIB") and the undersigned Customer.</p>

  <h2>1. PARTIES & CUSTOMER IDENTIFICATION</h2>
  <table>
    <tr><th>Customer Full Name</th><td>${data.customer.fullName}</td><th>Date of Birth</th><td>${data.customer.dob || '—'}</td></tr>
    <tr><th>Email Address</th><td>${data.customer.email}</td><th>Mobile Number</th><td>${data.customer.phone || '—'}</td></tr>
    <tr><th>Residential Address</th><td colspan="3">${data.customer.address || '—'}, ${data.customer.city || ''}, ${data.customer.state || ''}</td></tr>
    ${data.customer.guardianName ? `<tr><th>Guardian Name</th><td>${data.customer.guardianName} (${data.customer.guardianRelation})</td><th colspan="2">Minor Verified</th></tr>` : ''}
  </table>

  <h2>2. SERVICE & FINANCIAL SCHEDULE</h2>
  <table>
    <tr><th>Service Purchased</th><td>${data.service.title}</td><th>Region</th><td>${data.service.region ? data.service.region.toUpperCase() : 'IN'}</td></tr>
    <tr><th>Total Service MRP</th><td>₹${data.financials.serviceCost.toLocaleString()}</td><th>Down Payment Due</th><td>₹${data.financials.downPayment.toLocaleString()} (${data.financials.downPaymentPct || 30}%)</td></tr>
    <tr><th>Financed Principal</th><td>₹${data.financials.principalBalance.toLocaleString()}</td><th>Total Payable</th><td>₹${data.financials.totalPayable.toLocaleString()}</td></tr>
    <tr><th>Payment Cadence</th><td>${data.financials.paymentFrequency.toUpperCase()}</td><th>Number of Installments</th><td>${data.financials.installmentsCount}</td></tr>
    <tr><th>Installment Amount</th><td colspan="3"><strong>₹${data.financials.installmentAmount.toLocaleString()}</strong> per ${data.financials.paymentFrequency === 'weekly' ? 'week' : 'month'}</td></tr>
  </table>

  <h2>3. STATUTORY NOTICE & LATE FEES</h2>
  <p>This Agreement is an escrow-backed split payment facility and is NOT a banking loan, NBFC credit line, or financing product. No interest or compounding charges apply. If any installment is overdue by more than 24 hours, an administrative late fee of <strong>₹${data.financials.weeklyLateFee || 300}</strong> (weekly) or <strong>₹${data.financials.monthlyLateFee || 1500}</strong> (monthly) will be applied.</p>

  <h2>4. ELECTRONIC EXECUTION</h2>
  <div class="sig-box">
    <div><strong>Customer Electronic Signature:</strong></div>
    ${data.signatureDataUrl ? `<img src="${data.signatureDataUrl}" class="sig-img" alt="Customer Signature" />` : '<em>Digitally Signed on File</em>'}
    <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Signed by: ${data.customer.fullName} &bull; Date: ${dateStr}</div>
  </div>
</body>
</html>
  `.trim();
}

export function generateAccountAgreementHtml(data: AgreementData): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Digital Profile Services Flexible Payment Plan Agreement - ${data.agreementRef}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; }
    h1 { color: #581c87; font-size: 22px; border-bottom: 2px solid #a855f7; padding-bottom: 10px; }
    h2 { color: #6b21a8; font-size: 16px; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    .sig-box { margin-top: 30px; border: 1px dashed #94a3b8; padding: 16px; border-radius: 8px; width: 300px; }
    .sig-img { max-height: 60px; }
  </style>
</head>
<body>
  <h1>DIGITAL PROFILE SERVICES FLEXIBLE PAYMENT PLAN AGREEMENT</h1>
  <p><strong>Agreement Reference:</strong> ${data.agreementRef} &bull; <strong>Execution Date:</strong> ${dateStr}</p>
  <p>This Flexible Payment Plan Agreement ("Agreement") is executed by and between <strong>VIB Digital Services Platform</strong> ("Platform" / "VIB") and the undersigned Customer for the escrow-guaranteed purchase of an authorized digital profile collection.</p>

  <h2>1. PARTIES & CUSTOMER IDENTIFICATION</h2>
  <table>
    <tr><th>Customer Full Name</th><td>${data.customer.fullName}</td><th>Date of Birth</th><td>${data.customer.dob || '—'}</td></tr>
    <tr><th>Email Address</th><td>${data.customer.email}</td><th>Mobile Number</th><td>${data.customer.phone || '—'}</td></tr>
    <tr><th>Residential Address</th><td colspan="3">${data.customer.address || '—'}, ${data.customer.city || ''}, ${data.customer.state || ''}</td></tr>
    ${data.customer.guardianName ? `<tr><th>Guardian Name</th><td>${data.customer.guardianName} (${data.customer.guardianRelation})</td><th colspan="2">Minor Verified</th></tr>` : ''}
  </table>

  <h2>2. PROFILE DETAILS & FINANCING SCHEDULE</h2>
  <table>
    <tr><th>Profile Title</th><td>${data.service.title}</td><th>Listing ID</th><td>${data.service.listingId || 'N/A'}</td></tr>
    <tr><th>Profile MRP</th><td>₹${data.financials.serviceCost.toLocaleString()}</td><th>Down Payment Due</th><td>₹${data.financials.downPayment.toLocaleString()} (${data.financials.downPaymentPct || 40}%)</td></tr>
    <tr><th>Financed Balance</th><td>₹${data.financials.principalBalance.toLocaleString()}</td><th>Fixed Profit Margin</th><td>₹${data.financials.fixedProfit.toLocaleString()}</td></tr>
    <tr><th>Total Payable</th><td><strong>₹${data.financials.totalPayable.toLocaleString()}</strong></td><th>Payment Cadence</th><td>${data.financials.paymentFrequency.toUpperCase()}</td></tr>
    <tr><th>Installment Amount</th><td colspan="3"><strong>₹${data.financials.installmentAmount.toLocaleString()}</strong> per ${data.financials.paymentFrequency === 'weekly' ? 'week' : 'month'} (${data.financials.installmentsCount} installments)</td></tr>
  </table>

  <h2>3. LIFETIME WARRANTY & ESCROW PROVISIONS</h2>
  <p>The profile collection is backed by VIB's Lifetime Warranty Against Recovery. Complete credentials will be held in secure escrow and released according to the staging protocol. Timely fulfillment of all installments is required to maintain the Lifetime Guarantee.</p>

  <h2>4. ELECTRONIC EXECUTION</h2>
  <div class="sig-box">
    <div><strong>Customer Electronic Signature:</strong></div>
    ${data.signatureDataUrl ? `<img src="${data.signatureDataUrl}" class="sig-img" alt="Customer Signature" />` : '<em>Digitally Signed on File</em>'}
    <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Signed by: ${data.customer.fullName} &bull; Date: ${dateStr}</div>
  </div>
</body>
</html>
  `.trim();
}
