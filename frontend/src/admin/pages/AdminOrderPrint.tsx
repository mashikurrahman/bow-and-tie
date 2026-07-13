import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { admin } from '../../services/admin'
import type { Order } from '../../services/db'
import { formatPrice } from '../../store/StoreContext'

const COURIERS = [
  { id: 'steadfast', label: 'Steadfast' },
  { id: 'pathao', label: 'Pathao' },
  { id: 'redx', label: 'RedX' },
] as const

export default function AdminOrderPrint() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null | undefined>(undefined)
  const [provider, setProvider] = useState<'steadfast' | 'pathao' | 'redx'>('steadfast')
  const [shipping, setShipping] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (id) admin.getOrder(id).then((r) => setOrder(r.order)).catch(() => setOrder(null))
  }, [id])

  if (order === undefined) return <div className="admin-empty">Loading…</div>
  if (!order) return <div className="admin-empty">Order not found. <Link to="/admin/orders">Back to orders</Link></div>

  const ship = async () => {
    setShipping(true); setMsg('')
    try {
      const r = await admin.shipOrder(order.id, provider)
      setOrder(r.order)
      setMsg(`Shipped via ${provider} · Tracking: ${r.tracking.trackingCode}${r.tracking.mock ? ' (demo)' : ''}`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not create shipment')
    } finally {
      setShipping(false)
    }
  }

  const itemsCount = order.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="order-print-page">
      {/* Toolbar (hidden when printing) */}
      <div className="print-toolbar no-print">
        <Link to="/admin/orders" className="a-btn ghost">← Orders</Link>
        <div className="print-toolbar-right">
          <select className="admin-input" style={{ width: 'auto' }} value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)}>
            {COURIERS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button className="a-btn ghost" onClick={ship} disabled={shipping}>{shipping ? 'Booking…' : '🚚 Ship with courier'}</button>
          <button className="a-btn" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>
      {msg && <div className="a-success no-print">{msg}</div>}

      {/* Invoice */}
      <div className="invoice-doc">
        <div className="invoice-head">
          <div>
            <div className="invoice-brand">Bow &amp; Tie</div>
            <div className="invoice-sub">Handcrafted Bows &amp; Accessories · Dhaka, Bangladesh</div>
          </div>
          <div className="invoice-meta">
            <h2>INVOICE</h2>
            <div>Order <b>#{order.id}</b></div>
            <div>{new Date(order.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        <div className="invoice-parties">
          <div>
            <h4>Bill / Ship To</h4>
            <div className="invoice-name">{order.customer.name}</div>
            <div>{order.customer.phone}</div>
            <div>{order.customer.address}, {order.customer.city}</div>
          </div>
          <div>
            <h4>Details</h4>
            <div>Payment: <b>{order.payment.toUpperCase()}</b>{order.txnId ? ` · ${order.txnId}` : ''}</div>
            <div>Delivery: {order.deliveryZone === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'}</div>
            <div>Status: <b>{order.status}</b></div>
            {order.courier && <div>Courier: {order.courier} · {order.trackingCode}</div>}
          </div>
        </div>

        <table className="invoice-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={i}>
                <td>{it.name}{(it.color || it.size) && <span className="invoice-variant"> ({[it.color, it.size].filter(Boolean).join(' / ')})</span>}</td>
                <td>{it.quantity}</td>
                <td>{formatPrice(it.price)}</td>
                <td>{formatPrice(it.price * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-totals">
          <div><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          {order.discount > 0 && <div><span>Discount{order.promoCode ? ` (${order.promoCode})` : ''}</span><span>−{formatPrice(order.discount)}</span></div>}
          <div><span>Shipping</span><span>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</span></div>
          <div className="invoice-grand"><span>Total</span><span>{formatPrice(order.total)}</span></div>
        </div>

        <p className="invoice-foot">Thank you for shopping with Bow &amp; Tie! 🎀</p>
      </div>

      {/* Packing slip (second page when printing) */}
      <div className="invoice-doc packing-slip">
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
    </div>
  )
}
