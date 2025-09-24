import type { SensorPoint } from '../types/sensors';

type Props = { points: SensorPoint[] };

export default function RecentPoints({ points }: Props) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Recent recorded points</h3>
      {points.length === 0 ? (
        <div className="text-sm text-gray-500">No recorded points yet.</div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-auto">
          {points.map((p, i) => (
            <div key={i} className="p-2 bg-gray-50 rounded border">
              <div className="text-xs text-gray-500">{new Date(p.timestamp).toLocaleString()}</div>
              <div className="text-sm">Depth: {p.sonarDepth ?? '—'} m | Pressure: {p.pressure ?? '—'}</div>
              <div className="text-xs">{p.latitude ?? '—'}, {p.longitude ?? '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}