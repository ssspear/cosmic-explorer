import json

from server.routers.celestial_bodies import _all_bodies
from server.scripts.export_static_data import export


def test_export_writes_combined_snapshot_data(tmp_path):
    dest = tmp_path / "celestial-bodies.json"
    count = export(dest)

    payload = json.loads(dest.read_text(encoding="utf-8"))
    assert payload["source"] == "snapshot"
    assert payload["data"] == _all_bodies("snapshot")
    assert count == len(payload["data"])
    # Both exoplanets and the curated stars must be present (stars live in the
    # router, not the snapshot — the whole reason we reuse _all_bodies).
    types = {b["type"] for b in payload["data"]}
    assert "exoplanet" in types
    assert "star" in types


def test_export_creates_missing_parent_dir(tmp_path):
    dest = tmp_path / "nested" / "celestial-bodies.json"
    export(dest)
    assert dest.exists()
