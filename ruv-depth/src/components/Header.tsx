// src/components/Header.tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow p-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold text-blue-600">RUV Depth Mapper</Link>
      {user && (
        <Link to="/profiles" className="text-sm text-gray-600 hover:underline">Profiles</Link>
      )}
      
      <div className="space-x-4 flex items-center">
        {!user ? (
          <>
            <Link to="/login" className="text-sm text-gray-700 hover:underline">Login</Link>
            <Link to="/signup" className="text-sm text-blue-500 hover:underline">Signup</Link>
          </>
        ) : (
          <>
            <span className="text-sm text-gray-700">Hi, {user.email}</span>
            <button
              onClick={() => logout()}
              className="ml-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
