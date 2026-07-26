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

const DEG2RAD = Math.PI / 180;

// Standard equatorial (RA/Dec) + distance -> Cartesian. Distance in light-years,
// so the whole scene is in light-years to match the ring labels.
export function equatorialToXYZ(raDeg, decDeg, distanceLy) {
  const ra = raDeg * DEG2RAD;
  const dec = decDeg * DEG2RAD;
  const cosDec = Math.cos(dec);
  return {
    x: distanceLy * cosDec * Math.cos(ra),
    y: distanceLy * cosDec * Math.sin(ra),
    z: distanceLy * Math.sin(dec),
  };
}

// Max illustrative spread (light-years) applied to same-position planets so a
// multi-planet system fans into a visible cluster instead of stacking.
export const JITTER_LY = 0.15;

// Deterministic per-name offset: a small string hash seeds three pseudo-random
// components in [-JITTER_LY, JITTER_LY]. Stable across renders/filters.
export function systemJitter(planetName) {
  let h = 0;
  for (let i = 0; i < planetName.length; i += 1) {
    h = (h * 31 + planetName.charCodeAt(i)) & 0xffffffff;
  }
  const comp = (salt) => {
    const v = Math.sin(h * 0.0001 + salt) * 10000;
    return (v - Math.floor(v) - 0.5) * 2 * JITTER_LY;
  };
  return { dx: comp(1), dy: comp(2), dz: comp(3) };
}

const positionKey = (planet) =>
  `${planet.ra}|${planet.dec}|${planet.distance_ly}`;

export function neighborhoodPoints(planets) {
  // Jitter exists only to separate planets that render at the SAME point (a
  // multi-planet system). Count placeable planets per position first so we can
  // leave a solitary system at its exact RA/Dec/distance — jittering a lone
  // planet would introduce a fake ~0.15 ly/axis offset from its true spot.
  const positionCounts = new Map();
  for (const planet of planets) {
    if (planet.ra == null || planet.dec == null || planet.distance_ly == null) {
      continue;
    }
    const key = positionKey(planet);
    positionCounts.set(key, (positionCounts.get(key) ?? 0) + 1);
  }

  const points = [];
  let omitted = 0;
  for (const planet of planets) {
    if (planet.ra == null || planet.dec == null || planet.distance_ly == null) {
      omitted += 1;
      continue;
    }
    const base = equatorialToXYZ(planet.ra, planet.dec, planet.distance_ly);
    const coLocated = positionCounts.get(positionKey(planet)) > 1;
    const j = coLocated ? systemJitter(planet.name) : { dx: 0, dy: 0, dz: 0 };
    points.push({
      planet,
      x: base.x + j.dx,
      y: base.y + j.dy,
      z: base.z + j.dz,
      color: starColor(planet.star_temp_k),
      size: radiusToDotSize(planet.radius_earth),
    });
  }
  return { points, omitted };
}
