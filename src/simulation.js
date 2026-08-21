/** Mars environmental simulation model (simplified but plausible). */

const LANDING_SITES = [
  { name: '耶泽罗陨石坑', lat: 18.4, lon: 77.5 },
  { name: '奥林帕斯山麓', lat: 18.7, lon: -133.0 },
  { name: '维多利亚陨石坑', lat: -2.1, lon: -5.5 },
  { name: '乌托邦平原', lat: 25.0, lon: 110.0 },
  { name: '南极冰盖边缘', lat: -80.0, lon: 40.0 },
]

const SPEEDS = [0, 1, 8, 64, 512]

export class MarsSimulation {
  constructor() {
    this.sol = 0
    this.hour = 6
    this.speedIndex = 1
    this.latitude = 18
    this.dust = 12
    this.stormActive = false
    this.stormTimer = 0
    this.mode = 'orbit'
  }

  get speedMultiplier() {
    return SPEEDS[this.speedIndex] ?? 1
  }

  setSpeedIndex(index) {
    this.speedIndex = Math.max(0, Math.min(SPEEDS.length - 1, index))
  }

  nearestSite() {
    let best = LANDING_SITES[0]
    let bestDist = Infinity
    for (const site of LANDING_SITES) {
      const d = Math.abs(site.lat - this.latitude)
      if (d < bestDist) {
        bestDist = d
        best = site
      }
    }
    return best
  }

  update(dtSeconds) {
    if (this.speedMultiplier === 0) return

    // Mars sol ≈ 24.66 Earth hours; we map sol hours 0–24.66 onto a 0–1 day fraction.
    const hoursPerSecond = (this.speedMultiplier * 24.66) / 120
    this.hour += hoursPerSecond * dtSeconds

    while (this.hour >= 24.66) {
      this.hour -= 24.66
      this.sol += 1
    }

    if (this.stormActive) {
      this.stormTimer += dtSeconds * this.speedMultiplier
      const pulse = 55 + 35 * Math.sin(this.stormTimer * 0.08)
      this.dust = Math.min(100, Math.max(this.dust, pulse))
      if (this.stormTimer > 90) {
        this.stormActive = false
        this.stormTimer = 0
      }
    } else if (this.dust > 12) {
      this.dust = Math.max(12, this.dust - dtSeconds * this.speedMultiplier * 0.15)
    }
  }

  /** Local solar elevation in degrees for current latitude / hour. */
  sunElevation() {
    const dayFrac = this.hour / 24.66
    const solarHourAngle = (dayFrac - 0.5) * 360
    const declination = 25.19 * Math.sin((2 * Math.PI * (this.sol % 668)) / 668)
    const lat = this.latitude
    const sinEl =
      Math.sin(toRad(lat)) * Math.sin(toRad(declination)) +
      Math.cos(toRad(lat)) * Math.cos(toRad(declination)) * Math.cos(toRad(solarHourAngle))
    return toDeg(Math.asin(clamp(sinEl, -1, 1)))
  }

  telemetry() {
    const elev = this.sunElevation()
    const night = elev < 0
    const dustFactor = this.dust / 100

    // Approximate Gale crater diurnal range scaled by latitude & dust.
    const baseDay = -5 - Math.abs(this.latitude) * 0.15 - dustFactor * 8
    const baseNight = -75 - Math.abs(this.latitude) * 0.2 - dustFactor * 4
    const tNorm = clamp((elev + 10) / 70, 0, 1)
    const temp = lerp(baseNight, baseDay, smoothstep(tNorm)) + Math.sin(this.hour) * 1.2

    const pressure = 610 + Math.sin(this.sol * 0.17 + this.latitude * 0.02) * 40 - dustFactor * 25
    const wind = 8 + dustFactor * 55 + (night ? 4 : 12) + Math.abs(Math.sin(this.hour * 0.5)) * 6
    const radiation = night
      ? 0.18 + dustFactor * 0.05
      : 0.55 + (1 - dustFactor) * 0.35 + Math.max(0, elev) * 0.004
    const visibility = Math.max(0.2, 45 * (1 - dustFactor * 0.92) * (night ? 0.35 : 1))

    return {
      temp,
      pressure,
      wind,
      radiation,
      visibility,
      sunElevation: elev,
      dust: this.dust,
      night,
    }
  }

  formatSolClock() {
    const totalMinutes = (this.hour / 24.66) * 24 * 60
    const h = Math.floor(totalMinutes / 60) % 24
    const m = Math.floor(totalMinutes % 60)
    return `Sol ${this.sol} · ${pad(h)}:${pad(m)}`
  }
}

function toRad(d) {
  return (d * Math.PI) / 180
}

function toDeg(r) {
  return (r * 180) / Math.PI
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

function pad(n) {
  return String(n).padStart(2, '0')
}

export { LANDING_SITES, SPEEDS }
