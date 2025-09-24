import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { SensorPoint } from '../types/sensors';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons when using webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png'
});

type Props = {
  liveData: SensorPoint[];
  recordedData?: SensorPoint[];
};

function MapBoundsController({ positions }: { positions: L.LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (!positions || positions.length === 0) {
      // No markers — optionally reset view to a default
      // map.setView([0, 0], 2); // uncomment if you want it to recenter when empty
      return;
    }

    if (positions.length === 1) {
      // Single marker: center on it and choose a good zoom
      const latlng = positions[0] as L.LatLngExpression;
      // A conservative zoom that shows context; adjust to taste
      map.flyTo(latlng, 14, { animate: true, duration: 0.8 });
      return;
    }

    // Multiple markers: fit bounding box with padding
    const bounds = L.latLngBounds(positions as L.LatLngExpression[]);
    // If bounds are extremely tight (points almost same), expand a tiny bit so fitBounds doesn't zoom too far
    if (bounds.isValid()) {
      map.flyToBounds(bounds.pad(0.15), { animate: true, duration: 0.8 });
    }
  // Re-run when positions array identity changes (positions is memoized in parent)
  }, [map, positions]);

  return null;
}

export default function LiveMap({ liveData, recordedData = [] }: Props) {
  // pick an initial center: most recent live point first, else recorded, else 0,0
  const firstWithCoord =
    liveData.find(p => p.latitude != null && p.longitude != null)
    ?? recordedData.find(p => p.latitude != null && p.longitude != null)
    ?? null;

  const initialCenter: [number, number] = firstWithCoord ? [firstWithCoord.latitude as number, firstWithCoord.longitude as number] : [0, 0];

  // prepare live markers (limit and order)
  const liveMarkers = useMemo(() => {
    return liveData
      .filter(p => p.latitude != null && p.longitude != null)
      .slice(0, 200)
      .reverse(); // oldest -> newest (polyline order)
  }, [liveData]);

  // recorded markers (displayed when passed)
  const recordedMarkers = useMemo(() => {
    return (recordedData || [])
      .filter(p => p.latitude != null && p.longitude != null)
      .slice(0, 1000) // allow more recorded points if desired
      .reverse();
  }, [recordedData]);

  const livePositions = useMemo(() => liveMarkers.map(p => [p.latitude as number, p.longitude as number] as L.LatLngExpression), [liveMarkers]);
  const recordedPositions = useMemo(() => recordedMarkers.map(p => [p.latitude as number, p.longitude as number] as L.LatLngExpression), [recordedMarkers]);

  const polyline: L.LatLngTuple[] = useMemo(() => livePositions.map(pos => [pos as L.LatLngTuple][0]), [livePositions]);
  
  // choose combined positions for bounds: prefer livePositions, but include recorded if present and follow mode is off
  const combinedForBounds = useMemo(() => {
    // If there are live positions, center/focus on those; otherwise use recorded
    if (livePositions.length > 0) return livePositions;
    return recordedPositions;
  }, [livePositions, recordedPositions]);

  return (
    <div className="w-full h-full rounded">
      <MapContainer
        center={initialCenter}
        zoom={firstWithCoord ? 12 : 2}
        style={{ height: '100%', width: '100%', borderRadius: 8 }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* controller uses the combined positions to fit/center the map */}
        <MapBoundsController positions={combinedForBounds} />

        {/* live markers (blue marker icons) */}
        {liveMarkers.map((p, idx) => (
          <Marker key={`live-${idx}`} position={[p.latitude as number, p.longitude as number]}>
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <div className="text-xs">
                <div className="font-semibold text-blue-600">Live</div>
                <div>Depth: {p.sonarDepth ?? '—'} m</div>
                <div>Pressure: {p.pressure ?? '—'}</div>
                <div className="text-gray-500">{new Date(p.timestamp).toLocaleString()}</div>
              </div>
            </Tooltip>
          </Marker>
        ))}

        {/* recorded markers (red circle markers) */}
        {recordedMarkers.map((p, idx) => (
          <Marker
            key={`rec-${idx}`}
            position={[p.latitude as number, p.longitude as number]}
            eventHandlers={{
              add: (e) => {
                const iconEl = (e.target as any)._icon as HTMLElement | null;
                if (iconEl) iconEl.classList.add("recorded-hue");
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <div className="text-xs">
                <div className="font-semibold text-red-600">Recorded</div>
                <div>Depth: {p.sonarDepth ?? '—'} m</div>
                <div>Pressure: {p.pressure ?? '—'}</div>
                <div className="text-gray-500">{new Date(p.timestamp).toLocaleString()}</div>
              </div>
            </Tooltip>
          </Marker>
        ))}

        {/* polyline only for live data */}
        {polyline.length > 1 && <Polyline positions={polyline} color="#1e40af" weight={2} opacity={0.85} />}
      </MapContainer>
    </div>
  );
}