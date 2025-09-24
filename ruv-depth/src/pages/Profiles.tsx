// src/pages/Profiles.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listProfiles, createProfile, deleteProfile } from '../services/api';
import type { Profile } from '../types/profiles';
import { getId } from '../utils/id';

export default function Profiles() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setProfiles([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await listProfiles();
        const items: Profile[] = res.data?.profiles || [];
        setProfiles(items);
      } catch (err: any) {
        console.error(err);
        setError(err?.response?.data?.error || 'Failed to load profiles');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleCreate = async () => {
    if (!title.trim()) {
      setMsg('Please enter a title for the profile.');
      return;
    }
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await createProfile(title.trim(), description.trim());
      const p: Profile = res.data.profile;
      setProfiles((prev) => [p, ...prev]);
      setTitle('');
      setDescription('');
      setMsg('Profile created.');
      const id = getId(p);
      if (id) navigate(`/profiles/${id}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || 'Failed to create profile');
    } finally {
      setActionLoading(false);
      setTimeout(() => setMsg(null), 2500);
    }
  };

  const handleDelete = async (profileId?: string) => {
    if (!profileId) return;
    if (!confirm('Delete this profile and all its points? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await deleteProfile(profileId);
      setProfiles((prev) => prev.filter((p) => getId(p) !== profileId));
      setMsg('Profile deleted.');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || 'Failed to delete profile');
    } finally {
      setActionLoading(false);
      setTimeout(() => setMsg(null), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-lg p-6 shadow">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Profiles</h1>
            <p className="text-sm text-gray-500">Create a profile for each location / survey. Click a profile to open its dashboard.</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Signed in as</div>
            <div className="font-medium">{user?.email}</div>
          </div>
        </header>

        <section className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="col-span-2 p-3 border rounded"
              placeholder="Profile title (e.g. River bank #1)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button
              onClick={handleCreate}
              disabled={actionLoading}
              className="p-3 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {actionLoading ? 'Creating...' : 'Create Profile'}
            </button>
            <textarea
              className="col-span-3 p-3 border rounded mt-2"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {msg && <div className="mt-3 text-sm text-green-700">{msg}</div>}
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </section>

        <section className="mt-8">
          {loading ? (
            <div className="text-sm text-gray-500">Loading profiles...</div>
          ) : profiles.length === 0 ? (
            <div className="text-sm text-gray-500">No profiles yet. Create one above to get started.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((p) => {
                const id = getId(p);
                return (
                  <div key={id} className="p-4 bg-gray-50 rounded shadow-sm flex justify-between">
                    <div>
                      <Link to={`/profiles/${id}`} className="text-lg font-semibold text-blue-600 hover:underline">
                        {p.title}
                      </Link>
                      <p className="text-sm text-gray-600 mt-1">{p.description}</p>
                      <p className="text-xs text-gray-500 mt-2">Created: {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</p>
                    </div>

                    <div className="flex flex-col gap-2 items-end">
                      <button
                        onClick={() => navigate(`/profiles/${id}`)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDelete(id)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                        disabled={actionLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
