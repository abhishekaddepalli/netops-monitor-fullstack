import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps routes/sections that require Org Admin (or Super Admin). Read-only
 * and Operator users are redirected home rather than shown a blank/broken
 * admin screen — matches the backend's org.role middleware behavior.
 */
export default function RequireRole({ role = 'org_admin', children }) {
  const { isOrgAdmin, isSuperAdmin } = useAuth();

  if (role === 'super_admin' && !isSuperAdmin) return <Navigate to="/" replace />;
  if (role === 'org_admin' && !isOrgAdmin) return <Navigate to="/" replace />;

  return children;
}
