import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { admin, type AdminReview } from '../../services/admin'

export default function AdminReviews() {
  const [list, setList] = useState<AdminReview[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    admin.listReviews(q).then((r) => setList(r.reviews)).finally(() => setLoading(false))
  }, [q])

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, q])

  const toggle = async (r: AdminReview) => {
    setBusy(r.id)
    try {
      await admin.toggleReview(r.id, !r.hidden)
      await load()
    } finally {
      setBusy('')
    }
  }

  const remove = async (r: AdminReview) => {
    if (!confirm('Permanently delete this review?')) return
    setBusy(r.id)
    try {
      await admin.deleteReview(r.id)
      await load()
    } finally {
      setBusy('')
    }
  }

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)
  const hiddenCount = list.filter((r) => r.hidden).length

  return (
    <div>
      <div className="admin-page-head">
        <h1>Reviews</h1>
        <div className="admin-crumb">
          Moderate customer reviews shown on product pages · {list.length} total · {hiddenCount} hidden
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-toolbar">
          <input
            className="admin-input grow"
            placeholder="Search by product, customer or text…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Product</th><th>Rating</th><th>Review</th><th>By</th><th>Date</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className={r.hidden ? 'row-muted' : ''}>
                  <td className="cell-strong">
                    <Link to={`/product/${r.productId}`} className="admin-link" target="_blank">{r.productName}</Link>
                  </td>
                  <td><span className="review-stars">{stars(r.rating)}</span></td>
                  <td style={{ maxWidth: 320 }}>
                    {r.title && <strong>{r.title} · </strong>}{r.text}
                    {r.images.length > 0 && <span className="pid">📷 {r.images.length} photo(s)</span>}
                  </td>
                  <td>{r.name}{r.verified && <div className="pid">✓ Verified</div>}</td>
                  <td className="admin-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`pill ${r.hidden ? 'pill-red' : 'pill-green'}`}>{r.hidden ? 'Hidden' : 'Visible'}</span>
                  </td>
                  <td>
                    <div className="return-actions">
                      <button className="a-btn sm ghost" disabled={busy === r.id} onClick={() => toggle(r)}>
                        {r.hidden ? 'Unhide' : 'Hide'}
                      </button>
                      <button className="icon-btn danger" disabled={busy === r.id} onClick={() => remove(r)} title="Delete">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="admin-empty">Loading…</p>}
          {!loading && list.length === 0 && <p className="admin-empty">No reviews yet.</p>}
        </div>
      </div>
    </div>
  )
}
