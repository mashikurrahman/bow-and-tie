import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { orders as orderApi, type Order } from '../services/db'
import { formatPrice } from '../store/StoreContext'
import StatusTimeline from '../components/StatusTimeline'

export default function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null | undefined>(undefined)

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

  return (
    <div className="page narrow">
      <div className="breadcrumb"><Link to="/orders">My Orders</Link> / <span>#{order.id}</span></div>
      <div className="page-head">
        <h1>Order #{order.id}</h1>
        <p>Placed on {new Date(order.createdAt).toLocaleString()}</p>
      </div>

      <section className="account-card">
        <h3>Status</h3>
        <StatusTimeline order={order} />
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
