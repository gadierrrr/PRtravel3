# PuertoRicoTravelDeals (PRTD)

End-to-end prototype for a Puerto Rico travel deals marketplace focused on discoverability of curated Puerto Rico travel & experience deals, with admin curation, optional payment capture, and image management.

Runtime DB: `data.sqlite`. Dev startup logs show the absolute DB path and foreign key (FK) status (`foreign_keys=1`).

## Tech Stack
Node 18+ (ES modules not required, CommonJS), Express 4, EJS + express-ejs-layouts, SQLite (file-based) with light migration layer, Passport (Local + Google OAuth 2.0), connect-sqlite3 session store, CSRF protection, Stripe Checkout (feature flag), Multer for image uploads, single CSS file (design tokens + responsive grid), minimal dependency smoke tests.

## Key Features
- Public deal catalog with discount & time-left computations
- Extended metadata: merchant name, average rating, rating count, promotional blurb, end date, review count placeholder
- Image support: per-deal image via file upload (validated MIME/size) or external URL, with safe replacement & deletion
- Authentication: email/password signup + Google OAuth (optional)
- Admin portal (password gate) for CRUD deal management & image handling
- Stripe Checkout integration (flagged off by default)
- Idempotent migrations & seed scripts (safe re-run)
- Security: CSRF on state-changing routes, bcrypt password hashing, session regeneration on auth events, rate limiting placeholder (can be added)
- Clean design tokens & accessible focus states
- Lightweight test harness (no Jest/Mocha dependency)

## Architecture (High-Level)
```
Browser -> Express Router Layer -> Controllers (inline in routes) -> SQLite (serialized access)
														 |-> Passport Strategies (local, Google)
														 |-> Stripe Service (feature-flag)
														 |-> Multer (upload parsing) -> /public/uploads
Views: EJS templates with shared layout & partials
```

## Folder Structure
```
db/            Migration & seed scripts
public/        Static assets (css/, uploads/ (gitignored))
src/
	server.js    App bootstrap (middleware, routes)
	routes/      Route modules (public, auth, admin, stripe)
	auth/        Passport strategy setup (local, Google)
	lib/         Helpers (if added later)
views/         EJS templates (layout, partials, pages)
tests/         Smoke tests (HTTP requests)
```

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

### Minimal Production-ish Run
```bash
NODE_ENV=production SESSION_SECRET="change_me" PORT=3000 npm start
```
Use a process manager (pm2 / systemd) & put SQLite file on persistent volume. Front with an HTTPS-terminating reverse proxy (nginx / Caddy). Set secure cookies & enable trust proxy.

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
| IMAGE_MAX_SIZE_MB | Override default 2MB upload cap (optional) |
| UI_REFRESH | '1' to enable new homepage theme in production (default ON in dev) |

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
### UI Refresh Flag
Set `UI_REFRESH=1` in production to enable the refreshed homepage (gradient hero, chips, updated cards). In development it is ON by default unless `UI_REFRESH=0` is set.

### CSS Cleanup Approach
Legacy styles are preserved under `.theme-legacy` while refreshed styles scope to `.theme-refresh`. Unused selectors will be inventoried and pruned after verification (see `css-cleanup.md` when added).
Single `styles.css` with design tokens, responsive grid, focus-visible outlines, reduced-motion fallback, WCAG AA-ish color contrast for text & interactive elements.

## Accessibility CI Smoke
An automated GitHub Action (`a11y-smoke`) runs on each push/PR to `main`:

- Starts the app locally (migration + seed first)
- Executes axe-core CLI against `/` and one representative deal page (`/deal/oceanfront-escape`)
- Captures JSON reports and uploads them as a workflow artifact named `axe-a11y-reports`
- Fails the build only if violations with impact `serious` or `critical` are present (minor / moderate issues are logged but do not block)

Viewing reports:
1. Open the PR’s Checks tab → a11y-smoke job.
2. Download the `axe-a11y-reports` artifact to inspect `axe-home.json` and `axe-deal.json` locally.

To run locally (optional):
```
npm run migrate && npm run seed
node src/server.js &
npx axe http://localhost:3000/ --save axe-home.json --exit 0
npx axe http://localhost:3000/deal/oceanfront-escape --save axe-deal.json --exit 0
```
Then parse only serious/critical:
```
node -e 'const fs=require("fs");["axe-home.json","axe-deal.json"].forEach(f=>{const j=JSON.parse(fs.readFileSync(f));j.violations.filter(v=>["serious","critical"].includes(v.impact)).forEach(v=>console.log(f,v.id,v.impact));});'
```

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

## Image Upload Details
- Implemented with Multer disk storage -> `public/uploads` (gitignored)
- Max size default 2MB (tunable via `IMAGE_MAX_SIZE_MB`)
- Accepts only JPG / PNG (content-type validation)
- Replacing an image deletes the old file if it resides locally
- Admin can also provide an absolute/remote URL instead of uploading

## Security Notes
- CSRF tokens on all POST/PUT/DELETE forms (middleware ordered so Multer runs before CSRF validation for multipart forms)
- Passwords hashed with bcrypt (configurable rounds via code modification)
- Session secret must be strong & unique in production; enable secure & httpOnly flags
- Input validation: basic length / type checks; further hardening (rate limiting, helmet headers) recommended
- Google OAuth uses email linking; ensure verified emails only (future enhancement)

## Performance / Scalability
SQLite is sufficient for prototype & low concurrency. For scale: migrate to Postgres, add connection pooling, move sessions to Redis, and introduce background job processing for async tasks (emails, image processing).

## Versioning
Semantic versioning starting at `v0.1.0` (prototype). Breaking schema changes will bump MINOR until a stable `1.0.0`.

## Contributing
1. Fork & branch: `feat/short-description`
2. Run `npm run migrate && npm run seed`
3. Add tests in `tests/`
4. Ensure `npm test` passes & lint (if configured)
5. Open PR with concise description & screenshots for UI changes

## History Cleanup
The initial commit accidentally included `node_modules/`. Subsequent commits removed it from tracking. If repository size becomes an issue, a history rewrite (already optionally performed via `git filter-repo`) removes those blobs. After rewriting, force push & notify collaborators to re-clone.

## Future Hardening Ideas
- CSP & security headers (helmet)
- Structured logging (pino) + trace IDs
- Rate limiting + account lockout policy
- Queued email notifications (signup, order receipts)
- Image CDN offload & responsive sizes
- Full-text search / filtering

---
Last updated: August 2025 (expanded README)

---
<!-- Previous last updated marker retained above -->
