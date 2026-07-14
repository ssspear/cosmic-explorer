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
});
