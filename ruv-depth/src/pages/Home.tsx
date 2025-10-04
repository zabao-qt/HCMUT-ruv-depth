// src/pages/Home.tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">RUV Depth Mapper</h1>
      <p className="text-gray-600 mb-6">Collect underwater depth points with RUV and view them per-profile.</p>

      {!user ? (
        <div className="space-x-4">
          <Link to="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg">Login</Link>
          <Link to="/signup" className="px-6 py-3 bg-green-600 text-white rounded-lg">Sign Up</Link>
        </div>
      ) : (
        <div>
          <Link to="/profiles" className="px-6 py-3 bg-blue-600 text-white rounded-lg">Go to Profiles</Link>
        </div>
      )}
    </div>
  );
}
