import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import FullPageLoader from './FullPageLoader';

/** Login/register pages: a user who is already signed in goes straight to the dashboard. */
export default function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
