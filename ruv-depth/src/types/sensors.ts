// src/types/sensors.ts
export interface SensorPoint {
  timestamp: number; // epoch ms
  latitude?: number | null;
  longitude?: number | null;
  sonarDepth?: number | null; // meters
  pressure?: number | null;    // raw or converted to meters
  rssi?: number | null;
}
