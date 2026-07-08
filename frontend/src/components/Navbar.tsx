import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { storeName } from '../data'
import { useStore } from '../store/StoreContext'
import { useAuth } from '../store/AuthContext'

const logoUrl = '/logo-2.png'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/custom-order', label: 'Custom Order' },
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const { cartCount, wishlist, setCartOpen } = useStore()
  const { isAuthed } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/shop?q=${encodeURIComponent(query.trim())}`)
      setSearchOpen(false)
      setMenuOpen(false)
      setQuery('')
    }
  }

  return (
    <>
      <nav className="navbar">
        <button
          className="nav-hamburger"
          aria-label="Open menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <Link to="/" className="nav-logo" onClick={() => setMenuOpen(false)}>
          <img src={logoUrl} alt={storeName} />
          <span>BowClips</span>
        </Link>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="nav-icons">
          <button className="nav-icon-btn" aria-label="Search" onClick={() => setSearchOpen((v) => !v)}>
            🔍
          </button>
          <Link className="nav-icon-btn" to="/wishlist" aria-label="Wishlist">
            ♡
            {wishlist.length > 0 && <span className="cart-count">{wishlist.length}</span>}
          </Link>
          <Link className="nav-icon-btn" to={isAuthed ? '/account' : '/login'} aria-label="Account">
            👤
          </Link>
          <button type="button" className="nav-icon-btn" aria-label="Cart" onClick={() => setCartOpen(true)}>
            🛒
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </button>
        </div>
      </nav>

      {searchOpen && (
        <form className="nav-search" onSubmit={submitSearch}>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search bows, clips, silk…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-sm">
            Search
          </button>
        </form>
      )}
    </>
  )
}
