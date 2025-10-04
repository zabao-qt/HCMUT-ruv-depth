import type { SensorPoint } from '../types/sensors';

type Props = {
  current: SensorPoint | null;
  mode?: 'surface'|'underwater';
  pressureDepth?: number | null;
  totalDepth?: number | null;
};

export default function LiveReading({ current, mode, pressureDepth, totalDepth }: Props) {
  const depth = current?.sonarDepth ?? null;
  const pressure = current?.pressure ?? null;
  
  const SONAR_EFFECTIVE_LIMIT = 6.0;
  const depthNum = depth !== null && depth !== undefined ? Number(depth) : null;
  const sonarExceeds = depthNum !== null && depthNum > SONAR_EFFECTIVE_LIMIT;

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
        <div
          className={
            `p-4 rounded-lg text-white shadow-lg flex flex-col justify-center items-center ` +
            (sonarExceeds
              ? 'bg-gradient-to-r from-red-600 to-pink-600'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600')
          }
        >
          <div className="text-sm opacity-90">Sonar Depth</div>
          <div className="text-3xl font-bold mt-2">
            {depthNum !== null ? `${depthNum.toFixed(2)} m` : '—'}
          </div>

          {sonarExceeds && (
            <div className="mt-2 flex items-center gap-2">
              <div className="text-xs font-medium text-red-100px-2 py-1 rounded">
                Exceeds effective sensor range! Lower the sensors' level.
              </div>
            </div>
          )}
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-lg flex flex-col justify-center items-center">
          <div className="text-sm opacity-90">Pressure</div>
          <div className="text-3xl font-bold mt-2">{pressure !== null && pressure !== undefined ? `${pressure.toFixed(2)}MPa` : '—'}</div>
        </div>
        
        {mode === 'underwater' ? (
          <div className="p-4 rounded-lg bg-gray-800 text-white shadow-lg flex flex-col justify-center items-center col-span-2">
            <div className="text-sm opacity-90">Total depth ({mode})</div>
            <div className="text-3xl font-bold mt-2">{totalDepth == null ? '—' : `${totalDepth.toFixed(2)} m`}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 text-xs text-gray-500">Tip: Click <span className="font-medium">Measure</span> to save a point to this profile.</div>
    </div>
  );
}
