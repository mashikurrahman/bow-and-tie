import { useEffect, useState } from 'react'
import { admin, type Coupon } from '../../services/admin'
import StatusPill from '../components/StatusPill'

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [form, setForm] = useState({ code: '', percent: 10, label: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => admin.listCoupons().then((r) => setCoupons(r.coupons))
  useEffect(() => { load() }, [])

  const randomCode = () =>
    setForm((f) => ({ ...f, code: 'BOW' + Math.random().toString(36).slice(2, 6).toUpperCase() }))

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await admin.createCoupon({ code: form.code.toUpperCase(), percent: form.percent, label: form.label })
      setForm({ code: '', percent: 10, label: '' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (c: Coupon) => { await admin.toggleCoupon(c.code, !c.active); load() }
  const remove = async (code: string) => {
    if (!confirm(`Delete coupon ${code}?`)) return
    await admin.deleteCoupon(code); load()
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Coupons</h1>
        <div className="admin-crumb">Discount codes customers enter at checkout</div>
      </div>

      <div className="admin-grid-2b">
        <form className="admin-card" onSubmit={create}>
          <div className="admin-card-head"><h3>Generate Coupon</h3></div>
          {error && <div className="a-error">{error}</div>}
          <div className="a-field">
            <label>Code</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="admin-input" required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="EIDBONUS" />
              <button type="button" className="a-btn ghost" onClick={randomCode}>🎲</button>
            </div>
          </div>
          <div className="a-field"><label>Discount %</label><input className="admin-input" type="number" min="1" max="90" value={form.percent} onChange={(e) => setForm((f) => ({ ...f, percent: Number(e.target.value) }))} /></div>
          <div className="a-field"><label>Label (internal)</label><input className="admin-input" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Eid campaign" /></div>
          <button className="a-btn" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Coupon'}</button>
        </form>

        <div className="admin-card">
          <div className="admin-card-head"><h3>All Coupons ({coupons.length})</h3></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Code</th><th>Off</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.code}>
                    <td className="cell-strong">{c.code}{c.label && <div className="pid">{c.label}</div>}</td>
                    <td>{c.percent}%</td>
                    <td><StatusPill status={c.active ? 'Delivered' : 'Cancelled'} label={c.active ? 'Active' : 'Disabled'} /></td>
                    <td>
                      <button className="icon-btn" onClick={() => toggle(c)} title="Toggle">{c.active ? '⏸' : '▶'}</button>
                      <button className="icon-btn danger" onClick={() => remove(c.code)} title="Delete">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {coupons.length === 0 && <p className="admin-empty">No coupons yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
