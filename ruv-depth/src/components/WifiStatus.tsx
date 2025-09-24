// src/components/WifiStatus.tsx
import { useMemo } from 'react';
import { WifiStatus as LibWifiStatus, WifiStatusType as LibWifiStatusType } from 'react-wifi-status-indicator';

type Props = {
  rssi: number | null | undefined;
  width?: number | string;
  isConnected?: boolean;
  feedFresh?: boolean;
};

// Keep the same string labels the library expects
type LocalStatus =
  | 'Excellent'
  | 'Good'
  | 'Fair'
  | 'Poor'
  | 'Unavailable'
  | 'Error'
  | 'Searching';

// Map RSSI -> LocalStatus (MCU sentinel -127 treated as unavailable/offline)
function rssiToStatus(rssi?: number | null, isConnected = false, feedFresh = false): LocalStatus {
  if (!isConnected) return 'Unavailable';
  if (!feedFresh) return 'Searching';
  if (rssi === undefined || rssi === null) return 'Searching';
  if (rssi <= -120) return 'Unavailable'; // MCU sentinel (you publish -127)
  if (rssi >= -50) return 'Excellent';
  if (rssi >= -65) return 'Good';
  if (rssi >= -80) return 'Fair';
  return 'Poor';
}

// Wrapper component name changed so it doesn't collide with the imported `WifiStatus`
export default function WifiStatus({ rssi, width = 36,isConnected = false, feedFresh = false }: Props) {
  const status = useMemo(() => rssiToStatus(rssi, isConnected, feedFresh), [rssi, isConnected, feedFresh]);

  // Normalize width: the library accepts number or string; prefer passing the same type
  const numericWidth =
    typeof width === 'number' ? width : (String(width).trim() === '' ? 36 : width);

  // Colors keyed by local status names
  const colors: Record<LocalStatus | 'Offline' | 'Error', string> = {
    Excellent: '#10b981',
    Good: '#06b6d4',
    Fair: '#f59e0b',
    Poor: '#ef4444',
    Unavailable: '#9ca3af',
    Error: '#ef4444',
    Searching: '#6b7280',
    Offline: '#9ca3af',
  };

  const color = colors[status] ?? colors.Unavailable;

  // Convert our string status to the library's WifiStatusType value if available.
  // So try to read WifiStatusType[status]. If that's not present (edge case), fall back to the raw string.
  const libStatusProp =
    (LibWifiStatusType as any && (LibWifiStatusType as any)[status as string]) ||
    (status as any);

    let label = '—';
    if (!isConnected) label = 'Disconnected';
    else if (!feedFresh) label = 'Waiting…';
    else if (rssi === null || rssi === undefined) label = '—';
    else if (typeof rssi === 'number') label = `${rssi}dBm`;

  return (
    <div className="flex items-center gap-2" aria-live="polite" aria-label={`Wi-Fi ${status}`}>
      <div
        style={{
          width: numericWidth,
          height: numericWidth,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* pass colors/width and the library's status value */}
        <LibWifiStatus
          status={libStatusProp}
          color={color}
          errorColor={colors.Error}
          offlineColor={colors.Unavailable}
          width={numericWidth}
        />
      </div>

      <div className="flex flex-col text-right">
        <div className="text-xs text-gray-500">Wi-Fi</div>
        <div className="text-sm font-medium" style={{ color }}>
          {label}
        </div>
      </div>
    </div>
  );
}
