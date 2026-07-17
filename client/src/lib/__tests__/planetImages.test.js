import { describe, expect, it } from 'vitest';
import { planetImage } from '../planetImages';

describe('planetImage', () => {
  it('maps a known class to an image and caption', () => {
    const img = planetImage('neptune_like');
    expect(img.src).toContain('/planet-types/neptune.jpg');
    expect(img.caption).toMatch(/artist'?s concept/i);
  });

  it('returns null for unknown or null', () => {
    expect(planetImage('unknown')).toBeNull();
    expect(planetImage(null)).toBeNull();
  });

  it('maps every known size class to its image file', () => {
    expect(planetImage('rocky').src).toContain('/planet-types/rocky.jpg');
    expect(planetImage('super_earth').src).toContain(
      '/planet-types/super-earth.jpg'
    );
    expect(planetImage('neptune_like').src).toContain(
      '/planet-types/neptune.jpg'
    );
    expect(planetImage('gas_giant').src).toContain(
      '/planet-types/gas-giant.jpg'
    );
  });

  it('prefixes the image src with the Vite base URL', () => {
    expect(planetImage('rocky').src.startsWith(import.meta.env.BASE_URL)).toBe(
      true
    );
    expect(planetImage('rocky').src).toBe(
      `${import.meta.env.BASE_URL}planet-types/rocky.jpg`
    );
  });
});
