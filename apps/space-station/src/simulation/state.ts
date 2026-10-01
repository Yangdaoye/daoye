export interface SimulationState { elapsed: number; paused: boolean; speed: number; solarAngle: number; autoRotate: boolean; }
export function createState(): SimulationState { return { elapsed: 0, paused: false, speed: 1, solarAngle: 0, autoRotate: false }; }
export function advance(state: SimulationState, dt: number) { if (!state.paused) state.elapsed += Math.min(dt, .1) * state.speed; }
export function telemetry(state: SimulationState) {
  const phase = (state.elapsed / 5400) * Math.PI * 2;
  const daylight = Math.cos(phase) > -.35;
  const efficiency = Math.max(0, Math.cos(state.solarAngle * Math.PI / 180));
  return { daylight, power: daylight ? 24 * efficiency : 0, altitude: 400, velocity: 7.67, orbitProgress: (state.elapsed % 5400) / 5400 * 100 };
}
