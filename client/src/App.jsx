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
      [
        ...new Set(bodies.map((b) => b.discovery_method).filter(Boolean)),
      ].sort(),
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

  // A selection can fall outside the active filters (e.g. the user selects a
  // body, then narrows the filters to exclude it). Derive visibility from the
  // filtered set rather than tracking it separately, so the drawer/list stay
  // pure derivations of {bodies, filters, selected}.
  const selectedBody = useMemo(
    () =>
      selected && filteredBodies.some((b) => b.name === selected.name)
        ? selected
        : null,
    [selected, filteredBodies]
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
          <FilterBar
            filters={filters}
            methods={methods}
            onChange={setFilters}
          />
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
                selectedName={selectedBody?.name ?? null}
                onSelect={setSelected}
              />
              {selectedBody && (
                <PlanetDetailDrawer
                  body={selectedBody}
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
