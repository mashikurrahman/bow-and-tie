import { useEffect, useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { auth as authApi } from '../../services/db'
import { admin } from '../../services/admin'

export default function AdminSettings() {
  const { user, updateProfile } = useAuth()
  const [tab, setTab] = useState<'account' | 'security' | 'payments'>('account')

  const [store, setStore] = useState({ bkashNumber: '', nagadNumber: '' })
  const [storeMsg, setStoreMsg] = useState('')
  const [storeBusy, setStoreBusy] = useState(false)

  useEffect(() => {
    admin.getSettings().then(setStore).catch(() => {})
  }, [])

  const saveStore = async (e: React.FormEvent) => {
    e.preventDefault()
    setStoreBusy(true)
    try {
      const saved = await admin.updateSettings(store)
      setStore(saved)
      setStoreMsg('Payment numbers saved.')
      setTimeout(() => setStoreMsg(''), 2500)
    } finally {
      setStoreBusy(false)
    }
  }

  const [profile, setProfile] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' })
  const [profileMsg, setProfileMsg] = useState('')

  const [pw, setPw] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [busy, setBusy] = useState(false)

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateProfile(profile)
    setProfileMsg('Profile updated.')
    setTimeout(() => setProfileMsg(''), 2500)
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwErr('')
    setPwMsg('')
    if (pw.newPassword !== pw.confirm) return setPwErr('New passwords do not match.')
    setBusy(true)
    try {
      await authApi.changePassword(pw.oldPassword, pw.newPassword)
      setPwMsg('Password updated.')
      setPw({ oldPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Account & Settings</h1>
        <div className="admin-crumb">Dashboard <b>› Settings</b></div>
      </div>

      <div className="settings-tabs">
        <button className={tab === 'account' ? 'active' : ''} onClick={() => setTab('account')}>Account</button>
        <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}>Security</button>
        <button className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}>Payments</button>
      </div>

      {tab === 'account' ? (
        <div className="admin-card" style={{ maxWidth: 640 }}>
          <h3 style={{ marginBottom: 16 }}>Profile Information</h3>
          {profileMsg && <div className="a-success">{profileMsg}</div>}
          <form onSubmit={saveProfile}>
            <div className="a-field"><label>Name</label><input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="a-field"><label>Email</label><input value={user?.email ?? ''} disabled /></div>
            <div className="a-field"><label>Phone</label><input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="01XXXXXXXXX" /></div>
            <button className="a-btn" type="submit">Update</button>
          </form>
        </div>
      ) : tab === 'security' ? (
        <div className="admin-card" style={{ maxWidth: 640 }}>
          <h3 style={{ marginBottom: 16 }}>Password</h3>
          {pwErr && <div className="a-error">{pwErr}</div>}
          {pwMsg && <div className="a-success">{pwMsg}</div>}
          <form onSubmit={savePassword}>
            <div className="a-field"><label>Current Password</label><input type="password" required value={pw.oldPassword} onChange={(e) => setPw((p) => ({ ...p, oldPassword: e.target.value }))} /></div>
            <div className="a-field-row">
              <div className="a-field"><label>New Password</label><input type="password" required minLength={4} value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} /></div>
              <div className="a-field"><label>Confirm Password</label><input type="password" required value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} /></div>
            </div>
            <ul className="pw-rules">
              <li>Minimum 4 characters</li>
              <li>Use a mix of letters and numbers</li>
              <li>Avoid reusing an old password</li>
            </ul>
            <button className="a-btn" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update Password'}</button>
          </form>
        </div>
      ) : (
        <div className="admin-card" style={{ maxWidth: 640 }}>
          <h3 style={{ marginBottom: 6 }}>Manual payment numbers</h3>
          <p className="admin-muted" style={{ marginBottom: 16, fontSize: '0.85rem' }}>
            The bKash / Nagad numbers customers send money to at checkout. Leave a field blank to hide that option&apos;s number.
          </p>
          {storeMsg && <div className="a-success">{storeMsg}</div>}
          <form onSubmit={saveStore}>
            <div className="a-field">
              <label>bKash number</label>
              <input value={store.bkashNumber} onChange={(e) => setStore((s) => ({ ...s, bkashNumber: e.target.value }))} placeholder="01XXXXXXXXX" />
            </div>
            <div className="a-field">
              <label>Nagad number</label>
              <input value={store.nagadNumber} onChange={(e) => setStore((s) => ({ ...s, nagadNumber: e.target.value }))} placeholder="01XXXXXXXXX" />
            </div>
            <button className="a-btn" type="submit" disabled={storeBusy}>{storeBusy ? 'Saving…' : 'Save'}</button>
          </form>
        </div>
      )}
    </div>
  )
}
