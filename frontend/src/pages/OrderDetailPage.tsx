import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { orders as orderApi, type Order } from '../services/db'
import { formatPrice, useStore } from '../store/StoreContext'
import StatusTimeline from '../components/StatusTimeline'

export default function OrderDetailPage() {
  const { id } = useParams()
  const { notify, reorder } = useStore()
  const [order, setOrder] = useState<Order | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (id) orderApi.getMine(id).then((o) => setOrder(o))
  }, [id])

  const cancelOrder = async () => {
    if (!order || !confirm('Cancel this order? This cannot be undone.')) return
    setBusy(true)
    try {
      const updated = await orderApi.cancel(order.id)
      setOrder(updated)
      notify('Order cancelled')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not cancel order')
    } finally {
      setBusy(false)
    }
  }

  const requestReturn = async () => {
    if (!order) return
    const reason = prompt('Tell us briefly why you’d like to return this order (optional):') ?? undefined
    setBusy(true)
    try {
      const updated = await orderApi.requestReturn(order.id, reason)
      setOrder(updated)
      notify('Return requested — we’ll be in touch')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not request return')
    } finally {
      setBusy(false)
    }
  }

  if (order === undefined) return <div className="page empty-state"><p>Loading…</p></div>
  if (!order) {
    return (
      <div className="page empty-state">
        <h1>Order not found</h1>
        <Link to="/orders" className="btn">Back to My Orders</Link>
      </div>
    )
  }

  return (
    <div className="page narrow">
      <div className="breadcrumb"><Link to="/orders">My Orders</Link> / <span>#{order.id}</span></div>
      <div className="page-head order-detail-head">
        <div>
          <h1>Order #{order.id}</h1>
          <p>Placed on {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => reorder(order.items)}>↻ Buy again</button>
      </div>

      <section className="account-card">
        <h3>Status</h3>
        <StatusTimeline order={order} />
        <div className="order-actions">
          {(order.status === 'Processing' || order.status === 'Confirmed') && (
            <button className="btn btn-outline btn-sm danger-btn" onClick={cancelOrder} disabled={busy}>
              Cancel order
            </button>
          )}
          {order.status === 'Delivered' && (
            <button className="btn btn-outline btn-sm" onClick={requestReturn} disabled={busy}>
              Request a return
            </button>
          )}
          {order.status === 'Return Requested' && (
            <p className="order-return-note">↩️ A return has been requested. Our team will contact you shortly.</p>
          )}
        </div>
      </section>

      <section className="account-card">
        <h3>Items</h3>
        {order.items.map((it, i) => (
          <div className="confirm-line" key={i}>
            <span>{it.name} {(it.color || it.size) && `(${[it.color, it.size].filter(Boolean).join('/')})`} × {it.quantity}</span>
            <span>{formatPrice(it.price * it.quantity)}</span>
          </div>
        ))}
        <div className="confirm-line"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
        {order.discount > 0 && <div className="confirm-line"><span>Discount{order.promoCode ? ` (${order.promoCode})` : ''}</span><span>-{formatPrice(order.discount)}</span></div>}
        <div className="confirm-line"><span>Shipping</span><span>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</span></div>
        <div className="confirm-line grand"><span>Total</span><span>{formatPrice(order.total)}</span></div>
      </section>

      <div className="account-grid">
        <section className="account-card">
          <h3>Delivery</h3>
          <p className="muted">{order.customer.name}<br />{order.customer.phone}<br />{order.customer.address}, {order.customer.city}</p>
        </section>
        <section className="account-card">
          <h3>Payment</h3>
          <p className="muted">
            Method: <strong>{order.payment.toUpperCase()}</strong><br />
            {order.txnId && <>Txn ID: {order.txnId}<br /></>}
            {order.notes && <>Notes: {order.notes}</>}
          </p>
        </section>
      </div>
    </div>
  )
}
