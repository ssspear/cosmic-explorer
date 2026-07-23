import { useRef } from 'react';
import './LensTabs.css';

function LensTabs({ lenses, active, onChange, panelId = 'lens-panel' }) {
  const tabRefs = useRef(new Map());

  // Arrow-key nav follows the WAI-ARIA "automatic activation" tabs pattern:
  // moving selection also moves DOM focus to the newly-active tab. This only
  // runs from a tab's onKeyDown, so focus is already inside the tablist and
  // stealing it here is safe — a filter-driven re-render never calls this.
  const move = (delta) => {
    const i = lenses.findIndex((l) => l.key === active);
    const next = lenses[(i + delta + lenses.length) % lenses.length];
    onChange(next.key);
    tabRefs.current.get(next.key)?.focus();
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
            ref={(node) => {
              if (node) tabRefs.current.set(l.key, node);
              else tabRefs.current.delete(l.key);
            }}
            type="button"
            role="tab"
            id={`lenstab-${l.key}`}
            aria-selected={selected}
            aria-controls={panelId}
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
