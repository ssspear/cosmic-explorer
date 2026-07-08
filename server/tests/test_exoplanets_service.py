import httpx
import pytest

from server.services import exoplanets

SAMPLE_ROW = {
    "pl_name": "Proxima Cen b",
    "hostname": "Proxima Cen",
    "disc_year": 2016,
    "discoverymethod": "Radial Velocity",
    "sy_dist": 1.30119,
    "pl_orbper": 11.18465,
    "pl_rade": None,
    "pl_bmasse": 1.055,
    "pl_eqt": 218.0,
}


@pytest.fixture(autouse=True)
def _clear_cache():
    exoplanets._cache["data"] = None
    exoplanets._cache["fetched_at"] = 0.0
    yield


def test_normalize_converts_parsecs_to_light_years():
    body = exoplanets.normalize(SAMPLE_ROW)
    assert body["name"] == "Proxima Cen b"
    assert body["type"] == "exoplanet"
    assert body["host_star"] == "Proxima Cen"
    # 1.30119 pc * 3.26156 ly/pc ≈ 4.24 ly
    assert body["distance_ly"] == 4.24
    assert body["discovery_year"] == 2016
    assert body["mass_earth"] == 1.05
    assert "Proxima Cen" in body["description"]
    assert body["fun_fact"]


def test_normalize_handles_missing_values():
    body = exoplanets.normalize({"pl_name": "Mystery b"})
    assert body["distance_ly"] is None
    assert body["mass_earth"] is None
    assert body["description"].startswith("Mystery b is an exoplanet")
    assert body["fun_fact"]


def test_get_exoplanets_snapshot_does_not_call_network(monkeypatch):
    def _boom(*args, **kwargs):
        raise AssertionError("snapshot source must not hit the network")

    monkeypatch.setattr(exoplanets.httpx, "get", _boom)
    bodies = exoplanets.get_exoplanets(source="snapshot")
    assert len(bodies) > 0
    assert all(b["type"] == "exoplanet" for b in bodies)


def test_get_exoplanets_nasa_success(monkeypatch):
    class _Resp:
        def raise_for_status(self):
            pass

        def json(self):
            return [SAMPLE_ROW]

    monkeypatch.setattr(exoplanets.httpx, "get", lambda *a, **k: _Resp())
    bodies = exoplanets.get_exoplanets(source="nasa")
    assert len(bodies) == 1
    assert bodies[0]["name"] == "Proxima Cen b"


def test_get_exoplanets_nasa_falls_back_to_snapshot(monkeypatch):
    def _fail(*args, **kwargs):
        raise httpx.ConnectError("network down")

    monkeypatch.setattr(exoplanets.httpx, "get", _fail)
    bodies = exoplanets.get_exoplanets(source="nasa")
    # Falls back to the bundled snapshot instead of raising.
    assert len(bodies) == len(exoplanets.load_snapshot())
