/** Deterministic value noise + FBM for procedural Mars terrain. */

function hash2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return n - Math.floor(n)
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

export function valueNoise2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = smoothstep(x - x0)
  const fy = smoothstep(y - y0)
  const v00 = hash2(x0, y0, seed)
  const v10 = hash2(x0 + 1, y0, seed)
  const v01 = hash2(x0, y0 + 1, seed)
  const v11 = hash2(x0 + 1, y0 + 1, seed)
  const a = v00 + (v10 - v00) * fx
  const b = v01 + (v11 - v01) * fx
  return a + (b - a) * fy
}

export function fbm(
  x: number,
  y: number,
  seed: number,
  octaves = 5,
  lacunarity = 2,
  gain = 0.5,
): number {
  let amp = 1
  let freq = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2D(x * freq, y * freq, seed + i * 19)
    norm += amp
    amp *= gain
    freq *= lacunarity
  }
  return sum / norm
}

/** Soft crater bowl: 0 at rim exterior, negative inside. */
export function craterField(
  x: number,
  y: number,
  seed: number,
  density: number,
): number {
  let h = 0
  const cells = 3 + Math.floor(density * 4)
  for (let i = 0; i < cells; i++) {
    const cx = (hash2(i, 1, seed) - 0.5) * 280
    const cy = (hash2(i, 2, seed) - 0.5) * 280
    const r = 8 + hash2(i, 3, seed) * (18 + density * 30)
    const dx = x - cx
    const dy = y - cy
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d < r * 1.3) {
      const t = d / r
      const bowl = -Math.cos(Math.min(t, 1) * Math.PI) * 0.5 - 0.5
      const rim = Math.exp(-(((t - 1) * 6) ** 2)) * 0.35
      h += (bowl * (1 - Math.min(t, 1)) + rim) * r * 0.12
    }
  }
  return h
}
