from fractions import Fraction

from app.domain.money import (
    bps_to_fraction,
    floor_to_whole_kobo,
    round_fraction,
)


def test_recovery_estimate_floors_instead_of_half_up_rounding():
    estimate = Fraction(201, 2)  # 100.5 kobo

    assert round_fraction(estimate).minor == 101
    assert floor_to_whole_kobo(estimate).minor == 100


def test_basis_points_convert_to_exact_fraction():
    assert bps_to_fraction(6000) == Fraction(6000, 10000)
