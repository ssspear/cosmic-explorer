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
