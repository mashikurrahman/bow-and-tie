import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { admin } from '../../services/admin'
import type { Order } from '../../services/db'
import { formatPrice } from '../../store/StoreContext'

// Prints a packing slip for each selected order (one per page). Opened from the
// Orders table's bulk toolbar as /admin/print-slips?ids=a,b,c.
export default function AdminBulkPrint() {
  const [params] = useSearchParams()
  const ids = (params.get('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const [orders, setOrders] = useState<Order[] | null>(null)

  useEffect(() => {
    if (!ids.length) return setOrders([])
    Promise.all(ids.map((id) => admin.getOrder(id).then((r) => r.order).catch(() => null)))
      .then((list) => setOrders(list.filter((o): o is Order => !!o)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  if (orders === null) return <div className="admin-empty">Loading…</div>
  if (!orders.length) return <div className="admin-empty">No orders selected. <Link to="/admin/orders">Back to orders</Link></div>

  return (
    <div className="order-print-page">
      <div className="print-toolbar no-print">
        <Link to="/admin/orders" className="a-btn ghost">← Orders</Link>
        <div className="print-toolbar-right">
          <span className="admin-muted">{orders.length} packing slip(s)</span>
          <button className="a-btn" onClick={() => window.print()}>🖨 Print all</button>
        </div>
      </div>

      {orders.map((order) => {
        const itemsCount = order.items.reduce((s, i) => s + i.quantity, 0)
        return (
          <div className="invoice-doc packing-slip print-page-break" key={order.id}>
            <div className="invoice-head">
              <div className="invoice-brand">Packing Slip</div>
              <div className="invoice-meta"><div>Order <b>#{order.id}</b></div><div>{itemsCount} item(s)</div></div>
            </div>
            <div className="invoice-parties">
              <div>
                <h4>Deliver To</h4>
                <div className="invoice-name">{order.customer.name}</div>
                <div>{order.customer.phone}</div>
                <div>{order.customer.address}, {order.customer.city}</div>
              </div>
              <div>
                <h4>Collect (COD)</h4>
                <div className="packing-cod">{order.payment === 'cod' ? formatPrice(order.total) : 'Prepaid — collect ৳0'}</div>
              </div>
            </div>
            {order.giftWrap && (
              <div className="gift-slip">🎁 <b>Gift order — please gift wrap.</b>{order.giftMessage && <div className="gift-slip-msg">“{order.giftMessage}”</div>}</div>
            )}
            <table className="invoice-table">
              <thead><tr><th>✓</th><th>Item</th><th>Qty</th></tr></thead>
              <tbody>
                {order.items.map((it, i) => (
                  <tr key={i}><td>☐</td><td>{it.name}{(it.color || it.size) && ` (${[it.color, it.size].filter(Boolean).join(' / ')})`}</td><td>{it.quantity}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}