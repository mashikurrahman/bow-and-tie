import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../store/StoreContext'
import { orders as orderApi, type Order } from '../services/db'
import { useAuth } from '../store/AuthContext'
import { usePageMeta } from '../hooks/usePageMeta'

export default function OrderConfirmationPage() {
  usePageMeta({ title: 'Order Confirmed', noindex: true })
  const { isAuthed } = useAuth()
  const [order, setOrder] = useState<Order | null | undefined>(undefined)

  useEffect(() => {
    const id = localStorage.getItem('bc_last_order')
    if (id) orderApi.track(id).then(setOrder)
    else setOrder(null)
  }, [])

  if (order === undefined) return <div className="page empty-state"><p>Loading…</p></div>
  if (!order) {
    return (
      <div className="page empty-state">
        <h1>No recent order</h1>
        <Link to="/shop" className="btn">Go to Shop</Link>
      </div>
    )
  }

  return (
    <div className="page confirm-page">
      <div className="confirm-icon">✅</div>
      <h1>Thank you, {order.customer.name.split(' ')[0]}!</h1>
      <p className="confirm-sub">Your order <strong>#{order.id}</strong> has been placed.</p>
      <p className="confirm-note">
        We'll call you on <strong>{order.customer.phone}</strong> to confirm delivery to {order.customer.city}.
        Payment: <strong>{order.payment.toUpperCase()}</strong>.
      </p>

      <div className="confirm-card">
        <h3>Order Details</h3>
        {order.items.map((it, i) => (
          <div className="confirm-line" key={i}>
            <span>{it.name} {(it.color || it.size) && `(${[it.color, it.size].filter(Boolean).join('/')})`} × {it.quantity}</span>
            <span>{formatPrice(it.price * it.quantity)}</span>
          </div>
        ))}
        {order.discount > 0 && <div className="confirm-line"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
        <div className="confirm-line"><span>Shipping</span><span>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</span></div>
        <div className="confirm-line grand"><span>Total</span><span>{formatPrice(order.total)}</span></div>
      </div>

      <div className="confirm-actions">
        <Link to={`/track?id=${order.id}`} className="btn">Track Order</Link>
        {isAuthed && <Link to="/orders" className="btn btn-outline">My Orders</Link>}
        <Link to="/shop" className="btn btn-outline">Continue Shopping</Link>
      </div>
    </div>
  )
}
