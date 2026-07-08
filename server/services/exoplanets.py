"""Client for NASA's Exoplanet Archive.

Fetches confirmed exoplanet data from the NASA Exoplanet Archive TAP API,
normalizes each record into the shape used by the rest of the app, and falls
back to a bundled snapshot when the live service is unavailable.

NASA Exoplanet Archive: https://exoplanetarchive.ipac.caltech.edu
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import httpx

NASA_TAP_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"

# Columns pulled from the "ps" (Planetary Systems) table.
_COLUMNS = "pl_name,hostname,disc_year,discoverymethod,sy_dist,pl_orbper,pl_rade,pl_bmasse,pl_eqt"

# 1 parsec = 3.26156 light-years.
PARSEC_TO_LY = 3.26156

SNAPSHOT_PATH = Path(__file__).resolve().parent.parent / "data" / "exoplanets.json"

# Cache the live results for a short while so we don't hammer NASA on every hit.
_CACHE_TTL_SECONDS = 60 * 60
# When a live fetch fails or comes back empty we serve the snapshot, but cache
# that fallback only briefly — long enough to stop hammering NASA during an
# outage, short enough to retry the live source within a few minutes.
_FALLBACK_TTL_SECONDS = 5 * 60
_cache: dict[str, object] = {"data": None, "fetched_at": 0.0, "ttl": _CACHE_TTL_SECONDS}


# Distance cap (parsecs) applied in ADQL to keep the download light while still
# comfortably covering the nearest few dozen systems. Results are ordered by
# distance and sliced to the requested limit client-side, because the archive's
# TAP service applies ``top`` before ``order by``.
_MAX_DISTANCE_PC = 20.0


def build_query() -> str:
    """Build the ADQL query for the nearest confirmed exoplanets with a distance."""
    return (
        f"select {_COLUMNS} from ps "
        f"where default_flag=1 and sy_dist is not null and sy_dist < {_MAX_DISTANCE_PC} "
        "order by sy_dist asc"
    )


def _round(value: float | None, digits: int) -> float | None:
    return round(value, digits) if value is not None else None


def _build_description(
    name: str, host: str | None, distance_ly: float | None, year: int | None, method: str | None
) -> str:
    parts = [f"{name} is an exoplanet"]
    if host:
        parts.append(f"orbiting the star {host}")
    if distance_ly is not None:
        parts.append(f"about {distance_ly} light-years from Earth")
    sentence = " ".join(parts) + "."
    if year and method:
        sentence += f" It was discovered in {year} using the {method.lower()} method."
    elif year:
        sentence += f" It was discovered in {year}."
    return sentence


def _build_fun_fact(
    orbital_period_days: float | None,
    radius_earth: float | None,
    mass_earth: float | None,
    equilibrium_temp_k: float | None,
) -> str:
    if orbital_period_days is not None:
        if orbital_period_days < 1:
            hours = round(orbital_period_days * 24, 1)
            return f"A year here lasts just {hours} hours — it whips around its star that fast."
        return f"One orbit around its star takes about {round(orbital_period_days, 1)} Earth days."
    if mass_earth is not None:
        return f"It weighs in at roughly {mass_earth} times the mass of Earth."
    if radius_earth is not None:
        return f"Its radius is about {radius_earth} times that of Earth."
    if equilibrium_temp_k is not None:
        return f"Its estimated equilibrium temperature is around {equilibrium_temp_k} K."
    return "Details about this world are still being measured by astronomers."


def normalize(row: dict) -> dict:
    """Convert a raw NASA Exoplanet Archive row into an app celestial body."""
    name = row.get("pl_name")
    host = row.get("hostname")
    distance_pc = row.get("sy_dist")
    distance_ly = _round(distance_pc * PARSEC_TO_LY, 2) if distance_pc is not None else None
    year = row.get("disc_year")
    method = row.get("discoverymethod")
    orbital_period_days = _round(row.get("pl_orbper"), 2)
    radius_earth = _round(row.get("pl_rade"), 2)
    mass_earth = _round(row.get("pl_bmasse"), 2)
    equilibrium_temp_k = _round(row.get("pl_eqt"), 1)

    return {
        "name": name,
        "type": "exoplanet",
        "host_star": host,
        "distance_ly": distance_ly,
        "discovery_year": year,
        "discovery_method": method,
        "orbital_period_days": orbital_period_days,
        "radius_earth": radius_earth,
        "mass_earth": mass_earth,
        "equilibrium_temp_k": equilibrium_temp_k,
        "constellation": None,
        "description": _build_description(name, host, distance_ly, year, method),
        "fun_fact": _build_fun_fact(
            orbital_period_days, radius_earth, mass_earth, equilibrium_temp_k
        ),
    }


def fetch_from_nasa(limit: int = 40, timeout: float = 20.0) -> list[dict]:
    """Query the live NASA Exoplanet Archive and return normalized bodies."""
    params = {"query": build_query(), "format": "json"}
    resp = httpx.get(NASA_TAP_URL, params=params, timeout=timeout)
    resp.raise_for_status()
    rows = resp.json()
    bodies = [normalize(row) for row in rows if row.get("pl_name")]
    return bodies[:limit]


def load_snapshot() -> list[dict]:
    """Load the bundled snapshot of NASA exoplanet data."""
    with SNAPSHOT_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def get_exoplanets(source: str = "snapshot") -> list[dict]:
    """Return exoplanets from the bundled snapshot or live NASA API.

    ``source="nasa"`` performs a live fetch (cached for an hour) and falls back
    to the bundled snapshot if the request fails. Any other value serves the
    snapshot directly, which keeps responses fast, deterministic, and offline.
    """
    if source != "nasa":
        return load_snapshot()

    now = time.monotonic()
    cached = _cache["data"]
    if cached is not None and now - float(_cache["fetched_at"]) < float(_cache["ttl"]):
        return cached  # type: ignore[return-value]

    try:
        data = fetch_from_nasa()
    except (httpx.HTTPError, ValueError):
        data = []

    # A successful, non-empty fetch is cached for the full TTL. A failure or an
    # empty response falls back to the snapshot, cached only briefly so we back
    # off from NASA without serving stale-empty data for an hour.
    if data:
        _cache.update(data=data, fetched_at=now, ttl=_CACHE_TTL_SECONDS)
        return data

    fallback = load_snapshot()
    _cache.update(data=fallback, fetched_at=now, ttl=_FALLBACK_TTL_SECONDS)
    return fallback
