import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { admin, type CustomerDetail } from '../../services/admin'
import type { Order } from '../../services/db'
import { formatPrice } from '../../store/StoreContext'
import StatusPill from '../components/StatusPill'

export default function AdminCustomerDetail() {
  const { id } = useParams()
  const [customer, setCustomer] = useState<CustomerDetail | null | undefined>(undefined)
  const [orders, setOrders] = useState<Order[]>([])
  const [note, setNote] = useState('')
  const [noteMsg, setNoteMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    admin.getCustomer(id).then((r) => {
      setCustomer(r.customer)
      setOrders(r.orders)
      setNote(r.customer.adminNote)
    }).catch(() => setCustomer(null))
  }, [id])

  if (customer === undefined) return <div className="admin-empty">Loading…</div>
  if (!customer) return <div className="admin-empty">Customer not found. <Link to="/admin/customers">Back</Link></div>

  const saveNote = async () => {
    setBusy(true)
    try {
      await admin.saveCustomerNote(customer.id, note)
      setNoteMsg('Note saved.')
      setTimeout(() => setNoteMsg(''), 2500)
    } finally { setBusy(false) }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>{customer.name}</h1>
        <div className="admin-crumb"><Link to="/admin/customers" className="admin-link">Customers</Link> <b>› {customer.name}</b></div>
      </div>

      <div className="crm-grid">
        <div className="admin-card crm-profile">
          <div className="crm-row"><span>Email</span><b>{customer.email} {customer.emailVerified ? '✓' : ''}</b></div>
          <div className="crm-row"><span>Phone</span><b>{customer.phone || '—'}</b></div>
          <div className="crm-row"><span>Address</span><b>{customer.address || '—'}</b></div>
          <div className="crm-row"><span>Joined</span><b>{new Date(customer.createdAt).toLocaleDateString()}</b></div>
          <div className="crm-stats">
            <div><strong>{customer.orderCount}</strong><small>Orders</small></div>
            <div><strong>{formatPrice(customer.totalSpent)}</strong><small>Lifetime value</small></div>
            <div><strong>{customer.orderCount ? formatPrice(Math.round(customer.totalSpent / customer.orderCount)) : '—'}</strong><small>Avg order</small></div>
          </div>
        </div>

        <div className="admin-card">
          <h3 style={{ marginBottom: 8 }}>Private note</h3>
          <p className="admin-muted" style={{ fontSize: '0.8rem', marginBottom: 10 }}>Only staff can see this (e.g. preferences, VIP, issues).</p>
          {noteMsg && <div className="a-success" style={{ marginBottom: 8 }}>{noteMsg}</div>}
          <textarea rows={5} value={note} onChange={(e) => setNote(e.target.value.slice(0, 2000))} placeholder="Add a note about this customer…" style={{ width: '100%' }} />
          <button className="a-btn" onClick={saveNote} disabled={busy} style={{ marginTop: 10 }}>{busy ? 'Saving…' : 'Save note'}</button>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Order history</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="cell-strong"><Link to={`/admin/orders/${o.id}`} className="admin-link">#{o.id}</Link></td>
                  <td className="admin-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="cell-strong">{formatPrice(o.total)}</td>
                  <td><StatusPill status={o.payment} label={o.payment.toUpperCase()} /></td>
                  <td><StatusPill status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="admin-empty">No orders yet.</p>}
        </div>
      </div>
    </div>
  )
}