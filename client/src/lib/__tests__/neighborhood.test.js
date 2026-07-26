import { describe, expect, it } from 'vitest';
import {
  STAR_COLORS,
  starColor,
  radiusToDotSize,
  DOT_SIZE_MIN,
  DOT_SIZE_MAX,
  equatorialToXYZ,
  systemJitter,
  neighborhoodPoints,
  JITTER_LY,
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

describe('equatorialToXYZ', () => {
  it('places known coordinates on the right axes', () => {
    const a = equatorialToXYZ(0, 0, 10);
    expect(a.x).toBeCloseTo(10, 5);
    expect(a.y).toBeCloseTo(0, 5);
    expect(a.z).toBeCloseTo(0, 5);

    const b = equatorialToXYZ(90, 0, 10);
    expect(b.x).toBeCloseTo(0, 5);
    expect(b.y).toBeCloseTo(10, 5);

    const c = equatorialToXYZ(0, 90, 10);
    expect(c.z).toBeCloseTo(10, 5);
  });
});

describe('systemJitter', () => {
  it('is deterministic and small', () => {
    const j1 = systemJitter('TRAPPIST-1 b');
    const j2 = systemJitter('TRAPPIST-1 b');
    expect(j1).toEqual(j2);
    expect(Math.abs(j1.dx)).toBeLessThanOrEqual(JITTER_LY);
    expect(Math.abs(j1.dy)).toBeLessThanOrEqual(JITTER_LY);
    expect(Math.abs(j1.dz)).toBeLessThanOrEqual(JITTER_LY);
  });

  it('differs across planet names', () => {
    expect(systemJitter('TRAPPIST-1 b')).not.toEqual(
      systemJitter('TRAPPIST-1 c')
    );
  });
});

describe('neighborhoodPoints', () => {
  const base = {
    ra: 10,
    dec: 20,
    distance_ly: 12,
    star_temp_k: 5800,
    radius_earth: 1,
  };

  it('places valid planets and counts omitted ones', () => {
    const { points, omitted } = neighborhoodPoints([
      { ...base, name: 'A' },
      { ...base, name: 'B', ra: null }, // no coords -> omitted
      { ...base, name: 'C', distance_ly: null }, // no distance -> omitted
    ]);
    expect(points).toHaveLength(1);
    expect(points[0].planet.name).toBe('A');
    expect(omitted).toBe(2);
    expect(typeof points[0].color).toBe('string');
    expect(points[0].size).toBeGreaterThan(0);
  });

  it('separates co-located planets via jitter', () => {
    const { points } = neighborhoodPoints([
      { ...base, name: 'Kepler-x b' },
      { ...base, name: 'Kepler-x c' },
    ]);
    expect(points[0].x).not.toBe(points[1].x);
  });

  it('places a solitary system at its exact position (no jitter)', () => {
    const { points } = neighborhoodPoints([{ ...base, name: 'Solo b' }]);
    const exact = equatorialToXYZ(base.ra, base.dec, base.distance_ly);
    expect(points[0].x).toBe(exact.x);
    expect(points[0].y).toBe(exact.y);
    expect(points[0].z).toBe(exact.z);
  });
});
