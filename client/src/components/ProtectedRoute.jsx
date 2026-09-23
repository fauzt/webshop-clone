import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Wrap any route element that needs a logged-in user:
//   <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
// Pass requireRole="ADMIN" for admin-only pages (e.g. managing the catalogue).
export function ProtectedRoute({ children, requireRole }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
