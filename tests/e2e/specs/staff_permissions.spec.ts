import { test, expect, APIRequestContext } from '@playwright/test';
import { api, login, QA } from '../helpers/api';

/**
 * staff_permissions.spec.ts — server-side authorization regression suite.
 *
 * Core security/permission checks against the API. Exact status codes are
 * asserted; any deviation from intended policy is recorded as a note/annotation
 * and reported in README.md (app code is NOT modified).
 */

async function tokens(request: APIRequestContext) {
  return {
    customer: await login(request, QA.customer.email, QA.customer.password),
    customer2: await login(request, QA.customer2.email, QA.customer2.password),
    moderator: await login(request, QA.moderator.email, QA.moderator.password),
    admin: await login(request, QA.admin2.email, QA.admin2.password),
    superadmin: await login(request, QA.admin.email, QA.admin.password),
  };
}

async function customerId(request: APIRequestContext, superToken: string): Promise<string> {
  const r = await api(request, 'GET', '/api/admin/users?search=qa_customer', undefined, superToken);
  const users = (r.data?.users as any[]) || [];
  return users.find((u) => u.email === QA.customer.email)?.id || 'usr_unknown';
}

async function customer2Id(request: APIRequestContext, superToken: string): Promise<string> {
  const r = await api(request, 'GET', '/api/admin/users?search=qa_customer2', undefined, superToken);
  const users = (r.data?.users as any[]) || [];
  return users.find((u) => u.email === QA.customer2.email)?.id || 'usr_unknown';
}

/**
 * Creates an order for customer2 (deterministic catalog-backed VP order) and
 * returns its id. Falls back to any existing order owned by a different user.
 */
async function otherCustomersOrderId(request: APIRequestContext, t: Awaited<ReturnType<typeof tokens>>): Promise<string | null> {
  const created = await api(request, 'POST', '/api/user/orders', { type: 'vp', product_id: 'vp-475', amount: 499 }, t.customer2);
  if (created.status === 201 && created.data?.orderId) {
    return created.data.orderId as string;
  }
  const list = await api(request, 'GET', '/api/admin/orders', undefined, t.moderator);
  const orders = (list.data?.orders as any[]) || [];
  const c1Id = await customerId(request, t.superadmin);
  const other = orders.find((o) => o.user_id !== c1Id);
  return other?.id ?? null;
}

test.describe('Staff authorization — no token', () => {
  test('admin endpoints reject anonymous requests with 401', async ({ request }) => {
    for (const path of ['/api/admin/stats', '/api/admin/kyc/list', '/api/admin/emi/list']) {
      const r = await api(request, 'GET', path);
      expect(r.status, `${path} should require auth`).toBe(401);
    }
  });
});

test.describe('Staff authorization — customer token', () => {
  test('customer is denied all admin endpoints with 403', async ({ request }) => {
    const t = await tokens(request);

    const expects: Array<[string, number]> = [
      ['GET /api/admin/stats', 403],
      ['GET /api/admin/users', 403],
      ['PUT /api/admin/users/:id/status', 403],
      ['GET /api/admin/kyc/list', 403],
      ['GET /api/admin/emi/list', 403],
      ['PUT /api/admin/orders/:id/verify-payment', 403],
      ['GET /api/admin/finance/overview', 403],
    ];
    for (const [label, code] of expects) {
      let r: { status: number };
      if (label.startsWith('PUT')) {
        const orderId = await otherCustomersOrderId(request, t);
        r = await api(request, 'PUT', `/api/admin/orders/${orderId ?? 'ord_x'}/verify-payment`, { action: 'approve' }, t.customer);
      } else {
        const path = label.split(' ')[1];
        r = await api(request, 'GET', path, undefined, t.customer);
      }
      expect(r.status, `${label} should be forbidden for customer`).toBe(code);
    }
  });
});

test.describe('Staff authorization — moderator token', () => {
  test('moderator access levels (corrected security model)', async ({ request }) => {
    const t = await tokens(request);
    const targetId = await customerId(request, t.superadmin);

    // Operational areas stay open to moderators (staffOnly).
    expect((await api(request, 'GET', '/api/admin/stats', undefined, t.moderator)).status).toBe(200);
    expect((await api(request, 'GET', '/api/admin/orders', undefined, t.moderator)).status).toBe(200);
    expect((await api(request, 'GET', '/api/admin/kyc/list', undefined, t.moderator)).status).toBe(200);
    expect((await api(request, 'GET', '/api/admin/emi/list', undefined, t.moderator)).status).toBe(200);

    // Sensitive admin-only areas are denied to moderators (403).
    const finance = await api(request, 'GET', '/api/admin/finance/overview', undefined, t.moderator);
    expect(finance.status, 'moderator must not see finance overview (adminOnly)').toBe(403);

    const staff = await api(request, 'GET', '/api/admin/staff', undefined, t.moderator);
    expect(staff.status, 'moderator must not list staff (adminOnly)').toBe(403);

    const users = await api(request, 'GET', '/api/admin/users', undefined, t.moderator);
    expect(users.status, 'moderator must not list users (adminOnly)').toBe(403);
    const statusU = await api(request, 'PUT', `/api/admin/users/${targetId}/status`, { status: 'active', reason: 'qa-regression' }, t.moderator);
    expect(statusU.status, 'moderator must not suspend/ban users (adminOnly)').toBe(403);

    // Role management stays superadmin-only.
    const roleChange = await api(request, 'PUT', `/api/admin/users/${targetId}/role`, { role: 'seller' }, t.moderator);
    expect(roleChange.status, 'moderator must not change roles (superAdminOnly)').toBe(403);
  });
});

test.describe('Staff authorization — admin & superadmin role management', () => {
  test('admin cannot change roles or elevate to superadmin (P1-F7)', async ({ request }) => {
    const t = await tokens(request);
    const targetId = await customer2Id(request, t.superadmin);

    const r1 = await api(request, 'PUT', `/api/admin/users/${targetId}/role`, { role: 'seller' }, t.admin);
    expect(r1.status, 'admin must not change roles (superAdminOnly)').toBe(403);

    const r2 = await api(request, 'PUT', `/api/admin/users/${targetId}/role`, { role: 'superadmin' }, t.admin);
    expect(r2.status, 'admin must not elevate users to superadmin').toBe(403);

    // Leave the target in a clean unprivileged state via superadmin.
    const revert = await api(request, 'PUT', `/api/admin/users/${targetId}/role`, { role: 'user' }, t.superadmin);
    expect(revert.status).toBe(200);
  });

  test('superadmin can change roles and revert', async ({ request }) => {
    const t = await tokens(request);
    const targetId = await customerId(request, t.superadmin);

    const up = await api(request, 'PUT', `/api/admin/users/${targetId}/role`, { role: 'seller' }, t.superadmin);
    expect(up.status).toBe(200);
    const down = await api(request, 'PUT', `/api/admin/users/${targetId}/role`, { role: 'user' }, t.superadmin);
    expect(down.status).toBe(200);
  });
});

test.describe('IDOR & object-level authorization', () => {
  test('customer cannot access another customer\'s order room', async ({ request }) => {
    const t = await tokens(request);
    const orderId = await otherCustomersOrderId(request, t);
    expect(orderId, 'need an order for IDOR check').toBeTruthy();

    const r = await api(request, 'GET', `/api/orders/${orderId}/room`, undefined, t.customer);
    expect([403, 404], `cross-user order room expected 403/404, got ${r.status}`).toContain(r.status);
    test.info().annotations.push({
      type: 'note',
      description: `IDOR: customer GET /api/orders/:id/room on another user's order -> ${r.status} (403 = enforced).`,
    });
  });

  test('customer cannot fetch KYC docs belonging to others (random / traversal paths -> 404)', async ({ request }) => {
    const t = await tokens(request);

    const random = await api(request, 'GET', '/api/user/kyc/docs/random-missing.png', undefined, t.customer);
    expect(random.status).toBe(404);

    const traversal = await api(request, 'GET', '/api/user/kyc/docs/..%2F..%2Fserver%2Findex.ts', undefined, t.customer);
    expect(traversal.status).toBe(404);
  });
});

test.describe('Legal consent — client-supplied userId', () => {
  test('consent POST with customer token + another user id records under requester (finding check)', async ({ request }) => {
    const t = await tokens(request);
    const targetId = await customer2Id(request, t.superadmin);
    const contextId = `idor-probe-${Date.now()}`;

    const post = await api(request, 'POST', '/api/legal/consent', {
      policySlug: 'terms-and-conditions',
      version: '1.0',
      userId: targetId,
      contextType: 'pra',
      contextId,
    }, t.customer);
    expect(post.status).toBe(200);

    // Confirm who the consent row was actually recorded for.
    const list = await api(request, 'GET', '/api/admin/legal/consents', undefined, t.superadmin);
    expect(list.status).toBe(200);
    const consents = (list.data?.consents as any[]) || [];
    const row = consents.find((c) => c.context_id === contextId);
    expect(row, `consent probe row should be present (contextId=${contextId})`).toBeTruthy();
    expect(row.user_email, 'authenticated consent must be attributed to the requester, not the spoofed userId').toBe(QA.customer.email);
    test.info().annotations.push({
      type: 'note',
      description: `POST /api/legal/consent with customer token + foreign userId -> ${post.status}; recorded under requester ${row.user_email}. Server no longer trusts client-supplied userId when authenticated (see README F6 for the unauthenticated path).`,
    });
  });
});
