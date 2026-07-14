import { useEffect, useMemo, useState } from 'react'
import { admin, type AdminBundle, type AdminProduct } from '../../services/admin'
import { formatPrice } from '../../store/StoreContext'

const empty = { title: '', description: '', productIds: [] as string[], image: '', active: true }

export default function AdminBundles() {
  const [bundles, setBundles] = useState<AdminBundle[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => admin.listBundles().then((r) => setBundles(r.bundles)).catch(() => {})
  useEffect(() => {
    load()
    admin.listProducts().then((r) => setProducts(r.products)).catch(() => {})
  }, [])

  const nameById = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products])
  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())),
    [products, q],
  )

  const reset = () => { setEditingId(null); setForm(empty); setQ('') }
  const edit = (b: AdminBundle) => { setEditingId(b.id); setForm({ title: b.title, description: b.description, productIds: b.productIds, image: b.image, active: b.active }) }

  const toggleProduct = (id: string) =>
    setForm((f) => ({ ...f, productIds: f.productIds.includes(id) ? f.productIds.filter((x) => x !== id) : [...f.productIds, id] }))

  const save = async () => {
    if (!form.title.trim() || form.productIds.length === 0) return alert('Add a title and at least one product.')
    setBusy(true)
    try {
      if (editingId) await admin.updateBundle(editingId, form)
      else await admin.createBundle(form)
      reset()
      load()
    } finally { setBusy(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this bundle?')) return
    await admin.deleteBundle(id)
    if (editingId === id) reset()
    load()
  }

  const uploadImage = async (file?: File) => {
    if (!file) return
    const url = await admin.uploadImage(file)
    setForm((f) => ({ ...f, image: url }))
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Bundles</h1>
        <div className="admin-crumb">Dashboard <b>› Bundles</b> · "Complete the look" sets</div>
      </div>

      <div className="campaign-grid">
        <div className="admin-card">
          <h3 style={{ marginBottom: 12 }}>{editingId ? 'Edit bundle' : 'New bundle'}</h3>
          <div className="a-field"><label>Title</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. The Everyday Set" />
          </div>
          <div className="a-field"><label>Description</label>
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short pitch for the set" />
          </div>
          <div className="a-field"><label>Cover image (optional)</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {form.image && <img src={form.image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />}
              <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files?.[0])} />
            </div>
          </div>
          <div className="a-field">
            <label>Products in this set ({form.productIds.length})</label>
            <input className="admin-input" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
            <div className="bundle-picker">
              {filtered.map((p) => (
                <label key={p.id} className={`bundle-pick ${form.productIds.includes(p.id) ? 'on' : ''}`}>
                  <input type="checkbox" checked={form.productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                  <img src={p.image} alt="" />
                  <span>{p.name}</span>
                  <b>{formatPrice(p.price)}</b>
                </label>
              ))}
            </div>
          </div>
          <label className="gift-toggle" style={{ margin: '6px 0 14px' }}>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            <span>Active (visible on the store)</span>
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="a-btn" onClick={save} disabled={busy}>{editingId ? 'Update' : 'Create'} bundle</button>
            {editingId && <button className="a-btn ghost" onClick={reset}>New</button>}
          </div>
        </div>

        <div className="admin-card">
          <h3 style={{ marginBottom: 12 }}>Existing bundles</h3>
          {bundles.length === 0 && <p className="admin-empty">No bundles yet.</p>}
          {bundles.map((b) => (
            <div key={b.id} className="campaign-tpl">
              <div>
                <strong>{b.title} {!b.active && <span className="admin-muted">(hidden)</span>}</strong>
                <div className="admin-muted" style={{ fontSize: '0.8rem' }}>
                  {b.productIds.map((id) => nameById.get(id) ?? id).slice(0, 4).join(', ')}{b.productIds.length > 4 ? '…' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="a-btn ghost sm" onClick={() => edit(b)}>Edit</button>
                <button className="a-btn ghost sm" onClick={() => remove(b.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}