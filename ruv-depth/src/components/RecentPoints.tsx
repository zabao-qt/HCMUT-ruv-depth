import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import type { SensorPoint } from '../types/sensors';
import { pressureToDepth } from '../utils/convert';

type Props = {
  points: SensorPoint[];
  onDelete?: (point: SensorPoint) => Promise<void> | void; // called when user confirms delete
  className?: string;
};

export default function RecentPoints({ points, onDelete, className = '' }: Props) {
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});

  const handleDelete = async (p: SensorPoint) => {
    const id = (p as any).id ?? (p as any)._id ?? null;
    if (!id) {
      // If the point has no id, caller cannot delete; notify user
      if (!confirm('This point has no id and cannot be deleted from the server. Remove locally?')) return;
    }
    if (!confirm('Delete this recorded point? This cannot be undone.')) return;

    try {
      if (id) setDeletingIds(prev => ({ ...prev, [id]: true }));
      // call callback if provided
      const maybePromise = onDelete?.(p);
      if (maybePromise && typeof (maybePromise as any).then === 'function') {
        await maybePromise;
      }
      // caller is expected to update points state (optimistic remove recommended)
    } catch (err) {
      console.error('delete point err', err);
      alert('Failed to delete point. See console for details.');
    } finally {
      if (id) {
        setDeletingIds(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Recent recorded points</h3>
        <div className="text-xs text-gray-500">{points.length} total</div>
      </div>

      {points.length === 0 ? (
        <div className="text-sm text-gray-500">No recorded points yet.</div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-auto pr-2">
          {points.map((p, i) => {
            const id = (p as any).id ?? (p as any)._id ?? `idx-${i}`;
            const deleting = Boolean(deletingIds[id]);

            return (
              <div
                key={id}
                className="group relative flex items-start justify-between gap-3 p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-150"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="text-xs text-gray-400">{new Date(p.timestamp).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{p.latitude ?? '—'}, {p.longitude ?? '—'}</div>
                  </div>

                  <div className="mt-1 flex items-center gap-3">
                    {(() => {
                      const sonar = p.sonarDepth ?? null;
                      const pressure = p.pressure ?? null;
                      const pressureDepth = pressureToDepth(pressure);
                      const useTotal = pressure != null && pressure >= 0.02;

                      const depthVal = useTotal && sonar != null && pressureDepth != null
                        ? (sonar + pressureDepth).toFixed(2) + ' m'
                        : (sonar != null ? `${sonar}m` : '—');

                      return (
                        <div className="text-xs font-medium text-sky-700">
                          {useTotal ? 'Total Depth' : 'Depth'}
                          <span className="ml-2 font-semibold text-sky-900">{depthVal}</span>
                        </div>
                      );
                    })()}

                    <div className="text-xs font-medium text-amber-700">
                      Pressure
                      <span className="ml-2 font-semibold text-amber-900">{p.pressure ?? '—'}MPa</span>
                    </div>
                  </div>

                  {p.rssi !== null && p.rssi !== undefined && (
                    <div className="mt-2 text-xs text-gray-500">RSSI: <span className="font-medium text-gray-700">{p.rssi} dBm</span></div>
                  )}
                </div>

                {/* hover-revealed trash button */}
                <div className="flex items-center">
                  <button
                    onClick={() => handleDelete(p)}
                    disabled={deleting}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 inline-flex items-center justify-center rounded-md p-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                    title="Delete recorded point"
                  >
                    {deleting ? (
                      <svg className="animate-spin h-4 w-4 text-red-600" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4L8 10l-4 2z" />
                      </svg>
                    ) : (
                      <FiTrash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
