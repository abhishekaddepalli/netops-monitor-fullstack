import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoading } from './ui/Spinner';

/** Wraps routes that require a logged-in user. Redirects to /login otherwise. */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
