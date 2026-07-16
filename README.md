# elkgrovetoydrive.com — site source

**Public site:** https://elkgrovetoydrive.com · GitHub Pages repo [`cPALSs/elkgrovetoydrive`](https://github.com/cPALSs/elkgrovetoydrive)

**This folder (`Sites/elkgrovetoydrive`) is the canonical source of truth.** Edit here; push from this git repo when ready.

Toy Drive hub — home, team, about, **Fund the Fete**.

## Pages

| Path | File |
|------|------|
| `/` | `index.html` |
| `/team/` | Director recruitment (from `data/site.json`) |
| `/about/` | Toy Drive story + cPALSs |
| `/fund-the-fete/` | Interactive sponsor registry |
| `/build/` | Redirect → `/fund-the-fete/` |

## Content

- **`data/site.json`** — recruitment + about copy (see season Marketing [`Open Leadership Roles`](../../Projects%20-%20Toy%20Drive/2026/Marketing/Open%20Leadership%20Roles%20-%20Recruitment%20Copy.md))
- **`data/toydrive-2026.json`** — Fund the Fete data (from `build_toydrive_budget.py`)
- **`data/festivals.json`** — festival manifest for the SPA

## Local preview

```bash
cd Sites/elkgrovetoydrive
python3 -m http.server 8767
```

- http://localhost:8767/
- http://localhost:8767/team/
- http://localhost:8767/fund-the-fete/

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

See [`ElkGroveToyDrive Website - Launch Checklist.md`](../../Projects%20-%20Toy%20Drive/2026/Marketing/ElkGroveToyDrive%20Website%20-%20Launch%20Checklist.md).
