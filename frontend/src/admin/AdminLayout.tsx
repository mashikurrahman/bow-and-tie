import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import './admin.css'

const nav = [
  { to: '/admin', label: 'Dashboard', end: true, icon: '▦' },
  { to: '/admin/products', label: 'Products', icon: '🏷️' },
  { to: '/admin/orders', label: 'Orders', icon: '🧾' },
  { to: '/admin/customers', label: 'Customers', icon: '👥' },
  { to: '/admin/promotions', label: 'Promotions', icon: '🎯' },
  { to: '/admin/coupons', label: 'Coupons', icon: '🎟️' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

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
          {nav.map((n) => (
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
