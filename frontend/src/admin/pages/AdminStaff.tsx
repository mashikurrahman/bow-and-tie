import { useEffect, useState } from 'react'
import { admin, type Staff } from '../../services/admin'

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard', products: 'Products', import: 'Bulk Import', orders: 'Orders',
  customers: 'Customers', promotions: 'Promotions', coupons: 'Coupons', reports: 'Reports',
  questions: 'Q&A', settings: 'Settings',
}

const empty = { name: '', email: '', password: '', permissions: ['orders', 'questions'] as string[] }

export default function AdminStaff() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [sections, setSections] = useState<string[]>([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => admin.listStaff().then((r) => { setStaff(r.staff); setSections(r.sections) })
  useEffect(() => { load() }, [])

  const toggle = (p: string) =>
    setForm((f) => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p] }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      if (editing) {
        await admin.updateStaff(editing, { name: form.name, permissions: form.permissions, ...(form.password ? { password: form.password } : {}) })
      } else {
        await admin.createStaff(form)
      }
      setForm(empty); setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const edit = (s: Staff) => { setEditing(s.id); setForm({ name: s.name, email: s.email, password: '', permissions: s.permissions }); window.scrollTo(0, 0) }
  const cancel = () => { setEditing(null); setForm(empty); setError('') }
  const remove = async (s: Staff) => { if (confirm(`Remove staff member ${s.name}?`)) { await admin.deleteStaff(s.id); load() } }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Staff &amp; Roles</h1>
        <div className="admin-crumb">Create team accounts with access to only the sections they need</div>
      </div>

      <div className="admin-grid-2b">
        <form className="admin-card" onSubmit={submit}>
          <div className="admin-card-head"><h3>{editing ? 'Edit staff member' : 'Add staff member'}</h3></div>
          {error && <div className="a-error">{error}</div>}
          <div className="a-field"><label>Name</label><input className="admin-input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="a-field"><label>Email</label><input className="admin-input" type="email" required disabled={!!editing} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
          <div className="a-field"><label>{editing ? 'New password (optional)' : 'Password'}</label><input className="admin-input" type="password" required={!editing} minLength={4} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={editing ? 'Leave blank to keep' : ''} /></div>
          <div className="a-field">
            <label>Can access</label>
            <div className="perm-grid">
              {sections.map((s) => (
                <label key={s} className={`perm-item ${form.permissions.includes(s) ? 'on' : ''}`}>
                  <input type="checkbox" checked={form.permissions.includes(s)} onChange={() => toggle(s)} />
                  {LABELS[s] ?? s}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="a-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create staff'}</button>
            {editing && <button className="a-btn ghost" type="button" onClick={cancel}>Cancel</button>}
          </div>
        </form>

        <div className="admin-card">
          <div className="admin-card-head"><h3>Team ({staff.length})</h3></div>
          <div className="staff-list">
            {staff.map((s) => (
              <div className="staff-row" key={s.id}>
                <div>
                  <strong>{s.name}</strong>
                  <span className={`pill ${s.role === 'admin' ? 'pill-purple' : 'pill-blue'}`}>{s.role}</span>
                  <div className="pid">{s.email}</div>
                  <div className="staff-perms">{s.role === 'admin' ? 'Full access' : s.permissions.map((p) => LABELS[p] ?? p).join(', ') || 'No sections'}</div>
                </div>
                {s.role !== 'admin' && (
                  <div className="staff-actions">
                    <button className="icon-btn" onClick={() => edit(s)} title="Edit">✏️</button>
                    <button className="icon-btn danger" onClick={() => remove(s)} title="Remove">🗑</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
