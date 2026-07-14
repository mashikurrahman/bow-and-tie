import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useStore } from '../store/StoreContext'
import type { Address } from '../services/db'
import { usePageMeta } from '../hooks/usePageMeta'

const emptyAddr: Address = { label: 'Home', name: '', phone: '', address: '', city: 'Dhaka' }

export default function AccountPage() {
  usePageMeta({ title: 'My Account', noindex: true })
  const { user, logout, updateProfile, saveAddress, removeAddress } = useAuth()
  const { notify, wishlist } = useStore()
  const [profile, setProfile] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' })
  const [addr, setAddr] = useState<Address>(emptyAddr)
  const [showAddr, setShowAddr] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const referralLink = user.referralCode ? `${window.location.origin}/login?ref=${user.referralCode}` : ''
  const copyRef = () => {
    navigator.clipboard?.writeText(referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateProfile(profile)
    notify('Profile updated')
  }

  const addAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveAddress(addr)
    setAddr(emptyAddr)
    setShowAddr(false)
    notify('Address saved')
  }

  const setA = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddr((a) => ({ ...a, [k]: e.target.value }))

  return (
    <div className="page">
      <div className="page-head account-head">
        <div>
          <h1>Hi, {user.name.split(' ')[0]} 👋</h1>
          <p>{user.email}</p>
        </div>
        <button className="btn btn-outline" onClick={logout}>Log Out</button>
      </div>

      <div className="account-links">
        {user.role === 'admin' && (
          <Link to="/admin" className="account-tile" style={{ background: '#fceef3', borderColor: '#f3d6e0' }}><span>📊</span><strong>Admin Panel</strong><small>Manage the store</small></Link>
        )}
        <Link to="/orders" className="account-tile"><span>📦</span><strong>My Orders</strong><small>Track & view history</small></Link>
        <Link to="/wishlist" className="account-tile"><span>♡</span><strong>Wishlist</strong><small>{wishlist.length} saved</small></Link>
        <Link to="/track" className="account-tile"><span>🚚</span><strong>Track Order</strong><small>By order number</small></Link>
        <Link to="/shop" className="account-tile"><span>🛍️</span><strong>Continue Shopping</strong><small>Browse products</small></Link>
      </div>

      {user.referralCode && (
        <section className="rewards-banner">
          <div className="rewards-points">
            <span className="rewards-num">{user.points ?? 0}</span>
            <small>points</small>
            <em>= ৳{user.points ?? 0} to spend</em>
          </div>
          <div className="rewards-ref">
            <strong>🎁 Refer a friend — you both get ৳100</strong>
            <p>Share your link. When your friend places their first order, you each earn 100 points. You also earn points on every order you place.</p>
            <div className="rewards-code">
              <code>{user.referralCode}</code>
              <button className="btn btn-sm" onClick={copyRef}>{copied ? '✓ Copied!' : 'Copy invite link'}</button>
            </div>
          </div>
        </section>
      )}

      <div className="account-grid">
        <section className="account-card">
          <h3>Profile</h3>
          <form onSubmit={saveProfile}>
            <div className="field">
              <label>Name</label>
              <input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="01XXXXXXXXX" />
            </div>
            <button className="btn" type="submit">Save Profile</button>
          </form>
        </section>

        <section className="account-card">
          <div className="account-card-head">
            <h3>Saved Addresses</h3>
            <button className="btn btn-sm btn-outline" onClick={() => setShowAddr((v) => !v)}>
              {showAddr ? 'Cancel' : '+ Add'}
            </button>
          </div>

          {user.addresses.length === 0 && !showAddr && <p className="muted">No saved addresses yet.</p>}

          <div className="addr-list">
            {user.addresses.map((a) => (
              <div className="addr-item" key={a.id}>
                <div>
                  <strong>{a.label || 'Address'}</strong>
                  <p>{a.name} · {a.phone}</p>
                  <p>{a.address}, {a.city}</p>
                </div>
                <button className="cart-remove" onClick={() => a.id && removeAddress(a.id)}>Remove</button>
              </div>
            ))}
          </div>

          {showAddr && (
            <form onSubmit={addAddress} className="addr-form">
              <div className="field"><label>Label</label><input value={addr.label} onChange={setA('label')} placeholder="Home / Office" /></div>
              <div className="field-row">
                <div className="field"><label>Name *</label><input required value={addr.name} onChange={setA('name')} /></div>
                <div className="field"><label>Phone *</label><input required value={addr.phone} onChange={setA('phone')} /></div>
              </div>
              <div className="field"><label>Address *</label><input required value={addr.address} onChange={setA('address')} /></div>
              <div className="field"><label>City *</label><input required value={addr.city} onChange={setA('city')} /></div>
              <button className="btn" type="submit">Save Address</button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
