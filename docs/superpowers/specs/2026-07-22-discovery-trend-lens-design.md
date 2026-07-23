# Multi-Lens Foundation + Discovery-Trend Lens — Design

- **Date:** 2026-07-22
- **Linear:** COS-3 (epic). This spec covers the **lens-switcher foundation + the first lens (Discovery trend)**. The Neighborhood and Habitability lenses are deferred to their own spec→plan cycles under COS-3.
- **Status:** Approved (brainstorm) — ready for implementation planning.
- **Branch:** `feat/cos3-multiview` (off `master` @ 245f546, which includes the UI polish).

## Overview

Add a **lens system** to the Cosmic Explorer: a tab switcher over the main chart area that swaps between analytical "lenses" while the FilterBar, results list, detail drawer, and the shared `filteredPlanets` dataset stay common and cross-filter every lens. The existing size-families bar + distance-vs-size scatter become the default **"Size families"** lens; the first new lens is **"Discovery trend"** — a stacked bar of exoplanet discoveries per year, colored by discovery method (the rise of transit surveys).

## Goals

- A pluggable lens architecture so future lenses (Neighborhood, Habitability) slot in without App surgery.
- A Discovery-trend lens with full-data (500/500) that reads as a compelling timeline.
- All existing behavior preserved; filters cross-apply to every lens.

## Non-goals (this increment)

- Neighborhood and Habitability lenses (future COS-3 sub-projects).
- Per-bar planet selection in the trend chart (selection stays in the shared results list).
- Year-range brushing / zoom; stack-by-size-family toggle.

## Architecture

`App` remains the single source of truth. Add `activeLens` state. The main chart area (`.app__charts`) renders the active lens component; the FilterBar, legend-per-lens, results list, and drawer stay shared.

```
App (state: bodies, filters, selected, yMeasure, activeLens)
  ├─ FilterBar (shared)
  ├─ LensTabs (activeLens ↔ onChange)
  ├─ <active lens>  ← consumes filteredPlanets (+ onSelect where relevant)
  │     ├─ SizeFamiliesLens  = size legend + TypeDistributionChart + PlanetScatter
  │     └─ DiscoveryTrendLens = method legend + DiscoveryTrendChart
  └─ app__side: ResultsList + PlanetDetailDrawer (shared)
```

**Each lens is self-contained** — it renders its own legend + chart(s) and consumes `filteredPlanets`. This removes the App-level size-family legend (it moves into `SizeFamiliesLens`), so the legend is naturally lens-aware without App branching.

## Components / files

- `client/src/components/LensTabs.jsx` (+ `.css`, NEW) — segmented control. Props: `lenses` (array of `{key,label}`), `active`, `onChange`. Accessible (role="tablist", arrow-key nav, `aria-selected`).
- `client/src/components/SizeFamiliesLens.jsx` (NEW) — moves the current legend + `TypeDistributionChart` + `PlanetScatter` markup out of App. Props: `planets`, `yMeasure`, `onYMeasureChange`, `onSelect`.
- `client/src/components/DiscoveryTrendLens.jsx` (NEW) — method legend + `DiscoveryTrendChart`. Props: `planets`.
- `client/src/components/DiscoveryTrendChart.jsx` (NEW) — Recharts stacked `BarChart`; X = year, Y = count, one `<Bar stackId>` per method bucket, colored from the method palette. Empty-state message when no data (matches the other charts' pattern).
- `client/src/lib/discoveryMethods.js` (NEW) — the method system:
  - `METHODS` = ordered `[{key,label,color}]` for the buckets `radial_velocity`, `transit`, `imaging`, `other`.
  - `methodBucket(rawMethod)` → one of those keys (Astrometry, Transit Timing Variations, Eclipse Timing Variations → `other`).
  - `discoveriesByYear(planets)` → sorted array of `{ year, radial_velocity, transit, imaging, other }` counts (pure, the testing centerpiece).
- `client/src/App.jsx` (MODIFY) — add `activeLens` state + `LensTabs`; render the active lens; remove the inline legend + chart markup (now in `SizeFamiliesLens`). Everything else unchanged.

## Data & encoding

- Trend data comes from `discoveriesByYear(filteredPlanets)` — so the shared filters (type/method/distance) cross-apply automatically.
- **Method palette** (distinct from the blue/teal/amber/green size-family colors, so the two categorical systems never collide): finalize with the `dataviz` skill at build; the rare methods (1 planet each) bucket into a neutral **"Other."**
- Legend is per-lens: size-family colors under Size families, method colors under Discovery trend.
- Mono "instrument" type continues on axis ticks, tooltip, and legend labels (consistent with the polish).

## Interactions & states

- **Cross-filter:** every lens reads `filteredPlanets`; changing filters updates all lenses.
- **Trend hover:** tooltip with the year + per-method counts (mono).
- **Selection:** unchanged — via the results list / scatter dots; the trend chart is aggregate (no per-bar select).
- **Empty state:** the active lens shows its "No planets match your filters" message when the filtered set is empty.
- **Tab switch:** instant; no data refetch (client-side).

## Testing

- **`discoveryMethods.js`:** unit tests for `methodBucket` (each known method + the three rare → `other`) and `discoveriesByYear` (per-year per-bucket counts, sorted years, empty input → `[]`).
- **`DiscoveryTrendChart`:** empty vs non-empty branch (Recharts renders SVG that jsdom sizes to 0, so assert on the reliable branch like `TypeDistributionChart`).
- **`LensTabs`:** renders a tab per lens, marks the active one, fires `onChange` on click.
- **`SizeFamiliesLens`:** smoke render (its charts already have their own tests).
- **App integration:** switching to Discovery trend swaps the view; a filter change cross-applies; default lens is Size families.

## Verification

Full frontend suite + lint + build green; run locally and confirm: tabs switch views, the trend chart renders the timeline with method colors + working legend, filters cross-apply, and keyboard/focus works on the tabs.
