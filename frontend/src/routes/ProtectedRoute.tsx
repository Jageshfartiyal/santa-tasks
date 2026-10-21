import { Navigate, Outlet, useLocation } from 'react-router';
import { Loading } from '../components/States';
import { useAuth } from '../auth/AuthContext';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Loading label="Restoring session" />;
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Login/register pages bounce already-authenticated users to the dashboard. */
export function PublicOnlyRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <Loading label="Restoring session" />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
