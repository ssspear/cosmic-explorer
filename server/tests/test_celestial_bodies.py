from fastapi.testclient import TestClient

from server.main import app

client = TestClient(app)


def test_list_all_celestial_bodies():
    resp = client.get("/api/celestial-bodies")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert isinstance(data, list)
    assert len(data) == 8
    names = [b["name"] for b in data]
    assert "Kepler-22b" in names
    assert "Betelgeuse" in names


def test_filter_by_exoplanet():
    resp = client.get("/api/celestial-bodies", params={"body_type": "exoplanet"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert all(b["type"] == "exoplanet" for b in data)
    assert len(data) == 5


def test_filter_by_star():
    resp = client.get("/api/celestial-bodies", params={"body_type": "star"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert all(b["type"] == "star" for b in data)
    assert len(data) == 3


def test_get_single_body():
    resp = client.get("/api/celestial-bodies/Sirius")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["name"] == "Sirius"
    assert body["type"] == "star"
    assert body["constellation"] == "Canis Major"


def test_get_single_body_case_insensitive():
    resp = client.get("/api/celestial-bodies/sirius")
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "Sirius"


def test_get_unknown_body():
    resp = client.get("/api/celestial-bodies/Planet-X")
    assert resp.status_code == 200
    assert resp.json()["data"] is None
    assert resp.json()["error"] == "Not found"


def test_body_fields():
    resp = client.get("/api/celestial-bodies/Kepler-22b")
    body = resp.json()["data"]
    expected_keys = {
        "name",
        "type",
        "distance_ly",
        "discovery_year",
        "constellation",
        "description",
        "fun_fact",
    }
    assert set(body.keys()) == expected_keys
