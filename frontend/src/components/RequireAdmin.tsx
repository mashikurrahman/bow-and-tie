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
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
