# Exoplanet Size-Families Explorer — Design

- **Date:** 2026-07-09
- **Status:** Approved (brainstorm) — ready for implementation planning
- **Branch:** `feat/exoplanet-size-explorer` (based on `feat/nasa-exoplanet-data`; rebase onto `master` once PR #1 merges)
- **Approach:** A — Focused Classification Dashboard (v1). Multi-view explorer (B) is the tracked long-term roadmap.

## Overview

Turn the current text-only celestial-bodies list into a **comparison explorer** whose centerpiece
is a **size-families view**: every exoplanet is classified into a size family (rocky, super-Earth,
Neptune-like, gas giant) and the tool shows how common each type is, alongside a scatter that shows
where each planet sits. Clicking a planet opens a detail drawer with the existing facts card plus a
representative NASA artist's-concept image.

## Goals & success criteria

- See the **distribution** of planet types at a glance (the bar chart centerpiece).
- **Spot patterns** by cross-filtering the population (type, distance, discovery method).
- Drill into any planet for **facts + a picture**.
- Ship a **finished, polished, deployable** slice — learning-first, portfolio-quality.

## Users

Primarily the author: (1) learning full-stack development, (2) building a portfolio piece to show
employers. Implication: clean, tested, well-bounded code; visual polish; a live shareable link and a
strong README matter as much as raw functionality.

## Non-goals for v1 (tracked in Linear)

- Additional lenses — habitability, neighborhood, discovery-trend views (**B roadmap epic**).
- Scaling to the full ~6,000-planet catalog with server-side filtering/pagination.
- Per-planet real imagery (v1 uses type-representative artwork).
- Name search / typeahead.
- Live deployment (near-term follow-up, tracked separately).
- Server package restructure for distributable builds (**COS-1**).
- Migrating charts to visx/WebGL (**COS-2**).

## Architecture & data flow

Compute the hard thing once on the server; derive cheap things on the client.

```
NASA Archive ──► fetch_from_nasa ──► normalize ──► classify() ──► /api/celestial-bodies
(or snapshot)     (broad sample)     (existing)    (NEW)           bodies carry size_class
                                                                          │
                                                   React App fetches ONCE, holds full set
                                                                          │
                    FilterBar ──► filter state ──► derived filtered set ──┼──► TypeDistributionChart
                                                                          ├──► PlanetScatter
                                                                          ├──► Results list (demoted, synced)
                                                                          └──► PlanetDetailDrawer (on select)
```

- **Classification is server-side** (a pure function) so the size family is authoritative, testable,
  and identical in every view — never re-derived in JS.
- **Filtering is client-side** over the few-hundred-planet set: instant, no new API params, trivial
  cross-filtering. This is a deliberate v1 simplification.
- **Single source of truth:** `App` owns the full dataset + filter state; every view is a pure
  derivation, so the bar, scatter, and list cannot drift out of sync.

### Scaling seam (future, not v1)

When the sample grows past ~1,000 planets, client-side filtering and SVG rendering stop being free.
That is the point to (a) move filtering server-side with query params/pagination, and (b) swap the
chart renderer (COS-2). The v1 boundaries below are chosen so these are contained changes.

## Backend design (`server/`)

### 1. Broaden the sample (`services/exoplanets.py`)

Today's ADQL selects only the nearest ~40 systems (all radial-velocity, so **0 have a radius**).
Widen it to a representative sample that **includes transit-discovered planets** (which carry radii):
select confirmed planets (`default_flag=1`) that have a radius **or** a mass, capped at a configurable
`SAMPLE_LIMIT` (~300–500 for v1). Regenerate the bundled snapshot. `SAMPLE_LIMIT` is a single constant
so growing toward the full catalog later is a one-line change.

### 2. `classify()` — pure, well-tested (`services/classification.py`, new)

Maps a planet to `size_class ∈ {rocky, super_earth, neptune_like, gas_giant, unknown}` plus
`size_class_basis ∈ {radius, mass, none}`. Uses radius thresholds when radius is present; falls back to
mass thresholds otherwise; `unknown` only when both are null. Thresholds are named constants
(approximate, tunable):

| Class | Radius (R⊕) | Mass fallback (M⊕) |
|---|---|---|
| rocky | < 1.6 | < 2 |
| super_earth | 1.6 – 2.0 | 2 – 10 |
| neptune_like | 2.0 – 6.0 | 10 – 50 |
| gas_giant | ≥ 6.0 | ≥ 50 |

`normalize()` calls `classify()`, so every exoplanet in the API response gains `size_class` and
`size_class_basis`. This function is the backend testing centerpiece.

**Threshold tuning is data-informed, not upfront:** ship these defensible defaults, then inspect the
actual size distribution from the broadened sample and adjust boundaries only if the real data shows a
near-empty or over-full bucket. Caveats to footnote in the UI: gas-giant radius saturates (mass ranks
giants, not radius), and RV masses are minimums (M·sin i), so the mass-fallback path can under-classify.

### 3. API shape

`GET /api/celestial-bodies` is unchanged in structure (`{data, source}`) but each exoplanet now
includes `size_class` and `size_class_basis`. The frontend aggregates per-class counts itself. No new
endpoint in v1; a `/stats` endpoint is a later option if aggregation moves server-side.

### 4. Images

No reliable per-planet image API exists, and most planets have none. v1 uses a small curated set of
**public-domain NASA/JPL artist's concepts — one representative image per size family** — shown in the
detail drawer with an honest caption (e.g. "Artist's concept representative of a Neptune-like planet").
Always available, legally clean, truthful about being schematic. Real per-planet imagery is deferred.

## Frontend design (`client/`)

### Components (each one clear purpose, independently testable)

- **`App`** — fetches once, owns full dataset + filter state, derives the filtered set.
- **`FilterBar`** — type / distance / discovery-method controls → filter state.
- **`TypeDistributionChart`** — centerpiece bar chart: count of planets per size family.
- **`PlanetScatter`** — one mark per planet, colored by `size_class`; click a mark to select.
  **Axes use a single consistent quantity each** (never mix units): X = distance (ly), Y = a
  user-selectable measure defaulting to **radius (R⊕)** with a toggle to **mass (M⊕)**. Planets
  lacking the selected Y measure are **not plotted but their count is shown honestly** (e.g. "12
  planets not shown — no radius measured") and they remain visible in the companion list. Note:
  `size_class` (color) still uses the hybrid radius-or-mass classification, so every classified
  planet is colored even when it can't be positioned on the current axis.
  **Deferred (B-roadmap):** a selectable X-axis (e.g. orbital period, which reveals hot-Jupiters and
  the radius valley in period-space). v1 keeps X fixed to distance to stay legible and avoid
  reintroducing the flexible-axis scatter that was explicitly not chosen as the centerpiece.
- **Results list (demoted)** — a compact, filtered list/table synced to filters and selection. Not the
  centerpiece; it is the accessible, findable, mobile-friendly companion to the charts (resolves
  findability, accessibility, occlusion, mobile, and discoverability concerns of a charts-only UI).
- **`PlanetDetailDrawer`** — reuses the existing `CelestialCard` + the type image; opens on selection.
- **Shared color-by-type map + legend** — one mapping used by the bar, scatter, and list so a color
  means the same thing everywhere. Palette comes from the `dataviz` skill at build time.

### Chart library boundary (enforces COS-2's "easy swap")

v1 uses **Recharts** (fast, declarative, polished at this scale). **Rule:** the chart library is
imported *only* inside `TypeDistributionChart` and `PlanetScatter`. They receive our shaped data + the
color map as props and emit `onSelect(planet)`. Nothing else imports the library, and the library never
owns color, legend, or selection logic. This keeps a future visx/WebGL swap contained to those two
components.

### States

Replace the current silent error-swallow in `App` with explicit **loading / empty / error** states
(spinner; "no planets match" message; a real error with retry). Small change, meaningful polish and a
silent-failure fix.

### Accessibility

The demoted list is the accessible selection path (keyboard/screen-reader friendly). Chart marks get
aria labels and keyboard focus where practical, following the `dataviz` skill's accessible-chart
guidance. Basic responsive layout so it is usable on phones.

## Testing strategy

- **Backend** — `classify()`: each class by radius; mass fallback when radius null; radius-wins when
  both present; both-null → `unknown`; exact boundary values (1.6 / 2.0 / 6.0 R⊕; 2 / 10 / 50 M⊕);
  correct `size_class_basis`. Plus an API test that responses carry `size_class`.
- **Frontend** (vitest + React Testing Library) — bar chart renders one bar per class with correct
  counts; scatter renders a mark per planet and fires `onSelect` on click; filtering narrows charts and
  the list together; loading / empty / error states render; detail drawer shows facts + type image on
  select.

## Linear tracking

- **COS-1** — server packaging for distributable builds (deferred).
- **COS-2** — chart library migration to visx/WebGL as the catalog scales (deferred).
- **To file when planning:** B-roadmap epic (habitability / neighborhood / discovery-trend lenses),
  full-catalog scaling (server-side filtering/pagination), name search/typeahead, live deployment.
