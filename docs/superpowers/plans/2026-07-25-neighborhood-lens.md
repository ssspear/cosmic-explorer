# Neighborhood Lens (3D Stellar Map) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third explorer lens — a rotatable/zoomable 3D star map placing each filtered planet at its host star's real position, colored by star temperature and sized by planet radius, with Earth at center.

**Architecture:** `App` stays the single source of truth; the lens is a pure derivation of `filteredPlanets`. All testable logic (coordinate math, color/size mapping, jitter, point-building) lives in a pure lib (`neighborhood.js`) with full unit tests. The WebGL scene (`NeighborhoodMap.jsx`, react-three-fiber) is presentational and verified via build + a mocked lens test + a live visual check. The lens is lazy-loaded so the 3D bundle downloads only when its tab opens.

**Tech Stack:** React 19 + Vite, Recharts (existing lenses), **three + @react-three/fiber + @react-three/drei** (new, this lens), Vitest + React Testing Library, FastAPI/Python 3.12 backend, pytest + ruff.

## Global Constraints

- **Frontend lint/format:** run `npm run lint` and `npm run format` (from `client/`) before every frontend commit; both must be clean.
- **Backend lint/format:** run `ruff format` then `ruff check` (from `server/`) before every backend commit; both must be clean. (Install ruff if missing: `pip install ruff`.)
- **CSS:** design tokens only (from `client/src/index.css`) — no raw hex in layout/spacing; star-color hexes are the one intentional exception and live in `neighborhood.js`, not CSS.
- **Star color derives from `st_teff` only** — never `st_spectype` (only ~37% populated).
- **Position radial unit is light-years** (`distance_ly`), matching the ring labels.
- **Lazy-load the Neighborhood lens** — three/R3F must not enter the main bundle.
- **Field names (from the normalizer):** `name`, `ra`, `dec`, `distance_ly`, `star_temp_k`, `radius_earth`, `size_class`. Use these verbatim.

---

### Task 1: Backend — expose `ra`, `dec`, `star_temp_k`, `planet_count`; regenerate snapshot

**Files:**
- Modify: `server/services/exoplanets.py` (`_COLUMNS` ~line 23; `normalize()` ~lines 95–127)
- Test: `server/tests/test_exoplanets_service.py` (`SAMPLE_ROW` ~lines 6–16; new assertions)
- Regenerate (commit): `server/data/exoplanets.json`

**Interfaces:**
- Produces: each normalized body gains `ra` (float|None, decimal degrees), `dec` (float|None, decimal degrees), `star_temp_k` (float|None, Kelvin), `planet_count` (int|None). The frontend lib in later tasks consumes `ra`, `dec`, `star_temp_k`.

- [ ] **Step 1: Extend `SAMPLE_ROW` and add a failing test**

In `server/tests/test_exoplanets_service.py`, add the new raw columns to `SAMPLE_ROW`:

```python
SAMPLE_ROW = {
    "pl_name": "Proxima Cen b",
    "hostname": "Proxima Cen",
    "disc_year": 2016,
    "discoverymethod": "Radial Velocity",
    "sy_dist": 1.30119,
    "pl_orbper": 11.18465,
    "pl_rade": None,
    "pl_bmasse": 1.055,
    "pl_eqt": 218.0,
    "ra": 217.393,
    "dec": -62.676,
    "st_teff": 2992.0,
    "sy_pnum": 1,
}
```

Add a new test:

```python
def test_normalize_exposes_map_fields():
    body = exoplanets.normalize(SAMPLE_ROW)
    assert body["ra"] == 217.393
    assert body["dec"] == -62.676
    assert body["star_temp_k"] == 2992.0
    assert body["planet_count"] == 1


def test_normalize_map_fields_default_to_none():
    body = exoplanets.normalize({"pl_name": "Mystery b"})
    assert body["ra"] is None
    assert body["dec"] is None
    assert body["star_temp_k"] is None
    assert body["planet_count"] is None
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd server && python -m pytest tests/test_exoplanets_service.py::test_normalize_exposes_map_fields tests/test_exoplanets_service.py::test_normalize_map_fields_default_to_none -v`
Expected: FAIL with `KeyError: 'ra'` (fields not in the returned dict yet).

- [ ] **Step 3: Add the columns to the query**

In `server/services/exoplanets.py`, extend `_COLUMNS`:

```python
_COLUMNS = "pl_name,hostname,disc_year,discoverymethod,sy_dist,pl_orbper,pl_rade,pl_bmasse,pl_eqt,ra,dec,st_teff,sy_pnum"
```

- [ ] **Step 4: Expose the fields in `normalize()`**

Inside `normalize()`, after the existing extractions, add:

```python
    ra = _round(row.get("ra"), 5)
    dec = _round(row.get("dec"), 5)
    star_temp_k = _round(row.get("st_teff"), 1)
    planet_count = row.get("sy_pnum")
```

Then add these keys to the returned dict (place them near `distance_ly`):

```python
        "ra": ra,
        "dec": dec,
        "star_temp_k": star_temp_k,
        "planet_count": planet_count,
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd server && python -m pytest tests/test_exoplanets_service.py -v`
Expected: PASS (all, including the two new tests).

- [ ] **Step 6: Regenerate the committed snapshot (needs network)**

Run from repo root:

```bash
python -m server.scripts.refresh_exoplanets
python -m server.scripts.export_static_data
```

Expected: `refresh_exoplanets` prints "Wrote 500 exoplanets to …/server/data/exoplanets.json"; `export_static_data` prints "Wrote … celestial bodies …". Confirm the new fields are present:

```bash
python -c "import json; b=json.load(open('server/data/exoplanets.json'))[0]; print('ra' in b, 'dec' in b, 'star_temp_k' in b, 'planet_count' in b)"
```

Expected: `True True True True`. (If offline, the refresh will fail — the code is still correct; note it and let the reviewer/visual-check step regenerate with network. `client/public/celestial-bodies.json` is gitignored and regenerated by the deploy workflow, so it is NOT committed.)

- [ ] **Step 7: Lint and commit**

```bash
cd server && ruff format . && ruff check . && cd ..
git add server/services/exoplanets.py server/tests/test_exoplanets_service.py server/data/exoplanets.json
git commit -m "feat(explorer): expose ra/dec/star_temp_k/planet_count for the neighborhood map (COS-9)"
```

---

### Task 2: Pure lib — star color + dot size helpers

**Files:**
- Create: `client/src/lib/neighborhood.js`
- Test: `client/src/lib/__tests__/neighborhood.test.js`

**Interfaces:**
- Produces:
  - `STAR_COLORS` — object of band hexes: `{ mDwarf, kDwarf, sun, fWhite, aHot, unknown }`.
  - `starColor(teffK: number|null) → string` (hex). `null`/undefined → `STAR_COLORS.unknown`.
  - `DOT_SIZE_MIN`, `DOT_SIZE_MAX` — numeric bounds. `radiusToDotSize(radiusEarth: number|null) → number` clamped to `[DOT_SIZE_MIN, DOT_SIZE_MAX]`; `null` → `DOT_SIZE_MIN`.

- [ ] **Step 1: Write failing tests**

Create `client/src/lib/__tests__/neighborhood.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  STAR_COLORS,
  starColor,
  radiusToDotSize,
  DOT_SIZE_MIN,
  DOT_SIZE_MAX,
} from '../neighborhood';

describe('starColor', () => {
  it('maps temperature bands to real star colors', () => {
    expect(starColor(3000)).toBe(STAR_COLORS.mDwarf); // cool red dwarf
    expect(starColor(4500)).toBe(STAR_COLORS.kDwarf);
    expect(starColor(5800)).toBe(STAR_COLORS.sun); // sun-like
    expect(starColor(6800)).toBe(STAR_COLORS.fWhite);
    expect(starColor(9000)).toBe(STAR_COLORS.aHot); // hot blue-white
  });

  it('falls back to a neutral grey when temperature is missing', () => {
    expect(starColor(null)).toBe(STAR_COLORS.unknown);
    expect(starColor(undefined)).toBe(STAR_COLORS.unknown);
  });
});

describe('radiusToDotSize', () => {
  it('grows with radius and clamps at both ends', () => {
    expect(radiusToDotSize(1)).toBeLessThan(radiusToDotSize(10));
    expect(radiusToDotSize(0.01)).toBe(DOT_SIZE_MIN);
    expect(radiusToDotSize(9999)).toBe(DOT_SIZE_MAX);
  });

  it('uses the minimum size when radius is missing', () => {
    expect(radiusToDotSize(null)).toBe(DOT_SIZE_MIN);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd client && npx vitest run src/lib/__tests__/neighborhood.test.js`
Expected: FAIL (module not found / exports undefined).

- [ ] **Step 3: Implement the helpers**

Create `client/src/lib/neighborhood.js` (leave room to append geometry functions in Task 3):

```js
// Illustrative star colors keyed to temperature bands (Kelvin). These are
// natural blackbody-ish hues, legible on the #0b0d17 space background; tune
// during the visual pass. Not a categorical palette — no CVD constraint.
export const STAR_COLORS = Object.freeze({
  mDwarf: '#ff9a5a', // < 3900 K  — cool red/orange dwarfs
  kDwarf: '#ffc06b', // 3900–5300 — orange
  sun: '#ffe9a8', //    5300–6000 — sun-like yellow-white
  fWhite: '#eef0ff', // 6000–7500 — white
  aHot: '#cdd8ff', //   >= 7500    — blue-white
  unknown: '#8b93a7', // no temperature
});

export function starColor(teffK) {
  if (teffK == null) return STAR_COLORS.unknown;
  if (teffK < 3900) return STAR_COLORS.mDwarf;
  if (teffK < 5300) return STAR_COLORS.kDwarf;
  if (teffK < 6000) return STAR_COLORS.sun;
  if (teffK < 7500) return STAR_COLORS.fWhite;
  return STAR_COLORS.aHot;
}

export const DOT_SIZE_MIN = 0.5;
export const DOT_SIZE_MAX = 2.5;

// Compress a wide radius range (Earth radii, ~0.3 to ~25) into a legible dot
// scale via a log curve, clamped so nothing vanishes or dominates.
export function radiusToDotSize(radiusEarth) {
  if (radiusEarth == null || radiusEarth <= 0) return DOT_SIZE_MIN;
  const scaled = DOT_SIZE_MIN + Math.log10(1 + radiusEarth) * 1.1;
  return Math.min(DOT_SIZE_MAX, Math.max(DOT_SIZE_MIN, scaled));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd client && npx vitest run src/lib/__tests__/neighborhood.test.js`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

```bash
cd client && npm run lint && npm run format && cd ..
git add client/src/lib/neighborhood.js client/src/lib/__tests__/neighborhood.test.js
git commit -m "feat(explorer): star-color + dot-size helpers for the neighborhood map (COS-9)"
```

---

### Task 3: Pure lib — coordinate math, jitter, point-building

**Files:**
- Modify: `client/src/lib/neighborhood.js` (append)
- Test: `client/src/lib/__tests__/neighborhood.test.js` (append)

**Interfaces:**
- Consumes: `starColor`, `radiusToDotSize` (Task 2).
- Produces:
  - `equatorialToXYZ(raDeg, decDeg, distanceLy) → { x, y, z }`.
  - `systemJitter(planetName: string) → { dx, dy, dz }` — deterministic, magnitude ≤ `JITTER_LY`.
  - `neighborhoodPoints(planets) → { points, omitted }` where `points` is `[{ planet, x, y, z, color, size }]` and `omitted` is the count of planets dropped for missing ra/dec/distance.

- [ ] **Step 1: Write failing tests (append)**

Append to `client/src/lib/__tests__/neighborhood.test.js`:

```js
import {
  equatorialToXYZ,
  systemJitter,
  neighborhoodPoints,
  JITTER_LY,
} from '../neighborhood';

describe('equatorialToXYZ', () => {
  it('places known coordinates on the right axes', () => {
    const a = equatorialToXYZ(0, 0, 10);
    expect(a.x).toBeCloseTo(10, 5);
    expect(a.y).toBeCloseTo(0, 5);
    expect(a.z).toBeCloseTo(0, 5);

    const b = equatorialToXYZ(90, 0, 10);
    expect(b.x).toBeCloseTo(0, 5);
    expect(b.y).toBeCloseTo(10, 5);

    const c = equatorialToXYZ(0, 90, 10);
    expect(c.z).toBeCloseTo(10, 5);
  });
});

describe('systemJitter', () => {
  it('is deterministic and small', () => {
    const j1 = systemJitter('TRAPPIST-1 b');
    const j2 = systemJitter('TRAPPIST-1 b');
    expect(j1).toEqual(j2);
    expect(Math.abs(j1.dx)).toBeLessThanOrEqual(JITTER_LY);
    expect(Math.abs(j1.dy)).toBeLessThanOrEqual(JITTER_LY);
    expect(Math.abs(j1.dz)).toBeLessThanOrEqual(JITTER_LY);
  });

  it('differs across planet names', () => {
    expect(systemJitter('TRAPPIST-1 b')).not.toEqual(systemJitter('TRAPPIST-1 c'));
  });
});

describe('neighborhoodPoints', () => {
  const base = { ra: 10, dec: 20, distance_ly: 12, star_temp_k: 5800, radius_earth: 1 };

  it('places valid planets and counts omitted ones', () => {
    const { points, omitted } = neighborhoodPoints([
      { ...base, name: 'A' },
      { ...base, name: 'B', ra: null }, // no coords -> omitted
      { ...base, name: 'C', distance_ly: null }, // no distance -> omitted
    ]);
    expect(points).toHaveLength(1);
    expect(points[0].planet.name).toBe('A');
    expect(omitted).toBe(2);
    expect(typeof points[0].color).toBe('string');
    expect(points[0].size).toBeGreaterThan(0);
  });

  it('separates same-system planets via jitter', () => {
    const { points } = neighborhoodPoints([
      { ...base, name: 'Kepler-x b' },
      { ...base, name: 'Kepler-x c' },
    ]);
    expect(points[0].x).not.toBe(points[1].x);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd client && npx vitest run src/lib/__tests__/neighborhood.test.js`
Expected: FAIL (new exports undefined).

- [ ] **Step 3: Implement (append to `neighborhood.js`)**

```js
const DEG2RAD = Math.PI / 180;

// Standard equatorial (RA/Dec) + distance -> Cartesian. Distance in light-years,
// so the whole scene is in light-years to match the ring labels.
export function equatorialToXYZ(raDeg, decDeg, distanceLy) {
  const ra = raDeg * DEG2RAD;
  const dec = decDeg * DEG2RAD;
  const cosDec = Math.cos(dec);
  return {
    x: distanceLy * cosDec * Math.cos(ra),
    y: distanceLy * cosDec * Math.sin(ra),
    z: distanceLy * Math.sin(dec),
  };
}

// Max illustrative spread (light-years) applied to same-position planets so a
// multi-planet system fans into a visible cluster instead of stacking.
export const JITTER_LY = 0.15;

// Deterministic per-name offset: a small string hash seeds three pseudo-random
// components in [-JITTER_LY, JITTER_LY]. Stable across renders/filters.
export function systemJitter(planetName) {
  let h = 0;
  for (let i = 0; i < planetName.length; i += 1) {
    h = (h * 31 + planetName.charCodeAt(i)) & 0xffffffff;
  }
  const comp = (salt) => {
    const v = Math.sin(h * 0.0001 + salt) * 10000;
    return (v - Math.floor(v) - 0.5) * 2 * JITTER_LY;
  };
  return { dx: comp(1), dy: comp(2), dz: comp(3) };
}

export function neighborhoodPoints(planets) {
  const points = [];
  let omitted = 0;
  for (const planet of planets) {
    if (planet.ra == null || planet.dec == null || planet.distance_ly == null) {
      omitted += 1;
      continue;
    }
    const base = equatorialToXYZ(planet.ra, planet.dec, planet.distance_ly);
    const j = systemJitter(planet.name);
    points.push({
      planet,
      x: base.x + j.dx,
      y: base.y + j.dy,
      z: base.z + j.dz,
      color: starColor(planet.star_temp_k),
      size: radiusToDotSize(planet.radius_earth),
    });
  }
  return { points, omitted };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd client && npx vitest run src/lib/__tests__/neighborhood.test.js`
Expected: PASS (all).

- [ ] **Step 5: Lint and commit**

```bash
cd client && npm run lint && npm run format && cd ..
git add client/src/lib/neighborhood.js client/src/lib/__tests__/neighborhood.test.js
git commit -m "feat(explorer): coordinate math + point-building for the neighborhood map (COS-9)"
```

---

### Task 4: WebGL scene — add deps + `NeighborhoodMap`

**Files:**
- Modify: `client/package.json` (dependencies)
- Create: `client/src/components/NeighborhoodMap.jsx`

**Interfaces:**
- Consumes: `points` (from `neighborhoodPoints`, Task 3).
- Produces: `NeighborhoodMap` default export. Props: `points` (array of `{planet,x,y,z,color,size}`), `onSelect(planet)`, `selectedName` (string|null), `showRings` (bool).

> **Note:** react-three-fiber renders to a real WebGL context, which jsdom lacks — so this component is NOT unit-tested directly. It is verified by `npm run build` succeeding (compiles + lazy-splits) and by the live visual check in Task 7. Task 5's lens test mocks it.

- [ ] **Step 1: Install the 3D dependencies**

```bash
cd client && npm install three @react-three/fiber @react-three/drei && cd ..
```

Expected: three, @react-three/fiber, @react-three/drei added to `client/package.json` dependencies.

- [ ] **Step 2: Implement `NeighborhoodMap.jsx`**

Create `client/src/components/NeighborhoodMap.jsx`:

```jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const RINGS_LY = [25, 50, 100];

function StarDots({ points, onSelect }) {
  const ref = useRef();
  const [hovered, setHovered] = useState(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    points.forEach((p, i) => {
      dummy.position.set(p.x, p.z, p.y); // map astro-z (north) to three's up (y)
      dummy.scale.setScalar(p.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(p.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [points, dummy]);

  return (
    <>
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, points.length]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(e.instanceId ?? null);
        }}
        onPointerOut={() => setHovered(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.instanceId != null) onSelect(points[e.instanceId].planet);
        }}
      >
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial vertexColors />
      </instancedMesh>
      {hovered != null && points[hovered] && (
        <Html position={[points[hovered].x, points[hovered].z, points[hovered].y]} center>
          <div className="neighborhood-map__tip">
            {points[hovered].planet.name} ·{' '}
            {points[hovered].planet.distance_ly} ly · {points[hovered].planet.size_class}
          </div>
        </Html>
      )}
    </>
  );
}

function DistanceRings() {
  return RINGS_LY.map((r) => (
    <mesh key={r} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r - 0.4, r, 96]} />
      <meshBasicMaterial color="#2c3350" side={THREE.DoubleSide} transparent opacity={0.7} />
    </mesh>
  ));
}

function NeighborhoodMap({ points, onSelect, selectedName, showRings }) {
  const selected = points.find((p) => p.planet.name === selectedName);
  return (
    <Canvas camera={{ position: [0, 60, 120], fov: 55 }} className="neighborhood-map__canvas">
      <color attach="background" args={['#0b0d17']} />
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 80, 40]} intensity={1.2} />
      {showRings && <DistanceRings />}
      {/* Sun / Earth anchor at the origin */}
      <mesh>
        <sphereGeometry args={[1.4, 16, 16]} />
        <meshStandardMaterial color="#79f0c8" emissive="#2fae86" emissiveIntensity={0.6} />
      </mesh>
      <StarDots points={points} onSelect={onSelect} />
      {selected && (
        <mesh position={[selected.x, selected.z, selected.y]}>
          <sphereGeometry args={[selected.size * 1.8, 16, 16]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
      )}
      <OrbitControls enablePan={false} minDistance={10} maxDistance={400} />
    </Canvas>
  );
}

export default NeighborhoodMap;
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd client && npm run build`
Expected: build succeeds; output shows a separate chunk for the map deps (three/R3F) — confirming code-splitting once Task 6 lazy-loads it. (Before Task 6 wires it in, the chunk may not split yet; a clean build is the pass condition here.)

- [ ] **Step 4: Commit**

```bash
cd client && npm run lint && npm run format && cd ..
git add client/package.json client/package-lock.json client/src/components/NeighborhoodMap.jsx
git commit -m "feat(explorer): 3D star-map scene (react-three-fiber) for the neighborhood lens (COS-9)"
```

---

### Task 5: `NeighborhoodLens` — legend, controls, empty/omitted states

**Files:**
- Create: `client/src/components/NeighborhoodLens.jsx`
- Create: `client/src/components/NeighborhoodLens.css`
- Test: `client/src/components/__tests__/NeighborhoodLens.test.jsx`

**Interfaces:**
- Consumes: `neighborhoodPoints` (Task 3), `NeighborhoodMap` (Task 4), `STAR_COLORS` (Task 2).
- Produces: `NeighborhoodLens` default export. Props: `planets`, `onSelect(planet)`, `selectedName` (string|null).

- [ ] **Step 1: Write failing tests (mock the WebGL scene)**

Create `client/src/components/__tests__/NeighborhoodLens.test.jsx`:

```jsx
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NeighborhoodLens from '../NeighborhoodLens';

// The R3F scene needs WebGL (absent in jsdom); mock it to a marker.
vi.mock('../NeighborhoodMap', () => ({
  default: (props) => <div data-testid="map" data-rings={String(props.showRings)} />,
}));

const planet = (over = {}) => ({
  name: 'A',
  ra: 10,
  dec: 20,
  distance_ly: 12,
  star_temp_k: 5800,
  radius_earth: 1,
  size_class: 'rocky',
  ...over,
});

describe('NeighborhoodLens', () => {
  it('shows the empty message when nothing is placeable', () => {
    const { getByText, queryByTestId } = render(
      <NeighborhoodLens planets={[]} onSelect={vi.fn()} selectedName={null} />
    );
    expect(getByText('No planets match your filters.')).toBeInTheDocument();
    expect(queryByTestId('map')).not.toBeInTheDocument();
  });

  it('renders the map, legend, and an omitted-count note', () => {
    const { getByTestId, getByText } = render(
      <NeighborhoodLens
        planets={[planet(), planet({ name: 'B', ra: null })]}
        onSelect={vi.fn()}
        selectedName={null}
      />
    );
    expect(getByTestId('map')).toBeInTheDocument();
    expect(getByText('Neighborhood')).toBeInTheDocument();
    expect(getByText(/1 not shown/)).toBeInTheDocument(); // B has no coords
  });

  it('toggles the distance rings', () => {
    const { getByRole, getByTestId } = render(
      <NeighborhoodLens planets={[planet()]} onSelect={vi.fn()} selectedName={null} />
    );
    expect(getByTestId('map').dataset.rings).toBe('true');
    fireEvent.click(getByRole('button', { name: /rings/i }));
    expect(getByTestId('map').dataset.rings).toBe('false');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd client && npx vitest run src/components/__tests__/NeighborhoodLens.test.jsx`
Expected: FAIL (component missing).

- [ ] **Step 3: Implement the lens**

Create `client/src/components/NeighborhoodLens.jsx`:

```jsx
import { useMemo, useState } from 'react';
import NeighborhoodMap from './NeighborhoodMap';
import { STAR_COLORS, neighborhoodPoints } from '../lib/neighborhood';
import './NeighborhoodLens.css';

const LEGEND = [
  { label: 'Cool (M)', color: STAR_COLORS.mDwarf },
  { label: 'Orange (K)', color: STAR_COLORS.kDwarf },
  { label: 'Sun-like (G)', color: STAR_COLORS.sun },
  { label: 'White (F)', color: STAR_COLORS.fWhite },
  { label: 'Hot (A+)', color: STAR_COLORS.aHot },
];

function NeighborhoodLens({ planets, onSelect, selectedName }) {
  const [showRings, setShowRings] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const { points, omitted } = useMemo(() => neighborhoodPoints(planets), [planets]);

  if (points.length === 0) {
    return <p className="chart-empty">No planets match your filters.</p>;
  }

  return (
    <section className="neighborhood">
      <div className="neighborhood__head">
        <h2 className="app__section-title">Neighborhood</h2>
        <div className="neighborhood__controls">
          <button
            type="button"
            className="neighborhood__btn"
            aria-pressed={showRings}
            onClick={() => setShowRings((v) => !v)}
          >
            Distance rings
          </button>
          <button
            type="button"
            className="neighborhood__btn"
            aria-pressed={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      <ul className="app__legend" aria-label="Star colors by temperature">
        {LEGEND.map((s) => (
          <li key={s.label} className="app__legend-item">
            <span className="app__legend-swatch" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
        <li className="app__legend-item neighborhood__legend-note">Dot size = planet radius</li>
      </ul>

      <div className={`neighborhood__canvas-wrap${expanded ? ' neighborhood__canvas-wrap--expanded' : ''}`}>
        <NeighborhoodMap
          points={points}
          onSelect={onSelect}
          selectedName={selectedName}
          showRings={showRings}
        />
      </div>

      {omitted > 0 && (
        <p className="neighborhood__omitted">
          {omitted} not shown (no coordinates)
        </p>
      )}
    </section>
  );
}

export default NeighborhoodLens;
```

Create `client/src/components/NeighborhoodLens.css` (tokens only; taller canvas + expanded state + tooltip):

```css
.neighborhood__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.neighborhood__controls {
  display: flex;
  gap: 0.5rem;
}

.neighborhood__btn {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}

.neighborhood__btn[aria-pressed='true'] {
  color: var(--text);
  border-color: var(--accent);
}

.neighborhood__legend-note {
  color: var(--faint);
  font-family: var(--mono);
}

.neighborhood__canvas-wrap {
  height: 460px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg);
}

.neighborhood__canvas-wrap--expanded {
  height: 640px;
}

.neighborhood-map__canvas {
  width: 100%;
  height: 100%;
}

.neighborhood-map__tip {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--text);
  background: rgba(11, 13, 23, 0.9);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 0.2rem 0.45rem;
  white-space: nowrap;
  pointer-events: none;
}

.neighborhood__omitted {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--faint);
  margin-top: 0.5rem;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd client && npx vitest run src/components/__tests__/NeighborhoodLens.test.jsx`
Expected: PASS (all three).

- [ ] **Step 5: Lint and commit**

```bash
cd client && npm run lint && npm run format && cd ..
git add client/src/components/NeighborhoodLens.jsx client/src/components/NeighborhoodLens.css client/src/components/__tests__/NeighborhoodLens.test.jsx
git commit -m "feat(explorer): neighborhood lens shell — legend, ring toggle, expand, empty/omitted states (COS-9)"
```

---

### Task 6: Wire the lens into `App` (lazy-loaded, third tab)

**Files:**
- Modify: `client/src/App.jsx`
- Test: `client/src/__tests__/App.test.jsx`

**Interfaces:**
- Consumes: `NeighborhoodLens` (Task 5), the existing `filteredPlanets`, `setSelected`, `selectedBody`.

- [ ] **Step 1: Add a failing App integration test**

In `client/src/__tests__/App.test.jsx`, mock the lens (keep WebGL out of the App test) and add a test that switching to the Neighborhood tab renders it. Add near the top of the file:

```jsx
vi.mock('../components/NeighborhoodLens', () => ({
  default: ({ planets }) => (
    <div data-testid="neighborhood-lens">neighborhood:{planets.length}</div>
  ),
}));
```

Add the test (inside the existing top-level `describe`), following how the file already renders `App` and waits for data — mirror the existing ready-state setup (e.g. the `renderReady()`/`waitFor` helper this file already uses):

```jsx
it('switches to the lazy-loaded Neighborhood lens', async () => {
  const { getByRole, findByTestId } = renderReady();
  fireEvent.click(getByRole('tab', { name: 'Neighborhood' }));
  expect(await findByTestId('neighborhood-lens')).toBeInTheDocument();
});
```

(If this file does not already have a `renderReady` helper, use the same render-and-await-ready pattern the other tests in the file use; `findByTestId` is async to allow the `Suspense` lazy boundary to resolve.)

- [ ] **Step 2: Run to verify failure**

Run: `cd client && npx vitest run src/__tests__/App.test.jsx`
Expected: FAIL — no tab named "Neighborhood" yet.

- [ ] **Step 3: Wire it into `App.jsx`**

Add the lazy import and Suspense to the imports at the top:

```jsx
import { lazy, Suspense, useMemo, useState } from 'react';
```

Replace the static `SizeFamiliesLens`/`DiscoveryTrendLens` import lines' neighbor with a lazy import (keep the other two static):

```jsx
const NeighborhoodLens = lazy(() => import('./components/NeighborhoodLens'));
```

Add the third lens to `LENSES`:

```jsx
const LENSES = [
  { key: 'size', label: 'Size families' },
  { key: 'trend', label: 'Discovery trend' },
  { key: 'neighborhood', label: 'Neighborhood' },
];
```

Replace the two-way ternary inside `.app__charts` with an explicit three-way render:

```jsx
              {activeLens === 'size' && (
                <SizeFamiliesLens
                  planets={filteredPlanets}
                  yMeasure={yMeasure}
                  onYMeasureChange={setYMeasure}
                  onSelect={setSelected}
                />
              )}
              {activeLens === 'trend' && <DiscoveryTrendLens planets={filteredPlanets} />}
              {activeLens === 'neighborhood' && (
                <Suspense fallback={<p className="app__state">Loading 3D map…</p>}>
                  <NeighborhoodLens
                    planets={filteredPlanets}
                    onSelect={setSelected}
                    selectedName={selectedBody?.name ?? null}
                  />
                </Suspense>
              )}
```

Update the subtitle to mention the neighborhood view:

```jsx
      <p className="app__subtitle">
        Explore exoplanets across our stellar neighborhood — by size family, by
        discovery over time, and mapped in 3D
      </p>
```

- [ ] **Step 4: Run to verify pass**

Run: `cd client && npx vitest run src/__tests__/App.test.jsx`
Expected: PASS.

- [ ] **Step 5: Full suite + build + commit**

```bash
cd client && npx vitest run && npm run lint && npm run format && npm run build && cd ..
git add client/src/App.jsx client/src/__tests__/App.test.jsx
git commit -m "feat(explorer): add lazy-loaded Neighborhood lens as the third tab (COS-9)"
```

Expected: full suite green; build shows three/R3F split into its own async chunk (lazy-load confirmed).

---

### Task 7: Verification & live visual check

**Files:** none (verification only)

- [ ] **Step 1: Full backend + frontend suites**

```bash
cd server && ruff format --check . && ruff check . && python -m pytest && cd ..
cd client && npx vitest run && npm run lint && npm run build && cd ..
```

Expected: all green; no lint/format diffs.

- [ ] **Step 2: Regenerate snapshot data with network (if Task 1 ran offline)**

```bash
python -m server.scripts.refresh_exoplanets && python -m server.scripts.export_static_data
```

Confirm `server/data/exoplanets.json` carries `ra`/`dec`/`star_temp_k`/`planet_count`; commit it if it changed.

- [ ] **Step 3: Run the app and visually verify**

Start the app (per the repo's run instructions — backend `uvicorn` + `cd client && npm run dev`, or the static preview `npm run build && npm run preview` against the exported JSON). Confirm:
  - The **Neighborhood** tab appears third and switches to a 3D star map (Earth glowing at center).
  - Dots sit at plausible positions, **colored by star temperature** (orange dwarfs → blue-white hot) and **sized by radius**.
  - **Drag rotates**, **scroll zooms**; **distance rings** show and the **rings toggle** hides them; **expand** widens the canvas.
  - **Hover** shows name · distance · size class; **clicking a dot opens the detail drawer** and syncs with the results list; selecting from the list highlights the dot.
  - Changing a **filter cross-applies** (dot count changes); an all-excluding filter shows the empty message.
  - A **multi-planet system (e.g. TRAPPIST-1)** renders as a small cluster.
  - The other two lenses still load fast (three/R3F only fetched when the Neighborhood tab is first opened — check the network tab for a lazy chunk).

- [ ] **Step 4: Final review + branch finish**

Run the review topology (lens `code-review`; specialized agent if warranted; Codex adversarial on the substantive diff), address findings, then use `superpowers:finishing-a-development-branch` to open the PR for COS-9.

---

## Self-Review

- **Spec coverage:** Visual direction B + rings toggle → Task 5/6 (`showRings`) + Task 4 (`DistanceRings`). Layout 1 + taller canvas + expand → Task 5 CSS + control. Encoding (position/color/size/jitter) → Tasks 2–3. dot=planet + selection → Task 4/6 (`onSelect`, `selectedName`). Cross-filter → Task 6 (`filteredPlanets`). Empty + "not shown" → Task 5. Backend fields + snapshot → Task 1. Lazy-load + deps → Task 4/6. Testing (pure lib, mocked lens, App integration) → Tasks 2,3,5,6. Verification → Task 7. All spec sections mapped.
- **Placeholder scan:** no TBD/TODO; every code step has real content. The one deliberate looseness — the App test's `renderReady`/ready-state helper — defers to the file's existing pattern rather than inventing a name, because the exact helper is file-specific; the implementer mirrors what's already there.
- **Type consistency:** field names (`ra`, `dec`, `star_temp_k`, `distance_ly`, `radius_earth`, `size_class`, `name`) match between Task 1 (producer) and Tasks 3/5 (consumers). `neighborhoodPoints → { points, omitted }`, point shape `{ planet, x, y, z, color, size }`, and `showRings`/`selectedName`/`onSelect` prop names are consistent across Tasks 3–6.
