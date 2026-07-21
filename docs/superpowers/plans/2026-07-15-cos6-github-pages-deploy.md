# COS-6 GitHub Pages Static Deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the Cosmic Explorer as a reliable static demo on GitHub Pages that serves a bundled JSON generated from the backend's own data — no live backend.

**Architecture:** A Python export script reuses the API's `_all_bodies("snapshot")` to emit a single static `celestial-bodies.json` into the frontend's `public/` dir. The Vite build (production base `/cosmic-explorer/`) copies it into `dist/`, which a GitHub Actions workflow deploys to Pages. The frontend already fetches once and filters client-side, so one static file replaces the API.

**Tech Stack:** Python 3.12 (FastAPI, httpx), Node 22, Vite/React, GitHub Actions + Pages.

## Global Constraints

- Demo URL / base path: `/cosmic-explorer/` (tied to the repo name).
- Static data file path: `client/public/celestial-bodies.json`, shape `{"data": [...], "source": "snapshot"}`.
- Production build env: `VITE_API_URL=/cosmic-explorer/celestial-bodies.json`.
- The export script must reuse `_all_bodies("snapshot")` (snapshot exoplanets + curated stars) — never hand-copy data.
- Vite `base` is `/cosmic-explorer/` in production only; dev and test stay `/` (keeps vitest unaffected).
- Backend commands run from the repo root; frontend commands from `client/`.
- The generated `client/public/celestial-bodies.json` is a build artifact (gitignored), regenerated on each deploy.
- TDD where there is testable logic (the export script). Frequent commits.

---

## File Structure

- `server/scripts/export_static_data.py` (NEW) — emits the static combined JSON; reuses `_all_bodies`.
- `server/tests/test_export_static_data.py` (NEW) — verifies the export content.
- `client/vite.config.js` (MODIFY) — production `base` path.
- `client/src/lib/planetImages.js` (MODIFY) — prefix image `src` with `import.meta.env.BASE_URL`.
- `client/src/lib/__tests__/planetImages.test.js` (MODIFY) — add a base-URL assertion.
- `.github/workflows/deploy.yml` (NEW) — build + deploy to Pages.
- `.gitignore` (MODIFY) — ignore the generated data file.
- `readme.md` (MODIFY) — live demo link.

---

## Task 1: Static data export script (backend)

**Files:**
- Create: `server/scripts/export_static_data.py`
- Test: `server/tests/test_export_static_data.py`

**Interfaces:**
- Consumes: `server.routers.celestial_bodies._all_bodies(source: str) -> list[dict]` (existing).
- Produces: `export(dest: Path = DEFAULT_DEST) -> int` — writes `{"data": _all_bodies("snapshot"), "source": "snapshot"}` to `dest`, returns the body count. Module constant `DEFAULT_DEST` = repo-root `client/public/celestial-bodies.json`.

- [ ] **Step 1: Write the failing test**

```python
# server/tests/test_export_static_data.py
import json

from server.routers.celestial_bodies import _all_bodies
from server.scripts.export_static_data import export


def test_export_writes_combined_snapshot_data(tmp_path):
    dest = tmp_path / "celestial-bodies.json"
    count = export(dest)

    payload = json.loads(dest.read_text(encoding="utf-8"))
    assert payload["source"] == "snapshot"
    assert payload["data"] == _all_bodies("snapshot")
    assert count == len(payload["data"])
    # Both exoplanets and the curated stars must be present (stars live in the
    # router, not the snapshot — the whole reason we reuse _all_bodies).
    types = {b["type"] for b in payload["data"]}
    assert "exoplanet" in types
    assert "star" in types


def test_export_creates_missing_parent_dir(tmp_path):
    dest = tmp_path / "nested" / "celestial-bodies.json"
    export(dest)
    assert dest.exists()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest server/tests/test_export_static_data.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'server.scripts.export_static_data'`

- [ ] **Step 3: Write minimal implementation**

```python
# server/scripts/export_static_data.py
"""Generate the static celestial-bodies JSON the GitHub Pages demo serves.

Reuses the API's own data assembly (`_all_bodies`) so the static file cannot
drift from the live API's content or shape. Run from the repo root:

    python -m server.scripts.export_static_data
"""

from __future__ import annotations

import json
from pathlib import Path

from server.routers.celestial_bodies import _all_bodies

# client/public is copied verbatim into the Vite build output (dist/).
DEFAULT_DEST = (
    Path(__file__).resolve().parents[2] / "client" / "public" / "celestial-bodies.json"
)


def export(dest: Path = DEFAULT_DEST) -> int:
    """Write the combined snapshot dataset to ``dest``; return the body count."""
    payload = {"data": _all_bodies("snapshot"), "source": "snapshot"}
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    return len(payload["data"])


def main() -> None:
    count = export()
    print(f"Wrote {count} celestial bodies to {DEFAULT_DEST}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest server/tests/test_export_static_data.py -v`
Expected: PASS (both tests)

- [ ] **Step 5: Lint (ruff is installed in this workspace; CI enforces it)**

Run (from `server/`): `python -m ruff format . && python -m ruff check .`
Expected: no diffs / "All checks passed!"

- [ ] **Step 6: Commit**

```bash
git add server/scripts/export_static_data.py server/tests/test_export_static_data.py
git commit -m "feat(deploy): export static celestial-bodies JSON from backend data"
```

---

## Task 2: Frontend base-path handling

**Files:**
- Modify: `client/vite.config.js`
- Modify: `client/src/lib/planetImages.js`
- Test: `client/src/lib/__tests__/planetImages.test.js`

**Interfaces:**
- Produces: production Vite builds use `base: '/cosmic-explorer/'`; `planetImage(sizeClass).src` is prefixed with `import.meta.env.BASE_URL` so images resolve under the Pages subpath.

- [ ] **Step 1: Add the failing test**

Add this test inside the existing `describe('planetImage', ...)` block in `client/src/lib/__tests__/planetImages.test.js`:

```javascript
  it('prefixes the image src with the Vite base URL', () => {
    expect(planetImage('rocky').src.startsWith(import.meta.env.BASE_URL)).toBe(
      true
    );
    expect(planetImage('rocky').src).toBe(
      `${import.meta.env.BASE_URL}planet-types/rocky.jpg`
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/lib/__tests__/planetImages.test.js`
Expected: FAIL — current `src` is `/planet-types/rocky.jpg`, which does not equal `` `${BASE_URL}planet-types/rocky.jpg` `` unless the code uses `BASE_URL` (in vitest `BASE_URL` is `/`, so the `.toBe` assertion pins the shape). It fails until the implementation change in Step 3.

> Note: the pre-existing `toContain('/planet-types/...')` assertions keep passing either way, because `/planet-types/...` is a substring of the base-prefixed src. Only the new `.toBe` assertion drives the change.

- [ ] **Step 3: Update `planetImages.js`**

Change the `src` line (line 14) in `client/src/lib/planetImages.js` from:

```javascript
    src: `/planet-types/${file}`,
```

to:

```javascript
    src: `${import.meta.env.BASE_URL}planet-types/${file}`,
```

- [ ] **Step 4: Update `vite.config.js` for the production base path**

Replace the entire contents of `client/vite.config.js` with:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this repo under /cosmic-explorer/, so production builds
// use that base path; dev and test stay at root so Vitest is unaffected.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/cosmic-explorer/' : '/',
  plugins: [react()],
  server: { port: 3000 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
}));
```

- [ ] **Step 5: Run the full frontend suite + lint**

Run (from `client/`): `npx vitest run && npm run lint`
Expected: all tests PASS (including the new base-URL assertion and the unchanged image tests), lint clean.

- [ ] **Step 6: Commit**

```bash
git add client/vite.config.js client/src/lib/planetImages.js client/src/lib/__tests__/planetImages.test.js
git commit -m "feat(deploy): resolve base path for GitHub Pages subpath"
```

---

## Task 3: Deploy workflow, gitignore, README, and static-build verification

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `.gitignore`
- Modify: `readme.md`

**Interfaces:**
- Consumes: the export script (Task 1) and the base-path build (Task 2).
- Produces: a GitHub Actions workflow that builds the static bundle and deploys it to Pages on push to `master`.

- [ ] **Step 1: Ignore the generated data file**

Append this line to `.gitignore`:

```
client/public/celestial-bodies.json
```

- [ ] **Step 2: Create the deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Generate static data from backend
        run: |
          pip install fastapi "httpx>=0.28.0,<1"
          python -m server.scripts.export_static_data
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
          cache-dependency-path: client/package-lock.json
      - name: Build frontend
        working-directory: client
        env:
          VITE_API_URL: /cosmic-explorer/celestial-bodies.json
        run: |
          npm ci
          npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: client/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

> Convention note: `ci.yml` pins actions by commit SHA. Tag pins (`@v4`) are used here for readability; pinning these to SHAs afterward matches the repo convention and is a reasonable hardening (not required for the deploy to work).

- [ ] **Step 3: Add the live-demo link to the README**

In `readme.md`, add this line directly under the top-level title/intro (adjust placement to match the existing heading structure you see when you open the file):

```markdown
**Live demo:** https://ssspear.github.io/cosmic-explorer/
```

- [ ] **Step 4: Verify the static build locally (the real gate for this task)**

Run from the repo root:

```bash
pip install fastapi "httpx>=0.28.0,<1"   # if not already installed
python -m server.scripts.export_static_data
```
Expected: prints `Wrote <N> celestial bodies to .../client/public/celestial-bodies.json` (N ≈ 503: 500 exoplanets + 3 stars).

Then build and preview the production bundle:

```bash
cd client
VITE_API_URL=/cosmic-explorer/celestial-bodies.json npm run build
npx vite preview --port 4173
```
Open `http://localhost:4173/cosmic-explorer/` in a browser. Confirm: the bar chart, scatter, results list, and a planet's detail-drawer image all load, and the browser console shows **no 404s** for `celestial-bodies.json` or `/cosmic-explorer/planet-types/*.jpg`. Stop the preview server (Ctrl-C) when done.

- [ ] **Step 5: Confirm the full suites still pass**

Run: `python -m pytest server/tests/ -q` (from repo root) and `npx vitest run && npm run lint` (from `client/`).
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/deploy.yml .gitignore readme.md
git commit -m "feat(deploy): GitHub Pages workflow, ignore generated data, README demo link"
```

---

## Post-implementation (manual, by the repo owner)

- **Enable Pages once:** repo **Settings → Pages → Source: GitHub Actions**. The `deploy-pages` action requires this before the first run succeeds.
- After merging to `master` (or running the workflow via **Actions → Deploy to GitHub Pages → Run workflow**), confirm the deployment succeeds and `https://ssspear.github.io/cosmic-explorer/` loads.

## Deferred (Linear)

- COS-7 — the long-term impressive deployment (live backend, custom domain, per-PR previews, analytics, social card).
