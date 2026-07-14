import { describe, expect, it } from 'vitest';
import { SIZE_CLASSES, sizeClassMeta } from '../sizeClasses';

describe('sizeClasses', () => {
  it('orders families smallest to largest', () => {
    expect(SIZE_CLASSES.map((c) => c.key)).toEqual([
      'rocky',
      'super_earth',
      'neptune_like',
      'gas_giant',
      'unknown',
    ]);
  });

  it('returns metadata for a known key', () => {
    expect(sizeClassMeta('rocky').label).toBe('Rocky');
  });

  it('falls back to unknown for an unrecognized key', () => {
    expect(sizeClassMeta('bogus').key).toBe('unknown');
  });
});
