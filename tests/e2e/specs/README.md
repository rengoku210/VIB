# VIB E2E Regression Specs

Regression suite for the VIB marketplace platform (UI `http://localhost:3000`, API `http://localhost:5000`).

Run from the project root with:

```bash
npx playwright test --config=tests/e2e/playwright.config.ts specs/auth.spec.ts specs/security.spec.ts specs/staff_permissions.spec.ts
# or from tests/e2e:
cd tests/e2e && npx playwright test specs/auth.spec.ts specs/security.spec.ts specs/staff_permissions.spec.ts
# or the whole specs directory:
npx playwright test
```

Configuration lives in `tests/e2e/playwright.config.ts`; shared helpers in `tests/e2e/helpers/api.ts`
(`api`, `login`, `injectAuth`, `QA` accounts, `API_BASE`).

## Suite list

| File | Tests | Covers |
| --- | --- | --- |
| `specs/kyc.spec.ts` | 8 | KYC full lifecycle: initial state → customer UI submit (2 docs + previews) → admin list (pending, documents_count 2) → admin UI approve (chip Approved) → customer approved + 409 resubmission → rejection path (reason + resubmit 201) → document protection (cross-customer 404, `/uploads` 404) → success-confirmation UI probe |
| `specs/emi.spec.ts` | 9 | EMI full lifecycle: API apply (833.33 EMI, pending_approval) → dashboard listing → admin UI approve (active, schedule, first due next month) → customer UI pay with UTR + evidence → in-order 409 rule → admin verify installment → paid, progress 1/12 → outstanding balance ≈9166.67 → overdue shape check (status per payment; no DB tweak) → pay-feedback UI probe |
| `specs/admin.spec.ts` | 9 | Admin console: stats API; UI sidebar/Orders/Users & CRM; reload persistence; invoice create+persist; expense create+persist; staff create+permissions persist; announcement broadcast to customer notifications; task create+persist; payment-verification flow (order → evidence → verify → PAYMENT_VERIFIED, invoice paid, txn success) + payment settings update/restore |
| `specs/responsive.spec.ts` | 9 | Viewport regression at 390×844 / 768×1024 / 1440×900: no horizontal overflow on home, profiles, dashboard (customer token), admin (admin token); mobile menu/drawer navigation; dashboard drawer (KYC Verification, EMI Plans); signup modal fits viewport with scrollable content; desktop sidebar collapse/expand |
| `specs/auth.spec.ts` | 11 | Register (unique/duplicate/validation: missing name, invalid email, short password), login (wrong/correct), logout (session + localStorage token), route guards (`/?page=dashboard` logged-out redirect; injected-token dashboard), forgot-password feedback (success OTP or clear error) |
| `specs/staff_permissions.spec.ts` | 8 | Exact authorization status codes: no-token 401; customer 403 on all admin endpoints; moderator access levels (finance/users/staff/role); admin + superadmin role management (with revert); IDOR order-room / KYC-docs checks; legal-consent client-supplied `userId` finding check |
| `specs/security.spec.ts` | 13 | SQLi login/products; XSS reflection (API + UI no-dialog); path traversal; upload/KYC size validation; rate-limit observation; reset-OTP failure; admin-route UI protection; sensitive-info exposure (no `password_hash`/`salt`/base64 evidence) |

## Test data / isolation

- Seeded QA accounts are used (`helpers/api.ts` → `QA`).
- `kyc.spec.ts`, `emi.spec.ts` and this suite self-clean / avoid clobbering QA rows
  (`kyc/emi` use local SQLite `data/vib.db`, `node:sqlite`; ours register unique users / revert role changes).
- No application code or configuration was modified.

## App bugs found

### A. UI feedback bugs reported by sibling suites (Low/Medium)

1. **KYC submission success confirmation never displays** — `KycSection.tsx` renders `submitSuccess` inside the form container that unmounts when `kycStatus` flips to `pending`. (kyc.spec.ts #8 annotated `bug`)
2. **EMI installment payment success feedback never displays** — `EmiSection.tsx` sets `payFeedback` then `fetchDetail()` resets it to null. (emi.spec.ts #9 annotated `bug`)
3. **EMI admin approval confirmation never displays** — `AdminEmiManagement.tsx` sets `actionSuccess` then `openDetail()` resets it. (reported in emi.spec.ts #3 context)
4. **Cookie-consent banner intercepts clicks over modals (Medium)** — fixed `bottom-0 z-50` banner is rendered after modals and blocks pointer events in modal action rows until dismissed. Tests dismiss it first (`dismissCookieBanner` helper); the overlay conflict remains.

### B. Security / authorization findings from this suite (report-only)

| ID | Severity | Finding | Evidence (actual statuses) |
| --- | --- | --- | --- |
| F1 | P1 | Moderator can list all users and suspend/ban accounts (`adminOnly` includes `moderator`) | `GET /api/admin/users` → 200; `PUT /api/admin/users/:id/status` → 200 with moderator token |
| F2 | P2 | Moderator receives full financial overview (no moderation of `finance/overview`) | `GET /api/admin/finance/overview` → 200 with gross/expenses/net |
| F3 | P2 | Moderator can list staff accounts + permission sets | `GET /api/admin/staff` → 200 with moderator token |
| F4 | P3 | Upload endpoint does not sniff file content (declared-PNG data URL with non-image bytes stored as `*.png`) | `POST /api/upload` → 200 |
| F5 | P2 | No rate limiting on `/api/auth/login` | 30 rapid wrong-password attempts → all 401, no 429 |
| F6 | P2 | Unauthenticated `POST /api/legal/consent` accepts arbitrary `userId` (audit-trail forgery). With a valid bearer token the server correctly attributes consent to the token's user | anonymous POST → 200 recorded under supplied userId; authenticated POST → 200 recorded under requester (verified via `/api/admin/legal/consents`) |
| F7 | P1 | Regular `admin` can elevate users to `superadmin` (`superAdminOnly` includes `admin`) | `PUT /api/admin/users/:id/role` `{role:"superadmin"}` with qa_admin2 → 200 |
| F8 | — | (Info) Moderator role-change correctly denied | `PUT /api/admin/users/:id/role` with moderator → 403 |
| F9 | — | (Info) SQLi login returns 401 (not 400); no data leak | `POST /api/auth/login` `' OR 1=1 --` → 401 |
| F10 | — | (Info) Forgot-password enabled; wrong OTP rejected | `POST /api/auth/forgot-password` → 200/`requiresCode`; reset with wrong OTP → 400. At report time the email provider intermittently returned 503 "could not be delivered" (throttled), so the OTP check skips gracefully until delivery recovers |
| F11 | — | (Env note) Pre-existing pending KYC on `qa_customer@vib.test` can mask size-limit test; oversized-doc test registers a fresh user instead | fresh register → KYC >5MB → 400 |

## Acceptance / run results (2026-11-06)

- Our three files collect cleanly:
  `npx playwright test specs/auth.spec.ts specs/security.spec.ts specs/staff_permissions.spec.ts --list` → **33 tests in 3 files**.
- Final run of our three files: **32 passed, 1 skipped**. The skip is the reset-OTP
  check (forgot-password returned a transient service error at that moment; recorded &
  skipped per contract — on healthy runs it passes with 400 on wrong OTP).
- `tests/e2e/specs/` is shared with concurrently authored suites; while another suite is
  mid-edit a full `--list` may fail on **its** file (e.g. `kyc.spec.ts` currently
  references a not-yet-existing `tests/e2e/assets/1x1.png` and doubles the assets path).
  This is outside the scope of the three files above.
- Use `--output=<unique-dir>` when runs overlap to avoid `test-results/` artifact races
  (observed transient ENOENT errors on concurrent runs).
