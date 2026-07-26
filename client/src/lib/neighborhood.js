// Illustrative star colors keyed to temperature bands (Kelvin). These are
// natural blackbody-ish hues, legible on the #0b0d17 space background; tune
// during the visual pass. Not a categorical palette — no CVD constraint.
export const STAR_COLORS = Object.freeze({
  mDwarf: '#ff9a5a', // < 3900 K  — cool red/orange dwarfs
  kDwarf: '#ffc06b', // 3900–5300 — orange
  sun: '#ffe9a8', //    5300–6000 — sun-like yellow-white
  fWhite: '#eef0ff', // 6000–7500 — white
  aHot: '#cdd8ff', //   >= 7500    — blue-white
  unknown: '#8b93a7', // no temperature
});

export function starColor(teffK) {
  if (teffK == null) return STAR_COLORS.unknown;
  if (teffK < 3900) return STAR_COLORS.mDwarf;
  if (teffK < 5300) return STAR_COLORS.kDwarf;
  if (teffK < 6000) return STAR_COLORS.sun;
  if (teffK < 7500) return STAR_COLORS.fWhite;
  return STAR_COLORS.aHot;
}

export const DOT_SIZE_MIN = 0.5;
export const DOT_SIZE_MAX = 2.5;

// Compress a wide radius range (Earth radii, ~0.3 to ~25) into a legible dot
// scale via a log curve, clamped so nothing vanishes or dominates.
export function radiusToDotSize(radiusEarth) {
  if (radiusEarth == null || radiusEarth <= 0) return DOT_SIZE_MIN;
  const scaled = DOT_SIZE_MIN + Math.log10(1 + radiusEarth) * 1.1;
  return Math.min(DOT_SIZE_MAX, Math.max(DOT_SIZE_MIN, scaled));
}
