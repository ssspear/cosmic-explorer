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
| `GET /api/celestial-bodies/{name}` | Get a single body by name |

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
