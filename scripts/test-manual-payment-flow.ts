import assert from 'node:assert';
import { createSignedToken } from '../server/db.js';

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

async function runTest() {
  console.log('\n=== Testing Manual Payment Verification, QR Code & Confirmed Order Flow ===\n');

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

  // 1. Test Image Upload Endpoint (POST /api/upload)
  console.log('Step 1: Testing Image Upload (POST /api/upload)...');
  // 1x1 transparent PNG in base64
  const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const uploadRes = await request('/api/upload', {
    method: 'POST',
    body: JSON.stringify({
      image: samplePngBase64,
      filename: 'test_receipt.png',
    }),
  });

  assert(uploadRes.status === 200, `Expected 200 from /api/upload, got ${uploadRes.status}`);
  assert(uploadRes.data.success === true, 'Expected upload success to be true');
  assert(uploadRes.data.url.startsWith('/uploads/receipt_'), 'Expected returned url to start with /uploads/receipt_');
  console.log(`✓ Image successfully uploaded and stored: ${uploadRes.data.url}`);

  const uploadedReceiptUrl = uploadRes.data.url;

  // 2. Create a Manual Delivery Order (Profile / Account Listing)
  console.log('\nStep 2: Creating Manual Delivery Order (Profile / Account)...');
  const manualOrderRes = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      title: 'Ascendant 3 Prime Account (Manual Handoff)',
      amount: 4999,
      currency: 'INR',
      type: 'profile',
      paymentMethod: 'UPI Manual QR Verification',
      details: {
        riotId: 'AlexMercer#VAL',
        email: 'customer@vib.gg',
        category: 'profile',
      },
    }),
  });

  assert(manualOrderRes.status === 201, `Expected 201, got ${manualOrderRes.status}`);
  const manualOrderId = manualOrderRes.data.order.id;
  console.log(`✓ Manual order created: #${manualOrderId} for ₹4,999`);

  // 3. Submit Payment Evidence with Screenshot (POST /api/orders/:id/payment-evidence)
  console.log('\nStep 3: Submitting Payment Evidence with UTR & Screenshot...');
  const testUtr = '428190184712';
  const evidenceRes = await request(`/api/orders/${manualOrderId}/payment-evidence`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      ref: testUtr,
      screenshot: uploadedReceiptUrl,
      phone: '+91 98765 43210',
      email: 'alex.mercer.gaming@gmail.com',
    }),
  });

  assert(evidenceRes.status === 200, `Expected 200, got ${evidenceRes.status}`);
  assert(evidenceRes.data.order.payment_status === 'SUBMITTED_FOR_VERIFICATION', 'Expected status to be SUBMITTED_FOR_VERIFICATION');
  assert(evidenceRes.data.order.payment_evidence_ref === testUtr, 'Expected UTR to match');
  assert(evidenceRes.data.order.payment_evidence_image === uploadedReceiptUrl, 'Expected screenshot URL to match');
  console.log('✓ Payment evidence, UTR, and screenshot attached successfully to order');

  // 4. Verify Public Tracking returns the evidence and details (GET /api/orders/track/:id)
  console.log('\nStep 4: Testing Public Tracking endpoint (GET /api/orders/track/:id)...');
  const trackRes = await request(`/api/orders/track/${manualOrderId}`);
  assert(trackRes.status === 200, `Expected 200, got ${trackRes.status}`);
  assert(trackRes.data.order.payment_evidence_ref === testUtr, 'Expected UTR in tracking');
  assert(trackRes.data.order.payment_evidence_image === uploadedReceiptUrl, 'Expected screenshot in tracking');
  console.log('✓ Public tracking endpoint returns payment evidence & live order details');

  // 5. Admin Payment Verification for Manual Delivery Order (PUT /api/admin/orders/:id/verify-payment)
  console.log('\nStep 5: Admin Approving Payment for Manual Delivery Order...');
  const verifyRes = await request(`/api/admin/orders/${manualOrderId}/verify-payment`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      action: 'approve',
      notes: 'Verified in bank ledger and matching UPI transaction statement',
    }),
  });

  assert(verifyRes.status === 200, `Expected 200, got ${verifyRes.status}`);
  assert(verifyRes.data.order.payment_status === 'PAYMENT_VERIFIED', 'Expected PAYMENT_VERIFIED');
  assert(verifyRes.data.order.fulfillment_status === 'PROCESSING', 'Expected fulfillment PROCESSING');
  assert(verifyRes.data.codeIssued === false, 'Expected codeIssued to be false for manual delivery');
  console.log('✓ Admin successfully verified manual delivery order (email dispatched to customer)');

  // 6. Customer updates delivery contact on confirmed order (PUT /api/orders/:id/delivery-contact)
  console.log('\nStep 6: Customer Updating Delivery Contact on Confirmed Order...');
  const contactRes = await request(`/api/orders/${manualOrderId}/delivery-contact`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      phone: '+91 99999 88888',
      email: 'alex.dispatch@gmail.com',
      notes: 'Available on Discord and WhatsApp after 6 PM',
    }),
  });

  assert(contactRes.status === 200, `Expected 200, got ${contactRes.status}`);
  const details = JSON.parse(contactRes.data.order.details_json);
  assert(details.contactPhone === '+91 99999 88888', 'Expected contactPhone to be updated');
  assert(details.email === 'alex.dispatch@gmail.com', 'Expected delivery email to be updated');
  assert(details.deliveryNotes === 'Available on Discord and WhatsApp after 6 PM', 'Expected notes to be updated');
  console.log('✓ Customer successfully confirmed and updated delivery phone & email');

  // 7. Test Automatic Delivery Order (Indian VP Vault Code)
  console.log('\nStep 7: Testing Automatic VP Code Delivery Flow...');
  const vpOrderRes = await request('/api/user/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      title: '475 VP Indian Region Pack',
      amount: 499,
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

  // Submit UTR
  await request(`/api/orders/${vpOrderId}/payment-evidence`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      ref: '987654321012',
      screenshot: uploadedReceiptUrl,
    }),
  });

  // Admin approves VP order -> should auto-issue genuine code from inventory
  const vpApproveRes = await request(`/api/admin/orders/${vpOrderId}/verify-payment`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      action: 'approve',
      notes: 'Verified payment for Indian VP pack',
    }),
  });

  assert(vpApproveRes.status === 200);
  assert(vpApproveRes.data.order.payment_status === 'PAYMENT_VERIFIED');
  assert(vpApproveRes.data.order.status === 'completed');
  assert(vpApproveRes.data.codeIssued === true, 'Expected codeIssued to be true');
  assert(typeof vpApproveRes.data.order.issued_code === 'string' && vpApproveRes.data.order.issued_code.length > 5);
  console.log(`✓ Automatic Delivery: Genuine VP Code #${vpApproveRes.data.order.issued_code} auto-assigned and delivered!`);

  // Clean up the 2 test orders created during test
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync('data/vib.db');
  db.exec(`
    DELETE FROM invoices WHERE order_id IN ('${manualOrderId}', '${vpOrderId}');
    DELETE FROM transactions WHERE order_id IN ('${manualOrderId}', '${vpOrderId}');
    DELETE FROM order_messages WHERE order_id IN ('${manualOrderId}', '${vpOrderId}');
    DELETE FROM orders WHERE id IN ('${manualOrderId}', '${vpOrderId}');
    UPDATE vp_codes SET status = 'available', order_id = NULL, issued_at = NULL WHERE order_id = '${vpOrderId}';
    PRAGMA wal_checkpoint(TRUNCATE);
  `);

  console.log('\n=== All Tests Passed Successfully! ===\n');
}

runTest().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
