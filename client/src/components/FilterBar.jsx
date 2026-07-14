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
