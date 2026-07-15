"""Classify an exoplanet into a size family.

Boundaries are approximate, tunable conventions anchored to the radius valley
(~1.5-2.0 R-earth) and the solar-system planets. Radius is preferred; mass is a
fallback because it is less composition-dependent to interpret but widely
available for radial-velocity discoveries. See the design spec for caveats
(gas-giant radius saturation; RV masses are minimums).
"""

from __future__ import annotations

# (upper-exclusive) radius bounds in Earth radii
_RADIUS_ROCKY_MAX = 1.6
_RADIUS_SUPER_EARTH_MAX = 2.0
_RADIUS_NEPTUNE_MAX = 6.0

# (upper-exclusive) mass bounds in Earth masses
_MASS_ROCKY_MAX = 2.0
_MASS_SUPER_EARTH_MAX = 10.0
_MASS_NEPTUNE_MAX = 50.0


def _by_radius(radius: float) -> str:
    if radius < _RADIUS_ROCKY_MAX:
        return "rocky"
    if radius < _RADIUS_SUPER_EARTH_MAX:
        return "super_earth"
    if radius < _RADIUS_NEPTUNE_MAX:
        return "neptune_like"
    return "gas_giant"


def _by_mass(mass: float) -> str:
    if mass < _MASS_ROCKY_MAX:
        return "rocky"
    if mass < _MASS_SUPER_EARTH_MAX:
        return "super_earth"
    if mass < _MASS_NEPTUNE_MAX:
        return "neptune_like"
    return "gas_giant"


def classify(radius_earth: float | None, mass_earth: float | None) -> tuple[str, str]:
    """Return (size_class, size_class_basis) for a planet's radius and/or mass."""
    if radius_earth is not None:
        return _by_radius(radius_earth), "radius"
    if mass_earth is not None:
        return _by_mass(mass_earth), "mass"
    return "unknown", "none"
