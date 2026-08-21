import { craterField, fbm } from './noise'
import type { LandingSite } from './sites'

export interface TerrainSample {
  height: number
  slopeDeg: number
  grit: number
  isRock: boolean
  isSand: boolean
}

export class Terrain {
  readonly site: LandingSite
  readonly seed: number

  constructor(site: LandingSite) {
    this.site = site
    this.seed = Math.abs(Math.floor(site.lat * 1000 + site.lon * 10))
  }

  /** Search nearby for a gentle landing pad (rovers need low slope). */
  findLandingPad(maxRadius = 120): { x: number; y: number } {
    let best = { x: 0, y: 0, slope: Infinity }
    for (let r = 0; r <= maxRadius; r += 3) {
      const steps = r === 0 ? 1 : 12
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2
        const x = Math.cos(a) * r
        const y = Math.sin(a) * r
        const slope = this.sample(x, y).slopeDeg
        if (slope < 6) return { x, y }
        if (slope < best.slope) best = { x, y, slope }
      }
    }
    return { x: best.x, y: best.y }
  }

  heightAt(x: number, y: number): number {
    const r = this.site.roughness
    // Amplitudes tuned so typical slopes stay within rover envelopes (~0–20°)
    const base = fbm(x * 0.008, y * 0.008, this.seed, 5) * (3 + r * 10)
    const mid = fbm(x * 0.028, y * 0.028, this.seed + 7, 4) * (1.2 + r * 4)
    const fine = fbm(x * 0.1, y * 0.1, this.seed + 13, 3) * (0.35 + r * 1.1)
    const craters = craterField(x, y, this.seed + 21, this.site.craterDensity) * 0.45
    let regional = 0
    if (this.site.id === 'valles') regional = -y * 0.035 + Math.abs(x) * 0.01
    if (this.site.id === 'olympus') regional = (x + y) * 0.008
    if (this.site.id === 'gale') regional = Math.hypot(x, y) * 0.004
    return base + mid + fine + craters + regional
  }

  sample(x: number, y: number): TerrainSample {
    const h = this.heightAt(x, y)
    const eps = 1.8
    const dx = this.heightAt(x + eps, y) - this.heightAt(x - eps, y)
    const dy = this.heightAt(x, y + eps) - this.heightAt(x, y - eps)
    const slopeRad = Math.atan(Math.hypot(dx, dy) / (2 * eps))
    const slopeDeg = (slopeRad * 180) / Math.PI
    const grit = fbm(x * 0.08, y * 0.08, this.seed + 33, 3)
    const isRock = grit > 0.72 && slopeDeg > 6
    const isSand = grit < 0.38 && slopeDeg < 8
    return { height: h, slopeDeg, grit, isRock, isSand }
  }

  /** Approximate surface normal for shading. */
  normal(x: number, y: number): { nx: number; ny: number; nz: number } {
    const eps = 0.8
    const dx = this.heightAt(x + eps, y) - this.heightAt(x - eps, y)
    const dy = this.heightAt(x, y + eps) - this.heightAt(x, y - eps)
    const nx = -dx
    const ny = -dy
    const nz = 2 * eps
    const len = Math.hypot(nx, ny, nz) || 1
    return { nx: nx / len, ny: ny / len, nz: nz / len }
  }
}
