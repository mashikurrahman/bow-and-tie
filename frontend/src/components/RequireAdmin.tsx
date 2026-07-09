import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return <div className="admin-loading">Loading…</div>
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  // Admin and staff may enter the panel; per-section access is enforced below.
  if (user.role !== 'admin' && user.role !== 'staff') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
