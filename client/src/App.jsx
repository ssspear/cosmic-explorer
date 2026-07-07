import { useEffect, useState } from 'react';
import CelestialCard from './components/CelestialCard';
import './App.css';

const api =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/celestial-bodies';

function App() {
  const [bodies, setBodies] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const url = filter === 'all' ? api : `${api}?body_type=${filter}`;
    fetch(url)
      .then(async (res) => {
        const payload = await res.json();
        return res.ok && Array.isArray(payload.data) ? payload.data : [];
      })
      .then(setBodies)
      .catch(() => setBodies([]));
  }, [filter]);

  return (
    <div className="app">
      <h1 className="app__title">Cosmic Explorer</h1>
      <p className="app__subtitle">
        Discover exoplanets and stars beyond our sun
      </p>

      <nav className="app__filters" aria-label="Filter celestial bodies">
        {['all', 'exoplanet', 'star'].map((type) => (
          <button
            key={type}
            type="button"
            className={`filter-btn ${filter === type ? 'filter-btn--active' : ''}`}
            onClick={() => {
              setFilter(type);
              setSelected(null);
            }}
          >
            {type === 'all'
              ? 'All'
              : type === 'exoplanet'
                ? 'Exoplanets'
                : 'Stars'}
          </button>
        ))}
      </nav>

      <ul className="app__list">
        {bodies.map((body) => (
          <li key={body.name}>
            <button
              type="button"
              className={`body-link ${selected?.name === body.name ? 'body-link--active' : ''}`}
              onClick={() => setSelected(body)}
            >
              {body.name}
              <span className="body-link__type">{body.type}</span>
            </button>
          </li>
        ))}
      </ul>

      {selected && <CelestialCard body={selected} />}
    </div>
  );
}

export default App;
