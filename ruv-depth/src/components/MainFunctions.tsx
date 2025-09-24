// src/components/MainFunctions.tsx
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { realtimeDB, firestore } from '../services/firebase';
import { ref as dbRef, onValue, off } from 'firebase/database';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { SensorReading } from '../types/sensors';

export default function MainFunctions() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const subRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (subRef.current && user) {
        off(dbRef(realtimeDB, `measurements/${user.uid}/current`));
      }
    };
  }, [user]);

  const handleConnect = () => {
    if (!user) {
      setMsg('Sign in first to subscribe to live measurements.');
      return;
    }
    const path = `measurements/${user.uid}/current`;
    const r = dbRef(realtimeDB, path);
    // subscribe
    subRef.current = onValue(r, (snap) => {
      const val = snap.val();
      if (!val) {
        setReading(null);
        return;
      }
      // expected shape: { timestamp, latitude, longitude, sonarDepth, pressure }
      setReading({
        timestamp: val.timestamp ?? Date.now(),
        latitude: val.latitude,
        longitude: val.longitude,
        sonarDepth: val.sonardepth,
        pressure: val.pressure,
      });
      setConnected(true);
      setMsg(null);
    });
  };

  const handleDisconnect = () => {
    if (!user) return;
    off(dbRef(realtimeDB, `measurements/${user.uid}/current`));
    subRef.current = null;
    setConnected(false);
    setReading(null);
  };

  const handleRecord = async () => {
    if (!user) {
      setMsg('Sign in to record a profile.');
      return;
    }
    if (!reading) {
      setMsg('No current reading to record.');
      return;
    }
    if (!title.trim()) {
      setMsg('Please give the profile a title.');
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const profilesRef = collection(firestore, 'users', user.uid, 'profiles');
      await addDoc(profilesRef, {
        title: title.trim(),
        description: description.trim(),
        reading,
        createdAt: Date.now(),
        createdAtServer: serverTimestamp(), // helpful too
      });
      setTitle('');
      setDescription('');
      setMsg('Recorded successfully.');
    } catch (err: any) {
      setMsg(err.message || 'Failed to record.');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <section className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Main Functions</h2>

      <div className="flex gap-3 mb-4">
        {!connected ? (
          <button onClick={handleConnect} className="px-4 py-2 rounded bg-green-600 text-white">
            Connect (subscribe live)
          </button>
        ) : (
          <button onClick={handleDisconnect} className="px-4 py-2 rounded bg-yellow-600 text-white">
            Disconnect
          </button>
        )}

        <button
          onClick={handleRecord}
          disabled={saving || !connected}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
        >
          {saving ? 'Recording...' : 'Record Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 border rounded">
          <h3 className="font-medium mb-2">Live Reading</h3>
          {!reading ? (
            <p className="text-sm text-gray-500">No data yet. Connect to live feed.</p>
          ) : (
            <div className="space-y-1 text-sm">
              <p>Timestamp: {new Date(reading.timestamp).toLocaleString()}</p>
              <p>Latitude: {reading.latitude ?? '—'}</p>
              <p>Longitude: {reading.longitude ?? '—'}</p>
              <p>Sonar depth: {reading.sonarDepth ?? '—'} m</p>
              <p>Pressure: {reading.pressure ?? '—'}</p>
            </div>
          )}
        </div>

        <div className="p-3 border rounded">
          <h3 className="font-medium mb-2">Profile info (saved with reading)</h3>
          <input
            className="w-full p-2 border rounded mb-2"
            placeholder="Title (e.g. River bank #1)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full p-2 border rounded mb-2"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          {msg && <div className="text-sm text-gray-700 mb-2">{msg}</div>}
        </div>
      </div>
    </section>
  );
}
