import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthed, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return <div className="page empty-state"><p>Loading…</p></div>
  }
  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}
