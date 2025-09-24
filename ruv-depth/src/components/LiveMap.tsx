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

type Props = { data: SensorPoint[] };

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

export default function LiveMap({ data }: Props) {
  // newest-first -> center map on most recent point that has lat/lon
  const firstWithCoord = data.find(p => p.latitude != null && p.longitude != null) ?? null;
  const initialCenter: [number, number] = firstWithCoord ? [firstWithCoord.latitude as number, firstWithCoord.longitude as number] : [0, 0];

  // Build markers (filter null coords). We take up to 200 points and reverse so older -> newer ordering on polyline
  const markers = useMemo(() => {
    return data
      .filter(p => p.latitude != null && p.longitude != null)
      .slice(0, 200)
      .reverse();
  }, [data]);

  // lat/lng tuples for polyline & bounds controller
  const positions = useMemo(() => markers.map(p => [p.latitude as number, p.longitude as number] as L.LatLngExpression), [markers]);

  const polyline: L.LatLngTuple[] = useMemo(() => positions.map(pos => [pos as L.LatLngTuple][0]), [positions]);

  return (
    <div className="w-full h-full rounded">
      <MapContainer
        center={initialCenter}
        zoom={firstWithCoord ? 12 : 2}
        style={{ height: '100%', width: '100%', borderRadius: 8 }}
        maxZoom={22}
        // when using fitBounds later, keep scrollWheelZoom and other props as you like
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />

        {/* Tell the map to recenter/fit whenever positions change */}
        <MapBoundsController positions={positions} />

        {markers.map((p, idx) => (
          <Marker key={idx} position={[p.latitude as number, p.longitude as number]}>
            <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
              <div className="text-xs">
                <div>Depth: {p.sonarDepth ?? '—'} m</div>
                <div>Pressure: {p.pressure ?? '—'}</div>
                <div className="text-gray-500">{new Date(p.timestamp).toLocaleString()}</div>
              </div>
            </Tooltip>
          </Marker>
        ))}

        {polyline.length > 1 && <Polyline positions={polyline} color="#1e40af" weight={2} opacity={0.7} />}
      </MapContainer>
    </div>
  );
}
