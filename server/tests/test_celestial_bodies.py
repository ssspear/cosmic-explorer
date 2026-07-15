from fastapi.testclient import TestClient

from server.main import app
from server.services import exoplanets
from server.services.classification import classify

client = TestClient(app)

EXOPLANET_COUNT = len(exoplanets.load_snapshot())
STAR_COUNT = 3


def test_list_all_celestial_bodies():
    resp = client.get("/api/celestial-bodies")
    assert resp.status_code == 200
    payload = resp.json()
    data = payload["data"]
    assert isinstance(data, list)
    assert len(data) == EXOPLANET_COUNT + STAR_COUNT
    assert payload["source"] == "snapshot"
    names = [b["name"] for b in data]
    assert "Betelgeuse" in names


def test_list_with_source_nasa_passes_source_through(monkeypatch):
    """The router forwards ?source=nasa to the service and echoes it back."""

    def _fake_get(source="snapshot"):
        assert source == "nasa"
        return [{"name": "Test Planet", "type": "exoplanet"}]

    monkeypatch.setattr(exoplanets, "get_exoplanets", _fake_get)
    resp = client.get("/api/celestial-bodies", params={"source": "nasa"})
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["source"] == "nasa"
    names = [b["name"] for b in payload["data"]]
    assert "Test Planet" in names


def test_filter_by_exoplanet():
    resp = client.get("/api/celestial-bodies", params={"body_type": "exoplanet"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert all(b["type"] == "exoplanet" for b in data)
    assert len(data) == EXOPLANET_COUNT


def test_filter_by_star():
    resp = client.get("/api/celestial-bodies", params={"body_type": "star"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert all(b["type"] == "star" for b in data)
    assert len(data) == STAR_COUNT


def test_get_single_star():
    resp = client.get("/api/celestial-bodies/Sirius")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["name"] == "Sirius"
    assert body["type"] == "star"
    assert body["constellation"] == "Canis Major"


def test_get_single_exoplanet_case_insensitive():
    name = exoplanets.load_snapshot()[0]["name"]
    resp = client.get(f"/api/celestial-bodies/{name.lower()}")
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == name


def test_get_unknown_body():
    resp = client.get("/api/celestial-bodies/Planet-X")
    assert resp.status_code == 200
    assert resp.json()["data"] is None
    assert resp.json()["error"] == "Not found"


def test_exoplanets_have_size_class():
    resp = client.get("/api/celestial-bodies?body_type=exoplanet")
    data = resp.json()["data"]
    assert data, "expected at least one exoplanet"
    assert all(
        (b["size_class"], b["size_class_basis"])
        == classify(b["radius_earth"], b["mass_earth"])
        for b in data
    )


def test_stars_have_null_size_class():
    resp = client.get("/api/celestial-bodies?body_type=star")
    data = resp.json()["data"]
    assert all(b["size_class"] is None for b in data)
    assert all(b["size_class_basis"] is None for b in data)


def test_body_fields():
    name = exoplanets.load_snapshot()[0]["name"]
    resp = client.get(f"/api/celestial-bodies/{name}")
    body = resp.json()["data"]
    expected_keys = {
        "name",
        "type",
        "host_star",
        "distance_ly",
        "discovery_year",
        "discovery_method",
        "orbital_period_days",
        "radius_earth",
        "mass_earth",
        "equilibrium_temp_k",
        "size_class",
        "size_class_basis",
        "constellation",
        "description",
        "fun_fact",
    }
    assert set(body.keys()) == expected_keys
