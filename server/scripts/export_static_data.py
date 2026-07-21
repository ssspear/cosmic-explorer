"""Generate the static celestial-bodies JSON the GitHub Pages demo serves.

Reuses the API's own data assembly (`_all_bodies`) so the static file cannot
drift from the live API's content or shape. Run from the repo root:

    python -m server.scripts.export_static_data
"""

from __future__ import annotations

import json
from pathlib import Path

from server.routers.celestial_bodies import _all_bodies

# client/public is copied verbatim into the Vite build output (dist/).
DEFAULT_DEST = Path(__file__).resolve().parents[2] / "client" / "public" / "celestial-bodies.json"


def export(dest: Path = DEFAULT_DEST) -> int:
    """Write the combined snapshot dataset to ``dest``; return the body count."""
    payload = {"data": _all_bodies("snapshot"), "source": "snapshot"}
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    return len(payload["data"])


def main() -> None:
    count = export()
    print(f"Wrote {count} celestial bodies to {DEFAULT_DEST}")


if __name__ == "__main__":
    main()
