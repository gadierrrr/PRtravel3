# CSS Cleanup Inventory

Goal: Safely prune unused legacy styles after the UI Refresh flag (UI_REFRESH) is validated in production. This document inventories selectors and proposes phased removal.

## Legend
- L: Legacy only (not used by refresh markup)
- R: Refresh only (scoped under `.theme-refresh`)
- S: Shared / Neutral (used by both or global tokens)
- D?: Candidate for deprecation pending confirmation that no legacy template still references it

## High-Level Strategy
1. Inventory (this file) ✅
2. Map templates -> selectors (grep + manual confirm)
3. Add temporary runtime logging hook (optional) to record class usage in production (first 48h with flag ON for subset)
4. Mark unused legacy blocks with comment `/* DEPRECATED: remove after <date> */`
5. Remove after 2 deploys with no rollback
6. Collapse token duplication & re-name stable tokens

## Refresh-Scoped Selectors (R)
```
.theme-refresh .hero-v2
.theme-refresh .filters-bar
.theme-refresh .chip (.active, :focus-visible)
.theme-refresh .btn-cta-orange (:hover, :focus-visible)
.theme-refresh .deal-grid
.theme-refresh .deal-card-v2 (.media img, .body, .title, .title a, .teaser)
.theme-refresh .discount-badge
.theme-refresh .price-row-v2 (.now, .was, .pct)
.theme-refresh .time-left
```

## Legacy-Focused Selectors (L)
```
.hero (legacy)
.grid > .card
.spotlight (and nested img)
.sticker
/* plus legacy price row / buttons inside .card */
```
(TODO: Expand full list via automated grep of views referencing class names not inside refresh block.)

## Shared / Global (S)
```
:root CSS variables (tokens)
body.theme-refresh / body.theme-legacy body class toggles
Typography base selectors (body, h1, h2, etc.)
Utility focus styles (e.g. :focus-visible) if global
```

## Automated Extraction Plan
Script concept (pseudo):
1. Parse `views/**/*.ejs` for `class="..."` attributes, split on whitespace
2. Count frequency of each class in legacy vs refresh conditional blocks
3. Compare with CSS selectors to flag unused
4. Output JSON report consumed by this doc

## Candidates For Early Deletion (D?)
None yet flagged – need usage diff after flag rollout.

## Risk Mitigation
- Keep legacy CSS until analytics confirm >95% of traffic served refresh variant with no critical errors.
- Maintain ability to revert by just setting `UI_REFRESH=0` (legacy markup untouched).

## Next Steps
- [ ] Implement extraction script (Node) to generate `css-usage-report.json`
- [ ] Expand Legacy selector list with full enumeration
- [ ] Annotate CSS with `/* DEPRECATED yyyy-mm-dd */` comments once confirmed
- [ ] Merge removal PR separate from feature rollout

## Notes
All refresh selectors intentionally scoped with `.theme-refresh` root to avoid collisions; this allows safe deletion of legacy blocks without affecting refreshed styles.
