# Multi-Lens Foundation + Discovery-Trend Lens — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a lens-switcher over the explorer's main chart area, with the existing charts as a "Size families" lens and a new "Discovery trend" stacked-bar lens.

**Architecture:** `App` stays the single source of truth and gains an `activeLens` tab. Each lens is a self-contained component (renders its own legend + chart[s]) consuming the shared `filteredPlanets`. Filters, results list, and drawer stay shared and cross-filter every lens.

**Tech Stack:** React 19, Recharts, Vitest + React Testing Library.

## Global Constraints

- Two lenses this increment: `size` ("Size families") and `trend` ("Discovery trend"); default is `size`.
- Discovery-trend stacks by method bucket: `radial_velocity`, `transit`, `imaging`, `other` (Astrometry, Transit Timing Variations, Eclipse Timing Variations → `other`).
- Method palette lives in `client/src/lib/discoveryMethods.js`, distinct from the size-family colors; finalized via the `dataviz` skill.
- Recharts is imported only inside chart components (existing rule); charts assert on empty/non-empty branch in tests (jsdom sizes SVG to 0).
- Mono "instrument" type continues via existing CSS (`.recharts-*`, `.app__section-title`, `.app__legend`).
- Frontend commands run from `client/`. TDD; lint (eslint + prettier) must stay clean; run `npm run format` before committing if prettier flags files.

---

## File Structure

- `client/src/lib/discoveryMethods.js` (NEW) — `METHODS`, `methodBucket()`, `discoveriesByYear()`.
- `client/src/components/DiscoveryTrendChart.jsx` (NEW) — Recharts stacked bar.
- `client/src/components/DiscoveryTrendLens.jsx` (NEW) — method legend + chart.
- `client/src/components/SizeFamiliesLens.jsx` (NEW) — size legend + existing bar + scatter (extracted from App).
- `client/src/components/LensTabs.jsx` + `LensTabs.css` (NEW) — accessible segmented tab control.
- `client/src/App.jsx` (MODIFY) — `activeLens` state, `LensTabs`, render active lens, remove inline legend/charts.
- Matching `__tests__/*` for each new module + updated `App.test.jsx`.

---

## Task 1: Discovery-method model (`discoveryMethods.js`)

**Files:** Create `client/src/lib/discoveryMethods.js`, `client/src/lib/__tests__/discoveryMethods.test.js`

**Interfaces:**
- Produces: `METHODS` (ordered frozen `[{key,label,color}]`), `methodBucket(rawMethod) -> key`, `discoveriesByYear(planets) -> [{year, radial_velocity, transit, imaging, other}]` (sorted by year ascending).

- [ ] **Step 1: Write the failing tests**

```javascript
// client/src/lib/__tests__/discoveryMethods.test.js
import { describe, expect, it } from 'vitest';
import { METHODS, methodBucket, discoveriesByYear } from '../discoveryMethods';

describe('methodBucket', () => {
  it('maps the three named methods to their own buckets', () => {
    expect(methodBucket('Radial Velocity')).toBe('radial_velocity');
    expect(methodBucket('Transit')).toBe('transit');
    expect(methodBucket('Imaging')).toBe('imaging');
  });
  it('buckets rare/unknown methods into other', () => {
    expect(methodBucket('Astrometry')).toBe('other');
    expect(methodBucket('Transit Timing Variations')).toBe('other');
    expect(methodBucket('Eclipse Timing Variations')).toBe('other');
    expect(methodBucket(null)).toBe('other');
  });
});

describe('discoveriesByYear', () => {
  it('counts per year per bucket, sorted ascending, skipping null years', () => {
    const planets = [
      { discovery_year: 2016, discovery_method: 'Radial Velocity' },
      { discovery_year: 2016, discovery_method: 'Transit' },
      { discovery_year: 2014, discovery_method: 'Imaging' },
      { discovery_year: 2016, discovery_method: 'Astrometry' },
      { discovery_year: null, discovery_method: 'Transit' },
    ];
    expect(discoveriesByYear(planets)).toEqual([
      { year: 2014, radial_velocity: 0, transit: 0, imaging: 1, other: 0 },
      { year: 2016, radial_velocity: 1, transit: 1, imaging: 0, other: 1 },
    ]);
  });
  it('returns [] for no planets', () => {
    expect(discoveriesByYear([])).toEqual([]);
  });
});

describe('METHODS', () => {
  it('is the four buckets in order', () => {
    expect(METHODS.map((m) => m.key)).toEqual([
      'radial_velocity',
      'transit',
      'imaging',
      'other',
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `client/`): `npx vitest run src/lib/__tests__/discoveryMethods.test.js`
Expected: FAIL (cannot resolve `../discoveryMethods`)

- [ ] **Step 3: Write minimal implementation**

```javascript
// client/src/lib/discoveryMethods.js
// Placeholder categorical palette — distinct hues from the size-family colors
// (blue/teal/amber/green) so the two systems never collide. Finalize with the
// dataviz skill in Step 5.
export const METHODS = Object.freeze(
  [
    { key: 'radial_velocity', label: 'Radial velocity', color: '#8b6fe0' },
    { key: 'transit', label: 'Transit', color: '#2bb6d9' },
    { key: 'imaging', label: 'Imaging', color: '#d96ba8' },
    { key: 'other', label: 'Other', color: '#6b7186' },
  ].map((m) => Object.freeze(m))
);

export function methodBucket(method) {
  if (method === 'Radial Velocity') return 'radial_velocity';
  if (method === 'Transit') return 'transit';
  if (method === 'Imaging') return 'imaging';
  return 'other';
}

export function discoveriesByYear(planets) {
  const byYear = new Map();
  for (const p of planets) {
    const year = p.discovery_year;
    if (year == null) continue;
    if (!byYear.has(year)) {
      byYear.set(year, {
        year,
        radial_velocity: 0,
        transit: 0,
        imaging: 0,
        other: 0,
      });
    }
    byYear.get(year)[methodBucket(p.discovery_method)] += 1;
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run (from `client/`): `npx vitest run src/lib/__tests__/discoveryMethods.test.js`
Expected: PASS

- [ ] **Step 5: Finalize the method palette with the dataviz skill**

Invoke the `dataviz` skill. Use its color method + validator to replace the four placeholder `color` values with a validated categorical palette that (a) stays distinguishable in the app's dark theme and for common CVD, and (b) does NOT collide with the size-family hues (`#3987E5` blue, `#199E70` teal, `#C68200` amber, `#008300` green, `#898781` grey). Keep the four keys/order; `other` stays a neutral grey. Re-run the Step 4 tests (color-agnostic) to confirm still green.

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/discoveryMethods.js client/src/lib/__tests__/discoveryMethods.test.js
git commit -m "feat(explorer): discovery-method model (buckets + per-year aggregation)"
```

---

## Task 2: Discovery-trend chart (`DiscoveryTrendChart.jsx`)

**Files:** Create `client/src/components/DiscoveryTrendChart.jsx`, `client/src/components/__tests__/DiscoveryTrendChart.test.jsx`

**Interfaces:**
- Consumes: `METHODS`, `discoveriesByYear` (Task 1); `recharts`.
- Produces: `<DiscoveryTrendChart planets={Body[]} />` — stacked bar, X=year, one stacked `<Bar>` per method bucket; empty-state message when no data.

- [ ] **Step 1: Write the failing test**

```jsx
// client/src/components/__tests__/DiscoveryTrendChart.test.jsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DiscoveryTrendChart from '../DiscoveryTrendChart';

const planets = [
  { discovery_year: 2016, discovery_method: 'Transit' },
  { discovery_year: 2016, discovery_method: 'Radial Velocity' },
  { discovery_year: 2018, discovery_method: 'Imaging' },
];

describe('DiscoveryTrendChart', () => {
  // Recharts renders SVG jsdom sizes to 0px, so assert the empty/non-empty branch.
  it('does not show the empty message when there is data', () => {
    const { queryByText } = render(<DiscoveryTrendChart planets={planets} />);
    expect(queryByText(/no planets/i)).toBeNull();
  });
  it('shows the empty message for no data', () => {
    const { getByText } = render(<DiscoveryTrendChart planets={[]} />);
    expect(getByText(/no planets/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/__tests__/DiscoveryTrendChart.test.jsx`
Expected: FAIL (cannot resolve `../DiscoveryTrendChart`)

- [ ] **Step 3: Write minimal implementation**

```jsx
// client/src/components/DiscoveryTrendChart.jsx
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { METHODS, discoveriesByYear } from '../lib/discoveryMethods';

function DiscoveryTrendChart({ planets }) {
  const data = discoveriesByYear(planets);

  if (data.length === 0) {
    return <p className="chart-empty">No planets match your filters.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data}>
        <XAxis dataKey="year" tick={{ fontSize: 11 }} minTickGap={12} />
        <YAxis allowDecimals={false} />
        <Tooltip cursor={{ fillOpacity: 0.1 }} />
        {METHODS.map((m) => (
          <Bar
            key={m.key}
            dataKey={m.key}
            stackId="discoveries"
            name={m.label}
            fill={m.color}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default DiscoveryTrendChart;
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `client/`): `npx vitest run src/components/__tests__/DiscoveryTrendChart.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/DiscoveryTrendChart.jsx client/src/components/__tests__/DiscoveryTrendChart.test.jsx
git commit -m "feat(explorer): discovery-trend stacked-bar chart"
```

---

## Task 3: Discovery-trend lens (`DiscoveryTrendLens.jsx`)

**Files:** Create `client/src/components/DiscoveryTrendLens.jsx`, `client/src/components/__tests__/DiscoveryTrendLens.test.jsx`

**Interfaces:**
- Consumes: `DiscoveryTrendChart` (Task 2), `METHODS` (Task 1).
- Produces: `<DiscoveryTrendLens planets={Body[]} />` — a section with the "Discovery trend" title, a method legend, and the chart.

- [ ] **Step 1: Write the failing test**

```jsx
// client/src/components/__tests__/DiscoveryTrendLens.test.jsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DiscoveryTrendLens from '../DiscoveryTrendLens';

describe('DiscoveryTrendLens', () => {
  it('renders the title and a method legend', () => {
    const { getByText } = render(<DiscoveryTrendLens planets={[]} />);
    expect(getByText('Discovery trend')).toBeInTheDocument();
    expect(getByText('Radial velocity')).toBeInTheDocument();
    expect(getByText('Transit')).toBeInTheDocument();
    expect(getByText('Imaging')).toBeInTheDocument();
    expect(getByText('Other')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/__tests__/DiscoveryTrendLens.test.jsx`
Expected: FAIL (cannot resolve `../DiscoveryTrendLens`)

- [ ] **Step 3: Write minimal implementation**

```jsx
// client/src/components/DiscoveryTrendLens.jsx
import DiscoveryTrendChart from './DiscoveryTrendChart';
import { METHODS } from '../lib/discoveryMethods';

function DiscoveryTrendLens({ planets }) {
  return (
    <>
      <ul className="app__legend" aria-label="Discovery method colors">
        {METHODS.map((m) => (
          <li key={m.key}>
            <span
              className="app__legend-swatch"
              style={{ background: m.color }}
            />
            {m.label}
          </li>
        ))}
      </ul>
      <section>
        <h2 className="app__section-title">Discovery trend</h2>
        <DiscoveryTrendChart planets={planets} />
      </section>
    </>
  );
}

export default DiscoveryTrendLens;
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `client/`): `npx vitest run src/components/__tests__/DiscoveryTrendLens.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/DiscoveryTrendLens.jsx client/src/components/__tests__/DiscoveryTrendLens.test.jsx
git commit -m "feat(explorer): discovery-trend lens (legend + chart)"
```

---

## Task 4: Lens tabs (`LensTabs.jsx`)

**Files:** Create `client/src/components/LensTabs.jsx`, `client/src/components/LensTabs.css`, `client/src/components/__tests__/LensTabs.test.jsx`

**Interfaces:**
- Produces: `<LensTabs lenses={[{key,label}]} active={string} onChange={(key)=>void} />` — an accessible `role="tablist"` segmented control (arrow-key navigation, `aria-selected`).

- [ ] **Step 1: Write the failing test**

```jsx
// client/src/components/__tests__/LensTabs.test.jsx
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LensTabs from '../LensTabs';

const lenses = [
  { key: 'size', label: 'Size families' },
  { key: 'trend', label: 'Discovery trend' },
];

describe('LensTabs', () => {
  it('marks the active tab and fires onChange on click', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <LensTabs lenses={lenses} active="size" onChange={onChange} />
    );
    const trend = getByRole('tab', { name: 'Discovery trend' });
    expect(getByRole('tab', { name: 'Size families' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(trend).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(trend);
    expect(onChange).toHaveBeenCalledWith('trend');
  });

  it('moves selection with the right arrow key', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <LensTabs lenses={lenses} active="size" onChange={onChange} />
    );
    fireEvent.keyDown(getByRole('tab', { name: 'Size families' }), {
      key: 'ArrowRight',
    });
    expect(onChange).toHaveBeenCalledWith('trend');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/__tests__/LensTabs.test.jsx`
Expected: FAIL (cannot resolve `../LensTabs`)

- [ ] **Step 3: Write minimal implementation**

```jsx
// client/src/components/LensTabs.jsx
import './LensTabs.css';

function LensTabs({ lenses, active, onChange }) {
  const move = (delta) => {
    const i = lenses.findIndex((l) => l.key === active);
    const next = lenses[(i + delta + lenses.length) % lenses.length];
    onChange(next.key);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    }
  };

  return (
    <div className="lens-tabs" role="tablist" aria-label="Explorer views">
      {lenses.map((l) => {
        const selected = l.key === active;
        return (
          <button
            key={l.key}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`lens-tab ${selected ? 'is-active' : ''}`}
            onClick={() => onChange(l.key)}
            onKeyDown={onKeyDown}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

export default LensTabs;
```

```css
/* client/src/components/LensTabs.css */
.lens-tabs {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem;
  margin: 1.25rem 0 0;
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 999px;
}
.lens-tab {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}
.lens-tab:hover {
  color: var(--text);
}
.lens-tab.is-active {
  background: var(--accent-soft);
  color: var(--accent);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `client/`): `npx vitest run src/components/__tests__/LensTabs.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/LensTabs.jsx client/src/components/LensTabs.css client/src/components/__tests__/LensTabs.test.jsx
git commit -m "feat(explorer): accessible lens tab switcher"
```

---

## Task 5: Extract SizeFamiliesLens + wire App with tabs

**Files:** Create `client/src/components/SizeFamiliesLens.jsx`, `client/src/components/__tests__/SizeFamiliesLens.test.jsx`; Modify `client/src/App.jsx`, `client/src/__tests__/App.test.jsx`

**Interfaces:**
- Consumes: `LensTabs` (Task 4), `DiscoveryTrendLens` (Task 3), `TypeDistributionChart`/`PlanetScatter`/`SIZE_CLASSES` (existing).
- Produces: `<SizeFamiliesLens planets yMeasure onYMeasureChange onSelect />`; App renders the active lens under a tab switcher.

- [ ] **Step 1: Write the failing SizeFamiliesLens test**

```jsx
// client/src/components/__tests__/SizeFamiliesLens.test.jsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SizeFamiliesLens from '../SizeFamiliesLens';

describe('SizeFamiliesLens', () => {
  it('renders the size legend and both section titles', () => {
    const { getByText } = render(
      <SizeFamiliesLens
        planets={[]}
        yMeasure="radius_earth"
        onYMeasureChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    expect(getByText('Rocky')).toBeInTheDocument();
    expect(getByText('Size families')).toBeInTheDocument();
    expect(getByText('Distance vs. size')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/__tests__/SizeFamiliesLens.test.jsx`
Expected: FAIL (cannot resolve `../SizeFamiliesLens`)

- [ ] **Step 3: Create `SizeFamiliesLens.jsx` (extract from App)**

```jsx
// client/src/components/SizeFamiliesLens.jsx
import TypeDistributionChart from './TypeDistributionChart';
import PlanetScatter from './PlanetScatter';
import { SIZE_CLASSES } from '../lib/sizeClasses';

function SizeFamiliesLens({ planets, yMeasure, onYMeasureChange, onSelect }) {
  return (
    <>
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
      <section>
        <h2 className="app__section-title">Size families</h2>
        <TypeDistributionChart planets={planets} />
      </section>
      <section>
        <h2 className="app__section-title">Distance vs. size</h2>
        <PlanetScatter
          planets={planets}
          yMeasure={yMeasure}
          onYMeasureChange={onYMeasureChange}
          onSelect={onSelect}
        />
      </section>
    </>
  );
}

export default SizeFamiliesLens;
```

- [ ] **Step 4: Write the failing App lens-switch integration test**

Add to `client/src/__tests__/App.test.jsx` (keep existing tests; ensure `fireEvent` is imported from `@testing-library/react`):

```jsx
  it('switches from the size lens to the discovery-trend lens', async () => {
    mockFetchOk();
    const { getByRole, findByRole, queryByText } = render(<App />);
    // default lens is Size families
    expect(await findByRole('tab', { name: /size families/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    fireEvent.click(getByRole('tab', { name: /discovery trend/i }));
    expect(getByRole('tab', { name: /discovery trend/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    // size-families section title is gone; trend title present
    expect(queryByText('Size families')).toBeNull();
    expect(queryByText('Discovery trend')).toBeInTheDocument();
  });
```

> If the existing test file lacks a shared `mockFetchOk` helper, reuse whatever fetch-mock the other passing tests use (the file already mocks `fetch` returning `{ data: bodies, source }`); mirror that setup for this test.

- [ ] **Step 5: Run the App test to verify the new case fails**

Run (from `client/`): `npx vitest run src/__tests__/App.test.jsx`
Expected: FAIL on the new lens-switch test (no tabs yet).

- [ ] **Step 6: Wire `App.jsx`**

In `client/src/App.jsx`:
1. Update imports — remove `TypeDistributionChart`, `PlanetScatter`, and `SIZE_CLASSES`; add:
```jsx
import LensTabs from './components/LensTabs';
import SizeFamiliesLens from './components/SizeFamiliesLens';
import DiscoveryTrendLens from './components/DiscoveryTrendLens';
```
2. Add the lens list + state (near the other `useState` calls):
```jsx
const LENSES = [
  { key: 'size', label: 'Size families' },
  { key: 'trend', label: 'Discovery trend' },
];
```
```jsx
const [activeLens, setActiveLens] = useState('size');
```
3. Replace the inline legend `<ul className="app__legend">…</ul>` and the two `<section>` charts inside `.app__charts` with the tab switcher (above the layout) and the active lens:
```jsx
<LensTabs lenses={LENSES} active={activeLens} onChange={setActiveLens} />
<div className="app__layout">
  <div className="app__charts">
    {activeLens === 'size' ? (
      <SizeFamiliesLens
        planets={filteredPlanets}
        yMeasure={yMeasure}
        onYMeasureChange={setYMeasure}
        onSelect={setSelected}
      />
    ) : (
      <DiscoveryTrendLens planets={filteredPlanets} />
    )}
  </div>
  <div className="app__side">
    {/* ResultsList + PlanetDetailDrawer unchanged */}
  </div>
</div>
```
Keep `FilterBar`, `ResultsList`, `PlanetDetailDrawer`, all state derivations, and the loading/error states exactly as they are.

- [ ] **Step 7: Run tests + lint to verify green**

Run (from `client/`): `npx vitest run && npm run lint`
Expected: all tests PASS (existing + the new SizeFamiliesLens and lens-switch tests), lint clean. If prettier flags files, run `npm run format` and re-run.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/SizeFamiliesLens.jsx client/src/components/__tests__/SizeFamiliesLens.test.jsx client/src/App.jsx client/src/__tests__/App.test.jsx
git commit -m "feat(explorer): lens switcher — Size families + Discovery trend"
```

---

## Task 6: Full verification

- [ ] **Step 1: Full suite + build**

Run (from `client/`): `npx vitest run && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 2: Local visual check**

From repo root: `python -m server.scripts.export_static_data`; from `client/`: `VITE_API_URL=/celestial-bodies.json npm run dev`. Open `http://localhost:3000/`. Confirm: two tabs (Size families / Discovery trend); the Size families lens looks unchanged; switching to Discovery trend shows the stacked-bar timeline with the method legend; changing a filter (e.g. method = Transit) cross-applies to the trend chart; keyboard arrows move between tabs. Stop the dev server.

- [ ] **Step 3: Commit any polish** made during the visual check (if none, skip).

---

## Deferred (Linear, future COS-3 cycles)

- **Neighborhood** lens (distance-focused).
- **Habitability** lens (equilibrium-temp Goldilocks zone; only ~33% data — will show a subset with a caveat).
