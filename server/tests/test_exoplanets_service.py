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


def test_nasa_failure_is_cached_to_avoid_repeated_network_hits(monkeypatch):
    """A failed live fetch should back off, not re-hit NASA on every request."""
    calls = {"n": 0}

    def _fail(*args, **kwargs):
        calls["n"] += 1
        raise httpx.ConnectError("network down")

    monkeypatch.setattr(exoplanets.httpx, "get", _fail)
    first = exoplanets.get_exoplanets(source="nasa")
    second = exoplanets.get_exoplanets(source="nasa")

    assert len(first) == len(exoplanets.load_snapshot())
    assert len(second) == len(exoplanets.load_snapshot())
    # The second call is served from the cached fallback — NASA is hit once.
    assert calls["n"] == 1


def test_empty_nasa_response_falls_back_to_snapshot(monkeypatch):
    """An empty (but successful) NASA response must not be served as 'no data'."""

    class _Resp:
        def raise_for_status(self):
            pass

        def json(self):
            return []

    monkeypatch.setattr(exoplanets.httpx, "get", lambda *a, **k: _Resp())
    bodies = exoplanets.get_exoplanets(source="nasa")
    assert len(bodies) == len(exoplanets.load_snapshot())


def test_non_list_nasa_response_falls_back_to_snapshot(monkeypatch):
    """A 200 with non-list JSON (e.g. a NASA error object) must not 500."""

    class _Resp:
        def raise_for_status(self):
            pass

        def json(self):
            return {"error": "invalid query"}

    monkeypatch.setattr(exoplanets.httpx, "get", lambda *a, **k: _Resp())
    bodies = exoplanets.get_exoplanets(source="nasa")
    # Recovers cleanly via the snapshot rather than crashing on dict iteration.
    assert len(bodies) == len(exoplanets.load_snapshot())


def test_normalize_adds_size_class_from_radius():
    body = exoplanets.normalize({"pl_name": "Big b", "pl_rade": 12.0})
    assert body["size_class"] == "gas_giant"
    assert body["size_class_basis"] == "radius"


def test_normalize_adds_size_class_from_mass_fallback():
    body = exoplanets.normalize({"pl_name": "Mid b", "pl_bmasse": 20.0})
    assert body["size_class"] == "neptune_like"
    assert body["size_class_basis"] == "mass"


def test_normalize_size_class_unknown_when_no_size():
    body = exoplanets.normalize({"pl_name": "Nothing b"})
    assert body["size_class"] == "unknown"
    assert body["size_class_basis"] == "none"


def test_build_query_requires_a_size_measure():
    q = exoplanets.build_query()
    assert "pl_rade is not null or pl_bmasse is not null" in q
