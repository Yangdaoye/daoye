import type { LandingSite } from '../mars/sites'
import type { Terrain } from '../mars/terrain'
import type { WeatherState } from '../mars/weather'
import type { RoverTelemetry } from '../mars/rover'
import type { ScienceTarget } from '../mars/mission'

export interface RenderFrame {
  terrain: Terrain
  weather: WeatherState
  rover: RoverTelemetry
  targets: ScienceTarget[]
  site: LandingSite
  camX: number
  camY: number
  time: number
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function skyColor(weather: WeatherState): [number, number, number] {
  const day = Math.max(0, Math.cos(weather.zenith))
  const dusk = Math.max(0, 1 - Math.abs(weather.zenith - Math.PI / 2) * 2)
  // Martian sky: butterscotch / pinkish by day from dust scattering; deep blue-black at night
  const storm = weather.stormSeverity
  const r = lerp(12, lerp(194, 120, storm), day) + dusk * 40
  const g = lerp(10, lerp(130, 90, storm), day) + dusk * 20
  const b = lerp(18, lerp(78, 55, storm), day) + dusk * 10
  return [r, g, b]
}

function groundColor(
  grit: number,
  height: number,
  shade: number,
  sand: boolean,
  rock: boolean,
): [number, number, number] {
  let r = 140 + grit * 40 + height * 0.4
  let g = 72 + grit * 25 + height * 0.2
  let b = 42 + grit * 10
  if (sand) {
    r += 25
    g += 18
    b += 5
  }
  if (rock) {
    r -= 25
    g -= 15
    b -= 8
  }
  r *= shade
  g *= shade
  b *= shade
  return [r, g, b]
}

export class MarsRenderer {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private dust: { x: number; y: number; z: number; v: number }[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unsupported')
    this.ctx = ctx
    for (let i = 0; i < 180; i++) {
      this.dust.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        v: 0.02 + Math.random() * 0.08,
      })
    }
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.canvas.width = Math.floor(cssW * dpr)
    this.canvas.height = Math.floor(cssH * dpr)
    this.canvas.style.width = `${cssW}px`
    this.canvas.style.height = `${cssH}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  render(frame: RenderFrame) {
    const ctx = this.ctx
    const cssW = this.canvas.clientWidth
    const cssH = this.canvas.clientHeight
    if (cssW === 0 || cssH === 0) return

    const { weather, terrain, rover, targets, time } = frame
    const sky = skyColor(weather)

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, cssH * 0.45)
    grad.addColorStop(0, `rgb(${sky[0] * 0.55},${sky[1] * 0.5},${sky[2] * 0.7})`)
    grad.addColorStop(0.55, `rgb(${sky[0]},${sky[1]},${sky[2]})`)
    grad.addColorStop(1, `rgb(${sky[0] * 1.05},${sky[1] * 0.9},${sky[2] * 0.7})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, cssW, cssH)

    // Soft sun / Phobos proxy
    const day = Math.max(0, Math.cos(weather.zenith))
    if (day > 0.02) {
      const sunX = cssW * (0.5 + Math.sin((weather.lst - 0.5) * Math.PI * 2) * 0.35)
      const sunY = cssH * (0.42 - day * 0.28)
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 90)
      sunGrad.addColorStop(0, `rgba(255,220,160,${0.9 * day})`)
      sunGrad.addColorStop(0.2, `rgba(255,170,100,${0.35 * day})`)
      sunGrad.addColorStop(1, 'rgba(255,140,80,0)')
      ctx.fillStyle = sunGrad
      ctx.beginPath()
      ctx.arc(sunX, sunY, 90, 0, Math.PI * 2)
      ctx.fill()
    }

    // Distant haze horizon line
    const horizon = cssH * 0.42
    const haze = ctx.createLinearGradient(0, horizon - 40, 0, horizon + 80)
    haze.addColorStop(0, `rgba(${sky[0]},${sky[1]},${sky[2]},0)`)
    haze.addColorStop(0.5, `rgba(180,110,70,${0.25 + weather.dustTau * 0.08})`)
    haze.addColorStop(1, `rgba(120,70,45,0)`)
    ctx.fillStyle = haze
    ctx.fillRect(0, horizon - 40, cssW, 140)

    const scale = 4.2 // px per meter
    const camX = frame.camX
    const camY = frame.camY

    // Terrain tiles
    const viewR = Math.hypot(cssW, cssH) / scale + 20
    const step = 8
    const minX = Math.floor((camX - viewR) / step) * step
    const maxX = camX + viewR
    const minY = Math.floor((camY - viewR) / step) * step
    const maxY = camY + viewR

    for (let gy = minY; gy < maxY; gy += step) {
      for (let gx = minX; gx < maxX; gx += step) {
        const wx = gx
        const wy = gy
        const sample = terrain.sample(wx, wy)
        const n = terrain.normal(wx, wy)
        const sunDir = { x: 0.45, y: -0.3, z: 0.84 }
        const shade = Math.max(0.25, n.nx * sunDir.x + n.ny * sunDir.y + n.nz * sunDir.z)
        const col = groundColor(sample.grit, sample.height, shade, sample.isSand, sample.isRock)
        // Dust storm washes color
        const wash = weather.stormSeverity * 0.35
        const r = lerp(col[0], 160, wash)
        const g = lerp(col[1], 110, wash)
        const b = lerp(col[2], 70, wash)

        const sx = (wx - camX) * scale + cssW / 2
        const sy = (wy - camY) * scale + cssH * 0.62 - sample.height * 0.35

        // Skip offscreen
        if (sx < -20 || sy < horizon - 10 || sx > cssW + 20 || sy > cssH + 20) continue

        ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`
        ctx.fillRect(sx, sy, step * scale + 1.2, step * scale + 1.2)

        // Subtle rock flecks
        if (sample.isRock) {
          ctx.fillStyle = `rgba(40,25,18,${0.35 + sample.grit * 0.3})`
          ctx.fillRect(sx + 2, sy + 2, 2.5, 2.5)
        }
      }
    }

    // Science markers
    for (const t of targets) {
      const sx = (t.x - camX) * scale + cssW / 2
      const sy = (t.y - camY) * scale + cssH * 0.62 - terrain.heightAt(t.x, t.y) * 0.35
      if (sx < 0 || sy < horizon || sx > cssW || sy > cssH) continue
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.004 + t.x)
      ctx.beginPath()
      ctx.arc(sx, sy, t.collected ? 4 : 6 + pulse * 2, 0, Math.PI * 2)
      ctx.fillStyle = t.collected ? 'rgba(120,160,120,0.7)' : `rgba(240,200,90,${0.55 + pulse * 0.35})`
      ctx.fill()
      if (!t.collected) {
        ctx.strokeStyle = 'rgba(255,230,140,0.8)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.font = '600 11px "IBM Plex Mono", monospace'
        ctx.fillStyle = 'rgba(255,236,190,0.9)'
        ctx.fillText(t.label, sx + 10, sy - 6)
      }
    }

    // Rover
    const rx = (rover.x - camX) * scale + cssW / 2
    const ry = (rover.y - camY) * scale + cssH * 0.62 - terrain.heightAt(rover.x, rover.y) * 0.35
    ctx.save()
    ctx.translate(rx, ry)
    ctx.rotate(rover.heading + Math.PI / 2)
    // body
    ctx.fillStyle = '#c5ccd4'
    ctx.strokeStyle = '#2a2420'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(-10, -14, 20, 28, 3)
    ctx.fill()
    ctx.stroke()
    // mast
    ctx.fillStyle = '#8a9098'
    ctx.fillRect(-2, -22, 4, 10)
    ctx.fillStyle = '#d8dee6'
    ctx.fillRect(-5, -26, 10, 5)
    // wheels
    ctx.fillStyle = '#3a342f'
    for (const [wx, wy] of [[-12, -10], [8, -10], [-12, 8], [8, 8], [-12, -1], [8, -1]]) {
      ctx.fillRect(wx, wy, 5, 8)
    }
    // solar / RTG hint
    ctx.fillStyle = '#2c4a6e'
    ctx.fillRect(-8, -6, 16, 10)
    ctx.restore()

    // Heading ring
    ctx.beginPath()
    ctx.arc(rx, ry, 22, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,220,160,0.25)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Dust particles
    const wind = weather.windDir
    const dustAmt = 0.3 + weather.dustTau * 0.15 + weather.stormSeverity * 0.7
    for (const p of this.dust) {
      p.x += Math.cos(wind) * p.v * dustAmt * 0.015
      p.y += Math.sin(wind) * p.v * dustAmt * 0.01
      if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
        p.x = Math.random()
        p.y = Math.random()
      }
      const alpha = (0.08 + p.z * 0.2) * dustAmt
      ctx.fillStyle = `rgba(210,160,110,${alpha})`
      ctx.fillRect(p.x * cssW, p.y * cssH, 2 + p.z * 3, 1 + p.z)
    }

    // Storm veil
    if (weather.stormSeverity > 0.1) {
      ctx.fillStyle = `rgba(160,110,70,${weather.stormSeverity * 0.28})`
      ctx.fillRect(0, 0, cssW, cssH)
    }

    // Night vignette
    if (day < 0.35) {
      ctx.fillStyle = `rgba(4,3,8,${(0.35 - day) * 1.4})`
      ctx.fillRect(0, 0, cssW, cssH)
    }

    // Visibility fog distance cue
    const fog = Math.max(0, 1 - weather.visibilityM / 8000)
    if (fog > 0.05) {
      ctx.fillStyle = `rgba(${sky[0]},${sky[1]},${sky[2]},${fog * 0.45})`
      ctx.fillRect(0, 0, cssW, cssH)
    }
  }
}
