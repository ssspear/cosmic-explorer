import { lazy, Suspense, useMemo, useState } from 'react';
import FilterBar from './components/FilterBar';
import ResultsList from './components/ResultsList';
import PlanetDetailDrawer from './components/PlanetDetailDrawer';
import LensTabs from './components/LensTabs';
import SizeFamiliesLens from './components/SizeFamiliesLens';
import DiscoveryTrendLens from './components/DiscoveryTrendLens';
import { useCelestialBodies } from './hooks/useCelestialBodies';
import './App.css';

const NeighborhoodLens = lazy(() => import('./components/NeighborhoodLens'));

const api =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/celestial-bodies';

const DEFAULT_FILTERS = { type: 'all', method: 'all', maxDistance: 1000 };

const LENSES = [
  { key: 'size', label: 'Size families' },
  { key: 'trend', label: 'Discovery trend' },
  { key: 'neighborhood', label: 'Neighborhood' },
];

function App() {
  const { status, bodies, reload } = useCelestialBodies(api);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState(null);
  const [yMeasure, setYMeasure] = useState('radius_earth');
  const [activeLens, setActiveLens] = useState('size');

  const methods = useMemo(
    () =>
      [
        ...new Set(bodies.map((b) => b.discovery_method).filter(Boolean)),
      ].sort(),
    [bodies]
  );

  // The farthest known distance among loaded bodies bounds the slider so it
  // has no dead travel; falls back to the original 1000 ly ceiling before
  // data has loaded.
  const maxDistanceBound = useMemo(() => {
    const distances = bodies.map((b) => b.distance_ly).filter((d) => d != null);
    return distances.length === 0 ? 1000 : Math.ceil(Math.max(...distances));
  }, [bodies]);

  // Clamp the filter's maxDistance to the current bound so the default state
  // (maxDistance: 1000) shows every planet once the real, usually-smaller,
  // bound is known, and so a stale value from a previous dataset can't hide
  // bodies that are now in range.
  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      maxDistance: Math.min(filters.maxDistance, maxDistanceBound),
    }),
    [filters, maxDistanceBound]
  );

  const filteredBodies = useMemo(
    () =>
      bodies.filter((b) => {
        if (effectiveFilters.type !== 'all' && b.type !== effectiveFilters.type)
          return false;
        if (
          effectiveFilters.method !== 'all' &&
          b.discovery_method !== effectiveFilters.method
        )
          return false;
        if (
          b.distance_ly != null &&
          b.distance_ly > effectiveFilters.maxDistance
        )
          return false;
        return true;
      }),
    [bodies, effectiveFilters]
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
        Explore exoplanets across our stellar neighborhood — by size family, by
        discovery over time, and mapped in 3D
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
            filters={effectiveFilters}
            methods={methods}
            onChange={setFilters}
            maxDistanceBound={maxDistanceBound}
          />
          <LensTabs
            lenses={LENSES}
            active={activeLens}
            onChange={setActiveLens}
            panelId="lens-panel"
          />
          <div className="app__layout">
            <div
              className="app__charts"
              role="tabpanel"
              id="lens-panel"
              aria-labelledby={`lenstab-${activeLens}`}
              tabIndex={0}
            >
              {activeLens === 'size' && (
                <SizeFamiliesLens
                  planets={filteredPlanets}
                  yMeasure={yMeasure}
                  onYMeasureChange={setYMeasure}
                  onSelect={setSelected}
                />
              )}
              {activeLens === 'trend' && (
                <DiscoveryTrendLens planets={filteredPlanets} />
              )}
              {activeLens === 'neighborhood' && (
                <Suspense
                  fallback={<p className="app__state">Loading 3D map…</p>}
                >
                  <NeighborhoodLens
                    planets={filteredPlanets}
                    onSelect={setSelected}
                    selectedName={selectedBody?.name ?? null}
                  />
                </Suspense>
              )}
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
