import { describe, expect, it } from 'vitest';
import { METHODS, methodBucket, discoveriesByYear } from '../discoveryMethods';

describe('methodBucket', () => {
  it('maps the three named methods to their own buckets', () => {
    expect(methodBucket('Radial Velocity')).toBe('radial_velocity');
    expect(methodBucket('Transit')).toBe('transit');
    expect(methodBucket('Imaging')).toBe('imaging');
  });
  it('buckets rare/unknown methods into other', () => {
    expect(methodBucket('Astrometry')).toBe('other');
    expect(methodBucket('Transit Timing Variations')).toBe('other');
    expect(methodBucket('Eclipse Timing Variations')).toBe('other');
    expect(methodBucket(null)).toBe('other');
  });
});

describe('discoveriesByYear', () => {
  it('counts per year per bucket, sorted ascending, skipping null years', () => {
    const planets = [
      { discovery_year: 2016, discovery_method: 'Radial Velocity' },
      { discovery_year: 2016, discovery_method: 'Transit' },
      { discovery_year: 2014, discovery_method: 'Imaging' },
      { discovery_year: 2016, discovery_method: 'Astrometry' },
      { discovery_year: null, discovery_method: 'Transit' },
    ];
    expect(discoveriesByYear(planets)).toEqual([
      { year: 2014, radial_velocity: 0, transit: 0, imaging: 1, other: 0 },
      { year: 2016, radial_velocity: 1, transit: 1, imaging: 0, other: 1 },
    ]);
  });
  it('returns [] for no planets', () => {
    expect(discoveriesByYear([])).toEqual([]);
  });
});

describe('METHODS', () => {
  it('is the four buckets in order', () => {
    expect(METHODS.map((m) => m.key)).toEqual([
      'radial_velocity',
      'transit',
      'imaging',
      'other',
    ]);
  });
});
