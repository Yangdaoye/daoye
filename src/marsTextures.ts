import * as THREE from 'three'

/** Procedural Mars surface + bump maps (no external textures required). */
export function createMarsTextures(size = 1024): {
  map: THREE.CanvasTexture
  bumpMap: THREE.CanvasTexture
} {
  const mapCanvas = document.createElement('canvas')
  mapCanvas.width = size
  mapCanvas.height = size
  const mapCtx = mapCanvas.getContext('2d')!

  const bumpCanvas = document.createElement('canvas')
  bumpCanvas.width = size
  bumpCanvas.height = size
  const bumpCtx = bumpCanvas.getContext('2d')!

  const mapData = mapCtx.createImageData(size, size)
  const bumpData = bumpCtx.createImageData(size, size)

  const noise = createNoise(size)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size

      // Multi-octave noise for continents / highlands
      let n =
        noise(u * 3, v * 2) * 0.45 +
        noise(u * 8, v * 5) * 0.28 +
        noise(u * 18, v * 12) * 0.17 +
        noise(u * 40, v * 28) * 0.1

      // Valles Marineris-like canyon band
      const canyon = Math.exp(-Math.pow((v - 0.52) / 0.03, 2)) * Math.sin(u * Math.PI * 6) * 0.18
      n -= canyon * 0.55

      // Polar ice caps
      const polar = Math.max(0, 1 - v * 8) + Math.max(0, (v - 0.88) * 8)
      const ice = Math.min(1, polar * 1.2)

      // Olympus Mons / Tharsis volcano spots
      const volcanoes = [
        [0.22, 0.42, 0.035],
        [0.28, 0.4, 0.028],
        [0.33, 0.39, 0.024],
        [0.18, 0.38, 0.05],
      ] as const
      let volcano = 0
      for (const [cx, cy, r] of volcanoes) {
        const dx = (u - cx) * 1.4
        const dy = v - cy
        const d = Math.sqrt(dx * dx + dy * dy)
        volcano = Math.max(volcano, Math.max(0, 1 - d / r))
      }

      const height = THREE.MathUtils.clamp(n + volcano * 0.35 - ice * 0.15, 0, 1)

      // Color palette: deep basalt → rust → pale dust
      const deep = { r: 72, g: 28, b: 18 }
      const mid = { r: 168, g: 78, b: 42 }
      const high = { r: 210, g: 140, b: 88 }
      const iceCol = { r: 210, g: 220, b: 230 }

      let r: number
      let g: number
      let b: number
      if (height < 0.45) {
        const t = height / 0.45
        r = lerp(deep.r, mid.r, t)
        g = lerp(deep.g, mid.g, t)
        b = lerp(deep.b, mid.b, t)
      } else {
        const t = (height - 0.45) / 0.55
        r = lerp(mid.r, high.r, t)
        g = lerp(mid.g, high.g, t)
        b = lerp(mid.b, high.b, t)
      }

      // Dust streaks
      const streak = noise(u * 2, v * 60) * 18
      r = clamp255(r + streak)
      g = clamp255(g + streak * 0.6)
      b = clamp255(b + streak * 0.35)

      // Mix ice caps
      r = lerp(r, iceCol.r, ice)
      g = lerp(g, iceCol.g, ice)
      b = lerp(b, iceCol.b, ice)

      const i = (y * size + x) * 4
      mapData.data[i] = r
      mapData.data[i + 1] = g
      mapData.data[i + 2] = b
      mapData.data[i + 3] = 255

      const bump = Math.floor(height * 220 + noise(u * 50, v * 50) * 35)
      bumpData.data[i] = bump
      bumpData.data[i + 1] = bump
      bumpData.data[i + 2] = bump
      bumpData.data[i + 3] = 255
    }
  }

  mapCtx.putImageData(mapData, 0, 0)
  bumpCtx.putImageData(bumpData, 0, 0)

  const map = new THREE.CanvasTexture(mapCanvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8

  const bumpMap = new THREE.CanvasTexture(bumpCanvas)
  bumpMap.anisotropy = 4

  return { map, bumpMap }
}

function createNoise(seedSize: number): (x: number, y: number) => number {
  const grid = new Float32Array(seedSize * seedSize)
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.random() * 2 - 1
  }

  const sample = (x: number, y: number) => {
    const xi = Math.floor(x) % seedSize
    const yi = Math.floor(y) % seedSize
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const x0 = ((xi % seedSize) + seedSize) % seedSize
    const y0 = ((yi % seedSize) + seedSize) % seedSize
    const x1 = (x0 + 1) % seedSize
    const y1 = (y0 + 1) % seedSize

    const v00 = grid[y0 * seedSize + x0]
    const v10 = grid[y0 * seedSize + x1]
    const v01 = grid[y1 * seedSize + x0]
    const v11 = grid[y1 * seedSize + x1]

    const u = fade(xf)
    const v = fade(yf)
    return lerp(lerp(v00, v10, u), lerp(v01, v11, u), v)
  }

  return (u: number, v: number) => {
    // Map 0..1 UV into a stable noise field
    return (sample(u * 64, v * 64) + 1) * 0.5
  }
}

function fade(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}
