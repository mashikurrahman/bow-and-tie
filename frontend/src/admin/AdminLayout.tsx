import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import './admin.css'

const nav = [
  { to: '/admin', label: 'Dashboard', end: true, icon: '▦', perm: 'dashboard' },
  { to: '/admin/products', label: 'Products', icon: '🏷️', perm: 'products' },
  { to: '/admin/import', label: 'Bulk Import', icon: '📦', perm: 'import' },
  { to: '/admin/orders', label: 'Orders', icon: '🧾', perm: 'orders' },
  { to: '/admin/customers', label: 'Customers', icon: '👥', perm: 'customers' },
  { to: '/admin/reports', label: 'Reports', icon: '📈', perm: 'reports' },
  { to: '/admin/promotions', label: 'Promotions', icon: '🎯', perm: 'promotions' },
  { to: '/admin/coupons', label: 'Coupons', icon: '🎟️', perm: 'coupons' },
  { to: '/admin/questions', label: 'Q&A', icon: '💬', perm: 'questions' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const perms = user?.permissions ?? []
  const isAdmin = user?.role === 'admin'
  const can = (p: string) => isAdmin || perms.includes(p)
  const visibleNav = nav.filter((n) => can(n.perm))

  const doLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="admin">
      <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
        <div className="admin-brand">
          <img className="admin-logo-img" src="/logo-2.png" alt="Bow Clips" />
          <span>BowClips</span>
        </div>

        <div className="admin-store-card">
          <img className="admin-store-mark" src="/logo-2.png" alt="" />
          <div>
            <small>Store</small>
            <strong>Bow Clips & Co.</strong>
          </div>
        </div>

        <nav className="admin-nav">
          <span className="admin-nav-section">General</span>
          {visibleNav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="admin-nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
          <span className="admin-nav-section">Tools</span>
          {isAdmin && (
            <NavLink
              to="/admin/staff"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="admin-nav-icon">🛡️</span>
              Staff &amp; Roles
            </NavLink>
          )}
          <NavLink
            to="/admin/settings"
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setOpen(false)}
          >
            <span className="admin-nav-icon">⚙️</span>
            Account & Settings
          </NavLink>
          <Link to="/" className="admin-nav-item" onClick={() => setOpen(false)}>
            <span className="admin-nav-icon">🛍️</span>
            View Store
          </Link>
        </nav>

        <div className="admin-user">
          <span className="admin-avatar">{user?.name?.[0] ?? 'A'}</span>
          <div className="admin-user-info">
            <strong>{user?.name}</strong>
            <small>Admin</small>
          </div>
          <button className="admin-logout" onClick={doLogout} title="Log out">⏻</button>
        </div>
      </aside>

      {open && <div className="admin-scrim" onClick={() => setOpen(false)} />}

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-burger" onClick={() => setOpen(true)} aria-label="Menu">☰</button>
          <div className="admin-search">
            <span>🔍</span>
            <input placeholder="Search…" />
          </div>
          <div className="admin-topbar-right">
            <span className="admin-bell">🔔</span>
            <div className="admin-topuser">
              <span className="admin-avatar sm">{user?.name?.[0] ?? 'A'}</span>
              <div>
                <strong>{user?.name}</strong>
                <small>Admin</small>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
