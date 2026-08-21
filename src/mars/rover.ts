import {
  BATTERY_WH,
  DRIVE_POWER_W,
  IDLE_POWER_W,
  MAX_SAFE_SLOPE_DEG,
  MARS_GRAVITY,
  O2_CAPACITY_KG,
  O2_DRIVE_KG_H,
  O2_IDLE_KG_H,
  RTG_POWER_W,
  SOLAR_ARRAY_W,
  SURFACE_DOSE_MSV_PER_SOL,
  SOL_SECONDS,
} from './constants'
import type { Terrain } from './terrain'
import type { WeatherState } from './weather'

export interface RoverInput {
  throttle: number
  steer: number
  brake: boolean
  sample: boolean
}

export interface RoverTelemetry {
  x: number
  y: number
  heading: number
  speedMs: number
  slopeDeg: number
  batteryWh: number
  batteryPct: number
  o2Kg: number
  o2Pct: number
  powerInW: number
  powerOutW: number
  solarW: number
  rtgW: number
  doseMsv: number
  wheelTempC: number
  cabinTempC: number
  traction: number
  status: string
  hazard: string | null
  samplesHeld: number
  distanceM: number
  stuck: boolean
  alive: boolean
}

export class Rover {
  x = 0
  y = 0
  heading = 0
  vx = 0
  vy = 0
  batteryWh = BATTERY_WH * 0.92
  o2Kg = O2_CAPACITY_KG
  doseMsv = 0
  wheelTempC = -40
  cabinTempC = 18
  samplesHeld = 0
  distanceM = 0
  stuck = false
  alive = true
  status = '系统正常'
  hazard: string | null = null
  private sampleCooldown = 0

  terrain: Terrain

  constructor(terrain: Terrain, startX = 0, startY = 0) {
    this.terrain = terrain
    this.x = startX
    this.y = startY
  }

  reset(terrain: Terrain, x = 0, y = 0) {
    this.terrain = terrain
    this.x = x
    this.y = y
    this.heading = 0
    this.vx = 0
    this.vy = 0
    this.batteryWh = BATTERY_WH * 0.92
    this.o2Kg = O2_CAPACITY_KG
    this.doseMsv = 0
    this.wheelTempC = -40
    this.cabinTempC = 18
    this.samplesHeld = 0
    this.distanceM = 0
    this.stuck = false
    this.alive = true
    this.status = '系统正常'
    this.hazard = null
    this.sampleCooldown = 0
  }

  update(dt: number, input: RoverInput, weather: WeatherState): RoverTelemetry {
    if (!this.alive) return this.telemetry(0, 0, 0, 0)

    const ground = this.terrain.sample(this.x, this.y)
    let traction = 1
    if (ground.isSand) traction = 0.55
    if (ground.isRock) traction = 0.75
    if (weather.stormSeverity > 0.5) traction *= 0.85

    // Power budget
    const mu = Math.max(0, Math.cos(weather.zenith))
    const solarW =
      SOLAR_ARRAY_W *
      (weather.irradianceWm2 / 586) *
      (0.55 + 0.45 * mu) *
      Math.max(0.05, 1 - weather.dustTau * 0.12)
    const rtgW = RTG_POWER_W
    const powerIn = solarW + rtgW

    const driving = Math.abs(input.throttle) > 0.05 && (!this.stuck || input.throttle < -0.05)
    let powerOut = IDLE_POWER_W
    // Thermal control load rises in extreme cold / heat
    const thermalLoad = Math.max(0, (-20 - weather.temperatureC) * 0.9) + Math.max(0, weather.temperatureC - 5) * 1.2
    powerOut += thermalLoad
    if (driving) powerOut += DRIVE_POWER_W * Math.abs(input.throttle) * (1 + ground.slopeDeg / 40)
    if (input.sample) powerOut += 90

    const net = powerIn - powerOut
    this.batteryWh = Math.max(0, Math.min(BATTERY_WH, this.batteryWh + (net * dt) / 3600))

    // O₂ consumption (crewed EVA proxy for sim tension)
    const o2Rate = driving ? O2_DRIVE_KG_H : O2_IDLE_KG_H
    this.o2Kg = Math.max(0, this.o2Kg - (o2Rate * dt) / 3600)

    // Radiation — higher during day / thin air / storms slightly modulate
    const doseRate =
      (SURFACE_DOSE_MSV_PER_SOL / SOL_SECONDS) *
      (1.05 - this.terrain.site.pressureFactor * 0.05) *
      (0.9 + 0.2 * mu)
    this.doseMsv += doseRate * dt

    // Motion under Mars gravity (affects max accel / braking)
    const gFactor = MARS_GRAVITY / 9.80665
    const maxSpeed = 4.2 * traction // m/s — Perseverance ~0.04 m/s real; scaled for playability with note
    const accel = 1.1 * gFactor * traction
    const brakeDecel = 1.8 * gFactor

    if (this.batteryWh <= 0 || this.o2Kg <= 0) {
      this.alive = false
      this.status = this.o2Kg <= 0 ? '氧气耗尽 — 任务失败' : '电池耗尽 — 任务失败'
      this.hazard = this.status
      this.vx = 0
      this.vy = 0
      return this.telemetry(powerIn, powerOut, solarW, rtgW)
    }

    const reversing = input.throttle < -0.05
    if (ground.slopeDeg > MAX_SAFE_SLOPE_DEG + 8 && !reversing) {
      this.stuck = true
      this.hazard = `坡度 ${ground.slopeDeg.toFixed(0)}° 超出稳定极限 — 按 S 倒车脱离`
    } else if (ground.slopeDeg > MAX_SAFE_SLOPE_DEG) {
      this.hazard = `警告：坡度 ${ground.slopeDeg.toFixed(0)}° 接近极限`
      traction *= 0.4
      if (reversing) this.stuck = false
    } else if (weather.stormActive && weather.stormSeverity > 0.6) {
      this.hazard = '沙尘暴：能见度与太阳能下降'
      if (ground.slopeDeg < MAX_SAFE_SLOPE_DEG - 2) this.stuck = false
    } else {
      this.hazard = null
      if (ground.slopeDeg < MAX_SAFE_SLOPE_DEG - 2) this.stuck = false
    }

    // Allow reverse escape even when flagged stuck
    const canMove = !this.stuck || reversing
    this.heading += input.steer * 1.6 * dt
    let speed = Math.hypot(this.vx, this.vy)
    if ((!canMove && !reversing) || input.brake) {
      speed = Math.max(0, speed - brakeDecel * dt)
    } else if (driving && this.batteryWh > 20) {
      const cap = reversing ? maxSpeed * 0.45 : maxSpeed
      speed = Math.min(cap, speed + accel * Math.abs(input.throttle) * dt)
    } else {
      speed = Math.max(0, speed - 0.6 * dt)
    }

    if (canMove && (Math.abs(input.throttle) > 0.05 || speed > 0.05)) {
      const moveDir = reversing ? this.heading + Math.PI : this.heading
      const spd =
        Math.abs(input.throttle) > 0.05 ? speed : speed > 0.1 ? speed * 0.92 : 0
      this.vx = Math.cos(moveDir) * spd
      this.vy = Math.sin(moveDir) * spd
    } else {
      this.vx = 0
      this.vy = 0
    }

    const nx = this.x + this.vx * dt
    const ny = this.y + this.vy * dt
    const next = this.terrain.sample(nx, ny)
    // Forward blocked on extreme slopes; reverse always attempted at reduced speed
    const slopeLimit = reversing ? MAX_SAFE_SLOPE_DEG + 22 : MAX_SAFE_SLOPE_DEG + 12
    if (next.slopeDeg < slopeLimit) {
      const dist = Math.hypot(nx - this.x, ny - this.y)
      this.x = nx
      this.y = ny
      this.distanceM += dist
      if (reversing && next.slopeDeg < MAX_SAFE_SLOPE_DEG) this.stuck = false
    } else if (!reversing) {
      this.stuck = true
      this.hazard = '地形障碍：无法前进 — 尝试转向或倒车'
    }

    // Thermal
    const targetWheel = weather.temperatureC + (driving ? 25 : 5) + weather.stormSeverity * 5
    this.wheelTempC += (targetWheel - this.wheelTempC) * Math.min(1, dt * 0.15)
    const cabinTarget = 18 + (weather.temperatureC < -60 ? -2 : 0)
    this.cabinTempC += (cabinTarget - this.cabinTempC) * Math.min(1, dt * 0.05)

    this.sampleCooldown = Math.max(0, this.sampleCooldown - dt)
    if (!this.hazard) {
      this.status = driving ? '行驶中' : weather.stormActive ? '沙尘监视模式' : '待机'
    } else {
      this.status = this.hazard
    }

    return this.telemetry(powerIn, powerOut, solarW, rtgW)
  }

  /** Called by mission when a science target is secured. */
  storeSample(): boolean {
    if (this.samplesHeld >= 8 || this.sampleCooldown > 0) return false
    this.samplesHeld += 1
    this.sampleCooldown = 4
    this.status = '样本封存完成'
    return true
  }

  private telemetry(powerIn: number, powerOut: number, solarW: number, rtgW: number): RoverTelemetry {
    const ground = this.terrain.sample(this.x, this.y)
    return {
      x: this.x,
      y: this.y,
      heading: this.heading,
      speedMs: Math.hypot(this.vx, this.vy),
      slopeDeg: ground.slopeDeg,
      batteryWh: this.batteryWh,
      batteryPct: (this.batteryWh / BATTERY_WH) * 100,
      o2Kg: this.o2Kg,
      o2Pct: (this.o2Kg / O2_CAPACITY_KG) * 100,
      powerInW: powerIn,
      powerOutW: powerOut,
      solarW,
      rtgW,
      doseMsv: this.doseMsv,
      wheelTempC: this.wheelTempC,
      cabinTempC: this.cabinTempC,
      traction: ground.isSand ? 0.55 : ground.isRock ? 0.75 : 1,
      status: this.status,
      hazard: this.hazard,
      samplesHeld: this.samplesHeld,
      distanceM: this.distanceM,
      stuck: this.stuck,
      alive: this.alive,
    }
  }
}
