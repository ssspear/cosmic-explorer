// Placeholder categorical palette — finalize with the dataviz skill (run its
// palette validator) before shipping. Colorblind-safe, ordered by size.
export const SIZE_CLASSES = [
  { key: 'rocky', label: 'Rocky', color: '#4E79A7' },
  { key: 'super_earth', label: 'Super-Earth', color: '#59A14F' },
  { key: 'neptune_like', label: 'Neptune-like', color: '#EDC948' },
  { key: 'gas_giant', label: 'Gas giant', color: '#E15759' },
  { key: 'unknown', label: 'Unknown', color: '#BAB0AC' },
];

const BY_KEY = new Map(SIZE_CLASSES.map((c) => [c.key, c]));

export function sizeClassMeta(key) {
  return BY_KEY.get(key) ?? BY_KEY.get('unknown');
}
