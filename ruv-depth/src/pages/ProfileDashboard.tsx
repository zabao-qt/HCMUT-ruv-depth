import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { appendPoint, deletePoints, getPoints } from '../services/api';
import type { SensorPoint } from '../types/sensors';
import type { Profile } from '../types/profiles';

import LiveReading from '../components/LiveReading';
import LiveChart from '../components/LiveChart';
import LiveMap from '../components/LiveMap';
import RecentPoints from '../components/RecentPoints';
import WifiStatus from '../components/WifiStatus';

export default function ProfileDashboard() {
  const { profileId } = useParams<{ profileId: string }>();
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const STALE_MS = 30_000;

  const [profileMeta, setProfileMeta] = useState<Profile | null>(null);
  const [current, setCurrent] = useState<SensorPoint | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [feedFresh, setFeedFresh] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [points, setPoints] = useState<SensorPoint[]>([]); // recorded points
  const [livePoints, setLivePoints] = useState<SensorPoint[]>([]); // streaming points (for chart & map)
  const [showRecorded, setShowRecorded] = useState<boolean>(false);

  // load recorded points on mount / profile change
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      try {
        const res = await getPoints(profileId, 200);
        setPoints(res.data.points || []);
      } catch (err) {
        console.error('getPoints err', err);
      }
    })();
  }, [profileId]);

  // cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.off();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

// keep feedFresh updated on a timer
  useEffect(() => {
  const interval = setInterval(() => {
    if (lastSeen === null) {
      setFeedFresh(false);
      return;
    }
    const fresh = (Date.now() - lastSeen) <= STALE_MS;
    setFeedFresh(fresh);
  }, 5000);

  return () => clearInterval(interval);
}, [lastSeen]);

  const normalizeReading = (r: any): SensorPoint => {
    const ts = r?.timestamp ?? r?.created_at ?? Date.now();
    const num = (val: any) => {
      const n = Number(val);
      return Number.isNaN(n) ? null : n;
    };
    return {
      timestamp: typeof ts === 'number' ? ts : Date.parse(String(ts)) || Date.now(),
      latitude: num(r.latitude),
      longitude: num(r.longitude),
      sonarDepth: num(r.sonarDepth ?? r.sonardepth),
      pressure: num(r.pressure),
      rssi: num(r.rssi)
    };
  };

  const handleConnect = () => {
    if (!token) { alert('Login first'); return; }
    if (socketRef.current) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('[socket] connected', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      setLastSeen(null);
      console.log('[socket] disconnected', reason);
    });

    socket.on('measurement', (payload: any) => {
      const raw = payload?.reading ?? payload;
      const sp = normalizeReading(raw);
      console.log('[socket] measurement', sp);
      setLastSeen(Date.now());
      // merge into current
      setCurrent(prev => {
        if (!prev) return sp;
        return {
          timestamp: sp.timestamp ?? prev.timestamp,
          latitude: sp.latitude ?? prev.latitude ?? null,
          longitude: sp.longitude ?? prev.longitude ?? null,
          sonarDepth: sp.sonarDepth ?? prev.sonarDepth ?? null,
          pressure: sp.pressure ?? prev.pressure ?? null,
          rssi: sp.rssi ?? prev.rssi ?? null,
        };
      });

      // append to livePoints (keep up to 300 entries)
      setLivePoints(prev => {
        const next = [sp, ...prev].slice(0, 300);
        return next;
      });
    });

    socket.on('connect_error', (err: any) => console.error('[socket] connect_error', err));
  };

  const handleDisconnect = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
    setCurrent(null);
    // setLivePoints([]);
  };

  const handleMeasure = async () => {
    if (!profileId) return;
    if (!current) { alert('No current reading'); return; }
    setSaving(true);
    try {
      const res = await appendPoint(profileId, current);
      const created = res.data.point;
      const createdSP: SensorPoint = {
        timestamp: created.timestamp,
        latitude: created.latitude ?? null,
        longitude: created.longitude ?? null,
        sonarDepth: created.sonarDepth ?? null,
        pressure: created.pressure ?? null,
      };
      setPoints(prev => [createdSP, ...prev]);
      alert('Recorded point');
    } catch (err:any) {
      console.error('appendPoint err', err);
      alert('Failed to record point');
    } finally { setSaving(false); }
  };

  const handleDeletePoint = async (p: SensorPoint) => {
    const pointId = (p as any)._id;
    if (!pointId) {
      // fallback: if no id use local remove from UI
      setPoints(prev => prev.filter(x => x !== p));
      return;
    }

    if (!profileId) return;

    // optimistic UI: remove locally first
    setPoints(prev => prev.filter(x => ((x as any).id ?? (x as any)._id) !== pointId));

    try {
      await deletePoints(profileId, pointId);
      // success: nothing else to do (already removed)
    } catch (err) {
      console.error('delete point err', err);
      alert('Failed to delete point on server — restore in UI');
      // restore (simple approach: refetch points)
      try {
        const res = await getPoints(profileId, 200);
        setPoints(res.data.points || []);
      } catch (_) {}
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white p-6 rounded shadow">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{profileMeta?.title ?? `Profile ${profileId}`}</h1>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-500">
                Live monitoring — connected: <span className="font-medium">{isConnected && feedFresh ? 'yes' : 'no'}</span>
              </p>

              {/* Wifi status: use current.rssi (live streaming) */}
              <div className="ml-3">
                <WifiStatus rssi={current?.rssi ?? null} isConnected={isConnected} feedFresh={feedFresh} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isConnected ? (
              <button onClick={handleConnect} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded shadow">Connect</button>
            ) : (
              <button onClick={handleDisconnect} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded shadow">Disconnect</button>
            )}
            <button
              onClick={handleMeasure}
              disabled={!isConnected || saving}
              title={!isConnected ? "Connect first" : ""}
              className="px-4 py-2 rounded shadow text-white 
                        bg-blue-600 hover:bg-blue-700 
                        disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
            >
              {saving ? 'Saving...' : 'Measure (append)'}
            </button>
            <button
              onClick={() => setShowRecorded(s => !s)}
              className={`px-4 py-2 rounded shadow ${showRecorded ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}
              title="Toggle recorded points on map"
            >
              {showRecorded ? 'Hide recorded' : 'Show recorded'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1">
            <LiveReading current={current} />
            <div className="mt-4">
              <RecentPoints points={points} onDelete={handleDeletePoint} />
            </div>
          </div>

          <div className="col-span-2 space-y-4">
            <div className="h-52 bg-white p-4 rounded shadow">
              <LiveChart data={livePoints} />
            </div>

            <div className="h-96 bg-white p-2 rounded shadow">
              <LiveMap liveData={livePoints} recordedData={showRecorded ? points : []} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}