# Go-Live Readiness Report

## Executive Summary
Status: Ready with minor tasks (🟡). Core browsing, auth (local), admin CRUD with image upload, discount logic, and Stripe-gated checkout scaffolding all function. Minimal gaps: production session secret enforcement, foreign_keys PRAGMA not persisted for current runtime DB file, absence of vouchers implementation, and optional Google/Stripe enablement & SEO assets. None are hard blockers for a controlled soft launch adding real deals; Stripe payments require enabling + keys.

## Checklist Snapshot
- Public browsing: ✅
- Auth (email/password): ✅
- Google login (optional): ⚠️ (configured but requires real client keys)
- Admin (create/edit/archive deals): ✅
- Image upload on edit: ✅ (2MB limit, jpeg/png/webp)
- Purchase flow (Stripe flag off): ✅ (graceful 400 on attempt, app stable)
- Purchase flow (Stripe flag on): ⚠️ (code present; unverified with real keys/webhook in this run)
- Voucher generation & redeem: ❌ (not implemented yet)
- CSRF/session security: ✅ (csurf on mutating routes; secure cookie flags toggle in prod)
- Basic SEO (title/meta), sitemap/robots.txt (optional): ⚠️ (basic <title>, no sitemap/robots)

## What Works Now (Evidence)
- GET / → 200 (test log: `GET / 200 ...`)
- GET /deal/oceanfront-escape → 200 (test log)
- Signup POST /signup → 302 redirect then GET /account 200 (tests passed)
- Login invalid creds → 401 (auth guard functioning)
- Admin guard GET /admin → 302 to /admin/login (test log)
- Admin login POST /admin/login → 302 then dashboard GET /admin 200
- Deal creation POST /admin/deals → 302 then appears in dashboard (test log: new deal id referenced in toggle)
- Archive toggle POST /admin/deals/:id/toggle → 302 (test log)
- CSRF tokens present in auth/admin forms (grep hits across views/* with hidden _csrf)
- Image upload pipeline present (multer diskStorage, 2MB limit, mime filter) in `src/routes/admin.js`
- Stripe webhook endpoint `/webhooks/stripe` defined; handles `checkout.session.completed`
- Rate limiting active on auth endpoints (`authLimiter` in `auth.js`)
- No innerHTML usage (grep returned no results) → reduced XSS surface
- Test suite: 11 passed, 0 failed (smoke coverage of public/auth/admin flows)

## Gaps Before Go-Live
1. SESSION_SECRET enforcement
   - Severity: Blocker for production hardening
   - Scope: Fail fast if `process.env.SESSION_SECRET` missing & not dev/test; update server start check.
   - ETA: S
2. Foreign key enforcement persistence
   - Severity: Should-have
   - Scope: Ensure runtime DB connection sets `PRAGMA foreign_keys=ON;` (migration enables, but active connection must also). Confirm in `src/db.js` or add line.
   - ETA: S
3. Voucher generation & redeem flow
   - Severity: Should-have (if vouchers promised for launch); currently absent.
   - Scope: Add table (vouchers), generate on paid order, redeem endpoint with admin validation.
   - ETA: M
4. Stripe live validation
   - Severity: Should-have (only if accepting payments Day 1)
   - Scope: Run with STRIPE_ENABLED=true, real keys, simulate checkout + webhook success.
   - ETA: S
5. Google OAuth production keys
   - Severity: Nice-to-have
   - Scope: Populate GOOGLE_CLIENT_ID/SECRET & verify callback in prod URL.
   - ETA: S
6. Basic SEO & robots
   - Severity: Nice-to-have
   - Scope: Add meta description, /robots.txt, /sitemap.xml generator (static minimal).
   - ETA: S

(If vouchers not in MVP scope, remove item 3 and adjust readiness to green after items 1,2.)

## Risk Notes & Mitigations
- Local image storage (`/public/uploads`): Acceptable MVP; plan S3 or CDN later to avoid disk growth and support scaling.
- Single SQLite DB (`data.sqlite`): Fine for low traffic; plan Postgres migration once concurrency & growth increase.
- Stripe disabled path returns 400 (explicit): Clear signal; no ghost orders created.
- Missing vouchers: Orders currently not issuing user-facing redemption artifact; communicate limitation or implement minimal codegen.
- Foreign keys off (current runtime file app.sqlite empty; active DB file is data.sqlite): Confirm consistent DB file usage and enforce constraints on every connection.
- No rate limiting on admin create/edit beyond implicit session: low risk now; add global limiter if exposed publicly.

## Prioritized Action Items (3–7)
1. Enforce SESSION_SECRET in production (abort startup if unset). (Severity: Blocker, ETA: S)
2. Ensure foreign_keys PRAGMA for runtime DB connection; verify correct DB filename usage (align `db/app.sqlite` vs `db/data.sqlite`). (Severity: Should-have, ETA: S)
3. Decide MVP stance on vouchers; either implement minimal voucher issuance & redeem or explicitly defer in README. (Severity: Should-have, ETA: M)
4. Stripe end-to-end test with test keys (checkout + webhook) before enabling in prod. (Severity: Should-have, ETA: S)
5. Add meta description + robots.txt (and optional sitemap) for baseline SEO. (Severity: Nice-to-have, ETA: S)

## Appendix (Raw Outputs)
```
ls -la (excerpt)
.db files: data.sqlite (86KB), sessions.sqlite, app.sqlite (0B)

.env.example
PORT=3000
SESSION_SECRET=change_me
STRIPE_ENABLED=false
...

Schema tables (schema.sql): users, deals, deal_options, orders, order_items (no vouchers yet)

Test Summary: 11 passed, 0 failed
Sample logs:
GET / 200
GET /deal/oceanfront-escape 200
POST /signup 302
GET /account 200
GET /admin/login 200
POST /admin/login 302
GET /admin 200

CSRF grep count: multiple hits across auth/admin forms
innerHTML grep: (no results)

Deals count (seed): 6 base + subsequent admin-created entries (toggle example id 32 in logs)
Users (after signup test): demo + admin + test signup (at least 3 total; exact count requires sqlite query on data.sqlite)
```

---
Generated without modifying application code.
