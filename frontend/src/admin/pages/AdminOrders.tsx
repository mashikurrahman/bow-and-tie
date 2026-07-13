import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { admin } from '../../services/admin'
import type { Order, OrderStatus } from '../../services/db'
import { formatPrice } from '../../store/StoreContext'
import StatusPill from '../components/StatusPill'

const TABS = ['All', 'Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']
const NEXT: OrderStatus[] = ['Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [tab, setTab] = useState('All')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    admin
      .listOrders({ status: tab, q })
      .then((r) => {
        setOrders(r.orders)
        setCounts(r.counts)
        setTotal(r.total)
      })
      .finally(() => setLoading(false))
  }, [tab, q])

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, q])

  const changeStatus = async (id: string, status: OrderStatus) => {
    await admin.updateOrderStatus(id, status)
    load()
  }

  const togglePaymentVerified = async (id: string, verified: boolean) => {
    // Optimistic update so the toggle feels instant.
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, paymentVerified: verified } : o)))
    try {
      await admin.setPaymentVerified(id, verified)
    } catch {
      setOrders((os) => os.map((o) => (o.id === id ? { ...o, paymentVerified: !verified } : o)))
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Orders</h1>
        <div className="admin-crumb">Dashboard <b>› Orders</b> · {total} total</div>
      </div>

      <div className="admin-card">
        <div className="admin-toolbar">
          <input
            className="admin-input grow"
            placeholder="Search by order # or customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="admin-tabs">
          {TABS.map((t) => (
            <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t} {t !== 'All' && <span className="count">({counts[t] ?? 0})</span>}
            </button>
          ))}
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th><th>Customer</th><th>Items</th><th>Total</th>
                <th>Payment</th><th>Date</th><th>Status</th><th>Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="cell-strong"><Link to={`/admin/orders/${o.id}`} className="admin-link">#{o.id}</Link></td>
                  <td>{o.customer.name}<div className="pid">{o.customer.phone}</div></td>
                  <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="cell-strong">{formatPrice(o.total)}</td>
                  <td>
                    <StatusPill status={o.payment} label={o.payment.toUpperCase()} />
                    {o.payment !== 'cod' && (
                      <div className="pay-verify">
                        {o.txnId && <div className="pay-txn" title="Transaction ID">TrxID: {o.txnId}</div>}
                        <label className={`pay-check ${o.paymentVerified ? 'on' : ''}`}>
                          <input
                            type="checkbox"
                            checked={!!o.paymentVerified}
                            onChange={(e) => togglePaymentVerified(o.id, e.target.checked)}
                          />
                          {o.paymentVerified ? '✓ Verified' : 'Mark verified'}
                        </label>
                      </div>
                    )}
                  </td>
                  <td className="admin-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td><StatusPill status={o.status} /></td>
                  <td>
                    <select
                      className="admin-input"
                      style={{ padding: '6px 8px', width: 'auto' }}
                      value={o.status}
                      onChange={(e) => changeStatus(o.id, e.target.value as OrderStatus)}
                    >
                      {NEXT.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="admin-empty">Loading…</p>}
          {!loading && orders.length === 0 && <p className="admin-empty">No orders found.</p>}
        </div>
      </div>
    </div>
  )
}
