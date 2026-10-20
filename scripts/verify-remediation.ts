import assert from 'node:assert';
import { createSignedToken } from '../server/db';

const BASE_URL = 'http://localhost:5000';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runVerification() {
  console.log('\n=== Starting Verification for New Remediation Features ===\n');

  const adminToken = createSignedToken({
    id: 'usr_superadmin_01',
    email: 'admin@vib.gg',
    name: 'VIB Executive Superadmin',
    role: 'superadmin',
    status: 'active',
  });

  const customerToken = createSignedToken({
    id: 'usr_customer_04',
    email: 'customer@vib.gg',
    name: 'Alex Mercer',
    role: 'user',
    status: 'active',
  });

  // 1. Test Admin Listing Full Edit
  console.log('Test 1: Admin Listing Full Edit (PUT /api/admin/listings/:id)');
  const editListingRes = await request('/api/admin/listings/lst_immortal_kuronami', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: 'Immortal 1 Kuronami Vandal Account - Premium Vault Edition',
      price_inr: 5499,
      rank: 'Immortal 1',
      peak_rank: 'Immortal 3',
      level: 225,
      region: 'AP / Mumbai',
      status: 'published',
      featured: true,
      description: 'Fully audited Kuronami inventory with verified lifetime warranty.',
    }),
  });

  assert(editListingRes.status === 200, `Expected 200, got ${editListingRes.status}`);
  assert(editListingRes.data.listing.title === 'Immortal 1 Kuronami Vandal Account - Premium Vault Edition');
  assert(editListingRes.data.listing.price_inr === 5499);
  assert(editListingRes.data.listing.level === 225);
  console.log('✓ Admin successfully edited listing details and persisted changes');

  // Revert listing edit back to standard title/price for clean baseline
  await request('/api/admin/listings/lst_immortal_kuronami', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: 'Immortal 1 Kuronami Vandal Account',
      price_inr: 4999,
      rank: 'Immortal 1',
      peak_rank: 'Immortal 3',
      level: 210,
      region: 'AP / Mumbai',
      status: 'published',
      featured: true,
      description: 'Level 210 prime verified account with 210+ premium skins including Kuronami Vandal, Reaver Vandal, Prime Phantom, and Glitchpop Dagger.',
    }),
  });

  // 2. Test Rental Checkout Order Placement with Duration & Security Details
  console.log('\nTest 2: Rental Order Flow with Duration & Terms Acceptance');
  const rentalOrderRes = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      product_id: 'rental-radiant-smurf-24h',
      title: 'Radiant Account 24h Daily Rental',
      amount: 499,
      currency: 'INR',
      type: 'rental',
      paymentMethod: 'UPI Manual QR Verification',
      details: {
        riotId: 'AlexMercer#VAL',
        email: 'customer@vib.gg',
        category: 'rental',
        rentalDuration: '24h',
        termsAccepted: true,
      },
    }),
  });

  assert(rentalOrderRes.status === 201, `Expected 201, got ${rentalOrderRes.status}`);
  assert(rentalOrderRes.data.order.type === 'rental');
  const parsedDetails = rentalOrderRes.data.order.details || (rentalOrderRes.data.order.details_json ? JSON.parse(rentalOrderRes.data.order.details_json) : {});
  assert(parsedDetails.rentalDuration === '24h');
  console.log('✓ Rental order created with category "rental" and rentalDuration persisted in details');

  // Clean up the temporary rental test order
  const rentalOrderId = rentalOrderRes.data.order.id;

  // 3. Test Derank Order Creation
  console.log('\nTest 3: Derank Order Flow');
  const derankOrderRes = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      title: 'Ascendant to Platinum Safe MMR Derank Consultation',
      amount: 1999,
      currency: 'INR',
      type: 'derank',
      paymentMethod: 'UPI Manual QR Verification',
      details: {
        riotId: 'AlexMercer#VAL',
        email: 'customer@vib.gg',
        category: 'derank',
        currentRank: 'Ascendant 1',
        targetRank: 'Platinum 1',
      },
    }),
  });

  assert(derankOrderRes.status === 201, `Expected 201, got ${derankOrderRes.status}`);
  assert(derankOrderRes.data.order.type === 'derank');
  console.log('✓ Derank order created with category "derank"');

  const derankOrderId = derankOrderRes.data.order.id;

  // 4. Test Indian VP 14,650 Pack Import and Validation
  console.log('\nTest 4: High-Denomination VP Pack (14,650 VP) Import');
  const testVpCode = `VIB-TEST14650-${Date.now().toString(36).toUpperCase()}`;
  const importVpRes = await request('/api/admin/vp-codes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      package_id: 'vp-14650',
      codes: testVpCode,
      batch_no: 'TEST-VERIF-BATCH',
    }),
  });

  assert(importVpRes.status === 201, `Expected 201, got ${importVpRes.status}`);
  assert(importVpRes.data.addedCount === 1);
  assert(importVpRes.data.package_id === 'vp-14650');
  console.log('✓ High-tier denomination vp-14650 accepted and imported successfully');

  // 5. Test VP Code Order Reservation for Indian Region
  console.log('\nTest 5: Indian VP Code Automatic Fulfillment Matching');
  const vpOrderRes = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      title: '14,650 VP (Indian Region Top-Up)',
      amount: 11999,
      currency: 'INR',
      type: 'vp',
      paymentMethod: 'UPI Manual QR Verification',
      details: {
        riotId: 'AlexMercer#VAL',
        email: 'customer@vib.gg',
      },
    }),
  });

  assert(vpOrderRes.status === 201);
  const vpOrderId = vpOrderRes.data.order.id;

  // Approve payment as admin -> code should be automatically assigned from inventory
  const approveRes = await request(`/api/admin/orders/${vpOrderId}/verify-payment`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      action: 'approve',
      notes: 'Payment verified in bank records',
    }),
  });

  assert(approveRes.status === 200);
  assert(approveRes.data.order.fulfillment_status === 'COMPLETED');
  assert(approveRes.data.order.payment_status === 'PAYMENT_VERIFIED');
  console.log('✓ Indian VP order with title "(Indian Region Top-Up)" successfully matched and issued inventory code');

  // Clean up the 3 test orders created during this test
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync('data/vib.db');
  db.exec(`
    DELETE FROM invoices WHERE order_id IN ('${rentalOrderId}', '${derankOrderId}', '${vpOrderId}');
    DELETE FROM transactions WHERE order_id IN ('${rentalOrderId}', '${derankOrderId}', '${vpOrderId}');
    DELETE FROM orders WHERE id IN ('${rentalOrderId}', '${derankOrderId}', '${vpOrderId}');
    DELETE FROM vp_codes WHERE code = '${testVpCode}';
    PRAGMA wal_checkpoint(TRUNCATE);
  `);

  console.log('\n=== All Verification Tests Passed Successfully! ===\n');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
