import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { orders as orderApi, type Order } from '../services/db'
import { formatPrice } from '../store/StoreContext'
import { usePageMeta } from '../hooks/usePageMeta'

// Customer-facing invoice / receipt for the shopper's own order.
// Loads via the owner-scoped GET /orders/:id, and prints cleanly (the site
// chrome is hidden by the @media print rules in styles.css).
export default function OrderInvoicePage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null | undefined>(undefined)
  usePageMeta({ title: id ? `Invoice #${id}` : 'Invoice', noindex: true })

  useEffect(() => {
    if (id) orderApi.getMine(id).then((o) => setOrder(o))
  }, [id])

  if (order === undefined) return <div className="page empty-state"><p>Loading…</p></div>
  if (!order) {
    return (
      <div className="page empty-state">
        <h1>Order not found</h1>
        <Link to="/orders" className="btn">Back to My Orders</Link>
      </div>
    )
  }

  const paymentLabel =
    order.payment === 'cod' ? 'Cash on Delivery' : order.payment === 'bkash' ? 'bKash' : 'Nagad'

  return (
    <div className="page invoice-page">
      <div className="invoice-toolbar no-print">
        <Link to={`/orders/${order.id}`} className="btn btn-outline btn-sm">← Back to order</Link>
        <button type="button" className="btn btn-sm" onClick={() => window.print()}>🖨 Print / Save as PDF</button>
      </div>

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
            <h4>Billed / Shipped To</h4>
            <div className="invoice-name">{order.customer.name}</div>
            <div>{order.customer.phone}</div>
            <div>{order.customer.address}, {order.customer.city}</div>
          </div>
          <div>
            <h4>Details</h4>
            <div>Payment: <b>{paymentLabel}</b>{order.txnId ? ` · ${order.txnId}` : ''}</div>
            <div>Delivery: {order.deliveryZone === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'}</div>
            <div>Status: <b>{order.status}</b></div>
            {order.courier && <div>Courier: {order.courier}{order.trackingCode ? ` · ${order.trackingCode}` : ''}</div>}
          </div>
        </div>

        <table className="invoice-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={i}>
                <td>
                  {it.name}
                  {(it.color || it.size) && <span className="invoice-variant"> ({[it.color, it.size].filter(Boolean).join(' / ')})</span>}
                </td>
                <td>{it.quantity}</td>
                <td>{formatPrice(it.price)}</td>
                <td>{formatPrice(it.price * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-totals">
          <div><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          {order.discount > 0 && (
            <div><span>Discount{order.promoCode ? ` (${order.promoCode})` : ''}</span><span>−{formatPrice(order.discount)}</span></div>
          )}
          <div><span>Shipping</span><span>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</span></div>
          <div className="invoice-grand"><span>Total</span><span>{formatPrice(order.total)}</span></div>
        </div>

        <p className="invoice-note">
          {order.payment === 'cod'
            ? `Amount payable on delivery: ${formatPrice(order.total)}.`
            : `Paid via ${paymentLabel}.`}
        </p>
        <p className="invoice-foot">Thank you for shopping with Bow &amp; Tie! 🎀 · Questions? wa.me — WhatsApp us with your order number.</p>
      </div>
    </div>
  )
}
