import type { SensorPoint } from '../types/sensors';

type Props = { current: SensorPoint | null };

export default function LiveReading({ current }: Props) {
  const depth = current?.sonarDepth ?? null;
  const pressure = current?.pressure ?? null;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-4 rounded">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Live Timestamp</div>
          <div className="text-xs text-gray-600">{current ? new Date(current.timestamp).toLocaleString() : '—'}</div>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div>Lat</div>
          <div className="text-xs text-gray-600">{current?.latitude ?? '—'}</div>
          <div className="mt-2">Lon</div>
          <div className="text-xs text-gray-600">{current?.longitude ?? '—'}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg flex flex-col justify-center items-center">
          <div className="text-sm opacity-90">Sonar Depth</div>
          <div className="text-3xl font-bold mt-2">{depth !== null && depth !== undefined ? `${depth}m` : '—'}</div>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-lg flex flex-col justify-center items-center">
          <div className="text-sm opacity-90">Pressure</div>
          <div className="text-3xl font-bold mt-2">{pressure !== null && pressure !== undefined ? `${pressure}MPa` : '—'}</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">Tip: Click <span className="font-medium">Measure (append)</span> to save a point to this profile.</div>
    </div>
  );
}
