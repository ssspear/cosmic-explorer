// Finalized categorical palette — chosen to sit outside the size-family
// palette's occupied hues (blue/teal/amber/green) so the two systems never
// collide, using distinct violet/magenta/orange hues instead. `other` uses
// the app's own `--faint` neutral rather than the size-family's `--unknown`
// grey so the two "catch-all" buckets stay visually distinct. Dataviz-skill
// validated (lightness/chroma/contrast/CVD-safety) against this app's dark
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
