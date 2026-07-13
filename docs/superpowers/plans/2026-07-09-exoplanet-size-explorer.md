# Exoplanet Size-Families Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the text-only celestial-bodies list into a size-families comparison explorer: classify each exoplanet by size, chart how common each family is, and let the user filter and drill into any planet.

**Architecture:** Classification is computed once on the server (a pure function) and travels with each planet in the API. The React app fetches the full set once, holds it as the single source of truth, and derives every view (bar chart, scatter, synced list, detail drawer) by filtering client-side.

**Tech Stack:** Backend — FastAPI, httpx, pytest (Python 3.12). Frontend — React 19, Vite, Recharts, Vitest + React Testing Library.

## Global Constraints

- Python: `requires-python >=3.12`; deps pinned `httpx>=0.28.0,<1`, `fastapi>=0.115.0,<1`.
- Ruff: `line-length = 100`, `target-version = "py312"`, lint select `E,F,I,W,UP`.
- `SAMPLE_LIMIT = 500` (nearest confirmed planets that have a radius or mass).
- `size_class ∈ {"rocky","super_earth","neptune_like","gas_giant","unknown"}`; `size_class_basis ∈ {"radius","mass","none"}`.
- Chart library (Recharts) is imported ONLY inside `TypeDistributionChart.jsx` and `PlanetScatter.jsx`. Nothing else imports it; it never owns color, legend, or selection.
- Color-by-size-class comes from one shared module (`client/src/lib/sizeClasses.js`). Palette values are placeholders to be finalized with the `dataviz` skill during Task 6 (run its palette validator).
- Backend imports use the `server.*` prefix. Run backend commands from the repo root; run frontend commands from `client/`.
- TDD throughout: failing test → verify fail → minimal implementation → verify pass → commit.

---

## File Structure

**Backend (`server/`)**
- `services/classification.py` (NEW) — pure `classify()` + threshold constants.
- `services/exoplanets.py` (MODIFY) — broadened ADQL query, `SAMPLE_LIMIT`, call `classify()` in `normalize()`.
- `routers/celestial_bodies.py` (MODIFY) — add `size_class`/`size_class_basis` (None) to `STARS`.
- `data/exoplanets.json` (REGENERATE) — via the refresh script, now ~500 classified planets.
- `scripts/refresh_exoplanets.py` (MODIFY) — default limit → `SAMPLE_LIMIT`.
- `tests/test_classification.py` (NEW), `tests/test_exoplanets_service.py` (MODIFY), `tests/test_celestial_bodies.py` (MODIFY).

**Frontend (`client/src/`)**
- `lib/sizeClasses.js` (NEW) — ordered class metadata (key, label, color) + lookup.
- `lib/planetImages.js` (NEW) — size_class → representative NASA image + caption.
- `hooks/useCelestialBodies.js` (NEW) — fetch with loading/error/ready status.
- `components/FilterBar.jsx` (NEW), `TypeDistributionChart.jsx` (NEW), `PlanetScatter.jsx` (NEW), `ResultsList.jsx` (NEW), `PlanetDetailDrawer.jsx` (NEW).
- `components/CelestialCard.jsx` (REUSE, unchanged).
- `App.jsx` (MODIFY) — orchestration, filter + selection state, layout, states.
- `public/planet-types/*.jpg` (NEW) — four public-domain NASA/JPL artist concepts.
- Matching `__tests__/*.test.jsx` per component + an `App` integration test.

---

## Task 1: Size classification function (backend)

**Files:**
- Create: `server/services/classification.py`
- Test: `server/tests/test_classification.py`

**Interfaces:**
- Produces: `classify(radius_earth: float | None, mass_earth: float | None) -> tuple[str, str]` returning `(size_class, size_class_basis)`.

- [ ] **Step 1: Write the failing tests**

```python
# server/tests/test_classification.py
import pytest

from server.services.classification import classify


@pytest.mark.parametrize(
    "radius, expected",
    [
        (1.0, "rocky"),
        (1.59, "rocky"),
        (1.6, "super_earth"),
        (1.99, "super_earth"),
        (2.0, "neptune_like"),
        (5.99, "neptune_like"),
        (6.0, "gas_giant"),
        (11.2, "gas_giant"),
    ],
)
def test_classifies_by_radius(radius, expected):
    size_class, basis = classify(radius, None)
    assert size_class == expected
    assert basis == "radius"


@pytest.mark.parametrize(
    "mass, expected",
    [
        (1.0, "rocky"),
        (1.99, "rocky"),
        (2.0, "super_earth"),
        (9.99, "super_earth"),
        (10.0, "neptune_like"),
        (49.9, "neptune_like"),
        (50.0, "gas_giant"),
        (318.0, "gas_giant"),
    ],
)
def test_classifies_by_mass_when_radius_missing(mass, expected):
    size_class, basis = classify(None, mass)
    assert size_class == expected
    assert basis == "mass"


def test_radius_wins_when_both_present():
    # radius says rocky (1.0), mass says gas_giant (60) -> radius wins
    size_class, basis = classify(1.0, 60.0)
    assert size_class == "rocky"
    assert basis == "radius"


def test_unknown_when_both_missing():
    assert classify(None, None) == ("unknown", "none")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest server/tests/test_classification.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'server.services.classification'`

- [ ] **Step 3: Write minimal implementation**

```python
# server/services/classification.py
"""Classify an exoplanet into a size family.

Boundaries are approximate, tunable conventions anchored to the radius valley
(~1.5-2.0 R-earth) and the solar-system planets. Radius is preferred; mass is a
fallback because it is less composition-dependent to interpret but widely
available for radial-velocity discoveries. See the design spec for caveats
(gas-giant radius saturation; RV masses are minimums).
"""

from __future__ import annotations

# (upper-exclusive) radius bounds in Earth radii
_RADIUS_ROCKY_MAX = 1.6
_RADIUS_SUPER_EARTH_MAX = 2.0
_RADIUS_NEPTUNE_MAX = 6.0

# (upper-exclusive) mass bounds in Earth masses
_MASS_ROCKY_MAX = 2.0
_MASS_SUPER_EARTH_MAX = 10.0
_MASS_NEPTUNE_MAX = 50.0


def _by_radius(radius: float) -> str:
    if radius < _RADIUS_ROCKY_MAX:
        return "rocky"
    if radius < _RADIUS_SUPER_EARTH_MAX:
        return "super_earth"
    if radius < _RADIUS_NEPTUNE_MAX:
        return "neptune_like"
    return "gas_giant"


def _by_mass(mass: float) -> str:
    if mass < _MASS_ROCKY_MAX:
        return "rocky"
    if mass < _MASS_SUPER_EARTH_MAX:
        return "super_earth"
    if mass < _MASS_NEPTUNE_MAX:
        return "neptune_like"
    return "gas_giant"


def classify(radius_earth: float | None, mass_earth: float | None) -> tuple[str, str]:
    """Return (size_class, size_class_basis) for a planet's radius and/or mass."""
    if radius_earth is not None:
        return _by_radius(radius_earth), "radius"
    if mass_earth is not None:
        return _by_mass(mass_earth), "mass"
    return "unknown", "none"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest server/tests/test_classification.py -v`
Expected: PASS (all parametrized cases)

- [ ] **Step 5: Commit**

```bash
git add server/services/classification.py server/tests/test_classification.py
git commit -m "feat(exoplanets): add size-family classification function"
```

---

## Task 2: Broaden the sample and classify in normalize (backend)

**Files:**
- Modify: `server/services/exoplanets.py`
- Modify: `server/scripts/refresh_exoplanets.py`
- Test: `server/tests/test_exoplanets_service.py`

**Interfaces:**
- Consumes: `classify()` from Task 1.
- Produces: every normalized body has `size_class` and `size_class_basis`; module constant `SAMPLE_LIMIT = 500`; `build_query()` returns planets with a radius or mass, distance-ordered.

- [ ] **Step 1: Write the failing tests**

Add to `server/tests/test_exoplanets_service.py`:

```python
def test_normalize_adds_size_class_from_radius():
    body = exoplanets.normalize({"pl_name": "Big b", "pl_rade": 12.0})
    assert body["size_class"] == "gas_giant"
    assert body["size_class_basis"] == "radius"


def test_normalize_adds_size_class_from_mass_fallback():
    body = exoplanets.normalize({"pl_name": "Mid b", "pl_bmasse": 20.0})
    assert body["size_class"] == "neptune_like"
    assert body["size_class_basis"] == "mass"


def test_normalize_size_class_unknown_when_no_size():
    body = exoplanets.normalize({"pl_name": "Nothing b"})
    assert body["size_class"] == "unknown"
    assert body["size_class_basis"] == "none"


def test_build_query_requires_a_size_measure():
    q = exoplanets.build_query()
    assert "pl_rade is not null or pl_bmasse is not null" in q
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest server/tests/test_exoplanets_service.py -v -k "size_class or requires_a_size"`
Expected: FAIL (`KeyError: 'size_class'` and the query assertion fails)

- [ ] **Step 3: Add the import and SAMPLE_LIMIT constant**

In `server/services/exoplanets.py`, add to the imports block:

```python
from server.services.classification import classify
```

Add near the other module constants (below `_MAX_DISTANCE_PC`):

```python
# Number of nearest confirmed planets (with a radius or mass) to serve.
SAMPLE_LIMIT = 500
```

- [ ] **Step 4: Broaden the query**

Replace the body of `build_query()` with:

```python
def build_query() -> str:
    """ADQL for the nearest confirmed planets that have a radius or a mass."""
    return (
        f"select {_COLUMNS} from ps "
        "where default_flag=1 and sy_dist is not null "
        "and (pl_rade is not null or pl_bmasse is not null) "
        "order by sy_dist asc"
    )
```

- [ ] **Step 5: Classify inside `normalize()`**

In `normalize()`, immediately before the `return {` statement, add:

```python
    size_class, size_class_basis = classify(radius_earth, mass_earth)
```

Then add these two keys to the returned dict (after `"equilibrium_temp_k": equilibrium_temp_k,`):

```python
        "size_class": size_class,
        "size_class_basis": size_class_basis,
```

- [ ] **Step 6: Default the fetch/refresh limit to SAMPLE_LIMIT**

In `server/services/exoplanets.py`, change `fetch_from_nasa` signature:

```python
def fetch_from_nasa(limit: int = SAMPLE_LIMIT, timeout: float = 20.0) -> list[dict]:
```

In `server/scripts/refresh_exoplanets.py`, change the default in `main()`:

```python
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 500
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `python -m pytest server/tests/test_exoplanets_service.py -v`
Expected: PASS (new size_class tests + existing tests still green)

- [ ] **Step 8: Commit**

```bash
git add server/services/exoplanets.py server/scripts/refresh_exoplanets.py server/tests/test_exoplanets_service.py
git commit -m "feat(exoplanets): broaden sample and attach size_class in normalize"
```

---

## Task 3: Add size_class to stars, regenerate snapshot, verify API (backend)

**Files:**
- Modify: `server/routers/celestial_bodies.py`
- Regenerate: `server/data/exoplanets.json`
- Test: `server/tests/test_celestial_bodies.py`

**Interfaces:**
- Consumes: broadened service from Task 2.
- Produces: API bodies for exoplanets include `size_class`; the bundled snapshot contains classified planets.

- [ ] **Step 1: Write the failing tests**

Add to `server/tests/test_celestial_bodies.py`:

```python
def test_exoplanets_have_size_class():
    resp = client.get("/api/celestial-bodies?body_type=exoplanet")
    data = resp.json()["data"]
    assert data, "expected at least one exoplanet"
    valid = {"rocky", "super_earth", "neptune_like", "gas_giant", "unknown"}
    assert all(b["size_class"] in valid for b in data)


def test_stars_have_null_size_class():
    resp = client.get("/api/celestial-bodies?body_type=star")
    data = resp.json()["data"]
    assert all(b["size_class"] is None for b in data)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest server/tests/test_celestial_bodies.py -v -k "size_class"`
Expected: FAIL (`KeyError: 'size_class'` — snapshot rows and stars lack the field)

- [ ] **Step 3: Add null size fields to every STARS entry**

In `server/routers/celestial_bodies.py`, add to EACH of the three star dicts (after `"equilibrium_temp_k": None,`):

```python
        "size_class": None,
        "size_class_basis": None,
```

- [ ] **Step 4: Regenerate the bundled snapshot from live NASA**

`load_snapshot()` reads the JSON verbatim (it does not run `normalize()`), so the snapshot file itself must carry `size_class`. Regenerate it:

Run: `python -m server.scripts.refresh_exoplanets`
Expected: prints `Wrote <N> exoplanets to .../server/data/exoplanets.json` where N is up to 500.
Verify a row has the new fields: `python -c "import json; d=json.load(open('server/data/exoplanets.json')); print(d[0]['size_class'], d[0]['size_class_basis'])"`
Expected: a valid class + basis (not a KeyError).

> If NASA is unreachable, the fetch raises and no file is written. Retry; do not hand-edit the snapshot. The rest of the plan depends on a regenerated snapshot.

- [ ] **Step 5: Run the full backend suite to verify it passes**

Run: `python -m pytest server/tests/ -v`
Expected: PASS (all tests, including the count-derived ones that read `load_snapshot()`)

- [ ] **Step 6: Inspect the real size distribution (data-informed threshold check)**

Run:
```bash
python -c "import json,collections; d=json.load(open('server/data/exoplanets.json')); print(collections.Counter(b['size_class'] for b in d))"
```
Expected: a Counter across the classes. If any class is empty or swallows almost everything, note it — a follow-up may tune the constants in `classification.py`. Do not change thresholds now unless a bucket is degenerate.

- [ ] **Step 7: Commit**

```bash
git add server/routers/celestial_bodies.py server/data/exoplanets.json server/tests/test_celestial_bodies.py
git commit -m "feat(exoplanets): serve size_class via API and regenerate snapshot"
```

---

## Task 4: Shared size-class metadata module (frontend)

**Files:**
- Create: `client/src/lib/sizeClasses.js`
- Test: `client/src/lib/__tests__/sizeClasses.test.js`

**Interfaces:**
- Produces: `SIZE_CLASSES` (ordered array of `{key, label, color}`), `sizeClassMeta(key)` returning that object (or the `unknown` entry for unrecognized keys).

- [ ] **Step 1: Write the failing test**

```javascript
// client/src/lib/__tests__/sizeClasses.test.js
import { describe, expect, it } from 'vitest';
import { SIZE_CLASSES, sizeClassMeta } from '../sizeClasses';

describe('sizeClasses', () => {
  it('orders families smallest to largest', () => {
    expect(SIZE_CLASSES.map((c) => c.key)).toEqual([
      'rocky',
      'super_earth',
      'neptune_like',
      'gas_giant',
      'unknown',
    ]);
  });

  it('returns metadata for a known key', () => {
    expect(sizeClassMeta('rocky').label).toBe('Rocky');
  });

  it('falls back to unknown for an unrecognized key', () => {
    expect(sizeClassMeta('bogus').key).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/lib/__tests__/sizeClasses.test.js`
Expected: FAIL (cannot resolve `../sizeClasses`)

- [ ] **Step 3: Write minimal implementation**

```javascript
// client/src/lib/sizeClasses.js
// Placeholder categorical palette — finalize with the dataviz skill (run its
// palette validator) before shipping. Colorblind-safe, ordered by size.
export const SIZE_CLASSES = [
  { key: 'rocky', label: 'Rocky', color: '#4E79A7' },
  { key: 'super_earth', label: 'Super-Earth', color: '#59A14F' },
  { key: 'neptune_like', label: 'Neptune-like', color: '#EDC948' },
  { key: 'gas_giant', label: 'Gas giant', color: '#E15759' },
  { key: 'unknown', label: 'Unknown', color: '#BAB0AC' },
];

const BY_KEY = new Map(SIZE_CLASSES.map((c) => [c.key, c]));

export function sizeClassMeta(key) {
  return BY_KEY.get(key) ?? BY_KEY.get('unknown');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `client/`): `npx vitest run src/lib/__tests__/sizeClasses.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/sizeClasses.js client/src/lib/__tests__/sizeClasses.test.js
git commit -m "feat(client): shared size-class metadata and colors"
```

---

## Task 5: Data-fetching hook with loading/error/ready states (frontend)

**Files:**
- Create: `client/src/hooks/useCelestialBodies.js`
- Test: `client/src/hooks/__tests__/useCelestialBodies.test.jsx`

**Interfaces:**
- Produces: `useCelestialBodies(url)` returning `{ status, bodies, error, reload }` where `status ∈ 'loading' | 'ready' | 'error'`.

- [ ] **Step 1: Write the failing test**

```jsx
// client/src/hooks/__tests__/useCelestialBodies.test.jsx
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCelestialBodies } from '../useCelestialBodies';

afterEach(() => vi.restoreAllMocks());

describe('useCelestialBodies', () => {
  it('reaches ready with data on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ name: 'A', type: 'exoplanet' }] }),
    });
    const { result } = renderHook(() => useCelestialBodies('/api'));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.bodies).toHaveLength(1);
  });

  it('reaches error on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useCelestialBodies('/api'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.bodies).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/hooks/__tests__/useCelestialBodies.test.jsx`
Expected: FAIL (cannot resolve `../useCelestialBodies`)

- [ ] **Step 3: Write minimal implementation**

```javascript
// client/src/hooks/useCelestialBodies.js
import { useCallback, useEffect, useState } from 'react';

export function useCelestialBodies(url) {
  const [status, setStatus] = useState('loading');
  const [bodies, setBodies] = useState([]);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        if (!Array.isArray(payload.data)) throw new Error('malformed payload');
        return payload.data;
      })
      .then((data) => {
        if (!active) return;
        setBodies(data);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setBodies([]);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [url, nonce]);

  return { status, bodies, error, reload };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `client/`): `npx vitest run src/hooks/__tests__/useCelestialBodies.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useCelestialBodies.js client/src/hooks/__tests__/useCelestialBodies.test.jsx
git commit -m "feat(client): useCelestialBodies hook with explicit states"
```

---

## Task 6: Install Recharts and finalize the palette

**Files:**
- Modify: `client/package.json`, `client/package-lock.json`
- Modify: `client/src/lib/sizeClasses.js` (palette values only)

**Interfaces:**
- Produces: `recharts` available to import; finalized colorblind-safe palette in `SIZE_CLASSES`.

- [ ] **Step 1: Install Recharts**

Run (from `client/`): `npm install recharts`
Expected: `recharts` added to `dependencies` in `client/package.json`.

- [ ] **Step 2: Finalize the palette with the dataviz skill**

Invoke the `dataviz` skill. Use its color formula and run its palette validator to replace the five placeholder hex values in `SIZE_CLASSES` with a validated categorical palette that stays distinguishable in light and dark and for common color-vision deficiencies. Keep the five keys and their order unchanged.

- [ ] **Step 3: Verify existing tests still pass**

Run (from `client/`): `npx vitest run src/lib`
Expected: PASS (the ordering/label tests are color-agnostic)

- [ ] **Step 4: Commit**

```bash
git add client/package.json client/package-lock.json client/src/lib/sizeClasses.js
git commit -m "feat(client): add recharts and finalize size-class palette"
```

---

## Task 7: FilterBar component (frontend)

**Files:**
- Create: `client/src/components/FilterBar.jsx`
- Test: `client/src/components/__tests__/FilterBar.test.jsx`

**Interfaces:**
- Produces: `<FilterBar filters={{type, method, maxDistance}} methods={string[]} onChange={(next)=>void} />`. Emits a full next-filters object on any control change.

- [ ] **Step 1: Write the failing test**

```jsx
// client/src/components/__tests__/FilterBar.test.jsx
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FilterBar from '../FilterBar';

const base = { type: 'all', method: 'all', maxDistance: 1000 };

describe('FilterBar', () => {
  it('emits the new type on change', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <FilterBar filters={base} methods={['Transit']} onChange={onChange} />
    );
    fireEvent.change(getByLabelText(/type/i), { target: { value: 'exoplanet' } });
    expect(onChange).toHaveBeenCalledWith({ ...base, type: 'exoplanet' });
  });

  it('lists provided discovery methods', () => {
    const { getByRole } = render(
      <FilterBar filters={base} methods={['Transit']} onChange={vi.fn()} />
    );
    expect(getByRole('option', { name: 'Transit' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/__tests__/FilterBar.test.jsx`
Expected: FAIL (cannot resolve `../FilterBar`)

- [ ] **Step 3: Write minimal implementation**

```jsx
// client/src/components/FilterBar.jsx
import './FilterBar.css';

function FilterBar({ filters, methods, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="filter-bar">
      <label className="filter-bar__field">
        <span>Type</span>
        <select
          value={filters.type}
          onChange={(e) => set({ type: e.target.value })}
        >
          <option value="all">All</option>
          <option value="exoplanet">Exoplanets</option>
          <option value="star">Stars</option>
        </select>
      </label>

      <label className="filter-bar__field">
        <span>Discovery method</span>
        <select
          value={filters.method}
          onChange={(e) => set({ method: e.target.value })}
        >
          <option value="all">All methods</option>
          {methods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-bar__field">
        <span>Max distance: {filters.maxDistance} ly</span>
        <input
          type="range"
          min="1"
          max="1000"
          value={filters.maxDistance}
          onChange={(e) => set({ maxDistance: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}

export default FilterBar;
```

Create `client/src/components/FilterBar.css`:

```css
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1.5rem;
}
.filter-bar__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `client/`): `npx vitest run src/components/__tests__/FilterBar.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/FilterBar.jsx client/src/components/FilterBar.css client/src/components/__tests__/FilterBar.test.jsx
git commit -m "feat(client): FilterBar for type/method/distance"
```

---

## Task 8: TypeDistributionChart — the size-families bar chart (frontend)

**Files:**
- Create: `client/src/components/TypeDistributionChart.jsx`
- Test: `client/src/components/__tests__/TypeDistributionChart.test.jsx`

**Interfaces:**
- Consumes: `SIZE_CLASSES` (Task 4), `recharts` (Task 6).
- Produces: `<TypeDistributionChart planets={Body[]} onSelectClass={(key)=>void} />`. Counts planets per `size_class` and renders one bar per non-empty family.

- [ ] **Step 1: Write the failing test**

```jsx
// client/src/components/__tests__/TypeDistributionChart.test.jsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TypeDistributionChart, { countByClass } from '../TypeDistributionChart';

const planets = [
  { name: 'a', size_class: 'rocky' },
  { name: 'b', size_class: 'rocky' },
  { name: 'c', size_class: 'gas_giant' },
];

describe('countByClass', () => {
  it('counts per family and drops empty families', () => {
    const rows = countByClass(planets);
    expect(rows.map((r) => [r.key, r.count])).toEqual([
      ['rocky', 2],
      ['gas_giant', 1],
    ]);
  });

  it('returns an empty array for no planets', () => {
    expect(countByClass([])).toEqual([]);
  });
});

describe('TypeDistributionChart', () => {
  // Recharts renders SVG that jsdom sizes to 0px, so assert on the reliable
  // empty/non-empty branch rather than on rendered SVG bars.
  it('does not show the empty message when planets are present', () => {
    const { queryByText } = render(<TypeDistributionChart planets={planets} />);
    expect(queryByText(/no planets/i)).toBeNull();
  });

  it('shows the empty message for an empty set', () => {
    const { getByText } = render(<TypeDistributionChart planets={[]} />);
    expect(getByText(/no planets/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/__tests__/TypeDistributionChart.test.jsx`
Expected: FAIL (cannot resolve `../TypeDistributionChart`)

- [ ] **Step 3: Write minimal implementation**

```jsx
// client/src/components/TypeDistributionChart.jsx
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SIZE_CLASSES } from '../lib/sizeClasses';

export function countByClass(planets) {
  return SIZE_CLASSES.map((c) => ({
    ...c,
    count: planets.filter((p) => p.size_class === c.key).length,
  })).filter((c) => c.count > 0);
}

function TypeDistributionChart({ planets, onSelectClass }) {
  const counts = countByClass(planets);

  if (counts.length === 0) {
    return <p className="chart-empty">No planets match your filters.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={counts}>
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} />
        <Tooltip cursor={{ fillOpacity: 0.1 }} />
        <Bar
          dataKey="count"
          onClick={(d) => onSelectClass?.(d.key)}
          isAnimationActive={false}
        >
          {counts.map((c) => (
            <Cell key={c.key} fill={c.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default TypeDistributionChart;
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `client/`): `npx vitest run src/components/__tests__/TypeDistributionChart.test.jsx`
Expected: PASS (the pure `countByClass` cases plus the empty/non-empty branch)

- [ ] **Step 5: Commit**

```bash
git add client/src/components/TypeDistributionChart.jsx client/src/components/__tests__/TypeDistributionChart.test.jsx
git commit -m "feat(client): size-families bar chart"
```

---

## Task 9: PlanetScatter — distance vs. size, with Y toggle and honest not-shown count (frontend)

**Files:**
- Create: `client/src/components/PlanetScatter.jsx`
- Test: `client/src/components/__tests__/PlanetScatter.test.jsx`

**Interfaces:**
- Consumes: `sizeClassMeta` (Task 4), `recharts` (Task 6).
- Produces: `<PlanetScatter planets={Body[]} yMeasure={'radius_earth'|'mass_earth'} onYMeasureChange={(m)=>void} onSelect={(planet)=>void} />`. Plots only planets that have `distance_ly` and the selected Y measure; shows a count of those omitted.

- [ ] **Step 1: Write the failing test**

```jsx
// client/src/components/__tests__/PlanetScatter.test.jsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlanetScatter from '../PlanetScatter';

const planets = [
  { name: 'r1', distance_ly: 10, radius_earth: 1.2, mass_earth: null, size_class: 'rocky' },
  { name: 'r2', distance_ly: 20, radius_earth: null, mass_earth: 5, size_class: 'super_earth' },
];

describe('PlanetScatter', () => {
  it('reports how many planets are not shown on the current axis', () => {
    const { getByText } = render(
      <PlanetScatter planets={planets} yMeasure="radius_earth" onYMeasureChange={vi.fn()} onSelect={vi.fn()} />
    );
    // r2 has no radius -> 1 not shown
    expect(getByText(/1 planet.*not shown/i)).toBeInTheDocument();
  });

  it('recomputes the not-shown count for the mass axis', () => {
    const { queryByText } = render(
      <PlanetScatter planets={planets} yMeasure="mass_earth" onYMeasureChange={vi.fn()} onSelect={vi.fn()} />
    );
    // r1 has no mass -> 1 not shown on the mass axis
    expect(queryByText(/1 planet.*not shown/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/__tests__/PlanetScatter.test.jsx`
Expected: FAIL (cannot resolve `../PlanetScatter`)

- [ ] **Step 3: Write minimal implementation**

```jsx
// client/src/components/PlanetScatter.jsx
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { sizeClassMeta } from '../lib/sizeClasses';

const Y_LABELS = {
  radius_earth: 'Radius (Earth radii)',
  mass_earth: 'Mass (Earth masses)',
};

function PlanetScatter({ planets, yMeasure, onYMeasureChange, onSelect }) {
  const plottable = planets.filter(
    (p) => p.distance_ly != null && p[yMeasure] != null
  );
  const omitted = planets.length - plottable.length;
  const data = plottable.map((p) => ({
    x: p.distance_ly,
    y: p[yMeasure],
    planet: p,
    fill: sizeClassMeta(p.size_class).color,
  }));

  return (
    <div className="planet-scatter">
      <div className="planet-scatter__controls">
        <label>
          Y axis:{' '}
          <select value={yMeasure} onChange={(e) => onYMeasureChange(e.target.value)}>
            <option value="radius_earth">Radius</option>
            <option value="mass_earth">Mass</option>
          </select>
        </label>
        {omitted > 0 && (
          <span className="planet-scatter__omitted">
            {omitted} planet{omitted === 1 ? '' : 's'} not shown — no{' '}
            {yMeasure === 'radius_earth' ? 'radius' : 'mass'} measured
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeOpacity={0.2} />
          <XAxis
            type="number"
            dataKey="x"
            name="Distance"
            scale="log"
            domain={['auto', 'auto']}
            tick={{ fontSize: 12 }}
            label={{ value: 'Distance (light-years)', position: 'bottom' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={Y_LABELS[yMeasure]}
            scale="log"
            domain={['auto', 'auto']}
            tick={{ fontSize: 12 }}
          />
          <ZAxis range={[60, 60]} />
          <Tooltip
            cursor={{ strokeOpacity: 0.3 }}
            formatter={(value, name) => [value, name]}
            labelFormatter={() => ''}
          />
          <Scatter
            data={data}
            isAnimationActive={false}
            onClick={(d) => onSelect(d.planet)}
            shape={(props) => (
              <circle
                cx={props.cx}
                cy={props.cy}
                r={6}
                fill={props.payload.fill}
                fillOpacity={0.8}
                style={{ cursor: 'pointer' }}
              />
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PlanetScatter;
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `client/`): `npx vitest run src/components/__tests__/PlanetScatter.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/PlanetScatter.jsx client/src/components/__tests__/PlanetScatter.test.jsx
git commit -m "feat(client): distance-vs-size scatter with Y toggle and not-shown count"
```

---

## Task 10: ResultsList — demoted, synced companion list (frontend)

**Files:**
- Create: `client/src/components/ResultsList.jsx`, `client/src/components/ResultsList.css`
- Test: `client/src/components/__tests__/ResultsList.test.jsx`

**Interfaces:**
- Consumes: `sizeClassMeta` (Task 4).
- Produces: `<ResultsList bodies={Body[]} selectedName={string|null} onSelect={(body)=>void} />`. Renders an accessible list of buttons; marks the selected row.

- [ ] **Step 1: Write the failing test**

```jsx
// client/src/components/__tests__/ResultsList.test.jsx
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResultsList from '../ResultsList';

const bodies = [
  { name: 'Proxima Cen b', type: 'exoplanet', size_class: 'super_earth' },
  { name: 'Sirius', type: 'star', size_class: null },
];

describe('ResultsList', () => {
  it('calls onSelect with the clicked body', () => {
    const onSelect = vi.fn();
    const { getByRole } = render(
      <ResultsList bodies={bodies} selectedName={null} onSelect={onSelect} />
    );
    fireEvent.click(getByRole('button', { name: /proxima cen b/i }));
    expect(onSelect).toHaveBeenCalledWith(bodies[0]);
  });

  it('marks the selected row with aria-current', () => {
    const { getByRole } = render(
      <ResultsList bodies={bodies} selectedName="Sirius" onSelect={vi.fn()} />
    );
    expect(getByRole('button', { name: /sirius/i })).toHaveAttribute('aria-current', 'true');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/__tests__/ResultsList.test.jsx`
Expected: FAIL (cannot resolve `../ResultsList`)

- [ ] **Step 3: Write minimal implementation**

```jsx
// client/src/components/ResultsList.jsx
import { sizeClassMeta } from '../lib/sizeClasses';
import './ResultsList.css';

function ResultsList({ bodies, selectedName, onSelect }) {
  if (bodies.length === 0) {
    return <p className="results-list__empty">No bodies match your filters.</p>;
  }
  return (
    <ul className="results-list" aria-label="Matching celestial bodies">
      {bodies.map((body) => {
        const selected = body.name === selectedName;
        return (
          <li key={body.name}>
            <button
              type="button"
              className={`results-list__row ${selected ? 'is-selected' : ''}`}
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelect(body)}
            >
              <span className="results-list__name">{body.name}</span>
              {body.type === 'exoplanet' && (
                <span
                  className="results-list__chip"
                  style={{ background: sizeClassMeta(body.size_class).color }}
                >
                  {sizeClassMeta(body.size_class).label}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default ResultsList;
```

Create `client/src/components/ResultsList.css`:

```css
.results-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 420px;
  overflow-y: auto;
}
.results-list__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  text-align: left;
  color: inherit;
}
.results-list__row.is-selected {
  background: rgba(255, 255, 255, 0.12);
}
.results-list__chip {
  font-size: 0.7rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  color: #0b0b12;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `client/`): `npx vitest run src/components/__tests__/ResultsList.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ResultsList.jsx client/src/components/ResultsList.css client/src/components/__tests__/ResultsList.test.jsx
git commit -m "feat(client): accessible synced results list"
```

---

## Task 11: Planet images + detail drawer (frontend)

**Files:**
- Create: `client/src/lib/planetImages.js`, `client/src/components/PlanetDetailDrawer.jsx`, `client/src/components/PlanetDetailDrawer.css`
- Create: `client/public/planet-types/rocky.jpg`, `super-earth.jpg`, `neptune.jpg`, `gas-giant.jpg`
- Test: `client/src/lib/__tests__/planetImages.test.js`, `client/src/components/__tests__/PlanetDetailDrawer.test.jsx`

**Interfaces:**
- Consumes: `CelestialCard` (existing), `sizeClassMeta` (Task 4).
- Produces: `planetImage(sizeClass)` → `{ src, caption } | null`; `<PlanetDetailDrawer body={Body} onClose={()=>void} />`.

- [ ] **Step 1: Add the four artist-concept images**

Download four public-domain NASA/JPL artist concepts (one per family) into `client/public/planet-types/` as `rocky.jpg`, `super-earth.jpg`, `neptune.jpg`, `gas-giant.jpg`. Sources (all NASA/JPL-Caltech, public domain — record the exact URLs used in the commit body):
- Rocky: a terrestrial-world concept (e.g. a TRAPPIST-1 rocky-planet render).
- Super-Earth: a super-Earth concept.
- Neptune-like: a mini-Neptune / Neptune concept.
- Gas giant: a hot-Jupiter concept.

- [ ] **Step 2: Write the failing tests**

```javascript
// client/src/lib/__tests__/planetImages.test.js
import { describe, expect, it } from 'vitest';
import { planetImage } from '../planetImages';

describe('planetImage', () => {
  it('maps a known class to an image and caption', () => {
    const img = planetImage('neptune_like');
    expect(img.src).toContain('/planet-types/neptune.jpg');
    expect(img.caption).toMatch(/artist'?s concept/i);
  });

  it('returns null for unknown or null', () => {
    expect(planetImage('unknown')).toBeNull();
    expect(planetImage(null)).toBeNull();
  });
});
```

```jsx
// client/src/components/__tests__/PlanetDetailDrawer.test.jsx
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlanetDetailDrawer from '../PlanetDetailDrawer';

const body = {
  name: 'Proxima Cen b',
  type: 'exoplanet',
  size_class: 'super_earth',
  description: 'Close rocky world.',
  fun_fact: 'Nearest exoplanet.',
};

describe('PlanetDetailDrawer', () => {
  it('renders the facts card and a representative image', () => {
    const { getByRole, getByAltText } = render(
      <PlanetDetailDrawer body={body} onClose={vi.fn()} />
    );
    expect(getByRole('heading', { name: /proxima cen b/i })).toBeInTheDocument();
    expect(getByAltText(/super-earth/i)).toBeInTheDocument();
  });

  it('calls onClose from the close button', () => {
    const onClose = vi.fn();
    const { getByRole } = render(<PlanetDetailDrawer body={body} onClose={onClose} />);
    fireEvent.click(getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run (from `client/`): `npx vitest run src/lib/__tests__/planetImages.test.js src/components/__tests__/PlanetDetailDrawer.test.jsx`
Expected: FAIL (modules cannot be resolved)

- [ ] **Step 4: Write minimal implementations**

```javascript
// client/src/lib/planetImages.js
import { sizeClassMeta } from './sizeClasses';

const FILES = {
  rocky: 'rocky.jpg',
  super_earth: 'super-earth.jpg',
  neptune_like: 'neptune.jpg',
  gas_giant: 'gas-giant.jpg',
};

export function planetImage(sizeClass) {
  const file = FILES[sizeClass];
  if (!file) return null;
  return {
    src: `/planet-types/${file}`,
    caption: `Artist's concept representative of a ${sizeClassMeta(sizeClass).label} planet (NASA/JPL-Caltech).`,
  };
}
```

```jsx
// client/src/components/PlanetDetailDrawer.jsx
import CelestialCard from './CelestialCard';
import { planetImage } from '../lib/planetImages';
import './PlanetDetailDrawer.css';

function PlanetDetailDrawer({ body, onClose }) {
  const image = body.type === 'exoplanet' ? planetImage(body.size_class) : null;
  return (
    <aside className="detail-drawer" aria-label={`Details for ${body.name}`}>
      <button type="button" className="detail-drawer__close" onClick={onClose}>
        Close
      </button>
      {image && (
        <figure className="detail-drawer__figure">
          <img src={image.src} alt={image.caption} loading="lazy" />
          <figcaption>{image.caption}</figcaption>
        </figure>
      )}
      <CelestialCard body={body} />
    </aside>
  );
}

export default PlanetDetailDrawer;
```

Create `client/src/components/PlanetDetailDrawer.css`:

```css
.detail-drawer {
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.detail-drawer__close {
  align-self: flex-end;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: inherit;
  border-radius: 6px;
  padding: 0.25rem 0.75rem;
  cursor: pointer;
}
.detail-drawer__figure {
  margin: 0;
}
.detail-drawer__figure img {
  width: 100%;
  border-radius: 8px;
}
.detail-drawer__figure figcaption {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-top: 0.25rem;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run (from `client/`): `npx vitest run src/lib/__tests__/planetImages.test.js src/components/__tests__/PlanetDetailDrawer.test.jsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/planetImages.js client/src/components/PlanetDetailDrawer.jsx client/src/components/PlanetDetailDrawer.css client/public/planet-types client/src/lib/__tests__/planetImages.test.js client/src/components/__tests__/PlanetDetailDrawer.test.jsx
git commit -m "feat(client): planet-type images and detail drawer"
```

---

## Task 12: Compose the App — orchestration, filtering, states (frontend)

**Files:**
- Modify: `client/src/App.jsx`, `client/src/App.css`
- Test: `client/src/__tests__/App.test.jsx` (replace the existing scaffold test)

**Interfaces:**
- Consumes: every component and hook from Tasks 4–11.
- Produces: the assembled explorer. Filtering: `filteredBodies` = bodies matching `{type, method, maxDistance}`; `filteredPlanets` = `filteredBodies` where `type === 'exoplanet'`. Charts use `filteredPlanets`; the list uses `filteredBodies`.

- [ ] **Step 1: Write the failing integration tests**

```jsx
// client/src/__tests__/App.test.jsx
import { render, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const bodies = [
  { name: 'Rocky b', type: 'exoplanet', size_class: 'rocky', distance_ly: 10, radius_earth: 1.1, mass_earth: 1.2, discovery_method: 'Transit', description: 'd', fun_fact: 'f' },
  { name: 'Giant b', type: 'exoplanet', size_class: 'gas_giant', distance_ly: 40, radius_earth: 12, mass_earth: 300, discovery_method: 'Radial Velocity', description: 'd', fun_fact: 'f' },
  { name: 'Sirius', type: 'star', size_class: null, distance_ly: 8.6, radius_earth: null, mass_earth: null, discovery_method: null, description: 'd', fun_fact: 'f' },
];

afterEach(() => vi.restoreAllMocks());

function mockFetchOk() {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ data: bodies, source: 'snapshot' }),
  });
}

describe('App', () => {
  it('renders the results list after loading', async () => {
    mockFetchOk();
    const { getByRole } = render(<App />);
    await waitFor(() =>
      expect(getByRole('button', { name: /rocky b/i })).toBeInTheDocument()
    );
  });

  it('opens the detail drawer when a body is selected', async () => {
    mockFetchOk();
    const { getByRole, findByRole } = render(<App />);
    const row = await findByRole('button', { name: /giant b/i });
    fireEvent.click(row);
    expect(getByRole('heading', { name: /giant b/i })).toBeInTheDocument();
  });

  it('shows an error state when the fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));
    const { getByText } = render(<App />);
    await waitFor(() => expect(getByText(/could not load/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `client/`): `npx vitest run src/__tests__/App.test.jsx`
Expected: FAIL (old App has no results list / drawer / error text)

- [ ] **Step 3: Rewrite `App.jsx`**

```jsx
// client/src/App.jsx
import { useMemo, useState } from 'react';
import FilterBar from './components/FilterBar';
import TypeDistributionChart from './components/TypeDistributionChart';
import PlanetScatter from './components/PlanetScatter';
import ResultsList from './components/ResultsList';
import PlanetDetailDrawer from './components/PlanetDetailDrawer';
import { useCelestialBodies } from './hooks/useCelestialBodies';
import { SIZE_CLASSES } from './lib/sizeClasses';
import './App.css';

const api =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/celestial-bodies';

const DEFAULT_FILTERS = { type: 'all', method: 'all', maxDistance: 1000 };

function App() {
  const { status, bodies, reload } = useCelestialBodies(api);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState(null);
  const [yMeasure, setYMeasure] = useState('radius_earth');

  const methods = useMemo(
    () =>
      [...new Set(bodies.map((b) => b.discovery_method).filter(Boolean))].sort(),
    [bodies]
  );

  const filteredBodies = useMemo(
    () =>
      bodies.filter((b) => {
        if (filters.type !== 'all' && b.type !== filters.type) return false;
        if (filters.method !== 'all' && b.discovery_method !== filters.method)
          return false;
        if (b.distance_ly != null && b.distance_ly > filters.maxDistance)
          return false;
        return true;
      }),
    [bodies, filters]
  );

  const filteredPlanets = useMemo(
    () => filteredBodies.filter((b) => b.type === 'exoplanet'),
    [filteredBodies]
  );

  return (
    <div className="app">
      <h1 className="app__title">Cosmic Explorer</h1>
      <p className="app__subtitle">
        Explore exoplanets by size family across our stellar neighborhood
      </p>

      {status === 'loading' && <p className="app__state">Loading NASA data…</p>}
      {status === 'error' && (
        <p className="app__state app__state--error">
          Could not load exoplanet data.{' '}
          <button type="button" onClick={reload}>
            Retry
          </button>
        </p>
      )}

      {status === 'ready' && (
        <>
          <FilterBar filters={filters} methods={methods} onChange={setFilters} />
          <ul className="app__legend" aria-label="Size family colors">
            {SIZE_CLASSES.filter((c) => c.key !== 'unknown').map((c) => (
              <li key={c.key}>
                <span
                  className="app__legend-swatch"
                  style={{ background: c.color }}
                />
                {c.label}
              </li>
            ))}
          </ul>
          <div className="app__layout">
            <div className="app__charts">
              <section>
                <h2 className="app__section-title">Size families</h2>
                <TypeDistributionChart planets={filteredPlanets} />
              </section>
              <section>
                <h2 className="app__section-title">Distance vs. size</h2>
                <PlanetScatter
                  planets={filteredPlanets}
                  yMeasure={yMeasure}
                  onYMeasureChange={setYMeasure}
                  onSelect={setSelected}
                />
              </section>
            </div>
            <div className="app__side">
              <ResultsList
                bodies={filteredBodies}
                selectedName={selected?.name ?? null}
                onSelect={setSelected}
              />
              {selected && (
                <PlanetDetailDrawer
                  body={selected}
                  onClose={() => setSelected(null)}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Replace `App.css` layout**

Replace `client/src/App.css` contents with (keep any font/reset rules already present above this block if they exist):

```css
.app {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
.app__title {
  margin: 0;
}
.app__subtitle {
  opacity: 0.75;
  margin-top: 0.25rem;
}
.app__state {
  margin-top: 2rem;
}
.app__state--error {
  color: #ff9b9b;
}
.app__layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  align-items: start;
}
.app__section-title {
  font-size: 1rem;
  margin: 0 0 0.5rem;
}
.app__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  font-size: 0.8rem;
}
.app__legend li {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.app__legend-swatch {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 3px;
  display: inline-block;
}
@media (max-width: 800px) {
  .app__layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run (from `client/`): `npx vitest run src/__tests__/App.test.jsx`
Expected: PASS

- [ ] **Step 6: Run the full frontend suite + lint + build**

Run (from `client/`): `npx vitest run && npm run lint && npm run build`
Expected: all tests PASS, lint clean, production build succeeds.

- [ ] **Step 7: Commit**

```bash
git add client/src/App.jsx client/src/App.css client/src/__tests__/App.test.jsx
git commit -m "feat(client): assemble size-families explorer with filters, charts, list, drawer"
```

---

## Task 13: Full-stack smoke test and README

**Files:**
- Modify: `readme.md`

**Interfaces:** none (verification + docs).

- [ ] **Step 1: Run both test suites**

Run: `python -m pytest server/tests/ -q` (from repo root) and `npx vitest run` (from `client/`)
Expected: both green.

- [ ] **Step 2: Manual smoke test**

Start the backend (`uvicorn server.main:app --reload` from repo root) and the frontend (`npm run dev` from `client/`). Load the app, confirm: the bar chart shows families, the scatter plots points with a not-shown count, changing the Y toggle re-renders, filters narrow all views, clicking a dot or list row opens the drawer with an image.

- [ ] **Step 3: Update the README**

In `readme.md`, under the existing feature description, add a short "Size-Families Explorer" paragraph describing the classification (radius with mass fallback), the charts, and the type-representative NASA imagery. Note the `SAMPLE_LIMIT` and how to refresh the snapshot.

- [ ] **Step 4: Commit**

```bash
git add readme.md
git commit -m "docs: describe the size-families explorer"
```

---

## Deferred to Linear (file during handoff)

- **B-roadmap epic:** habitability, neighborhood, and discovery-trend lenses.
- **Full-catalog scaling:** server-side filtering/pagination (the client-filter → server-filter seam).
- **Name search / typeahead.**
- **Live deployment** (the portfolio link).
- Existing: COS-1 (packaging), COS-2 (visx/WebGL swap).
