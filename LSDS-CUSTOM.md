# LSDS Adoption & Remaining Custom Code (`elkgrovetoydrive`)

Wired onto `cPALSs/design-system@7a3cbdd` (`vendor/lsds/` + `lsds.lock.json`).

## What was wired

- **Typography & Theme:** All 10 rendered HTML pages (`/`, `/about/`, `/charities/`, `/fund-the-fete/`, `/production/`, `/resources/`, `/resources/media/`, `/sponsorship/`, `/team/`, `/volunteer/`) set `data-ls-theme="verdant"` and `data-ls-scheme="auto"` (synced with `data-theme` on pre-paint and toggle), and load `/vendor/lsds/fonts/metropolis.css`, `/vendor/lsds/lsds.css`, `/vendor/lsds/themes/verdant.css`, and `/vendor/lsds/lsds.iife.js`. (7 meta-refresh redirect stubs were skipped.)
- **Token bridge (`site.css`):** Bridged legacy `:root` variables (`--bg`, `--surface`, `--surface-raised`, `--border`, `--text`, `--muted`, `--accent`, `--accent-hover`, `--accent-dim`, `--gold`, `--success`, `--danger`, `--on-accent`, `--overlay`, `--radius`, `--font`, `--max-width`, `--nav-height`, `--sponsor-card-*`) to `--ls-*` tokens and removed the duplicated `:root[data-theme="light"]` and `@media (prefers-color-scheme: light)` blocks.
- **Buttons:** Migrated `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-tertiary` to `.ls-btn` / `.ls-btn--primary` / `.ls-btn--secondary` / `.ls-btn--tertiary` across HTML and `site.js`; removed duplicated `.btn*` CSS from `site.css`.
- **Nav shell:** Migrated `.site-nav*` and `initNavMenu()` to LSDS `nav-shell` (`.ls-nav*` + `window.LSDS.initNavShell`).
- **Doc layout & scroll-spy:** Migrated `.site-doc-*` to LSDS `doc-layout` (`.ls-doc-*`) and replaced `doc-scroll.js` with a 23-line delegation shim to `window.LSDS.initDocScroll` / `refreshTocPager`.
- **Sponsor grid:** Migrated `.sponsor-tier` / `.sponsor-grid` / `.sponsor-card` to LSDS `sponsor-grid` (`.ls-sponsor-*`), mapping per-card `cardBg` overrides to `--ls-sponsor-card-bg` and `--ls-sponsor-opacity`.
- **Lightbox:** Migrated the custom flyer modal (`.history-lightbox*`, `ensureHistoryLightbox` / `initHistoryLightbox`) to the LSDS lightbox primitive (`data-ls-lightbox` + `window.LSDS.initLightbox` with a Share `renderChrome` action).
- **Hardcoded hex cleanup:** Replaced theme, heading-anchor copied/failed, sponsor card, host logo plate, charity logo slot, and error-panel hex literals with `--ls-*` tokens.

## Line & hex counts (before → after)

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| `site.css` | 2,795 | 1,902 | -893 (-31.9%) |
| `doc-scroll.js` | 283 | 23 | -260 (-91.9%) |
| `site.js` | 1,803 | 1,737 | -66 (-3.7%) |
| Hex literals in `site.css` | 66 | 4 | -62 (-93.9%) |

The 4 remaining hex literals in `site.css` are intentional YouTube player chrome values (`#111`, `#ff0000`, `#fff`) in `.video-embed` / `.video-play*`.

## Remaining custom CSS / JS

| Area | Location | Notes / future DS candidate |
|---|---|---|
| **Fund the Fete app** | `fund-the-fete/styles.css` (1,304 lines), `fund-the-fete/app.js` (1,695 lines) | Left intact; inherits Metropolis and `--bg`/`--text`/`--muted` via `var(--font)` and `site.css` token bridge. Strong candidate for a future shared LSDS pattern with EGLNY's `fund-the-festival/`. |
| **Theme toggle** | `site.js` (`applyTheme` / `setTheme` / `initTheme`), `site.css` (`.theme-toggle`) | Syncs both `data-theme` and `data-ls-scheme` using `sessionStorage["toydrive-theme"]` (and legacy `build-theme` on `/fund-the-fete/`). Could eventually delegate directly to `window.LSDS.initSchemeToggle({ storageKey: "toydrive-theme" })`. |
| **Two-column mobile nav drawer & tickets CTA** | `site.css` (`.site-nav-col*`, `.site-nav-tickets-cta`, `.site-nav-social*`, `.site-nav-symbol`), `site.js` (`renderNav`, `renderNavTicketsCta`) | Thin extension on LSDS `nav-shell`: left column stacks About + Resources, right column stacks Production + mobile-only Free tickets pill CTA; unwraps via `display: contents` at `>= 880px`. |
| **4-column sponsor cap & text-only card captions** | `site.css` (`.ls-sponsor-grid`, `.sponsor-card-label` / `.sponsor-card-name` / `.sponsor-card-caption`) | Caps sponsor grids at 4 columns and styles text-only cards + captions using `--ls-sponsor-fg` / `--ls-sponsor-dark-fg`. |
| **Doc-layout hero gutter alignment** | `site.css` (`.page-wrap--doc > .hero:has(+ .ls-doc-layout)`) | Aligns doc-page hero headings with the 200px TOC gutter on desktop `>= 1100px`. |
| **Home hero, flyer & photo strip** | `site.css`, `site.js` | Two-column home lead, flyer trigger button (`.home-flyer-open`, backed by LSDS lightbox), hosted-by badges, and photo strip cards. |
| **Charity, Team/Roster, Poster wall, Media, Season & Blog layouts** | `site.css`, `site.js` | Page-specific grids and modals (`.charity-grid`, `.roster-*`, `.lane-*`, `.poster-wall`, `.video-grid`, `.resources-season`, `.resource-card-grid`, `.blog-*`). |
