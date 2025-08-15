# PuertoRicoTravelDeals (PRTD)

End-to-end prototype for a Puerto Rico travel deals marketplace.

## Stack
Node 18+, Express, EJS + express-ejs-layouts, SQLite (embedded), Passport (local + Google), Sessions (connect-sqlite3), CSRF protection, Stripe Checkout (feature flagged), modern responsive CSS (single file, design tokens).

## Quick Start (≈5 minutes)
1. Clone & install:
	```bash
	npm install
	```
2. Create `.env` from example:
	```bash
	cp .env.example .env
	```
3. Set a secure `SESSION_SECRET` (and optionally GOOGLE / STRIPE vars now or later).
4. Initialize DB:
	```bash
	npm run migrate
	npm run seed
	```
5. Run dev server:
	```bash
	npm run dev
	# or npm start
	```
6. Visit http://localhost:3000

## Environment Variables
See `.env.example` for full list:

| Variable | Purpose |
|----------|---------|
| PORT | Server port (default 3000) |
| SESSION_SECRET | Required session signing secret |
| ADMIN_PASSWORD | Password for simple admin gate |
| GOOGLE_CLIENT_ID / SECRET / CALLBACK_URL | Enable Google OAuth (optional) |
| STRIPE_ENABLED | 'true' to enable Stripe Checkout flow |
| STRIPE_SECRET_KEY | Stripe secret API key (test) |
| STRIPE_PUBLIC_KEY | (Future: client usage) |
| STRIPE_WEBHOOK_SECRET | Verify incoming Stripe webhooks |

## Auth
- Local email/password signup & login
- Google OAuth (account linking by email) when env vars present
- Sessions persisted in SQLite store
- CSRF protection on all state-changing forms

## Admin
Minimal CRUD (one option per deal):
- Login: `/admin/login` (ADMIN_PASSWORD)
- List / create / edit / archive deals
- Single `deal_option` auto-managed (Standard)

## Stripe Checkout (Feature Flag)
Disabled by default. Set:
```
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
Checkout flow: POST /checkout/session creates order (status `created`) + Stripe Checkout Session. Webhook (`/webhooks/stripe`) on `checkout.session.completed` marks order `paid`. (Stock decrement out of scope for MVP.)

Stripe CLI example:
```bash
stripe login
stripe listen --events checkout.session.completed --forward-to localhost:3000/webhooks/stripe
```

## Google OAuth Setup
1. Create OAuth Client (Web) in Google Cloud Console.
2. Authorized redirect URI: `http://localhost:3000/auth/google/callback` (or your configured callback).
3. Populate `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` in `.env`.

## Scripts
| Script | Description |
|--------|-------------|
| dev | Nodemon + inspector |
| start | Launch server |
| migrate | Apply schema (idempotent) |
| seed | Insert demo data (idempotent) |
| test | Run smoke tests |

## Smoke Tests
Minimal dependency-free suite (`npm test`). Covered:
1. Home page 200 + title
2. Seeded deal detail 200
3. Signup -> account access
4. Invalid login rejection
5. Admin guard redirect
6. Admin login + create deal + toggle archive
7. Stripe placeholder (skipped unless enabled)

Exit code non-zero if any fail. Tests use raw HTTP and basic cookie handling.

## Accessibility & UI
Single `styles.css` with design tokens, responsive grid, focus-visible outlines, reduced-motion fallback, WCAG AA-ish color contrast for text & interactive elements.

## Terminal Rules
Use provided npm scripts. Avoid manual DB tampering outside scripts for repeatability. Keep single CSS file authoritative for styling tweaks.

## Roadmap Ideas
- Multiple deal options & inventory tracking
- Order history page
- Improved error pages & flash messaging
- Stripe client-side (Stripe.js) + taxes/fees
- Email notifications

## License
Internal prototype (add license if open-sourcing).

---
Last updated: August 2025
