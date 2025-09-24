import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { SensorPoint } from '../types/sensors';

type Props = { data: SensorPoint[] };

function timeLabel(ts: number) {
  try { return new Date(ts).toLocaleTimeString(); } catch(e) { return String(ts); }
}

export default function LiveChart({ data }: Props) {
  // recharts expects data in ascending order for x; our livePoints are newest-first, so reverse
  const chartData = [...data].reverse().map(p => ({
    time: timeLabel(p.timestamp),
    depth: p.sonarDepth ?? null
  }));

  return (
    <div className="w-full h-full">
      <h3 className="text-sm font-medium mb-2">Sonar Depth (live)</h3>
      {chartData.length === 0 ? (
        <div className="text-sm text-gray-500">Waiting for live data...</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis domain={["auto","auto"]} />
            <Tooltip />
            <Line type="monotone" dataKey="depth" stroke="#1e40af" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
