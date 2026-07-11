import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { admin, type RefundAction } from '../../services/admin'
import type { Order } from '../../services/db'
import { formatPrice } from '../../store/StoreContext'
import StatusPill from '../components/StatusPill'

const REFUND_METHODS = ['original', 'bkash', 'nagad', 'cash'] as const

export default function AdminReturns() {
  const [returns, setReturns] = useState<Order[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [method, setMethod] = useState<Record<string, string>>({})

  const load = useCallback(() => {
    setLoading(true)
    admin
      .listReturns()
      .then((r) => {
        setReturns(r.returns)
        setCounts(r.counts)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (o: Order, action: RefundAction) => {
    if (action === 'refund' && !confirm(`Refund ${formatPrice(o.total)} for order #${o.id}? This restocks the items.`)) return
    if (action === 'reject' && !confirm(`Reject the return for order #${o.id}?`)) return
    setBusy(o.id)
    try {
      await admin.refundOrder(o.id, action, action === 'refund' ? { method: method[o.id] ?? 'original' } : undefined)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy('')
    }
  }

  const pending = returns.filter((o) => o.refundStatus === 'Requested' || o.refundStatus === 'Approved')
  const closed = returns.filter((o) => o.refundStatus === 'Refunded' || o.refundStatus === 'Rejected')

  const row = (o: Order) => (
    <tr key={o.id}>
      <td className="cell-strong"><Link to={`/admin/orders/${o.id}`} className="admin-link">#{o.id}</Link></td>
      <td>{o.customer.name}<div className="pid">{o.customer.phone}</div></td>
      <td className="cell-strong">{formatPrice(o.total)}</td>
      <td style={{ maxWidth: 220 }}>{o.returnReason || <span className="admin-muted">—</span>}</td>
      <td><StatusPill status={o.refundStatus ?? 'Requested'} /></td>
      <td className="admin-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
      <td>
        {o.refundStatus === 'Refunded' ? (
          <span className="admin-muted">{o.refundMethod} · {o.refundedAt ? new Date(o.refundedAt).toLocaleDateString() : ''}</span>
        ) : o.refundStatus === 'Rejected' ? (
          <span className="admin-muted">Rejected</span>
        ) : (
          <div className="return-actions">
            {o.refundStatus === 'Requested' && (
              <>
                <button className="a-btn sm" disabled={busy === o.id} onClick={() => act(o, 'approve')}>Approve</button>
                <button className="a-btn sm ghost" disabled={busy === o.id} onClick={() => act(o, 'reject')}>Reject</button>
              </>
            )}
            {o.refundStatus === 'Approved' && (
              <>
                <select
                  className="admin-input"
                  style={{ padding: '6px 8px', width: 'auto' }}
                  value={method[o.id] ?? 'original'}
                  onChange={(e) => setMethod((m) => ({ ...m, [o.id]: e.target.value }))}
                >
                  {REFUND_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <button className="a-btn sm" disabled={busy === o.id} onClick={() => act(o, 'refund')}>Mark refunded</button>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  )

  return (
    <div>
      <div className="admin-page-head">
        <h1>Returns &amp; Refunds</h1>
        <div className="admin-crumb">
          Dashboard <b>› Returns</b> · {counts.Requested ?? 0} awaiting · {counts.Approved ?? 0} to refund
        </div>
      </div>

      <div className="admin-card">
        {pending.length > 0 && <h3 className="qa-group-title">Open ({pending.length})</h3>}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Total</th><th>Reason</th><th>Status</th><th>Date</th><th>Action</th></tr>
            </thead>
            <tbody>{pending.map(row)}</tbody>
          </table>
          {loading && <p className="admin-empty">Loading…</p>}
          {!loading && pending.length === 0 && <p className="admin-empty">No open return requests. 🎉</p>}
        </div>

        {closed.length > 0 && (
          <>
            <h3 className="qa-group-title" style={{ marginTop: 24 }}>Closed ({closed.length})</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Order</th><th>Customer</th><th>Total</th><th>Reason</th><th>Status</th><th>Date</th><th>Outcome</th></tr>
                </thead>
                <tbody>{closed.map(row)}</tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
