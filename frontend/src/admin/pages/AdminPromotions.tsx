import { useEffect, useState } from 'react'
import { admin, type AdminProduct, type Promotion, type PromotionInput } from '../../services/admin'
import StatusPill from '../components/StatusPill'

const blank: PromotionInput = {
  title: '', description: '', percent: 20, scope: 'all', productIds: [],
  startsAt: null, endsAt: null, active: true, showPopup: true, showSlider: true,
  bgColor: '#c9527a', ctaLabel: 'Shop the sale',
}

const toInput = (p: Promotion): PromotionInput => ({
  title: p.title, description: p.description, percent: p.percent, scope: p.scope,
  productIds: p.productIds, startsAt: p.startsAt ? p.startsAt.slice(0, 10) : null,
  endsAt: p.endsAt ? p.endsAt.slice(0, 10) : null, active: p.active, showPopup: p.showPopup,
  showSlider: p.showSlider, bgColor: p.bgColor, ctaLabel: p.ctaLabel,
})

export default function AdminPromotions() {
  const [promos, setPromos] = useState<Promotion[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [editing, setEditing] = useState<string | null>(null) // id | 'new' | null
  const [form, setForm] = useState<PromotionInput>(blank)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => admin.listPromotions().then((r) => setPromos(r.promotions))
  useEffect(() => {
    load()
    admin.listProducts().then((r) => setProducts(r.products))
  }, [])

  const set = <K extends keyof PromotionInput>(k: K, v: PromotionInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const openNew = () => { setForm(blank); setEditing('new'); setError('') }
  const openEdit = (p: Promotion) => { setForm(toInput(p)); setEditing(p.id); setError('') }

  const toggleProduct = (id: string) =>
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id) ? f.productIds.filter((x) => x !== id) : [...f.productIds, id],
    }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    const payload: PromotionInput = {
      ...form,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      productIds: form.scope === 'selected' ? form.productIds : [],
    }
    try {
      if (editing === 'new') await admin.createPromotion(payload)
      else if (editing) await admin.updatePromotion(editing, payload)
      setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete promotion "${title}"?`)) return
    await admin.deletePromotion(id)
    load()
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Promotions</h1>
        <div className="admin-crumb">Auto-applied discounts, home popup &amp; hero slider</div>
      </div>

      {editing ? (
        <form className="admin-card" style={{ maxWidth: 760 }} onSubmit={save}>
          <div className="admin-card-head"><h3>{editing === 'new' ? 'New Promotion' : 'Edit Promotion'}</h3></div>
          {error && <div className="a-error">{error}</div>}

          <div className="a-field-row">
            <div className="a-field"><label>Title *</label><input required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Eid Mega Sale" /></div>
            <div className="a-field"><label>Discount % *</label><input required type="number" min="1" max="90" value={form.percent} onChange={(e) => set('percent', Number(e.target.value))} /></div>
          </div>

          <div className="a-field"><label>Description</label><input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Up to 25% off everything!" /></div>

          <div className="a-field-row">
            <div className="a-field"><label>Starts (optional)</label><input type="date" value={form.startsAt ?? ''} onChange={(e) => set('startsAt', e.target.value || null)} /></div>
            <div className="a-field"><label>Ends (optional)</label><input type="date" value={form.endsAt ?? ''} onChange={(e) => set('endsAt', e.target.value || null)} /></div>
          </div>

          <div className="a-field">
            <label>Applies to</label>
            <div className="option-chips">
              <button type="button" className={`chip ${form.scope === 'all' ? 'active' : ''}`} onClick={() => set('scope', 'all')}>All products</button>
              <button type="button" className={`chip ${form.scope === 'selected' ? 'active' : ''}`} onClick={() => set('scope', 'selected')}>Selected products</button>
            </div>
          </div>

          {form.scope === 'selected' && (
            <div className="a-field">
              <label>Pick products ({form.productIds.length} selected)</label>
              <div className="promo-product-pick">
                {products.map((p) => (
                  <label key={p.id} className={`promo-pick-item ${form.productIds.includes(p.id) ? 'on' : ''}`}>
                    <input type="checkbox" checked={form.productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                    <img src={p.image} alt="" />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="a-field-row">
            <div className="a-field"><label>CTA label</label><input value={form.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} /></div>
            <div className="a-field"><label>Banner color</label><input type="color" value={form.bgColor} onChange={(e) => set('bgColor', e.target.value)} style={{ height: 42, padding: 4 }} /></div>
          </div>

          <div className="a-field-row">
            <label className="a-check"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Active</label>
            <label className="a-check"><input type="checkbox" checked={form.showPopup} onChange={(e) => set('showPopup', e.target.checked)} /> Show home popup</label>
            <label className="a-check"><input type="checkbox" checked={form.showSlider} onChange={(e) => set('showSlider', e.target.checked)} /> Show hero slider</label>
          </div>

          <div className="product-actions" style={{ marginTop: 10 }}>
            <button className="a-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Promotion'}</button>
            <button className="a-btn ghost" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="admin-card">
          <div className="admin-toolbar">
            <div className="grow" />
            <button className="a-btn" onClick={openNew}>＋ New Promotion</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Title</th><th>Discount</th><th>Scope</th><th>Window</th><th>Surfaces</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-strong">{p.title}</td>
                    <td>{p.percent}%</td>
                    <td>{p.scope === 'all' ? 'All products' : `${p.productIds.length} products`}</td>
                    <td className="admin-muted">{p.startsAt ? new Date(p.startsAt).toLocaleDateString() : '—'} → {p.endsAt ? new Date(p.endsAt).toLocaleDateString() : '∞'}</td>
                    <td className="admin-muted">{[p.showPopup && 'Popup', p.showSlider && 'Slider'].filter(Boolean).join(', ') || '—'}</td>
                    <td><StatusPill status={p.live ? 'Delivered' : 'Cancelled'} label={p.live ? 'Live' : p.active ? 'Scheduled' : 'Off'} /></td>
                    <td>
                      <button className="icon-btn" onClick={() => openEdit(p)} title="Edit">✎</button>
                      <button className="icon-btn danger" onClick={() => remove(p.id, p.title)} title="Delete">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {promos.length === 0 && <p className="admin-empty">No promotions yet. Create one to run a sale.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
