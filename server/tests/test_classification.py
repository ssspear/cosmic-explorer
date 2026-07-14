import pytest

from server.services.classification import classify


@pytest.mark.parametrize(
    "radius, expected",
    [
        (1.0, "rocky"),
        (1.59, "rocky"),
        (1.6, "super_earth"),
        (1.99, "super_earth"),
        (2.0, "neptune_like"),
        (5.99, "neptune_like"),
        (6.0, "gas_giant"),
        (11.2, "gas_giant"),
    ],
)
def test_classifies_by_radius(radius, expected):
    size_class, basis = classify(radius, None)
    assert size_class == expected
    assert basis == "radius"


@pytest.mark.parametrize(
    "mass, expected",
    [
        (1.0, "rocky"),
        (1.99, "rocky"),
        (2.0, "super_earth"),
        (9.99, "super_earth"),
        (10.0, "neptune_like"),
        (49.9, "neptune_like"),
        (50.0, "gas_giant"),
        (318.0, "gas_giant"),
    ],
)
def test_classifies_by_mass_when_radius_missing(mass, expected):
    size_class, basis = classify(None, mass)
    assert size_class == expected
    assert basis == "mass"


def test_radius_wins_when_both_present():
    # radius says rocky (1.0), mass says gas_giant (60) -> radius wins
    size_class, basis = classify(1.0, 60.0)
    assert size_class == "rocky"
    assert basis == "radius"


def test_unknown_when_both_missing():
    assert classify(None, None) == ("unknown", "none")
