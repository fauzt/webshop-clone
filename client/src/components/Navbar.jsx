import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold text-slate-900">
          Bookstore
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              {user.role === 'ADMIN' && (
              <Link to="/admin/books" className="text-slate-700 hover:text-slate-900">
                Admin
              </Link>
              )}
              <Link to="/cart" className="text-slate-700 hover:text-slate-900">
                Cart
              </Link>
              <Link to="/orders" className="text-slate-700 hover:text-slate-900">
                Orders
              </Link>
              <span className="text-slate-400">{user.email}</span>
              <button onClick={logout} className="text-slate-700 hover:text-slate-900">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-700 hover:text-slate-900">
                Log in
              </Link>
              <Link to="/register" className="text-slate-700 hover:text-slate-900">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
