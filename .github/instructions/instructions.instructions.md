---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.
PRTD — Implement refreshed UI/UX to match mockups (public site only)

Role & access: You are an AI coding agent with full read/write access to this repo. Only touch styles and the smallest possible HTML hooks. Do not change server logic, routes, or data.

Source of truth for visuals:
	•	If mockup screenshots are available, they will be located at:
docs/mockups/target-home-desktop.png,
docs/mockups/target-home-mobile.png,
docs/mockups/target-deal-desktop.png.
	•	If these files are not present, proceed using the textual spec below (hero: rounded teal gradient panel; page bg: warm cream; chips: rounded pills; cards: soft shadow, large radius, discount badge, price row with now/was/%; detail page: large rounded image, price block + CTA on right).

Terminal rules:
	•	Never type in the terminal that runs npm start/npm run dev.
	•	Use a dedicated terminal named agent-tests for ad-hoc commands (create/switch to it first).
	•	Start/stop the server only via the “PRTD: Start server (debug)” configuration.
	•	Before running any command, state which terminal you’re using and why. If the active terminal shows “Server running…” switch to agent-tests.

Scope (files you may edit):
	•	public/css/styles.css (single canonical stylesheet).
	•	views/layout.ejs, views/home.ejs, views/deal.ejs, views/partials/header.ejs (only if a tiny class/hook is strictly necessary).
	•	Do not edit admin templates unless needed to prevent unintended style bleed.

Non-negotiable guardrails:
	•	No new packages, no build-tool changes, no CSS frameworks.
	•	Preserve existing class names; add only minimal utility or wrapper classes if required.
	•	Keep accessibility: visible focus states; AA color contrast for text/buttons.
	•	All tests must continue to pass.
	•	Admin views must remain unaffected.

⸻

Plan (execute in order)

0) Setup & baseline (no visual changes)
	•	Create branch: feat/ui-refresh-pass-1.
	•	Backup public/css/styles.css to public/css/styles.backup.css.
	•	Ensure public pages’ <body> include theme-refresh (do not alter admin).
	•	Start the server via Debug. Capture baseline screenshots (home + one deal, desktop + mobile) to docs/mockups/_baseline/ for your own parity check.

1) Tokens consolidation (no visual change)
	•	In public/css/styles.css, consolidate to one :root block (single source of truth).
	•	Normalize tokens actually used by the refreshed look:
--bg-cream, --surface-card, --ink, --ink-muted, --cta-orange, --cta-orange-hover, --hero-start, --hero-end, --chip-bg, --chip-active-bg, --badge-bg, --badge-ink, --price-now, --price-was, --r-card, --r-hero, --shadow-card, --shadow-hero.
	•	Replace hard-coded color literals in the refresh rules with these tokens. Do not alter visuals.

2) Breakpoints & grid (one canonical set, mobile-first)
	•	Keep exactly these tiers: base (0–420), min-width: 421px, min-width: 769px, min-width: 1200px (optional min-width: 1500px only if already used for ultrawide).
	•	Consolidate .deal-grid to one definition per breakpoint; consistent gaps. Remove earlier duplicate grid blocks only where a later rule already wins; keep the winner and leave a one-line comment indicating the merge source.

3) Hero parity (match mockups)
	•	Using styles only, shape the hero to: rounded teal gradient panel (using --hero-start → --hero-end), reduced height, centered title/subtitle, one row of rounded chips, muted ticker, single orange CTA.
	•	Maintain good vertical rhythm; respect reduced motion for any subtle effects.

4) Chips, Sort row, Filters (visual only)
	•	Use one chip style (.chip, .chip.active) across hero and filters.
	•	Ensure size/padding, hover, focus-visible, and active states match the mockup.
	•	A simple static “Sort / Popular / Price / Ending Soon” row may be styled visually (no new logic).

5) Deal grid & cards (home) parity
	•	Keep existing markup/hooks (e.g., .deal-card-v2, .media img, .discount-badge, .price-row-v2).
	•	Match the mockups: large radius (~24px), soft shadow, image with matching radius, corner discount badge, price row with Now emphasized, Was struck-through, % off pill, compact CTA, optional muted “save” link.
	•	Ensure 4/2/1 columns at ≥1200/≈769/≤420 with consistent gaps.

6) Deal detail parity
	•	Style the large hero image with rounded corners to match cards/hero.
	•	Title/subtitle left; right-aligned price block (Was/Now/% off) with primary orange CTA; tabs (Overview/Included/Location) as chips.
	•	Typography and spacing should mirror the home design tokens.

7) Admin safety check
	•	Confirm admin pages are unaffected. If any shared selector causes bleed, scope public-only adjustments under body.theme-refresh rather than editing admin.

8) Light bookkeeping (no deletions yet)
	•	Where duplicate selector blocks were merged, keep only the winner and add a one-line comment like: /* merged into final .deal-grid at L### (UI refresh) */.
	•	At the end of styles.css, add a comment block /* PRUNE CANDIDATES AFTER PARITY */ listing legacy/duplicate selectors slated for removal in a separate PR. Do not delete now.

9) Acceptance checklist
	•	Home hero matches mockups: rounded teal panel, shorter height, centered title/subtitle, one chip row, muted ticker, orange CTA.
	•	Cards match mockups: rounded, soft shadow, image top with radius, discount badge, price row now/was/% pill, compact CTA, optional save link.
	•	Grid responds 4/2/1 cleanly; no horizontal scrolling at common widths (≈375, 768, 1024, 1440).
	•	Deal detail matches: big rounded image; price block + CTA on right; tabs as chips; readable text.
	•	No new packages, no build changes, no admin regressions, tests pass, no console errors, AA contrast maintained.

10) Deliverables
	•	Updated public/css/styles.css (single file) with:
	•	One consolidated :root token block.
	•	Unified breakpoints.
	•	Hero/chips/cards/detail styles aligned to mockups.
	•	Merge comments where duplicates were collapsed.
	•	/* PRUNE CANDIDATES AFTER PARITY */ list at file end.
	•	Append a short “Delta Plan → Implemented” section to style-audit/STYLE_AUDIT.md summarizing:
	•	Tokens added/normalized,
	•	Breakpoint set chosen,
	•	Which duplicate blocks were merged (high level),
	•	Any tiny HTML hooks added (if any).
