# COS-6: Deploy the Explorer as a Live GitHub Pages Demo — Design

- **Date:** 2026-07-15
- **Linear:** COS-6 (v1, this spec). Long-term "impressive" deployment tracked separately as COS-7.
- **Status:** Approved (brainstorm) — ready for implementation planning.

## Overview

Publish the Cosmic Explorer as a **reliable, instant static demo** on GitHub Pages:
`https://ssspear.github.io/cosmic-explorer/`. Because the app serves bundled snapshot data with
no database and filters entirely client-side, the deployed demo needs **no live backend** — the
frontend fetches a single static JSON file generated from the backend's own data. No cold starts,
near-zero cost, always fast.

## Goals & success criteria

- A public URL loads the working explorer (charts, scatter, list, drawer, images) with no backend.
- The static data matches the real API's content and shape (no drift).
- Auto-deploys on push to `master`.
- README links to the live demo.

## Non-goals (deferred to COS-7)

- Live FastAPI backend / live `?source=nasa`.
- Custom domain, per-PR preview deploys, analytics, OpenGraph/social card.

## Architecture & data flow

```
Build (GitHub Actions):
  server/data/exoplanets.json + STARS(router) ─► export script ─► client/public/celestial-bodies.json
                                                                    ({data:[...], source:"snapshot"})
  client/ ──(vite build: base=/cosmic-explorer/, VITE_API_URL=/cosmic-explorer/celestial-bodies.json)──► client/dist
  client/dist ─► GitHub Pages ─► https://ssspear.github.io/cosmic-explorer/

Runtime (browser, no backend):
  App → fetch(VITE_API_URL) → {data:[...]} → client-side filter → charts / list / drawer
```

- **Single static JSON as the "API".** The app already fetches once and filters client-side, so one
  file (`{data:[...], source:"snapshot"}`) is a drop-in for the live API.
- **Generated from backend data, no drift.** The file is produced by reusing the router's
  `_all_bodies("snapshot")` (snapshot exoplanets **+** the three curated stars, which live in the
  router, not the snapshot) — never hand-copied — and regenerated fresh on every deploy.
- **Base path is the one real nuance.** Pages serves the repo under `/cosmic-explorer/`, so absolute
  asset/data references must resolve under that base or they 404 on the deployed site while working
  locally.

### Scaling / future seam

The base path is coupled to the repo name. A custom domain or repo rename (COS-7) changes it in
`vite.config.js` and the workflow's `VITE_API_URL`. Acceptable and documented for v1.

## Components / changes

### 1. Static data export (`server/scripts/export_static_data.py`, new)
- Import `_all_bodies` from `server.routers.celestial_bodies`; write
  `{"data": _all_bodies("snapshot"), "source": "snapshot"}` to `client/public/celestial-bodies.json`
  (pretty-printed, UTF-8). Create the `public/` dir if missing.
- Run from repo root (`python -m server.scripts.export_static_data`); relies on repo-root-on-path,
  so it does NOT depend on the COS-1 packaging fix.

### 2. Frontend base-path handling (`client/`)
- `vite.config.js`: use the config-function form; set `base: mode === 'production' ? '/cosmic-explorer/' : '/'`.
  Dev and test stay at `/`, so vitest is unaffected.
- `src/lib/planetImages.js`: change `src` from `/planet-types/${file}` to
  `` `${import.meta.env.BASE_URL}planet-types/${file}` ``. (Test still passes: `BASE_URL` is `/` under
  vitest, so `toContain('/planet-types/neptune.jpg')` holds.)
- No data-URL code change: the deploy sets `VITE_API_URL=/cosmic-explorer/celestial-bodies.json`;
  local dev keeps its `http://localhost:8000/api/celestial-bodies` default.

### 3. Deploy workflow (`.github/workflows/deploy.yml`, new)
- Triggers: `push` to `master`, `workflow_dispatch`.
- `permissions: { contents: read, pages: write, id-token: write }`.
- `concurrency: { group: "pages", cancel-in-progress: false }` (standard Pages hygiene).
- Steps: checkout → setup-python 3.12 → `pip install fastapi "httpx>=0.28.0,<1"` →
  `python -m server.scripts.export_static_data` → setup-node 22 → `npm ci` (in `client/`) →
  `npm run build` (env `VITE_API_URL=/cosmic-explorer/celestial-bodies.json`) →
  `actions/configure-pages` → `actions/upload-pages-artifact` (path `client/dist`) →
  `actions/deploy-pages`.
- Runs alongside the existing `ci.yml`; separate file, no interference.

### 4. Repo config
- `.gitignore`: add `client/public/celestial-bodies.json` (generated build artifact).
- **Manual one-time step (user):** Settings → Pages → Source = **GitHub Actions**. The
  `deploy-pages` action requires this before the first run succeeds.

### 5. README
- Add a "Live demo" link to `https://ssspear.github.io/cosmic-explorer/` near the top.

## Testing / verification

- **Existing tests unaffected** — `vite.config` base is production-only; `planetImages` test holds
  under `BASE_URL="/"`. Run `npx vitest run` to confirm.
- **Local static build check:** `python -m server.scripts.export_static_data` →
  `cd client && VITE_API_URL=/cosmic-explorer/celestial-bodies.json npx vite build` →
  `npx vite preview` → open the previewed `/cosmic-explorer/` URL and confirm data + planet images
  load (no 404s in the console).
- **Export script test:** a small pytest asserting the export writes a file whose `data` equals
  `_all_bodies("snapshot")` and includes both exoplanets and the three stars.
- **Post-deploy:** open the Pages URL; confirm charts, scatter, list, drawer, and images render.

## Linear tracking

- COS-6 — this static deploy.
- COS-7 — long-term impressive deployment (live backend, custom domain, previews, analytics).
