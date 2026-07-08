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
