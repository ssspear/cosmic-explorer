"""Refresh the bundled NASA exoplanet snapshot.

Pulls the nearest confirmed exoplanets from the live NASA Exoplanet Archive and
writes them to ``server/data/exoplanets.json``. Run this to update the data that
the API serves by default:

    python -m server.scripts.refresh_exoplanets [limit]
"""

from __future__ import annotations

import json
import sys

from server.services.exoplanets import SNAPSHOT_PATH, fetch_from_nasa


def main() -> None:
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 500
    bodies = fetch_from_nasa(limit=limit)
    SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with SNAPSHOT_PATH.open("w", encoding="utf-8") as fh:
        json.dump(bodies, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print(f"Wrote {len(bodies)} exoplanets to {SNAPSHOT_PATH}")


if __name__ == "__main__":
    main()
