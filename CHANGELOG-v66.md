# Pocono AI — v66 Release Notes

**Theme:** Universal TCO Calculator deployment + accessibility/responsiveness hardening pass.

## Task 1 — Universal 3-Year TCO Calculator deployment

The dynamic Status-Quo / CapEx / HaaS comparison engine is now live on all three primary conversion pages. The legacy CapEx-only `phRoi()` block on the physicians page has been removed entirely.

**Pages updated**

- `for-physicians.html` — legacy `phRoi()` block deleted; replaced with the namespaced `ph-` calculator.
- `for-attorneys.html` — calculator inserted between the Mata-v-Avianca section and the AI-hallucination liability section, using the `at-` namespace.
- `simulation.html` — calculator added at the end of the deliberation flow (just before `</main>`) using the `sim-` namespace, framed as "Run the numbers yourself."

**JavaScript namespacing**

A single `initROICalculator(prefix)` function powers all three pages. The prefix lookup means there are no cross-page collisions:

- `ph-inp-providers`, `ph-inp-monthly`, `ph-inp-burden` (physicians)
- `at-inp-providers`, `at-inp-monthly`, `at-inp-burden` (attorneys)
- `sim-inp-providers`, `sim-inp-monthly`, `sim-inp-burden` (simulation)

Each calculator section root carries `data-tco-prefix="ph|at|sim"`, and the IIFE auto-detects which namespace lives on the current page on `DOMContentLoaded`. The function is also exposed at `window.initROICalculator` for manual re-invocation.

**Bulletproof JS architecture preserved**

- Outer `try/catch` around the entire init function.
- Inner `try/catch` around the `update()` handler so a bad slider event can never freeze the page.
- Required-input null-guard: if any of the three sliders is missing, the function returns silently — preventing a TypeError on a page that loads the script but does not host the calculator.
- Every DOM write goes through a `setText(node, value)` helper that no-ops on missing nodes.

## Task 2 — The Bug Hunt

Six bugs/hardening fixes shipped in v66:

**Bug #1 — Slider accessibility (a11y).** Every `<input type="range">` in the new calculator carries a unique, descriptive `aria-label`:

- "Number of providers (1 to 10)" / "Number of attorneys (1 to 10)"
- "Current scribe / cloud-AI spend, in US dollars per month"
- "Annual prior-auth & admin burden in US dollars per year" / "Annual non-billable admin burden in US dollars per year"

The visible `<label for>` association is preserved as well, so screen readers get a clean announcement and sighted keyboard users still see the linked label.

**Bug #2 — `Intl.NumberFormat` NaN/undefined safety.** The new `fmt()` helper:

1. Coerces non-numbers via `Number(n)` first.
2. Returns the fixed string `"$0"` if the result is `NaN`, `null`, `undefined`, or non-finite.
3. Wraps the `Intl.NumberFormat` constructor itself in a `try/catch`, falling back to `toLocaleString('en-US')`, then to a plain `'$' + rounded` string. Rapid slider drags or browsers without `Intl` support can no longer surface `"$NaN"` or `"$undefined"`.
4. The slider input parser additionally clamps each value to its `min`/`max` and falls back to a sensible default if `parseInt` returns `NaN`.

**Bug #3 — Responsive overlap on mobile (< 400px).** The output cards (`Status Quo`, `CapEx`, `HaaS`) and the savings/payback summary now collapse to a single column at `max-width: 400px`. The card values use `clamp(1.1em, 4.5vw, 1.7em)` plus `word-break: break-word` so a six-digit dollar figure no longer breaks out of its container. The shell padding also reduces from `36px` to `14px` on narrow viewports.

**Bug #4 — Keyboard focus rings on sliders.** A page-level `*:focus-visible` rule already exists in `styles.css` using `--focus-ring: 0 0 0 2px var(--ai-blue)`. The new sliders explicitly opt in to that token via:

```css
.tco-slider:focus-visible { box-shadow: var(--focus-ring); outline: none; }
.tco-slider:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 4px rgba(0,163,255,0.35), 0 2px 6px rgba(0,163,255,0.45); }
.tco-slider:focus-visible::-moz-range-thumb     { box-shadow: 0 0 0 4px rgba(0,163,255,0.35); }
```

Keyboard users now see a consistent, branded focus ring on both the track and the thumb — Webkit and Gecko.

**Bug #5 — Meta-tag dedup audit.** Audited canonical, `og:url`, `og:title`, `og:image`, `og:description`, `twitter:card`, and `twitter:image` across all three pages. Confirmed exactly **one** of each per page; no duplicates were introduced or remain. The `<head>` block on all three pages is now clean.

**Bug #6 — Stale version strings.** Updated user-visible `v59` mentions to `v66` on the simulation page (the eyebrow on the sim hero and the simulation disclosure paragraph). The historical code comment "DATA (preserved verbatim from v59)" inside the engine script is intentionally left as a lineage note. The HTML comment on each page (`<!-- Pocono AI v59 -->`) is now `<!-- Pocono AI v66 -->`.

## Calculation model (for reference)

| Path        | Formula                                                          |
| ----------- | ---------------------------------------------------------------- |
| Status Quo  | `(monthly_spend * providers * 36) + (annual_burden * providers * 3)` |
| CapEx       | `$17,999 hardware + ($300/mo support × 36 mo) = $28,799`         |
| HaaS        | `$950/mo × 36 mo = $34,200`                                      |
| Savings     | `Status Quo − HaaS`                                              |
| Payback     | `HaaS_total / (monthly_spend * providers + (annual_burden * providers / 12))` |

All three pages share this single model so the numbers are consistent across the funnel.

## Files in this release

- `for-physicians.html`
- `for-attorneys.html`
- `simulation.html`

No CSS file changes (`styles.css` left untouched). The TCO calculator's CSS is scoped under `.tco-calc-section` and inlined per page so the universal stylesheet stays unchanged.
