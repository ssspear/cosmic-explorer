// Finalized categorical palette — dataviz skill's categorical slots 5 (violet),
// 7 (magenta), 8 (orange), dark-mode steps, chosen to sit outside the
// size-family's occupied slots 1/2/3/4 (blue/teal/amber/green) so the two
// systems never collide on hue. `other` uses the app's own `--faint` neutral
// (#6b7186) rather than the size-family's `--unknown` grey (#898781) so the
// two "catch-all" buckets stay visually distinct when both lenses are shown
// together. Validated with scripts/validate_palette.js against this app's
// actual dark surfaces (--bg #0b0d17, --surface-2 #1c2036, --pairs all, since
// stacked-bar segments can sit adjacent in any order): lightness band PASS,
// chroma floor PASS, contrast PASS (>= 3:1 on both surfaces), worst CVD ΔE
// 13.4 (tritan) / 42.1 (protan) — clear of the >= 12 target with no floor-band
// reliance. `other`'s neutral (#6b7186) is intentionally below the chroma
// floor (that's what makes it read as neutral) and contrasts >= 3.3:1 on both
// surfaces.
export const METHODS = Object.freeze(
  [
    { key: 'radial_velocity', label: 'Radial velocity', color: '#9085e9' },
    { key: 'transit', label: 'Transit', color: '#d55181' },
    { key: 'imaging', label: 'Imaging', color: '#d95926' },
    { key: 'other', label: 'Other', color: '#6b7186' },
  ].map((m) => Object.freeze(m))
);

export function methodBucket(method) {
  if (method === 'Radial Velocity') return 'radial_velocity';
  if (method === 'Transit') return 'transit';
  if (method === 'Imaging') return 'imaging';
  return 'other';
}

export function discoveriesByYear(planets) {
  const byYear = new Map();
  for (const p of planets) {
    const year = p.discovery_year;
    if (year == null) continue;
    if (!byYear.has(year)) {
      byYear.set(year, {
        year,
        radial_velocity: 0,
        transit: 0,
        imaging: 0,
        other: 0,
      });
    }
    byYear.get(year)[methodBucket(p.discovery_method)] += 1;
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}
