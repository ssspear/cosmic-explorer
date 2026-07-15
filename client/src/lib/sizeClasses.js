// Finalized categorical palette — dataviz skill's default categorical slots
// 1 (blue), 2 (aqua), 3 (amber, darkened one OKLCH lightness step from the
// skill's default #c98500 to clear 3:1 contrast on both surfaces), 4
// (green), in fixed order, with "unknown" as the documented neutral "muted"
// grey. Validated with scripts/validate_palette.js in both light (#fcfcfb)
// and dark (#1a1a19) modes, --pairs all (safe for scatter-style charts):
// lightness band PASS, chroma floor PASS, contrast PASS on both surfaces
// (>= 3:1), worst CVD ΔE 8.9 (floor band 8-12 — legal only with the
// legend/direct-label secondary encoding a size-class chart must ship).
export const SIZE_CLASSES = Object.freeze(
  [
    { key: 'rocky', label: 'Rocky', color: '#3987E5' },
    { key: 'super_earth', label: 'Super-Earth', color: '#199E70' },
    { key: 'neptune_like', label: 'Neptune-like', color: '#C68200' },
    { key: 'gas_giant', label: 'Gas giant', color: '#008300' },
    { key: 'unknown', label: 'Unknown', color: '#898781' },
  ].map((c) => Object.freeze(c))
);

const BY_KEY = new Map(SIZE_CLASSES.map((c) => [c.key, c]));

export function sizeClassMeta(key) {
  return BY_KEY.get(key) ?? BY_KEY.get('unknown');
}
