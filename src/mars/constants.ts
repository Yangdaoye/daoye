/**
 * Mars physical constants grounded in published planetary science values.
 * Sources: NASA Mars Fact Sheet, Curiosity REMS/RAD, Perseverance MEDA.
 */

/** Surface gravity (m/s²). Equatorial mean ≈ 3.72076. */
export const MARS_GRAVITY = 3.72076

/** Mean surface atmospheric pressure (Pa). Viking/Curiosity era mean ≈ 610. */
export const MARS_PRESSURE_PA = 610

/** Earth sea-level pressure for comparison (Pa). */
export const EARTH_PRESSURE_PA = 101325

/** Mean solar irradiance at Mars' semi-major axis (W/m²). ~43% of Earth's 1361. */
export const MARS_SOLAR_CONSTANT = 586

/** Length of one Martian solar day / sol (seconds). */
export const SOL_SECONDS = 88775.244

/** Mean surface air temperature (°C). */
export const MEAN_TEMP_C = -63

/** Typical diurnal temperature swing at equatorial sites (°C amplitude). */
export const DIURNAL_AMPLITUDE_C = 40

/** Approximate surface ionizing dose rate without habitat (mSv/sol). Curiosity RAD ≈ 0.64 mGy/day ≈ 0.67 mSv/sol. */
export const SURFACE_DOSE_MSV_PER_SOL = 0.67

/** Atmospheric composition (volume mixing ratios). */
export const ATMOSPHERE = {
  co2: 0.951,
  n2: 0.026,
  ar: 0.019,
  o2: 0.0016,
  co: 0.0006,
} as const

/** One-way light-time Earth↔Mars extremes (minutes). */
export const COMM_DELAY_MIN = { min: 3.1, max: 22.4 } as const

/** Typical clear-sky aerosol optical depth (tau). */
export const DUST_TAU_CLEAR = 0.3

/** Regional dust storm optical depth. */
export const DUST_TAU_STORM = 3.5

/** Global dust storm optical depth (extreme). */
export const DUST_TAU_GLOBAL = 5.5

/** Rover max safe slope (degrees) — Perseverance design envelope ~30°. */
export const MAX_SAFE_SLOPE_DEG = 25

/** Wheel drive power draw baseline (W) while rolling on flat ground. */
export const DRIVE_POWER_W = 180

/** Idle avionics + thermal keep-alive (W). */
export const IDLE_POWER_W = 55

/** RTG continuous electrical output proxy for Perseverance-class (W). MMRTG ~110 W BOL. */
export const RTG_POWER_W = 110

/** Solar array nameplate at Mars noon, clear sky, 0° incidence (W). */
export const SOLAR_ARRAY_W = 420

/** Cabin / suit O₂ tank capacity (kg). */
export const O2_CAPACITY_KG = 4.2

/** Metabolic O₂ consumption while driving (kg/h). */
export const O2_DRIVE_KG_H = 0.048

/** Metabolic O₂ consumption while idle (kg/h). */
export const O2_IDLE_KG_H = 0.028

/** Battery usable capacity (Wh). */
export const BATTERY_WH = 2400

/** World scale: one map unit ≈ meters. */
export const METERS_PER_UNIT = 1

/** Simulation time scale options (sim seconds per real second). */
export const TIME_SCALES = [1, 10, 60, 600] as const

export function pressurePercentOfEarth(pa = MARS_PRESSURE_PA): number {
  return (pa / EARTH_PRESSURE_PA) * 100
}

export function earthGFraction(g = MARS_GRAVITY): number {
  return g / 9.80665
}
