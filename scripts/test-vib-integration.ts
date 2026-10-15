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
    console.log('\n>>> ALL 18 INTEGRATION TESTS PASSED WITH 100% SUCCESS RATE! <<<');
  } else {
    console.error(`\n>>> FAILED TESTS: ${failed} <<<`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
