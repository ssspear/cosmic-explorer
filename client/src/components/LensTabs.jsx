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
