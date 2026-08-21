export type SimState = {
  /** Martian local time of day, 0–24 */
  solHour: number
  /** Dust storm intensity 0–1 */
  dust: number
  /** Simulation speed multiplier */
  timeScale: number
  /** Camera distance from planet center */
  cameraDistance: number
  autoRotate: boolean
  stormActive: boolean
  /** When true, dust slowly settles after a storm ends */
  stormSettling: boolean
}

export type Telemetry = {
  temperatureC: number
  pressurePa: number
  windMs: number
  radiationMsv: number
  sol: number
  season: string
}

const SEASONS = ['北半球春', '北半球夏', '北半球秋', '北半球冬'] as const

export function createInitialState(): SimState {
  return {
    solHour: 9.5,
    dust: 0.18,
    timeScale: 1,
    cameraDistance: 4.2,
    autoRotate: true,
    stormActive: false,
    stormSettling: false,
  }
}

/** Advance sol clock and derive surface telemetry. */
export function tickState(state: SimState, dt: number): Telemetry {
  const hoursPerSecond = 0.35 * state.timeScale
  state.solHour = (state.solHour + dt * hoursPerSecond) % 24

  if (state.stormActive) {
    state.stormSettling = false
    state.dust = Math.min(1, state.dust + dt * 0.12)
  } else if (state.stormSettling) {
    state.dust = Math.max(0.12, state.dust - dt * 0.035)
    if (state.dust <= 0.121) {
      state.stormSettling = false
    }
  }

  return sampleTelemetry(state)
}

export function sampleTelemetry(state: SimState): Telemetry {
  const dayFactor = Math.cos(((state.solHour - 12) / 12) * Math.PI)
  // Mars: roughly -60°C night / -5°C day at mid-latitudes, colder with dust
  const baseDay = -8 - state.dust * 22
  const baseNight = -63 - state.dust * 8
  const temperatureC = lerp(baseNight, baseDay, (dayFactor + 1) / 2)

  const pressurePa = 610 + Math.sin(state.solHour * 0.5) * 40 - state.dust * 35
  const windMs = 8 + state.dust * 55 + Math.abs(Math.sin(state.solHour * 0.7)) * 6
  const radiationMsv = 0.21 + (1 - state.dust * 0.35) * (0.08 + Math.max(0, dayFactor) * 0.12)

  // Rough season from cumulative sol hours (demo loop)
  const seasonIndex = Math.floor((state.solHour / 24) * 4 + state.dust * 0.5) % 4

  return {
    temperatureC,
    pressurePa,
    windMs,
    radiationMsv,
    sol: 4821 + Math.floor(state.solHour / 24),
    season: SEASONS[seasonIndex],
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function formatTemp(c: number): string {
  return `${c.toFixed(1)}`
}

export function formatPressure(pa: number): string {
  return `${pa.toFixed(0)}`
}

export function formatWind(ms: number): string {
  return `${ms.toFixed(1)}`
}

export function formatRad(msv: number): string {
  return `${msv.toFixed(2)}`
}

export function formatSolHour(h: number): string {
  const hour = Math.floor(h)
  const min = Math.floor((h - hour) * 60)
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}
