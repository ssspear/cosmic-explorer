from fastapi import APIRouter

router = APIRouter()

EXOPLANETS = [
    {
        "name": "Kepler-22b",
        "type": "exoplanet",
        "distance_ly": 620,
        "discovery_year": 2011,
        "constellation": "Cygnus",
        "description": "One of the first confirmed exoplanets in the habitable zone of a Sun-like star.",
        "fun_fact": "Kepler-22b orbits its star in 290 days, similar to Earth's 365-day year.",
    },
    {
        "name": "TRAPPIST-1e",
        "type": "exoplanet",
        "distance_ly": 40,
        "discovery_year": 2017,
        "constellation": "Aquarius",
        "description": "A rocky, roughly Earth-sized world in the TRAPPIST-1 system's habitable zone.",
        "fun_fact": "The TRAPPIST-1 system has seven Earth-sized planets, three of which are in the habitable zone.",
    },
    {
        "name": "Proxima Centauri b",
        "type": "exoplanet",
        "distance_ly": 4.24,
        "discovery_year": 2016,
        "constellation": "Centaurus",
        "description": "The closest known exoplanet to our solar system, orbiting the nearest star.",
        "fun_fact": "At 4.24 light-years away, a spacecraft traveling at 10% the speed of light would reach it in about 42 years.",
    },
    {
        "name": "HD 209458 b (Osiris)",
        "type": "exoplanet",
        "distance_ly": 159,
        "discovery_year": 1999,
        "constellation": "Pegasus",
        "description": "The first exoplanet observed transiting its star and the first with a detected atmosphere.",
        "fun_fact": "Its atmosphere is being blown away by stellar radiation, creating a comet-like tail of gas.",
    },
    {
        "name": "55 Cancri e",
        "type": "exoplanet",
        "distance_ly": 41,
        "discovery_year": 2004,
        "constellation": "Cancer",
        "description": "A super-Earth so close to its star that its surface may be covered in molten lava.",
        "fun_fact": "Early studies suggested this planet could be made largely of diamond due to a high carbon-to-oxygen ratio.",
    },
]

STARS = [
    {
        "name": "Betelgeuse",
        "type": "star",
        "distance_ly": 700,
        "discovery_year": None,
        "constellation": "Orion",
        "description": "A red supergiant nearing the end of its life, one of the largest stars visible to the naked eye.",
        "fun_fact": "Betelgeuse could explode as a supernova anytime in the next 100,000 years and would be visible in daylight.",
    },
    {
        "name": "Sirius",
        "type": "star",
        "distance_ly": 8.6,
        "discovery_year": None,
        "constellation": "Canis Major",
        "description": "The brightest star in Earth's night sky, actually a binary system of two stars.",
        "fun_fact": "Ancient Egyptians based their calendar on the heliacal rising of Sirius, which signaled the Nile's annual flood.",
    },
    {
        "name": "Polaris",
        "type": "star",
        "distance_ly": 433,
        "discovery_year": None,
        "constellation": "Ursa Minor",
        "description": "The current North Star, a yellow supergiant used for navigation for centuries.",
        "fun_fact": "Polaris is actually a triple star system — the main star is orbited by two smaller companions.",
    },
]


@router.get("/celestial-bodies")
def list_celestial_bodies(body_type: str | None = None):
    bodies = EXOPLANETS + STARS
    if body_type:
        bodies = [b for b in bodies if b["type"] == body_type]
    return {"data": bodies}


@router.get("/celestial-bodies/{name}")
def get_celestial_body(name: str):
    bodies = EXOPLANETS + STARS
    for body in bodies:
        if body["name"].lower() == name.lower():
            return {"data": body}
    return {"error": "Not found", "data": None}
