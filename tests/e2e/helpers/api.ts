/**
 * VIB E2E helpers: direct API access (for seeding, server-side assertions and
 * permission tests) plus browser session helpers that inject an auth token so
 * UI tests skip the login forms when they are not the point of the test.
 */
import { APIRequestContext, Page } from '@playwright/test';

export const API_BASE = 'http://localhost:5000';

export const QA = {
  customer: { email: 'qa_customer@vib.test', password: 'QaPass#123' },
  customer2: { email: 'qa_customer2@vib.test', password: 'QaPass#123' },
  seller: { email: 'qa_seller@vib.test', password: 'QaPass#123' },
  moderator: { email: 'qa_moderator@vib.test', password: 'QaPass#123' },
  admin2: { email: 'qa_admin2@vib.test', password: 'QaPass#123' },
  admin: { email: 'admin@vib.gg', password: 'AdminPassword@123' },
};

export interface ApiResult<T = any> {
  status: number;
  data: T | null;
}

export async function api(
  request: APIRequestContext,
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<ApiResult> {
  const res = await request[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](API_BASE + path, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    data: body === undefined ? undefined : body,
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* non-json */ }
  return { status: res.status(), data };
}

export async function login(request: APIRequestContext, email: string, password: string): Promise<string> {
  const r = await api(request, 'POST', '/api/auth/login', { email, password });
  if (r.status !== 200) throw new Error(`login failed ${r.status} ${JSON.stringify(r.data)}`);
  return (r.data as any).token;
}

/** Injects a bearer token into localStorage for the SPA so the user is "logged in". */
export async function injectAuth(page: Page, token: string) {
  await page.addInitScript((t) => {
    localStorage.setItem('vib_auth_token', t);
  }, token);
}
