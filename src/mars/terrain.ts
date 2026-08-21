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

  heightAt(x: number, y: number): number {
    const r = this.site.roughness
    const base = fbm(x * 0.012, y * 0.012, this.seed, 5) * (12 + r * 40)
    const mid = fbm(x * 0.045, y * 0.045, this.seed + 7, 4) * (4 + r * 14)
    const fine = fbm(x * 0.18, y * 0.18, this.seed + 13, 3) * (1 + r * 3)
    const craters = craterField(x, y, this.seed + 21, this.site.craterDensity)
    // Broad regional tilt for canyon / volcano sites
    let regional = 0
    if (this.site.id === 'valles') regional = -y * 0.08 + Math.abs(x) * 0.02
    if (this.site.id === 'olympus') regional = (x + y) * 0.015
    if (this.site.id === 'gale') regional = Math.hypot(x, y) * 0.01
    return base + mid + fine + craters + regional
  }

  sample(x: number, y: number): TerrainSample {
    const h = this.heightAt(x, y)
    const eps = 0.6
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
