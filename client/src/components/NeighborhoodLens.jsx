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
  const { points, omitted } = useMemo(
    () => neighborhoodPoints(planets),
    [planets]
  );

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
            <span
              className="app__legend-swatch"
              style={{ background: s.color }}
            />
            {s.label}
          </li>
        ))}
        <li className="app__legend-item neighborhood__legend-note">
          Dot size = planet radius
        </li>
      </ul>

      <div
        className={`neighborhood__canvas-wrap${expanded ? ' neighborhood__canvas-wrap--expanded' : ''}`}
      >
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
