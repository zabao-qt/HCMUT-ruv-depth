// src/types/profile.ts
import type { SensorPoint } from './sensors';

export interface Profile {
  // server uses Mongo _id; keep both for convenience
  _id?: string;
  id?: string;

  title: string;
  description?: string;
  createdAt: number;
  updatedAt?: number;

  // points stored separately (in server) and often fetched separately
  // but include a permissive type so we can store either keyed object or array
  points?: Record<string, SensorPoint> | SensorPoint[];
}
