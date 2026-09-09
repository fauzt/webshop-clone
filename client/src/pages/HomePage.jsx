import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">Bookstore</h1>
      <p className="mt-2 text-slate-600">
        {user ? `Logged in as ${user.email}` : 'Browse the catalogue — the real catalogue UI comes next.'}
      </p>
      {!user && (
        <Link to="/login">
        <button
          className="mt-6 rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          Log in
        </button>
        </Link>
      )}
      {user && (
        <button
          onClick={logout}
          className="mt-6 rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          Log out
        </button>
      )}
    </div>
  );
}
