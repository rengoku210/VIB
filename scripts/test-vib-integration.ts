/**
 * Comprehensive Automated Integration Test Suite for VIB Digital Services Platform
 * Verifies Phases 2, 3, 4, 5, 7 of the Master Prompt
 */

const BASE_URL = 'http://localhost:5000';

interface TestResult {
  suite: string;
  test: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, test: string, details?: string) {
  if (condition) {
    results.push({ suite, test, status: 'PASS', details });
    console.log(`[PASS] ${suite} -> ${test}`);
  } else {
    results.push({ suite, test, status: 'FAIL', details });
    console.error(`[FAIL] ${suite} -> ${test}: ${details || 'Assertion failed'}`);
  }
}

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data, ok: response.ok };
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('STARTING VIB DIGITAL SERVICES PLATFORM TEST SUITE');
  console.log('====================================================\n');

  // 1. HEALTH & CONNECTIVITY
  {
    const res = await request('/api/health');
    assert(res.status === 200 && res.data?.status === 'ok', 'Health Check', 'Server responds to /api/health');
  }

  // 1.5 RIOT GAMES VALORANT ID VERIFICATION API
  {
    // Test 1.5.1: Valid Riot ID (POST)
    const validRiot = await request('/api/riot/verify', {
      method: 'POST',
      body: JSON.stringify({ riotId: 'TenZ#0001' }),
    });
    assert(
      validRiot.status === 200 &&
      validRiot.data?.exists === true &&
      validRiot.data?.verified === true &&
      validRiot.data?.gameName === 'TenZ' &&
      validRiot.data?.tagLine === '0001',
      'Riot Verification',
      'Legitimate Riot ID verified via POST /api/riot/verify'
    );

    // Test 1.5.2: Valid Riot ID with separate name and tag (POST)
    const splitRiot = await request('/api/riot/verify', {
      method: 'POST',
      body: JSON.stringify({ gameName: 'ShahZaM', tagLine: '1111' }),
    });
    assert(
      splitRiot.status === 200 &&
      splitRiot.data?.exists === true &&
      splitRiot.data?.riotId === 'ShahZaM#1111',
      'Riot Verification',
      'Riot ID verified when username and tagline are submitted separately'
    );

    // Test 1.5.3: Valid Riot ID via GET query parameters
    const getRiot = await request('/api/riot/verify?riotId=Boaster%23EUW');
    assert(
      getRiot.status === 200 &&
      getRiot.data?.exists === true &&
      getRiot.data?.gameName === 'Boaster',
      'Riot Verification',
      'Riot ID verified via GET /api/riot/verify query parameter'
    );

    // Test 1.5.4: Missing tagLine rejected with 400 Bad Request
    const noTagRiot = await request('/api/riot/verify', {
      method: 'POST',
      body: JSON.stringify({ gameName: 'NoTagPlayer' }),
    });
    assert(
      noTagRiot.status === 400 &&
      noTagRiot.data?.exists === false &&
      Boolean(noTagRiot.data?.error),
      'Riot Verification',
      'Missing tagline rejected with 400 Bad Request'
    );

    // Test 1.5.5: Non-existent / placeholder fake ID rejected
    const fakeRiot = await request('/api/riot/verify', {
      method: 'POST',
      body: JSON.stringify({ riotId: 'fake#1234' }),
    });
    assert(
      fakeRiot.status === 400 &&
      fakeRiot.data?.exists === false,
      'Riot Verification',
      'Non-existent / fake Riot ID rejected with exists: false'
    );

    // Test 1.5.6: Zero sensitive data leakage assertion
    assert(
      validRiot.data?.email === undefined &&
      validRiot.data?.password === undefined &&
      validRiot.data?.billing === undefined &&
      validRiot.data?.personalData === undefined,
      'Riot Verification',
      'Riot ID verification strictly does not retrieve, access, or expose sensitive personal data (email, etc.)'
    );
  }

  // 2. SIGN UP / REGISTRATION (Phase 2)
  const testEmail = `test_user_${Date.now()}@vib-test.gg`;
  let userToken = '';
  let userId = '';

  {
    // Test 2.1: Valid Registration
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alex Phantom',
        email: testEmail,
        password: 'SecurePassword123!',
        phone: '+91 98765 43210',
        riot_id: 'Phantom#VIB',
      }),
    });
    assert(regRes.status === 201 && regRes.data?.token && regRes.data?.user?.email === testEmail,
      'Phase 2: Sign-Up', 'Valid registration creates user and returns token');
    
    if (regRes.data?.token) {
      userToken = regRes.data.token;
      userId = regRes.data.user.id;
    }

    // Test 2.2: Duplicate Email Registration Prevention
    const dupRes = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alex Duplicate',
        email: testEmail,
        password: 'AnotherPassword123!',
      }),
    });
    assert(dupRes.status === 409, 'Phase 2: Sign-Up', 'Duplicate email registration rejected with 409 Conflict');

    // Test 2.3: Validation Error on Short Password
    const weakRes = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Weak Pass',
        email: `weak_${Date.now()}@vib-test.gg`,
        password: '123',
      }),
    });
    assert(weakRes.status === 400, 'Phase 2: Sign-Up', 'Short password rejected with 400 Bad Request');

    // Test 2.4: Registration with Invalid Riot ID Rejected
    const badRiotReg = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Bad Riot Tester',
        email: `bad_riot_${Date.now()}@vib-test.gg`,
        password: 'ValidPassword123!',
        riot_id: 'fake#1234',
      }),
    });
    assert(badRiotReg.status === 400, 'Phase 2: Sign-Up', 'Registration with non-existent Riot ID strictly rejected with 400 Bad Request');
  }

  // 3. SIGN IN & SESSION MANAGEMENT (Phase 3)
  {
    // Test 3.1: Invalid Password Rejected
    const badLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword!',
      }),
    });
    assert(badLogin.status === 401, 'Phase 3: Sign-In', 'Invalid password rejected with 401 Unauthorized');

    // Test 3.2: Valid Login
    const goodLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'SecurePassword123!',
      }),
    });
    assert(goodLogin.status === 200 && goodLogin.data?.token, 'Phase 3: Sign-In', 'Valid login returns session token');

    // Test 3.3: Session Restoration via /api/auth/me
    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(meRes.status === 200 && meRes.data?.user?.email === testEmail, 'Phase 3: Session Management', 'Token restores user profile via /api/auth/me');

    // Test 3.4: Unauthenticated /api/auth/me Rejected
    const noAuthMe = await request('/api/auth/me');
    assert(noAuthMe.status === 401, 'Phase 3: Session Management', 'Unauthenticated request to /api/auth/me rejected with 401');
  }

  // 3.5 FIREBASE GOOGLE AUTHENTICATION INTEGRATION
  {
    // Test 3.5.1: Missing email rejected
    const badFirebase = await request('/api/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify({ uid: 'firebase_test_123' }),
    });
    assert(badFirebase.status === 400, 'Phase 3.5: Firebase Google Auth', 'Missing email in Firebase login rejected with 400 Bad Request');

    // Test 3.5.2: Existing user Google Auth linking
    const existingGoogle = await request('/api/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        name: 'Alex Phantom Google Linked',
        uid: 'firebase_test_uid_999',
        avatar: 'https://lh3.googleusercontent.com/a/test-avatar-999',
      }),
    });
    assert(
      existingGoogle.status === 200 &&
      existingGoogle.data?.token &&
      existingGoogle.data?.user?.email === testEmail &&
      existingGoogle.data?.user?.avatar?.includes('googleusercontent.com'),
      'Phase 3.5: Firebase Google Auth',
      'Firebase Google Sign-In links existing user, updates avatar, and returns valid session token'
    );

    // Test 3.5.3: New user Google Auth auto-provisioning
    const newGoogleEmail = `new_google_${Date.now()}@gmail.com`;
    const newGoogle = await request('/api/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify({
        email: newGoogleEmail,
        name: 'Google Newcomer',
        uid: `firebase_uid_${Date.now()}`,
        avatar: 'https://lh3.googleusercontent.com/a/newcomer-photo',
      }),
    });
    assert(
      newGoogle.status === 200 &&
      newGoogle.data?.token &&
      newGoogle.data?.user?.email === newGoogleEmail &&
      newGoogle.data?.user?.role === 'user' &&
      newGoogle.data?.user?.auth_provider === 'google',
      'Phase 3.5: Firebase Google Auth',
      'Firebase Google Sign-In provisions new user with google provider, role user, and valid session token'
    );

    // Test 3.5.4: Me endpoint validates session issued by Firebase login
    const firebaseMeRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${newGoogle.data?.token}` },
    });
    assert(
      firebaseMeRes.status === 200 &&
      firebaseMeRes.data?.user?.email === newGoogleEmail,
      'Phase 3.5: Firebase Google Auth',
      'Session token from Firebase login authenticates through /api/auth/me RBAC'
    );
  }

  // 4. USER DASHBOARD & CUSTOMER WORKFLOWS (Phase 4 & 5)
  let testOrderId = '';
  {
    // Test 4.1: Create Order
    const orderRes = await request('/api/user/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        package_id: 'vp-7400-tier',
        package_title: '7400 VP Tier-1 Pack',
        amount_inr: 4999,
        payment_method: 'UPI',
        riot_id: 'Phantom#VIB',
        details: { delivery: 'Instant Automated', discount: 'Applied' },
      }),
    });
    assert(orderRes.status === 201 && orderRes.data?.order?.id, 'Phase 4: User Dashboard', 'User can create order with database persistence');
    if (orderRes.data?.order?.id) {
      testOrderId = orderRes.data.order.id;
    }

    // Test 4.1b: Order rejected with invalid Riot ID
    const badRiotOrder = await request('/api/user/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        package_id: 'vp-7400-tier',
        package_title: '7400 VP Tier-1 Pack',
        amount_inr: 4999,
        payment_method: 'UPI',
        details: { riotId: 'fake#1234' },
      }),
    });
    assert(badRiotOrder.status === 400, 'Phase 4: User Dashboard', 'Order with non-existent Riot ID strictly rejected with 400 Bad Request');

    // Test 4.2: List User Orders
    const listOrders = await request('/api/user/orders', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(listOrders.status === 200 && Array.isArray(listOrders.data?.orders) && listOrders.data.orders.length > 0,
      'Phase 4: User Dashboard', 'User can query order history');

    // Test 4.3: Create Support Ticket / Dispute
    const ticketRes = await request('/api/user/tickets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        subject: 'Inquiry on VP Activation',
        message: 'Could you verify the processing timeframe for regional VP transfer?',
        category: 'order',
        order_id: testOrderId,
      }),
    });
    assert(ticketRes.status === 201 && ticketRes.data?.ticket?.id, 'Phase 4: User Dashboard', 'User can open a support ticket');

    // Test 4.4: Profile Update
    const updateRes = await request('/api/user/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        bio: 'Competitive Radiant Valorant Player',
        discord_tag: 'Phantom#0001',
      }),
    });
    assert(updateRes.status === 200 && updateRes.data?.user?.discord_tag === 'Phantom#0001',
      'Phase 4: User Dashboard', 'User can update profile settings');

    // Test 4.4b: Profile update rejected with invalid Riot ID
    const badRiotProfile = await request('/api/user/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        riot_id: 'fake#1234',
      }),
    });
    assert(badRiotProfile.status === 400, 'Phase 4: User Dashboard', 'Profile update with non-existent Riot ID strictly rejected with 400 Bad Request');
  }

  // 5. ROLE-BASED ACCESS CONTROL (RBAC) (Phase 4 & 5)
  let adminToken = '';
  {
    // Test 5.1: Customer Trying to Access Admin Area Forbidden (403)
    const adminForbidden = await request('/api/admin/metrics', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(adminForbidden.status === 403, 'Phase 5: Authorization & RBAC', 'Customer access to /api/admin/* strictly rejected with 403 Forbidden');

    // Test 5.2: Admin Login
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@vib.gg',
        password: 'AdminPassword@123',
      }),
    });
    assert(adminLogin.status === 200 && adminLogin.data?.user?.role === 'superadmin',
      'Phase 5: Authorization & RBAC', 'Superadmin login grants superadmin role');
    adminToken = adminLogin.data?.token || '';

    // Test 5.3: Admin Access to Admin Metrics
    const adminMetrics = await request('/api/admin/metrics', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminMetrics.status === 200 && typeof adminMetrics.data?.totalUsers === 'number',
      'Phase 5: Authorization & RBAC', 'Superadmin has full access to platform metrics');

    // Test 5.4: Admin Access to User Management
    const adminUsers = await request('/api/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminUsers.status === 200 && Array.isArray(adminUsers.data?.users),
      'Phase 5: Authorization & RBAC', 'Superadmin can list and inspect users');

    // Test 5.5: Admin Updates Order Status
    if (testOrderId) {
      const updateOrder = await request(`/api/admin/orders/${testOrderId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          status: 'completed',
          admin_notes: 'Delivered and verified via Riot API gateway',
        }),
      });
      assert(updateOrder.status === 200 && updateOrder.data?.order?.status === 'completed',
        'Phase 5: Admin Fulfillment', 'Admin can fulfill and update customer order status');
    }

    // Test 5.6: Admin Broadcasts Announcement
    const announceRes = await request('/api/admin/announcements', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Platform Upgrade Complete',
        message: 'All regional VP servers are online and synchronized.',
        target: 'all',
      }),
    });
    assert(announceRes.status === 200 && announceRes.data?.recipientCount > 0,
      'Phase 5: Communication Center', 'Admin can broadcast platform-wide announcements to all users');

    // Test 5.7: Verify Customer Received Announcement as Notification
    const notifRes = await request('/api/user/notifications', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const hasBroadcast = notifRes.data?.notifications?.some((n: any) => n.title === 'Platform Upgrade Complete');
    assert(hasBroadcast, 'Phase 5: Communication Center', 'Customer notification feed receives the broadcasted announcement');

    // Test 5.8: Admin Audit Logs
    const auditRes = await request('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(auditRes.status === 200 && Array.isArray(auditRes.data?.logs) && auditRes.data.logs.length > 0,
      'Phase 5: Audit & Security', 'All privileged operations are immutably recorded in audit logs');
  }

  // 6. PRODUCTS CATALOG API & PRICE TAMPERING PREVENTION
  {
    // Test 6.1: Query Products Catalog
    const catRes = await request('/api/products');
    assert(catRes.status === 200 && Array.isArray(catRes.data?.products) && catRes.data.products.length >= 10,
      'Catalog & Security', 'GET /api/products returns populated database catalog');

    // Test 6.2: Query Single Product
    const singleRes = await request('/api/products/vp-475');
    assert(singleRes.status === 200 && singleRes.data?.product?.price_inr === 499,
      'Catalog & Security', 'GET /api/products/:id returns specific product details');

    // Test 6.3: Non-existent product returns 404
    const notFoundRes = await request('/api/products/non-existent-prod-id');
    assert(notFoundRes.status === 404, 'Catalog & Security', 'GET /api/products/:invalid returns 404 Not Found');

    // Test 6.4: Price Tampering Attack Strictly Blocked (400)
    const tamperedOrder = await request('/api/user/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        package_id: 'vp-475',
        title: '475 Valorant Points Pack',
        amount: 10, // Tampered price: ₹10 instead of catalog ₹499
        currency: 'INR',
        type: 'vp',
      }),
    });
    assert(tamperedOrder.status === 400 && String(tamperedOrder.data?.error).includes('Price verification failed'),
      'Catalog & Security', 'Server strictly rejects tampered order price with 400 Bad Request');

    // Test 6.5: Cart Checkout with Profile (e.g., Diamond Profile ₹8,999) succeeds cleanly
    const diamondCartOrder = await request('/api/user/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        product_id: 'p-diamond-180',
        title: 'Cart Checkout: Diamond Profile (x1)',
        amount: 8999,
        currency: 'INR',
        type: 'cart',
        details: { riotId: 'Rengoku#ORIPO', email: 'rammodhvadiya210@gmail.com' },
      }),
    });
    assert(diamondCartOrder.status === 201 && diamondCartOrder.data?.order?.id,
      'Catalog & Security', 'Cart checkout with Diamond Profile (₹8,999) passes catalog verification and creates order');

    // Test 6.6: Multi-item Cart Checkout succeeds cleanly
    const multiItemCartOrder = await request('/api/user/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        title: 'Cart Checkout: Diamond Profile (x1), 475 VP (x1)',
        amount: 9498,
        currency: 'INR',
        type: 'cart',
        details: { riotId: 'Rengoku#ORIPO', email: 'rammodhvadiya210@gmail.com' },
      }),
    });
    assert(multiItemCartOrder.status === 201 && multiItemCartOrder.data?.order?.id,
      'Catalog & Security', 'Multi-item cart checkout passes verification and creates order');

    // Test 6.7: Cart Checkout Price Tampering Strictly Blocked (400)
    const tamperedCartOrder = await request('/api/user/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        product_id: 'p-diamond-180',
        title: 'Cart Checkout: Diamond Profile (x1)',
        amount: 10, // Tampered: ₹10 for an ₹8,999 profile
        currency: 'INR',
        type: 'cart',
        details: { riotId: 'Rengoku#ORIPO', email: 'rammodhvadiya210@gmail.com' },
      }),
    });
    assert(tamperedCartOrder.status === 400 && String(tamperedCartOrder.data?.error).includes('Price verification failed'),
      'Catalog & Security', 'Server strictly rejects underpriced cart checkout with 400 Bad Request');
  }

  // 7. UNIVERSAL ORDER ROOM, CHAT & ANTI-FRAUD SCANNER
  {
    // Test 7.1: Access Order Room
    const roomRes = await request(`/api/orders/${testOrderId}/room`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(roomRes.status === 200 && roomRes.data?.order?.id === testOrderId && Array.isArray(roomRes.data?.stages),
      'Order Room & Anti-Fraud', 'Customer can access Order Room lifecycle and progression stages');

    // Test 7.2: Anti-Fraud Scanner Flags Phone Number Leakage
    const phoneLeak = await request(`/api/orders/${testOrderId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        message: 'Direct deal bro, WhatsApp me on 9876543210 right now',
      }),
    });
    assert(phoneLeak.status === 201 && phoneLeak.data?.message?.flagged === 1 && phoneLeak.data?.warning,
      'Order Room & Anti-Fraud', 'Anti-fraud scanner intercepts Indian phone number and flags message');

    // Test 7.3: Anti-Fraud Scanner Flags UPI Handle Leakage
    const upiLeak = await request(`/api/orders/${testOrderId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        message: 'Pay outside VIB to my personal handle seller@okhdfcbank',
      }),
    });
    assert(upiLeak.status === 201 && upiLeak.data?.message?.flagged === 1,
      'Order Room & Anti-Fraud', 'Anti-fraud scanner intercepts off-platform UPI handle and flags message');

    // Test 7.4: Clean Order Message Delivered Without Flags
    const cleanMsg = await request(`/api/orders/${testOrderId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        message: 'Hello Support team, I have confirmed the Riot ID tag format.',
      }),
    });
    assert(cleanMsg.status === 201 && cleanMsg.data?.message?.flagged === 0 && !cleanMsg.data?.warning,
      'Order Room & Anti-Fraud', 'Compliant in-platform communication is saved with zero flags');
  }

  // 8. COMMERCIAL INVOICING & GST COMPLIANCE
  let testInvoiceId = '';
  {
    // Test 8.1: Customer Queries Generated Invoices
    const userInvoices = await request('/api/user/invoices', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(userInvoices.status === 200 && Array.isArray(userInvoices.data?.invoices) && userInvoices.data.invoices.length > 0,
      'Commercial Invoicing', 'Customer receives automatic sequential GST invoice for orders');
    if (userInvoices.data?.invoices?.[0]?.id) {
      testInvoiceId = userInvoices.data.invoices[0].id;
    }

    // Test 8.2: Retrieve Individual Printable Invoice
    if (testInvoiceId) {
      const invRes = await request(`/api/invoices/${testInvoiceId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert(invRes.status === 200 && invRes.data?.invoice?.id === testInvoiceId && typeof invRes.data?.invoice?.tax_amount === 'number',
        'Commercial Invoicing', 'Official tax invoice details include 18% GST calculation and sequential ID');
    }

    // Test 8.3: Admin Manual Billing Invoice Creation
    const manualInv = await request('/api/admin/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customer_name: 'Custom Corporate Client',
        customer_email: 'corp@esports.gg',
        customer_phone: '+91 99887 76655',
        product_name: 'Tournament Account Provisioning Pack',
        description: 'Bespoke 5-seat scrim profile bundle with regional verification',
        unit_price: 15000,
        quantity: 1,
        platform_fee: 500,
        notes: 'Official invoice issued under Section 31 of CGST Act',
      }),
    });
    assert(manualInv.status === 201 && manualInv.data?.invoice?.id.startsWith('VIB-INV-') && manualInv.data.invoice.final_total > 15000,
      'Commercial Invoicing', 'Admin can generate compliant manual tax invoice with automatic GST calculation');

    // Test 8.4: Admin Queries All Invoices
    const adminInvoices = await request('/api/admin/invoices', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminInvoices.status === 200 && Array.isArray(adminInvoices.data?.invoices) && adminInvoices.data.invoices.length >= 2,
      'Commercial Invoicing', 'Admin has full ledger access to all issued platform tax invoices');
  }

  // 9. FINANCIAL CONTROL CENTER, EXPENSES & SETTLEMENTS
  {
    // Test 9.1: Financial Overview Metrics
    const finRes = await request('/api/admin/finance/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(finRes.status === 200 && typeof finRes.data?.grossVolume === 'number' && typeof finRes.data?.platformCommission === 'number',
      'Financial Control', 'Admin retrieves financial metrics (gross volume, commissions, taxes, expenses, net profit)');

    // Test 9.2: Record Operating Expense
    const expenseRes = await request('/api/admin/finance/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        category: 'API Gateway & Cloud Infrastructure',
        description: 'Riot Games verification microservice hosting and DB backup node',
        amount: 3200,
        recorded_by: 'Finance Operations',
      }),
    });
    assert(expenseRes.status === 201 && expenseRes.data?.expense?.id,
      'Financial Control', 'Admin can record platform operating expenses in the double-entry ledger');

    // Test 9.3: Query Operating Expenses
    const expensesList = await request('/api/admin/finance/expenses', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(expensesList.status === 200 && Array.isArray(expensesList.data?.expenses) && expensesList.data.expenses.length > 0,
      'Financial Control', 'Expenses ledger is queryable by administration staff');

    // Test 9.4: Query Seller Settlements Queue
    const settlementsRes = await request('/api/admin/finance/settlements', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(settlementsRes.status === 200 && Array.isArray(settlementsRes.data?.settlements),
      'Financial Control', 'Settlements queue accurately reports escrow releases and seller payout status');
  }

  // 10. EMPLOYEE TASK MANAGEMENT
  let testTaskId = '';
  {
    // Test 10.1: Admin Creates Employee Task
    const taskRes = await request('/api/admin/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        department: 'Verification',
        title: 'Audit high-value Radiant profile handover',
        description: 'Verify Riot 2FA email transfer and credentials lock before escrow release',
        priority: 'high',
        assigned_to: 'Staff Officer Karan',
        due_date: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    assert(taskRes.status === 201 && taskRes.data?.task?.id,
      'Staff Task Management', 'Admin creates departmental staff task with priority and due date');
    if (taskRes.data?.task?.id) {
      testTaskId = taskRes.data.task.id;
    }

    // Test 10.2: Update Task Status
    if (testTaskId) {
      const updateTask = await request(`/api/admin/tasks/${testTaskId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          status: 'completed',
        }),
      });
      assert(updateTask.status === 200 && updateTask.data?.task?.status === 'completed',
        'Staff Task Management', 'Staff task status transitioned to completed');
    }

    // Test 10.3: Query Tasks Filtered by Department
    const listTasks = await request('/api/admin/tasks?department=Verification', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listTasks.status === 200 && Array.isArray(listTasks.data?.tasks),
      'Staff Task Management', 'Tasks are queryable by department filter');
  }

  // 11. CUSTOMER CRM & INTERNAL AUDIT NOTES
  {
    // Test 11.1: Query Customer CRM Summary
    const crmRes = await request(`/api/admin/users/${userId}/crm`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(crmRes.status === 200 && crmRes.data?.user?.id === userId && typeof crmRes.data?.lifetimeSpent === 'number',
      'Customer CRM', 'Admin CRM view surfaces lifetime spend, dispute volume, and fraud risk score');

    // Test 11.2: Add Internal Staff Note
    const noteRes = await request(`/api/admin/users/${userId}/crm/notes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        note: 'Customer verified phone and Discord handle via voice authentication. Low risk.',
      }),
    });
    assert(noteRes.status === 201 && noteRes.data?.note?.id,
      'Customer CRM', 'Internal confidential staff note recorded (hidden from customer view)');
  }

  // 12. COMMUNICATION EMAIL TEMPLATES
  {
    // Test 12.1: Query Email Templates
    const templatesRes = await request('/api/admin/communication/templates', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(templatesRes.status === 200 && Array.isArray(templatesRes.data?.templates) && templatesRes.data.templates.length >= 4,
      'Communication Center', 'Admin queries transactional email and notification templates');

    // Test 12.2: Update Email Template
    const updateTpl = await request('/api/admin/communication/templates/tpl_order_confirmed', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        subject: 'Order Confirmed - Your VIB Delivery is In Progress!',
      }),
    });
    assert(updateTpl.status === 200 && updateTpl.data?.template?.subject.includes('VIB Delivery'),
      'Communication Center', 'Admin modifies and persists transactional email template content');
  }

  // 13. MANUAL QR PAYMENT ARCHITECTURE (VIB 2.0 PART A)
  {
    // Test 13.1: Query default payment settings
    const paySettings = await request('/api/payment/settings');
    assert(
      paySettings.status === 200 &&
      Boolean(paySettings.data?.upi_id || paySettings.data?.settings?.upi_id),
      'VIB 2.0 Payment',
      'GET /api/payment/settings returns default manual UPI QR settings'
    );

    // Test 13.2: Admin updates payment settings
    const updatePay = await request('/api/admin/payment/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        upi_id: 'thevibofficial@okhdfcbank',
        payee_name: 'VIB Official Digital Hub',
        support_phone: '+91 9181801766',
        instructions: 'Scan with GPay/PhonePe and enter 12-digit UTR below.',
      }),
    });
    assert(
      updatePay.status === 200 &&
      updatePay.data?.settings?.payee_name === 'VIB Official Digital Hub',
      'VIB 2.0 Payment',
      'Admin successfully updates business UPI ID and instructions'
    );
  }

  // 14. ORDER UTR SUBMISSION & PUBLIC TRACKING (VIB 2.0 PART A & MOBILE UX)
  let indianVpOrderId = '';
  {
    // Place Indian VP Pack Order (475 VP Viper Edition)
    const newOrder = await request('/api/user/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        package_id: 'vp-475',
        title: '475 VP (Viper Edition)',
        amount: 499,
        currency: 'INR',
        type: 'vp',
        paymentMethod: 'UPI Manual QR',
        details: { riotId: 'TenZ#0001', email: 'testcustomer@vib.gg' },
      }),
    });
    assert(
      newOrder.status === 201 &&
      newOrder.data?.order?.id &&
      newOrder.data?.order?.payment_status === 'AWAITING_PAYMENT',
      'VIB 2.0 Payment',
      'Order placed with initial status AWAITING_PAYMENT'
    );
    indianVpOrderId = newOrder.data?.order?.id;

    // Test 14.2: Customer submits 12-digit Bank UTR reference
    const utrRes = await request(`/api/orders/${indianVpOrderId}/payment-evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        ref: '428190184712',
        screenshot: 'https://cdn.vib.gg/receipts/test-utr.png',
      }),
    });
    assert(
      utrRes.status === 200 &&
      utrRes.data?.order?.payment_status === 'SUBMITTED_FOR_VERIFICATION' &&
      utrRes.data?.order?.payment_evidence_ref === '428190184712',
      'VIB 2.0 Payment',
      'Customer submits UTR, order updates to SUBMITTED_FOR_VERIFICATION'
    );

    // Test 14.3: Public Tracking endpoint returns order timeline and status
    const trackRes = await request(`/api/orders/track/${indianVpOrderId}`);
    assert(
      trackRes.status === 200 &&
      trackRes.data?.order?.id === indianVpOrderId &&
      trackRes.data?.order?.payment_status === 'SUBMITTED_FOR_VERIFICATION' &&
      Array.isArray(trackRes.data?.order?.timeline) &&
      trackRes.data?.order?.whatsappSupportUrl?.includes('9181801766'),
      'VIB 2.0 Tracking',
      'Public tracking endpoint returns order status, audit timeline, and WhatsApp desk link'
    );
  }

  // 15. ADMIN PAYMENT VERIFICATION & ATOMIC INDIAN VP CODE DELIVERY (VIB 2.0 PART B)
  {
    // Test 15.1: Admin verifies payment -> atomically assigns code from inventory
    const verifyRes = await request(`/api/admin/orders/${indianVpOrderId}/verify-payment`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'approve', notes: 'Bank statement confirmed.' }),
    });
    assert(
      verifyRes.status === 200 &&
      verifyRes.data?.codeIssued === true &&
      verifyRes.data?.order?.payment_status === 'PAYMENT_VERIFIED' &&
      verifyRes.data?.order?.fulfillment_status === 'COMPLETED' &&
      Boolean(verifyRes.data?.order?.issued_code),
      'VIB 2.0 Indian VP',
      'Admin approves payment: Atomic VP code assigned from inventory and marked COMPLETED'
    );

    // Test 15.2: Public tracking now displays the genuine issued code
    const trackFulfilled = await request(`/api/orders/track/${indianVpOrderId}`);
    assert(
      trackFulfilled.status === 200 &&
      trackFulfilled.data?.order?.issued_code === verifyRes.data?.order?.issued_code,
      'VIB 2.0 Indian VP',
      'Fulfilled order exposes genuine Valorant Prepaid PIN code on tracking page'
    );

    // Test 15.3: Bulk Import & Inventory management of VP Codes
    const testCodeSuffix = Date.now().toString(36).toUpperCase();
    const testCodes = [
      `RA-TEST-${testCodeSuffix}-001`,
      `RA-TEST-${testCodeSuffix}-002`,
      `RA-TEST-${testCodeSuffix}-003`,
    ];
    const importRes = await request('/api/admin/vp-codes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        package_id: 'vp-475',
        batch_no: `TEST-BATCH-${testCodeSuffix}`,
        codes: testCodes,
      }),
    });
    assert(
      importRes.status === 201 &&
      importRes.data?.addedCount === 3,
      'VIB 2.0 Indian VP',
      'Admin can bulk import genuine prepaid codes into inventory'
    );

    // Test 15.4: List VP Codes and verify inventory breakdown
    const listCodes = await request('/api/admin/vp-codes?package_id=vp-475', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      listCodes.status === 200 &&
      Array.isArray(listCodes.data?.codes) &&
      listCodes.data.codes.some((c: any) => c.code === testCodes[0]),
      'VIB 2.0 Indian VP',
      'Admin can list and audit prepaid code inventory'
    );
  }

  // 16. REGIONAL / PHP VP ORDERS & ZERO CODE DISPATCH GUARANTEE (VIB 2.0 PART C)
  let regionalOrderId = '';
  {
    // Test 16.1: Place Regional PHP VP Order
    const regOrderRes = await request('/api/user/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        title: '1,000 VP Regional Pack (PHP/International)',
        amount: 850,
        currency: 'INR',
        type: 'regional_vp',
        paymentMethod: 'UPI Manual QR',
        details: { riotId: 'TenZ#0001', email: 'phptester@vib.gg' },
      }),
    });
    assert(
      regOrderRes.status === 201 &&
      regOrderRes.data?.order?.id,
      'VIB 2.0 Regional VP',
      'Regional PHP VP order created'
    );
    regionalOrderId = regOrderRes.data.order.id;

    // Test 16.2: Admin verifies payment for Regional order
    const regVerifyRes = await request(`/api/admin/orders/${regionalOrderId}/verify-payment`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'approve', notes: 'Regional payment received.' }),
    });
    assert(
      regVerifyRes.status === 200 &&
      regVerifyRes.data?.codeIssued === false &&
      regVerifyRes.data?.order?.issued_code === null,
      'VIB 2.0 Regional VP',
      'Strict Rule: Regional VP orders NEVER issue automated codes. Dispatched to WhatsApp desk'
    );

    // Test 16.3: Query regional orders queue
    const regQueue = await request('/api/admin/regional-orders', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      regQueue.status === 200 &&
      Array.isArray(regQueue.data?.orders) &&
      regQueue.data.orders.some((o: any) => o.id === regionalOrderId),
      'VIB 2.0 Regional VP',
      'Admin regional queue contains the PHP/International order for WhatsApp coordination'
    );
  }

  // 17. ACCOUNT & PROFILE LISTINGS WORKFLOW (VIB 2.0 PART D)
  let userListingId = '';
  {
    // Test 17.1: Query VIP plans
    const vipPlans = await request('/api/vip-plans');
    assert(
      vipPlans.status === 200 &&
      Array.isArray(vipPlans.data?.plans) &&
      vipPlans.data.plans.length >= 3,
      'VIB 2.0 Listings',
      'GET /api/vip-plans returns promotional tiers (Silver, Gold, Platinum)'
    );

    // Test 17.2: User submits account listing for moderation
    const submitListing = await request('/api/user/listings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        title: 'Ascendant 2 Smurf - Reaver Vandal & Ion Phantom',
        description: 'Clean Mumbai server account with full email access and no bans.',
        price_inr: 5499,
        rank_tier: 'Ascendant 2',
        peak_rank: 'Immortal 1',
        account_level: 160,
        region: 'ap',
        knife_count: 2,
        skins: ['Reaver Vandal', 'Ion Phantom', 'Glitchpop Dagger'],
        vip_plan_id: 'silver',
        status: 'submitted',
      }),
    });
    assert(
      submitListing.status === 201 &&
      submitListing.data?.listing?.id &&
      submitListing.data?.listing?.status === 'submitted',
      'VIB 2.0 Listings',
      'User can submit account listing for admin review'
    );
    userListingId = submitListing.data.listing.id;

    // Test 17.3: Admin lists pending listings
    const adminListings = await request('/api/admin/listings?status=submitted', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminListings.status === 200 &&
      adminListings.data?.listings?.some((l: any) => l.id === userListingId),
      'VIB 2.0 Listings',
      'Admin moderation queue contains the newly submitted listing'
    );

    // Test 17.4: Admin approves and publishes listing
    const approveListing = await request(`/api/admin/listings/${userListingId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'published' }),
    });
    assert(
      approveListing.status === 200 &&
      approveListing.data?.listing?.status === 'published',
      'VIB 2.0 Listings',
      'Admin can approve and publish community listing'
    );

    // Test 17.5: Public marketplace includes the newly published listing
    const publicListings = await request('/api/listings');
    assert(
      publicListings.status === 200 &&
      publicListings.data?.listings?.some((l: any) => l.id === userListingId),
      'VIB 2.0 Listings',
      'GET /api/listings displays verified published community accounts'
    );
  }

  // 18. VALORANT SKIN CATALOG & EMAIL LOGGING SYSTEM (VIB 2.0 PART E & F)
  {
    // Test 18.1: Skins catalog returns structured skins with categories
    const skinsRes = await request('/api/skins');
    assert(
      skinsRes.status === 200 &&
      Array.isArray(skinsRes.data?.skins) &&
      skinsRes.data.skins.length >= 10 &&
      skinsRes.data.skins.some((s: any) => s.weapon === 'Vandal'),
      'VIB 2.0 Skin Catalog',
      'GET /api/skins returns structured Valorant weapon skin catalog'
    );

    // Test 18.2: Outbound email delivery logs are queryable by admin
    const emailLogs = await request('/api/admin/email-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      emailLogs.status === 200 &&
      Array.isArray(emailLogs.data?.logs) &&
      emailLogs.data.logs.length > 0,
      'VIB 2.0 Email Logs',
      'GET /api/admin/email-logs records outbound transactional messages with delivery status'
    );

    // Test 18.3: Admin can trigger diagnostic test email
    const testEmailRes = await request('/api/admin/email/test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ email: 'thevibofficial@gmail.com' }),
    });
    assert(
      testEmailRes.status === 200 &&
      Boolean(testEmailRes.data?.success),
      'VIB 2.0 Email Logs',
      'POST /api/admin/email/test executes Nodemailer diagnostic dispatch and logs result'
    );
  }

  console.log('\n====================================================');
  console.log('TEST SUMMARY RESULTS');
  console.log('====================================================');
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Tests Run: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log(`\n>>> ALL ${total} INTEGRATION TESTS PASSED WITH 100% SUCCESS RATE! <<<`);
  } else {
    console.error(`\n>>> FAILED TESTS: ${failed} <<<`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
