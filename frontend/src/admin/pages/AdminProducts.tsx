import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { admin, type AdminProduct } from '../../services/admin'
import { formatPrice } from '../../store/StoreContext'
import StatusPill from '../components/StatusPill'

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    admin.listProducts().then((r) => setProducts(r.products)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await admin.deleteProduct(id)
    load()
  }

  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <div className="admin-page-head">
        <h1>Products</h1>
        <div className="admin-crumb">Dashboard <b>› Products</b> · {products.length} items</div>
      </div>

      <div className="admin-card">
        <div className="admin-toolbar">
          <input className="admin-input grow" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Link to="/admin/import" className="a-btn ghost">📦 Bulk Import</Link>
          <button className="a-btn ghost" onClick={() => admin.exportCsv('products').catch(() => {})}>⬇ Export CSV</button>
          <Link to="/admin/products/new" className="a-btn">＋ Add Product</Link>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Product</th><th>Price</th><th>Cost</th><th>Margin</th><th>Stock</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const margin = p.price - (p.costPrice ?? 0)
                const marginPct = p.price ? Math.round((margin / p.price) * 100) : 0
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="cell-product">
                        <img src={p.image} alt={p.name} />
                        <div><div className="cell-strong">{p.name}</div><div className="pid">{p.category} · {p.id}</div></div>
                      </div>
                    </td>
                    <td>{formatPrice(p.price)}</td>
                    <td className="admin-muted">{formatPrice(p.costPrice ?? 0)}</td>
                    <td><span className="cell-strong">{formatPrice(margin)}</span> <span className="pid">({marginPct}%)</span></td>
                    <td>{p.stock}</td>
                    <td><StatusPill status={p.inStock && p.stock > 0 ? 'Delivered' : 'Cancelled'} label={p.inStock && p.stock > 0 ? 'In stock' : 'Sold out'} /></td>
                    <td>
                      <button className="icon-btn" title="Edit" onClick={() => navigate(`/admin/products/${p.id}/edit`)}>✎</button>
                      <button className="icon-btn danger" title="Delete" onClick={() => remove(p.id, p.name)}>🗑</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {loading && <p className="admin-empty">Loading…</p>}
          {!loading && filtered.length === 0 && <p className="admin-empty">No products found.</p>}
        </div>
      </div>
    </div>
  )
}
