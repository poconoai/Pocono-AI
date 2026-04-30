# Pocono AI — v67 Changelog
**Released:** 2026-04-30
**Theme:** Brand Asset Ecosystem & Trust Signals

---

## What shipped

### 1. New brand asset ecosystem
A small, deliberate set of variations of the new logo so the site reads like a mature, established company.

| File | Purpose | Where it's used |
|------|---------|-----------------|
| `logo.svg` | Primary full-color mark (shield arc + dual-peak monolith + glowing core node) | Header, JSON-LD `"logo"` schema |
| `logo-mono.svg` | Monochrome footer mark using `currentColor` | Footer of every page |
| `favicon.svg` | Tab-icon variant with rounded card and simplified core node, sized to read at 16×16 | `<link rel="icon" type="image/svg+xml">` |
| `og-image.jpg` (+ `.png`) | 1200×630 social card — logo centered on dark navy with "Sovereign on-premises AI" tagline | `og:image` on every shareable page |
| `brand-banner.jpg` | 1600×600 hero brand banner | Index page, just below the fold |
| `logo-1024.png` | 1024×1024 raster fallback | Available for any future raster needs |
| `badge-dell.svg`, `badge-nvidia.svg`, `badge-qdrant.svg`, `badge-ollama.svg` | Grayscale wordmarks of the enterprise stack | Trust-badges row on architecture + index |

### 2. Header logo — new full mark
- **Replaced** `<img src="logo-icon.svg" width="32">` with `<img src="logo.svg" width="40" height="40">` on **all 17 HTML pages**.
- **Updated CSS** `.logo img` sizing from `34px` height to `44×44` with `border-radius:6px` so the new full mark sits cleanly inside the 70px sticky header.

### 3. Footer logo — quiet monochrome mark
- **Added** the new `<a class="footer-logo">` block (logo + wordmark) to **16 of 17 pages** (comparison.html intentionally uses the minimal copyright-only footer).
- **New CSS** `.footer-logo` rules: 36×36 icon, `opacity:0.85`→1 on hover, color resolves from `currentColor` so the mark sits quietly next to the muted footer text and won't compete with the primary CTAs above.

### 4. Brand banner on index
- Inserted a `.brand-banner-section` immediately below the hero section on `index.html`, displaying the `brand-banner.jpg` asset that reinforces the "Sovereign on-premises AI" positioning.
- Banner is fully responsive (`max-width: 1200px`, rounded edges, soft shadow) and mobile-friendly (`border-radius: 10px` under 600px viewport).

### 5. Trust badges — "we play nice" row
- New `.trust-badges-section` on `architecture.html` (above the Data Sovereignty Pipeline header) and `index.html` (after brand banner).
- Eyebrow label: "BUILT ON ENTERPRISE INFRASTRUCTURE".
- Four wordmark badges: Dell · NVIDIA · Qdrant · Ollama.
- Grayscale at rest (`opacity:0.65`), full color on hover, collapses to single-row mobile layout.

### 6. Favicon & social meta upgrade — every page
- **Replaced** the single `<link rel="icon" href="logo-icon.svg">` with a four-line block:
  - `<link rel="icon" href="favicon.svg" type="image/svg+xml">`
  - `<link rel="alternate icon" href="favicon.ico">` (legacy fallback)
  - `<link rel="apple-touch-icon" sizes="180x180" href="favicon-180x180.png">`
  - `<meta name="theme-color" content="#051622">`
- **Replaced** `og:image` from `hero.jpg` to `og-image.jpg` on **16 pages** (404 has no OG by design).
- **Added** `og:image:width`, `og:image:height`, and `og:image:alt` to every page so LinkedIn previews never crop wrong.
- **Updated** JSON-LD `"logo"` references to point to the new `logo.svg` on the **12 pages** that carry Organization schema.
- **Removed** **4 duplicate `<meta property="og:url">` tags** found on `architecture.html`, `careers.html`, `investors.html`, `partners.html`.

---

## Verification

```
page                                       fav  og:img  canon  og:url   hdr  ftr
404.html                                    1    0       0      0        1    1
about.html                                  1    1       1      1        1    1
architecture.html                           1    1       1      1        1    1
careers.html                                1    1       1      1        1    1
comparison.html                             1    1       1      1        1    0  ← minimal footer by design
competitive-analysis.html                   1    1       1      1        1    1
competitive-analysis_updated.html           1    1       1      1        1    1
ehr-burden-research.html                    1    1       1      1        1    1
for-attorneys.html                          1    1       1      1        1    1
for-physicians.html                         1    1       1      1        1    1
index.html                                  1    1       1      1        1    1
investors.html                              1    1       1      1        1    1
legal-admin-burden.html                     1    1       1      1        1    1
legal-admin-burden_updated.html             1    1       1      1        1    1
partners.html                               1    1       1      1        1    1
patient-advocacy.html                       1    1       1      1        1    1
simulation.html                             1    1       1      1        1    1
```

| Check | Result |
|-------|--------|
| Header logo (`<img src="logo.svg">`) on every page | **17 / 17** |
| Footer logo block on every page (excluding minimal-footer comparison.html) | **16 / 16** |
| Favicon block on every page | **17 / 17** |
| `og:image` updated on every shareable page | **16 / 16** |
| Duplicate `og:url` tags remaining | **0** |
| Duplicate `canonical` tags remaining | **0** |
| JSON-LD `"logo"` pointing at new `logo.svg` | **12 / 12** |
| Trust-badge SVGs (4 logos) on architecture.html | ✓ |
| Trust-badge SVGs (4 logos) on index.html | ✓ |
| Brand banner asset on index.html | ✓ |

---

## File diff summary
- **17 HTML pages** modified (header logo + favicon block + JSON-LD logo URL).
- **16 HTML pages** modified (footer logo block).
- **2 HTML pages** modified (trust-badge row): `index.html`, `architecture.html`.
- **1 HTML page** modified (brand banner): `index.html`.
- **1 CSS file** modified (`styles.css`): logo img resize, footer-logo rules, brand-banner-section rules, trust-badges-section rules.
- **9 new asset files** added: `logo.svg`, `logo-mono.svg`, `favicon.svg`, `og-image.jpg`, `og-image.png`, `brand-banner.jpg`, `logo-1024.png`, `badge-dell.svg`, `badge-nvidia.svg`, `badge-qdrant.svg`, `badge-ollama.svg`.

---

## Known carry-overs from v66
- `patient-advocacy.html` has a pre-existing `<div>` imbalance (30 open / 31 close) that was present in the v66 baseline — not introduced in v67. Flagged for a future structural pass.
- The legacy `logo-icon.svg` and `logo.png` files are **retained** in the package so any external link or cached reference still resolves; they are no longer referenced from any HTML page.
