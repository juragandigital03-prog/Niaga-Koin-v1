import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

/** Gate for routes that require a logged-in session (e.g. Dashboard). */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
