# Cosmic Explorer

Exoplanet & star explorer built with **FastAPI** (Python) and **React 19** (Vite).

## Quick start

```bash
# Prerequisites: Node 22+, Python 3.12+

# Install everything
npm run setup

# Run both servers (client :3000, API :8000)
npm run launch
```

## Project structure

```
client/       React 19 SPA (Vite, Vitest, ESLint, Prettier)
server/       FastAPI REST API (pytest, ruff)
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/celestial-bodies` | List all exoplanets and stars |
| `GET /api/celestial-bodies?body_type=exoplanet` | Filter by type (`exoplanet` or `star`) |
| `GET /api/celestial-bodies?source=nasa` | Fetch exoplanets live from NASA (falls back to the snapshot on error) |
| `GET /api/celestial-bodies/{name}` | Get a single body by name |

## Data

Exoplanet data comes from the [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu)
(the nearest confirmed planets). It is bundled as a snapshot at
`server/data/exoplanets.json` so the API is fast, deterministic, and works
offline; `?source=nasa` performs a live query instead. Stars are curated
locally since the archive catalogs planets, not standalone stars.

Refresh the snapshot from the live archive:

```bash
python -m server.scripts.refresh_exoplanets [limit]   # run from the repo root
```

## Size-Families Explorer

The client classifies each exoplanet into one of four size families —
**rocky**, **super-Earth**, **neptune-like**, or **gas giant** — based on
radius (preferred) with a fallback to mass when radius isn't measured. The
boundaries are approximate, tunable conventions anchored to the radius
valley (~1.5-2.0 Earth radii) and the solar system's own planets; see
`server/services/classification.py` for the exact thresholds and caveats.

The explorer view ties together four coordinated pieces, all driven by the
same filtered set of bodies:

- A **bar chart** of planet counts per size family; clicking a bar filters
  the view to that family.
- A **distance-vs-size scatter plot** (distance in light-years on a log
  X-axis) with a Y-axis toggle between radius and mass, plus a count of
  planets not shown because they lack a measurement for the selected axis.
- A **synced results list** that reflects the same filtered/selected set as
  the chart and scatter, with a size-family chip per exoplanet row.
- A **detail drawer** that opens on selecting a chart bar, scatter point, or
  list row, showing the planet's stats alongside a representative artist's
  concept image credited to NASA, ESA, CSA / STScI (Webb) for its size
  family.

The bundled snapshot samples the nearest `SAMPLE_LIMIT = 500` confirmed
planets that have a radius or mass measurement. Refresh it from the live
archive with:

```bash
python -m server.scripts.refresh_exoplanets [limit]   # run from the repo root
```

## Testing

```bash
# Run all tests
npm test

# Client only
cd client && npm test

# Server only
cd server && python -m pytest -v
```

## Linting

```bash
# Client (ESLint + Prettier)
cd client && npm run lint

# Server (ruff)
cd server && ruff check . && ruff format --check .
```
