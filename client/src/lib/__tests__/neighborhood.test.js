import { describe, expect, it } from 'vitest';
import {
  STAR_COLORS,
  starColor,
  radiusToDotSize,
  DOT_SIZE_MIN,
  DOT_SIZE_MAX,
} from '../neighborhood';

describe('starColor', () => {
  it('maps temperature bands to real star colors', () => {
    expect(starColor(3000)).toBe(STAR_COLORS.mDwarf); // cool red dwarf
    expect(starColor(4500)).toBe(STAR_COLORS.kDwarf);
    expect(starColor(5800)).toBe(STAR_COLORS.sun); // sun-like
    expect(starColor(6800)).toBe(STAR_COLORS.fWhite);
    expect(starColor(9000)).toBe(STAR_COLORS.aHot); // hot blue-white
  });

  it('falls back to a neutral grey when temperature is missing', () => {
    expect(starColor(null)).toBe(STAR_COLORS.unknown);
    expect(starColor(undefined)).toBe(STAR_COLORS.unknown);
  });
});

describe('radiusToDotSize', () => {
  it('grows with radius and clamps at both ends', () => {
    expect(radiusToDotSize(1)).toBeLessThan(radiusToDotSize(10));
    expect(radiusToDotSize(0)).toBe(DOT_SIZE_MIN);
    expect(radiusToDotSize(9999)).toBe(DOT_SIZE_MAX);
  });

  it('uses the minimum size when radius is missing', () => {
    expect(radiusToDotSize(null)).toBe(DOT_SIZE_MIN);
  });
});
