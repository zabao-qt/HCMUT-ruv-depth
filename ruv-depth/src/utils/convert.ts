// constants for pressure -> depth conversion
const PRESSURE_MULTIPLIER = 1e6; // MPa -> Pa
const RHO = 1000; // kg/m3
const G = 9.80665; // m/s2

export function pressureToDepth(pressureVal?: number | null) {
  if (pressureVal == null) return null;
  const p = Number(pressureVal);
  if (Number.isNaN(p)) return null;
  const pPa = p * PRESSURE_MULTIPLIER;
  return pPa / (RHO * G); // meters
}
