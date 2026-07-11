import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { admin, type Inventory } from '../../services/admin'
import { formatPrice } from '../../store/StoreContext'

export default function AdminInventory() {
  const [data, setData] = useState<Inventory | null>(null)
  const [threshold, setThreshold] = useState(5)
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    admin.listInventory(threshold).then(setData).finally(() => setLoading(false))
  }, [threshold])

  useEffect(() => { load() }, [load])

  const rows = (data?.rows ?? []).filter((r) =>
    filter === 'out' ? r.stock <= 0 : filter === 'low' ? r.stock > 0 && r.stock <= (data?.threshold ?? 5) : true,
  )

  const level = (stock: number) => {
    const t = data?.threshold ?? 5
    if (stock <= 0) return { cls: 'pill-red', label: 'Out of stock' }
    if (stock <= t) return { cls: 'pill-yellow', label: 'Low' }
    return { cls: 'pill-green', label: 'In stock' }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Inventory</h1>
        <div className="admin-crumb">Dashboard <b>› Inventory</b> · stock levels per SKU</div>
      </div>

      <div className="inv-stats">
        <button className={`inv-stat ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          <strong>{data?.summary.skuCount ?? 0}</strong><span>All SKUs</span>
        </button>
        <button className={`inv-stat low ${filter === 'low' ? 'active' : ''}`} onClick={() => setFilter('low')}>
          <strong>{data?.summary.lowStock ?? 0}</strong><span>Low stock</span>
        </button>
        <button className={`inv-stat out ${filter === 'out' ? 'active' : ''}`} onClick={() => setFilter('out')}>
          <strong>{data?.summary.outOfStock ?? 0}</strong><span>Out of stock</span>
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-toolbar">
          <label className="admin-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Low-stock threshold ≤
            <input
              className="admin-input"
              type="number"
              min={0}
              style={{ width: 80 }}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Number(e.target.value)))}
            />
          </label>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Product</th><th>SKU / Variant</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const lv = level(r.stock)
                return (
                  <tr key={`${r.productId}-${r.variantId ?? 'base'}`} className={r.stock <= 0 ? 'row-muted' : ''}>
                    <td className="cell-strong">
                      <div className="inv-prod">
                        {r.image && <img src={r.image} alt="" className="inv-thumb" />}
                        {r.productName}
                      </div>
                    </td>
                    <td>{r.label ?? <span className="admin-muted">—</span>}{r.sku && <div className="pid">{r.sku}</div>}</td>
                    <td>{formatPrice(r.price)}</td>
                    <td className="cell-strong">{r.stock}</td>
                    <td><span className={`pill ${lv.cls}`}>{lv.label}</span></td>
                    <td><Link to={`/admin/products/${r.productId}/edit`} className="admin-link">Edit</Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {loading && <p className="admin-empty">Loading…</p>}
          {!loading && rows.length === 0 && <p className="admin-empty">Nothing to show.</p>}
        </div>
      </div>
    </div>
  )
}
