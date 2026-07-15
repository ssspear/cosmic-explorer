from fastapi import APIRouter

from server.services import exoplanets

router = APIRouter()

# Stars are curated locally — the NASA Exoplanet Archive catalogs planets, not
# the stars themselves as standalone entries.
STARS = [
    {
        "name": "Betelgeuse",
        "type": "star",
        "host_star": None,
        "distance_ly": 700,
        "discovery_year": None,
        "discovery_method": None,
        "orbital_period_days": None,
        "radius_earth": None,
        "mass_earth": None,
        "equilibrium_temp_k": None,
        "size_class": None,
        "size_class_basis": None,
        "constellation": "Orion",
        "description": "A red supergiant nearing the end of its life, one of the largest stars visible to the naked eye.",
        "fun_fact": "Betelgeuse could explode as a supernova anytime in the next 100,000 years and would be visible in daylight.",
    },
    {
        "name": "Sirius",
        "type": "star",
        "host_star": None,
        "distance_ly": 8.6,
        "discovery_year": None,
        "discovery_method": None,
        "orbital_period_days": None,
        "radius_earth": None,
        "mass_earth": None,
        "equilibrium_temp_k": None,
        "size_class": None,
        "size_class_basis": None,
        "constellation": "Canis Major",
        "description": "The brightest star in Earth's night sky, actually a binary system of two stars.",
        "fun_fact": "Ancient Egyptians based their calendar on the heliacal rising of Sirius, which signaled the Nile's annual flood.",
    },
    {
        "name": "Polaris",
        "type": "star",
        "host_star": None,
        "distance_ly": 433,
        "discovery_year": None,
        "discovery_method": None,
        "orbital_period_days": None,
        "radius_earth": None,
        "mass_earth": None,
        "equilibrium_temp_k": None,
        "size_class": None,
        "size_class_basis": None,
        "constellation": "Ursa Minor",
        "description": "The current North Star, a yellow supergiant used for navigation for centuries.",
        "fun_fact": "Polaris is actually a triple star system — the main star is orbited by two smaller companions.",
    },
]


def _all_bodies(source: str) -> list[dict]:
    return exoplanets.get_exoplanets(source=source) + STARS


@router.get("/celestial-bodies")
def list_celestial_bodies(body_type: str | None = None, source: str = "snapshot"):
    """List celestial bodies.

    - ``body_type`` filters to ``exoplanet`` or ``star``.
    - ``source=nasa`` fetches exoplanets live from the NASA Exoplanet Archive
      (falling back to the bundled snapshot on error); any other value serves
      the bundled snapshot.
    """
    bodies = _all_bodies(source)
    if body_type:
        bodies = [b for b in bodies if b["type"] == body_type]
    return {"data": bodies, "source": source}


@router.get("/celestial-bodies/{name}")
def get_celestial_body(name: str, source: str = "snapshot"):
    for body in _all_bodies(source):
        if body["name"].lower() == name.lower():
            return {"data": body}
    return {"error": "Not found", "data": None}
