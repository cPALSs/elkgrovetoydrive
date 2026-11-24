# elkgrovetoydrive.com — site source

**Public site:** https://elkgrovetoydrive.com · GitHub Pages repo [`cPALSs/elkgrovetoydrive`](https://github.com/cPALSs/elkgrovetoydrive)

**This folder (`Sites/elkgrovetoydrive`) is the canonical source of truth.** Edit here; push from this git repo when ready.

Toy Drive hub — home, team, about, charities, **Fund the Fete**, **Sponsorship**.

## Pages

| Path | File |
|------|------|
| `/` | `index.html` |
| `/team/` | Director recruitment (from `data/site.json`) |
| `/about/` | Toy Drive story + cPALSs |
| `/charities/` | Local charity partners (from `data/site.json`) |
| `/fund-the-fete/` | Interactive sponsor registry |
| `/sponsorship/` | Sponsorship — partner pathways (Fund the Fete + packet) + 2025 sponsor recognition |
| `/sponsors/` | Redirect → `/sponsorship/#thank-you-2025` |
| `/build/` | Redirect → `/fund-the-fete/` |

## Content

- **`data/site.json`** — recruitment + about copy (see season Marketing [`Open Leadership Roles`](../../../Programs/Toy%20Drive/2026/Marketing/Open%20Leadership%20Roles%20-%20Recruitment%20Copy.md))
- **`data/toydrive-2026.json`** — Fund the Fete data (from `build_toydrive_budget.py`)
- **`data/festivals.json`** — festival manifest for the SPA
- **`data/toydrive-*-sponsors-display.json`** / **`toydrive-*-volunteers-display.json`** — public sponsor + in-kind logos/tiers (homepage + `/sponsorship/`)

## Sponsor logo cards

Match EGLNY’s pattern (`Operations/Sites/eglny/STYLE.md` · Sponsor logo cards). **Full agent workflow** (Magick trim vs plates, Gray `+smush` fix, SVG rasterize, flier cash/in-kind): skill [`festival-sponsor-logos`](../../../.cursor/skills/festival-sponsor-logos/SKILL.md).

| Rule | Behavior |
|------|----------|
| **Aspect** | `3 / 2` (`--sponsor-card-aspect`) |
| **Inset** | `--sponsor-card-logo-scale: 0.8` (absolute center + `object-fit: contain`) — not %-padding |
| **Grid** | Cap at **4 columns** max (5-across is too small) |
| **Sort** | A→Z by name within each tier at render (`site.js`) — never by logo path |
| **Plates** | Default white; optional `cardBg` / `logoOnDark` for baked plates (CV navy, HEART tan, Vinh Phat tan, etc.) |

Asset prep — trim export padding under `sponsors/YYYY/` so CSS inset drives spacing:

```bash
magick logo.png -bordercolor white -border 1 -fuzz 3% -trim +repage sponsors/2026/slug.png
```

Do **not** trim plate-fill marks (navy/tan squares meant to match `cardBg`). Prefer PNG with real alpha when the mark isn’t rectangular.

## Local preview

```bash
cd Sites/elkgrovetoydrive
python3 -m http.server 8767
```

- http://localhost:8767/
- http://localhost:8767/team/
- http://localhost:8767/fund-the-fete/
- http://localhost:8767/sponsorship/

## Refresh generated data

From monorepo root (writes into this folder; does not push):

```bash
./scripts/publish_elkgrovetoydrive_site.sh
```

Then commit and push **from this repo** when ready:

```bash
git add -A && git commit -m "Update elkgrovetoydrive.com site" && git push
```

## Launch

See [`ElkGroveToyDrive Website - Launch Checklist.md`](../../../Programs/Toy%20Drive/2026/Marketing/ElkGroveToyDrive%20Website%20-%20Launch%20Checklist.md).
