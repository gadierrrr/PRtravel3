# Style Audit (Public Site)

Generated: 2025-08-16
Scope: Public pages (home, deal detail). Admin styles noted only when overlapping.
No code changes performed; this is an inventory for planned restyle.

---
## 1. Summary
Single public stylesheet: `public/css/styles.css` (16.4 KB). Both legacy and refresh UIs are driven by the same file via body classes (`theme-legacy` / `theme-refresh`). Cascade contains some duplicate selector re-definitions (e.g. `.grid`, `.hero`, `.nav-cats a`) introduced by appended responsive / refinement blocks; later definitions (lower in file) win. Design tokens are centrally declared in two `:root` blocks (initial + later additions for fun/radii). No separate component partials; everything is flat.

Key findings:
- One canonical CSS file (good for consolidation) but mixed concerns (legacy + refresh + admin + utilities) in same scope.
- Duplicate selectors arise from later responsive refinement append-only strategy (intentional, safe to collapse later).
- Limited use of utility classes (`.spacer`, `.muted`) – some utilities appear unused (`.muted`).
- Feature-flag styles scoped cleanly under `.theme-refresh` preventing collision.

## 2. Load Order & Files
| Order | File        | Bytes | Referenced By | Notes |
|-------|-------------|-------|---------------|-------|
| 0     | styles.css  | 16416 | layout.ejs    | Canonical public + admin sharing |

No other `<link rel="stylesheet">` references detected.
Admin tables, forms, and spotlight structures share the same file (risk: restyle changes could affect admin inadvertently).

## 3. Design Tokens & Palette
**Root Variables (primary set)**: color (bg/surface/ink/accent/focus), borders, radii, spacing scale (`--space-1..6`), shadows, transitions, font stack, hero gradient.
**Additional Tokens (second :root)**: fun accent colors (`--fun-yellow`, `--fun-green`), card alias, extended radii (`--r-xl`, `--r-lg`).

Raw color literals not mapped to variables (candidates for new tokens):
- `#fff` (multiple surface/contrast contexts)
- `#d0d7de` (image placeholder bg)
- `#ffe8d6` / `#7a3d00` (promo block)
- `#fff3e0` (time-left badge)
- `#004F63` (refresh price now alt)
- Gradient inline colors inside refresh hero `linear-gradient(135deg,#005067,#007d8a)` instead of tokenized stops.
- Discount / badge palette (#FFF1E6, #C55300, #FFE1CC, #B95000) not yet tokenized.

Recommendation: Consolidate into semantic tokens: `--color-bg-alt`, `--color-surface-alt`, `--color-promo-bg`, `--color-price-now`, `--color-badge-bg`, `--color-badge-fg`, `--color-discount-chip-bg`, etc.

## 4. Media Queries / Breakpoints
Unique queries (deduped conceptually):
- `(prefers-reduced-motion: reduce)` (two occurrences + variant no-preference animation)
- Responsive widths: `min-width:421px`, `min-width:769px`, `min-width:1200px`, legacy earlier `min-width: 768px` (note: near-duplicate 768 vs 769 off-by-one), `max-width:720px`, `min-width:1500px` (refresh wide grid).
Breakpoints effective grid tiers: 0–420, 421–768, 769–1199, 1200+, plus ultrawide 1500+ for refresh card min-size bump.
Potential cleanup: unify `768` vs `769` boundaries; potentially collapse `720` into same tablet band.

## 5. Component Selectors (Current)
### Hero
Legacy: `.hero` container; gradient via `--gradient-hero`; title `.hero h1`; subtitle `.hero-lede`; chips `.pill`; ticker `.ticker`; CTA `.btn`.
Refresh: `.hero-v2` container (new gradient inline); title `.hero-v2 h1`; subtitle `.hero-sub`; chips `.chip` & active `.chip.active`; ticker/meta `.meta-row` (unstyled in CSS – inherits); CTA `.btn-cta-orange`.

### Chips Row
Legacy sorted + categories use `.pill` (active state styled inline? Active variant for legacy not separately defined – potential gap). Refresh uses `.chip` with `.chip.active` background variant.

### Deal Grid
Legacy: `.grid` + responsive overrides (1/2/3/4 columns). Gap 1.25rem.
Refresh: `.deal-grid` auto-fill baseline earlier, plus overrides appended (now explicit 1–4 columns) with gap 1.4rem; wide >=1500px increases min tile width.

### Deal Card
Legacy: `.card`; image `.card img`; discount indicator `.pill.off`; price now `.price-now` (green), price was `.price-was`; teaser `.teaser`; rating `.rating`; CTA `.btn`; optional save link (unstyled inline link); badge `.badge`.
Refresh: `.deal-card-v2`; image `.deal-card-v2 .media img`; discount badge `.discount-badge`; secondary discount percent `.price-row-v2 .pct`; price row container `.price-row-v2`; now `.price-row-v2 .now` / was `.price-row-v2 .was`; CTA `.btn-cta-orange`.

### Page
Background legacy: `body` -> `--color-bg`; refresh adds body.theme-refresh background `--bg-cream`. Font stack `--font-stack`; container `.container` (max-width 1200px, padding responsive constant). Line-height base 1.5.

### Highlighted Static Values
- Radii: primary card radius 14px; refresh cards 24px; large spotlight radius 28px.
- Shadows: `var(--shadow-sm)` (cards resting) and `var(--shadow-md)` (hero, header).
- Spacing scale evenly quarter-rem increments mapped.

## 6. Duplicate / Conflicting Selectors
Detected duplicates (same file, later wins): `:root` (second extends tokens), `*`, `.nav-cats a` (later adds min-height/padding), `.hero`, `.hero h1`, `.grid` (multiple overrides culminating in explicit columns), `.card:hover`, etc.
These are predictable due to append-only responsive adjustments. No cross-file conflicts (single sheet). Consolidation opportunity: merge earlier & later definitions to reduce cascade depth and improve maintainability.

## 7. Dead Selectors (Heuristic)
Heuristic unmatched tokens:
- `textarea`, `textarea:focus` (not used in current public views – only forms with `input` displayed; if admin edit forms might add `<textarea>` later, verify before removal).
- `.muted` (unused in provided public views; safe candidate if admin does not reference).
- Animation keyframe extraction artifact: selectors `from`, `to` (parser heuristic because of `@keyframes` – ignore; not actual orphaned style).
Further validation recommended with runtime class collection before pruning.

## 8. Gaps vs Target Look (High-Level)
Anticipated changes needed for final mock alignment:
- Hero: unify gradients (tokenize refresh gradient), consistent spacing & vertical rhythm between legacy/refresh variants or remove legacy after flag sunset.
- Chips: consistent typographic scale & padding; legacy `.pill` lacks active visual distinct token; need semantic variants (default, active, focus, hover) across both.
- Grid: reconcile gap difference (1.25rem vs 1.4rem) & unify column breakpoint boundary (768 vs 769).
- Card: legacy & refresh diverge in radius (14px vs 24px) & shadow; choose canonical elevation levels and semantic tokens (e.g., `--elev-card-rest`, `--elev-card-hover`).
- Discount/price styling: tokenize discount backgrounds (#FFF1E6, #FFE1CC) & emphasize percentage with consistent badge style.
- Color system: migrate raw literals to semantic tokens; reduce reliance on inline gradients & magic numbers (#004F63, #C55300, etc.).
- Typography: establish heading scale tokens (e.g., `--font-size-h1`, etc.) rather than ad-hoc pixel/rem values.
- Spacing: convert repeated numeric paddings/margins to spacing scale tokens (`--space-x`).
- Accessibility: ensure active chips legacy variant & color contrast tokens meet AA; unify focus outlines (some custom white focus vs var focus).
- Potential structural hook: Add `.hero-panel` wrapper for easier future theme transitions (not mandatory yet).

## 9. Risk Notes
- Shared stylesheet includes admin table & form styles; sweeping refactors risk admin UI regressions—consider scoping admin-specific rules under `.admin` wrapper or splitting file later.
- Duplicate selectors currently rely on order; collapsing without verifying specificity may alter subtle spacing.
- Removing legacy classes prematurely could break flag fallback or unaudited marketing pages if any.
- Animation keyframe parsing indicates caution when doing automated selector removal (avoid misidentifying keyframe steps as dead).

## 10. (Optional) Screens
Screenshots not captured in this environment (no headless screenshot tooling added to avoid dependency bloat). If needed, run: `npx playwright screenshot` or similar in a future pass.

---
## JSON Artifacts Overview
Included in `style-audit/`:
- `css-files.json` – single loaded file metadata.
- `selectors-by-file.json` – full selector listing with line numbers.
- `duplicate-selectors.json` – duplicate definitions & final winners.
- `variables-and-colors.json` – tokens & raw color frequency counts.
- `media-queries.json` – all media queries (some duplicates by intent).
- `dead-selectors.json` – heuristic unused selectors.
- `components-map.json` – mapping of UI parts to current selectors.

## Next Steps (Implementation Phase Guidance)
1. Establish semantic token layer (colors, radii, shadows, typography). 
2. Collapse duplicate selectors; co-locate responsive variants within grouped blocks (mobile-first).
3. Decide canonical component set (deal card v2?) and deprecate legacy counterpart.
4. Add runtime class usage logging for one deploy before removing dead selectors.
5. Split admin-specific rules to avoid accidental breakage in public redesign.
6. Introduce design tokens file (e.g., `tokens.css`) imported before components.

-- End of Audit --
