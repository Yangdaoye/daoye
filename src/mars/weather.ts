import {
  COMM_DELAY_MIN,
  DUST_TAU_CLEAR,
  DUST_TAU_GLOBAL,
  DUST_TAU_STORM,
  MARS_PRESSURE_PA,
  MARS_SOLAR_CONSTANT,
  SOL_SECONDS,
} from './constants'
import type { LandingSite } from './sites'

export interface WeatherState {
  sol: number
  /** Local true solar time fraction 0–1 (0=midnight). */
  lst: number
  /** Local solar zenith angle (radians). */
  zenith: number
  temperatureC: number
  pressurePa: number
  windMs: number
  windDir: number
  dustTau: number
  /** Direct + diffuse irradiance on horizontal surface (W/m²). */
  irradianceWm2: number
  visibilityM: number
  stormActive: boolean
  stormSeverity: number
  /** One-way Earth comm delay (seconds). */
  commDelaySec: number
  seasonLabel: string
}

export class WeatherSystem {
  private stormTimer = 0
  private stormDuration = 0
  private stormSeverity = 0
  private nextStormIn: number
  private windDir = Math.PI * 0.25
  private phase = Math.random() * Math.PI * 2

  private site: LandingSite

  constructor(site: LandingSite) {
    this.site = site
    this.nextStormIn = 1800 + Math.random() * 3600
  }

  reset(site: LandingSite) {
    this.site = site
    this.stormTimer = 0
    this.stormDuration = 0
    this.stormSeverity = 0
    this.nextStormIn = 1800 + Math.random() * 3600
  }

  update(simTimeSec: number, dt: number): WeatherState {
    const sol = simTimeSec / SOL_SECONDS
    const lst = ((simTimeSec % SOL_SECONDS) + SOL_SECONDS) % SOL_SECONDS / SOL_SECONDS

    // Solar hour angle from local midnight; noon at lst=0.5
    const hourAngle = (lst - 0.5) * Math.PI * 2
    const lat = (this.site.lat * Math.PI) / 180
    // Simplified season: fixed declination near equinox + slight site bias
    const decl = 0.15 * Math.sin(sol * 0.1 + this.phase)
    const sinAlt =
      Math.sin(lat) * Math.sin(decl) +
      Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle)
    const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)))
    const zenith = Math.PI / 2 - altitude

    this.tickStorm(dt)

    const baseTau = this.site.dustTau
    const dustTau =
      baseTau +
      this.stormSeverity * (DUST_TAU_STORM - DUST_TAU_CLEAR) +
      (this.stormSeverity > 0.85 ? (DUST_TAU_GLOBAL - DUST_TAU_STORM) * (this.stormSeverity - 0.85) / 0.15 : 0)

    // Diurnal temperature model
    const dayFactor = Math.max(0, Math.sin(Math.PI * Math.max(0, Math.min(1, (lst - 0.25) / 0.5))))
    const temp =
      this.site.tempLowC +
      (this.site.tempHighC - this.site.tempLowC) * (0.15 + 0.85 * dayFactor) -
      this.stormSeverity * 8

    const pressurePa =
      MARS_PRESSURE_PA *
      this.site.pressureFactor *
      (1 + 0.02 * Math.sin(lst * Math.PI * 2)) *
      (1 - this.stormSeverity * 0.03)

    this.windDir += (Math.sin(simTimeSec * 0.001) * 0.15 + (Math.random() - 0.5) * 0.02) * dt
    const windBase = 2.5 + this.site.roughness * 2
    const windMs =
      windBase +
      dayFactor * 4 +
      this.stormSeverity * 18 +
      Math.sin(simTimeSec * 0.01) * 1.5

    // Beer–Lambert-ish attenuation through dusty air + cosine incidence
    const mu = Math.max(0, Math.cos(zenith))
    const direct = MARS_SOLAR_CONSTANT * mu * Math.exp(-dustTau / Math.max(0.05, mu))
    const diffuse = MARS_SOLAR_CONSTANT * 0.08 * (1 - Math.exp(-dustTau)) * Math.max(0.05, mu + 0.2)
    const irradianceWm2 = Math.max(0, direct + diffuse)

    const visibilityM = Math.max(40, 12000 * Math.exp(-dustTau * 1.1) * (0.4 + 0.6 * (1 - this.stormSeverity)))

    // Opposition proxy oscillates with sol
    const delayFrac = 0.5 + 0.5 * Math.sin(sol * 0.07 + this.phase)
    const delayMin = COMM_DELAY_MIN.min + (COMM_DELAY_MIN.max - COMM_DELAY_MIN.min) * delayFrac

    return {
      sol,
      lst,
      zenith,
      temperatureC: temp,
      pressurePa,
      windMs,
      windDir: this.windDir,
      dustTau,
      irradianceWm2,
      visibilityM,
      stormActive: this.stormSeverity > 0.15,
      stormSeverity: this.stormSeverity,
      commDelaySec: delayMin * 60,
      seasonLabel: decl > 0.05 ? '北半球夏半年' : decl < -0.05 ? '北半球冬半年' : '分点季',
    }
  }

  private tickStorm(dt: number) {
    if (this.stormSeverity > 0) {
      this.stormTimer += dt
      const rise = Math.min(1, this.stormTimer / 120)
      const fall =
        this.stormTimer > this.stormDuration
          ? Math.max(0, 1 - (this.stormTimer - this.stormDuration) / 180)
          : 1
      this.stormSeverity = Math.min(rise, fall) * (0.55 + Math.random() * 0.05)
      if (fall <= 0) {
        this.stormSeverity = 0
        this.stormTimer = 0
        this.nextStormIn = 2400 + Math.random() * 5000
      }
      return
    }
    this.nextStormIn -= dt
    if (this.nextStormIn <= 0) {
      this.stormDuration = 400 + Math.random() * 900
      this.stormTimer = 0.01
      this.stormSeverity = 0.2
    }
  }
}
