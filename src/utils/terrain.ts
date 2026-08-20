/** Procedural Jezero-like height field for the interactive DEM mesh. */

export function jezeroHeight(x: number, z: number): number {
  const r = Math.hypot(x, z)
  // Broad crater bowl (~49 km mapped into ~100 unit scene)
  const bowl = -1.8 * Math.exp(-((r * r) / 2200)) + 0.15 * Math.exp(-((r - 42) ** 2) / 80)

  // Western delta fan (negative X / negative Z quadrant rise into inlet)
  const deltaCore = Math.exp(-(((x + 18) / 16) ** 2) - (((z + 22) / 14) ** 2))
  const delta = 2.4 * deltaCore + 1.1 * Math.exp(-(((x + 28) / 10) ** 2) - (((z + 6) / 18) ** 2))

  // Eastern / southern rough floor undulation (Máaz-like)
  const floorRough =
    0.22 * Math.sin(x * 0.35) * Math.cos(z * 0.28) +
    0.12 * Math.sin(x * 0.9 + z * 0.4) +
    0.08 * Math.cos(x * 1.4) * Math.sin(z * 1.1)

  // Séítah-ish ridge west of center
  const seitah = 0.55 * Math.exp(-(((x + 12) / 7) ** 2) - (((z + 1) / 9) ** 2))

  // Small Belva depression
  const belva = -0.7 * Math.exp(-(((x - 6) / 3.2) ** 2) - (((z + 22) / 3.2) ** 2))

  // Sand ripples east
  const ripples =
    0.12 * Math.sin(x * 2.8 + z * 0.3) * Math.exp(-(((x - 18) / 10) ** 2) - ((z / 12) ** 2))

  // Rim wall
  const rim = 3.8 * Math.exp(-((r - 48) ** 2) / 40) * (r > 30 ? 1 : 0.2)

  // Gentle regional tilt toward west inlet
  const tilt = -0.015 * x + 0.008 * z

  return bowl + delta + floorRough + seitah + belva + ripples + rim + tilt
}

export function surfaceNormal(x: number, z: number, eps = 0.35): [number, number, number] {
  const hL = jezeroHeight(x - eps, z)
  const hR = jezeroHeight(x + eps, z)
  const hD = jezeroHeight(x, z - eps)
  const hU = jezeroHeight(x, z + eps)
  const dx = hL - hR
  const dz = hD - hU
  const len = Math.hypot(dx, 2 * eps, dz) || 1
  return [dx / len, (2 * eps) / len, dz / len]
}
