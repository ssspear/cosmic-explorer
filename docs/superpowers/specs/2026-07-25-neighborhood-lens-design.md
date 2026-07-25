# Neighborhood Lens — 3D Stellar Map — Design

- **Date:** 2026-07-25
- **Linear:** COS-9 (child of the COS-3 multi-view epic). Second lens after Discovery-trend.
- **Status:** Approved (brainstorm) — ready for implementation planning.
- **Branch:** `feat/cos9-neighborhood-lens` (off `master` @ bbe80c0, which includes the lens foundation).

## Overview

Add a **Neighborhood lens** to the Cosmic Explorer: a real-time 3D star map that places each filtered planet at its host star's true position in space, with Earth/the Sun at the center. It answers "how far are these worlds from us — and from each other?" at a glance, and folds in size comparison. It is the third lens in the switcher (after **Size families** and **Discovery trend**) and the app's **first WebGL surface** (advances COS-2).

## Goals

- A rotatable/zoomable 3D map of the stellar neighborhood, honest to the archive coordinates.
- Reads the shared `filteredPlanets`, so all existing filters cross-apply.
- Selecting a dot drives the existing detail drawer; no new selection model.
- Distance **and** size legible together (position = distance, dot size = planet radius, dot color = star temperature).

## Non-goals (this increment)

- The procedural "artist's concept" planet render (a later COS-3/COS-2 increment; this lens lays the R3F foundation for it).
- Real NASA concept-art enrichment via the Images API (later, optional, drawer-only).
- Full-catalog scaling (COS-4) — still the nearest-500 sample.
- Animated stellar proper motion; constellation lines; a habitability overlay.

## Visual direction (locked in brainstorming)

- **"Instrument" aesthetic (direction B):** dark space, glowing star dots, plus faint concentric **distance rings** (e.g. 25 / 50 / 100 ly) on a ground plane for depth and scale. The rings are **toggle-able** (off → clean starfield). Matches the mono "instrument" voice from the UI-polish pass.
- **Layout 1 (consistent):** the map lives in the lens area (`.app__charts` panel), the shared results list + drawer stay on the right — same shell as the other lenses. The map canvas is **taller** than the flat ~300px charts so it feels spacious, with an optional **"expand"** control that momentarily widens it to full width.

## Encoding (locked)

Each **dot = one planet**, positioned at its host star's 3D location:

- **Position** = `(x, y, z)` computed from the star's right ascension, declination, and distance. Radial unit is **light-years** (`distance_ly`), consistent with the ring labels and the rest of the app.
- **Color** = **host-star temperature** (`st_teff`): orange red-dwarfs → white sun-likes → blue-white hot stars. Null `st_teff` → a neutral grey fallback. (Distinct from the size-family and discovery-method palettes — no collision; each lens owns its encoding, as Discovery already does.)
- **Size** = **planet radius** (`radius_earth`): small rocky dots → large gas-giant dots, clamped to a sensible min/max so nothing vanishes or dominates. Null radius → a small default.
- **Same-system planets** (shared coordinates, e.g. TRAPPIST-1's 7) get a **tiny deterministic jitter** — a fraction of a light-year, seeded from the planet name — so they fan into a small visible cluster instead of stacking invisibly. Documented as an *illustrative* spread (true intra-system distances are far below neighborhood scale).

## Interactions & states

- **Orbit controls:** drag to rotate, scroll/pinch to zoom (drei `OrbitControls`).
- **Hover:** a label/tooltip with planet name + distance (ly) + size class (drei `Html` or an overlay).
- **Select:** click a dot → `onSelect(planet)` → the existing `PlanetDetailDrawer`; the selected planet is highlighted (glow/ring). `selectedName` is passed in so selection from the results list also highlights on the map.
- **Ring toggle** and **expand** controls sit in a small control strip, styled like the scatter's existing controls.
- **Legend:** star-temperature color scale + a "dot size = planet radius" note.
- **Cross-filter:** the map renders `filteredPlanets`; changing filters re-renders it. Planets **missing coordinates or distance** can't be placed — they're dropped from the map with a small "N not shown (no coordinates)" note, mirroring the scatter's "omitted" affordance.
- **Empty state:** no planets match → the canvas is replaced by the shared "No planets match your filters" message (`chart-empty`), consistent with the Size and Discovery lenses.

## Architecture

`App` remains the single source of truth. The lens is a pure derivation of `filteredPlanets`, consistent with the existing lenses.

```
App (adds 'neighborhood' to LENSES; renders NeighborhoodLens when active)
  └─ NeighborhoodLens (props: planets, onSelect, selectedName)
        ├─ legend + ring-toggle + expand controls + "not shown" note
        └─ NeighborhoodMap (the R3F <Canvas>: instancedMesh of star dots,
              Earth/Sun anchor, distance rings, OrbitControls, hover, click)
```

### Components / files

- `client/src/lib/neighborhood.js` (NEW) — **the pure, tested core:**
  - `equatorialToXYZ(raDeg, decDeg, distanceLy)` → `{ x, y, z }` (standard spherical→Cartesian; ra/dec in degrees).
  - `starColor(teffK)` → hex string (temperature→color approximation; null → neutral grey).
  - `radiusToDotSize(radiusEarth)` → clamped numeric scale (null → small default).
  - `systemJitter(planetName)` → small deterministic `{dx, dy, dz}` offset (seeded hash; stable across renders).
  - `neighborhoodPoints(planets)` → `[{ planet, x, y, z, color, size }]`, dropping planets without ra/dec/distance and applying jitter. Returns the placed points **and** the omitted count.
- `client/src/components/NeighborhoodMap.jsx` (NEW) — the R3F `<Canvas>` scene: one `<instancedMesh>` of low-poly spheres (one instance per placed point, per-instance position/color/scale), a Sun/Earth marker at the origin, the distance-ring meshes, `<OrbitControls>`, hover + click handlers, selected-dot highlight. Presentational; not unit-tested against WebGL.
- `client/src/components/NeighborhoodLens.jsx` (NEW) — legend + controls (ring toggle, expand) + the "not shown" note + `NeighborhoodMap`; owns the empty-state branch. Props: `planets`, `onSelect`, `selectedName`.
- `client/src/components/NeighborhoodLens.css` (NEW) — canvas sizing (taller), expanded/full-width state, control-strip + legend styling, token-only (reuse the design tokens).
- `client/src/App.jsx` (MODIFY) — add `{ key: 'neighborhood', label: 'Neighborhood' }` to `LENSES`; replace the two-way lens ternary with a clean three-way (small switch or lens map); render `NeighborhoodLens` **lazily** (`React.lazy` + `<Suspense>`) so three/R3F only downloads when the tab is opened; pass `planets={filteredPlanets}`, `onSelect={setSelected}`, `selectedName={selectedBody?.name ?? null}`; refresh the subtitle to mention the neighborhood/3D view.

### Backend / data (MODIFY)

- `server/services/exoplanets.py`:
  - Add `ra`, `dec`, `st_teff`, `sy_pnum` to `_COLUMNS`.
  - In `normalize()`, extract and expose them on the body: `ra`, `dec`, `star_temp_k` (from `st_teff`), `planet_count` (from `sy_pnum`). Keep `ra`/`dec` in decimal degrees; round sensibly; null-safe.
- Regenerate **both** snapshots so the new fields flow through:
  1. `python -m server.scripts.refresh_exoplanets` → re-fetches live NASA data with the new columns → `server/data/exoplanets.json`.
  2. `python -m server.scripts.export_static_data` → `client/public/celestial-bodies.json` (the static demo's data).
- Backend can fetch NASA server-side fine (no CORS constraint applies to Python); the browser never calls NASA directly — the committed snapshot is the source, unchanged pattern.

### Dependencies

- Add `three`, `@react-three/fiber`, `@react-three/drei`.
- **Lazy-load the lens** so the ~600 KB–1 MB WebGL bundle is fetched only when a visitor opens the Neighborhood tab; the Size and Discovery lenses stay lightweight.

## Data & encoding notes (from the NASA data research)

- `ra` / `dec`: decimal degrees, **100% coverage**. `sy_dist`→`distance_ly`: ~99.6%. `st_teff`: ~95%. `sy_pnum`: complete. Coordinates are ICRS/J2000 (Gaia) — proper-motion drift is negligible for a static map.
- `st_spectype` is only ~37% populated — **not used**; star color derives from `st_teff`.
- A handful of planets lack distance/coords → dropped from the map (the "not shown" note), still present in the results list.

## Testing

- **`neighborhood.js` (centerpiece, pure, jsdom-safe):**
  - `equatorialToXYZ`: known cases — `(ra 0, dec 0, d 10) → (10, 0, 0)`; `(ra 90, dec 0, d 10) → (~0, 10, 0)`; `(ra 0, dec 90, d 10) → (~0, 0, 10)`.
  - `starColor`: a cool temp → warm hue, a hot temp → blue hue, `null` → the neutral grey.
  - `radiusToDotSize`: small vs large radius ordering; clamping at both ends; `null` → default.
  - `systemJitter`: deterministic (same name → same offset), small magnitude, distinct across names.
  - `neighborhoodPoints`: places valid planets, drops those missing ra/dec/distance, reports the omitted count, applies jitter to same-host planets.
- **`NeighborhoodLens`:** empty vs non-empty branch and the "not shown" note + legend render (assert on the reliable DOM outside the Canvas — the WebGL scene isn't rendered in jsdom, same principle as the charts). Mock `NeighborhoodMap`/the R3F Canvas if its import errors under jsdom.
- **App integration:** the Neighborhood tab appears and switches to it; default lens is still Size families; a filter change cross-applies to the map (via `filteredPlanets`).

## Verification

Full frontend suite + lint + build green; snapshots regenerated. Run the app locally and confirm: the tab switches to the map; dots sit at plausible positions colored by star temperature and sized by radius; rings + ring-toggle + expand work; hover shows name/distance; clicking a dot opens the detail drawer and syncs with the results list; filters cross-apply; a multi-planet system (e.g. TRAPPIST-1) shows as a small cluster. Confirm the other lenses' bundle isn't bloated (lazy-load working).
