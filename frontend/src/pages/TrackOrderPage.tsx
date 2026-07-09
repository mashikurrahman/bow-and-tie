import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { orders as orderApi, type Order } from '../services/db'
import { formatPrice } from '../store/StoreContext'
import StatusTimeline from '../components/StatusTimeline'
import { usePageMeta } from '../hooks/usePageMeta'

export default function TrackOrderPage() {
  usePageMeta({ title: 'Track Your Order', description: 'Track your Bow & Tie order status with your order number.' })
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('id') ?? '')
  const [order, setOrder] = useState<Order | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)

  const track = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) return
    setBusy(true)
    const found = await orderApi.track(query)
    setOrder(found)
    setBusy(false)
  }

  return (
    <div className="page narrow">
      <div className="page-head">
        <h1>Track Your Order</h1>
        <p>Enter your order number (e.g. BC1A2B3) to see live status.</p>
      </div>

      <form className="track-form" onSubmit={track}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Order number"
          aria-label="Order number"
        />
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Track'}</button>
      </form>

      {order === null && <p className="auth-error">No order found with that number. Please check and try again.</p>}

      {order && (
        <div className="track-result">
          <div className="account-card">
            <div className="account-card-head">
              <h3>Order #{order.id}</h3>
              <span className={`status-pill status-${order.status.toLowerCase()}`}>{order.status}</span>
            </div>
            <StatusTimeline order={order} />
          </div>
          <div className="account-card">
            <h3>Summary</h3>
            {order.items.map((it, i) => (
              <div className="confirm-line" key={i}>
                <span>{it.name} × {it.quantity}</span>
                <span>{formatPrice(it.price * it.quantity)}</span>
              </div>
            ))}
            <div className="confirm-line grand"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            <p className="muted" style={{ marginTop: 12 }}>Delivering to {order.customer.city} · {order.payment.toUpperCase()}</p>
          </div>
        </div>
      )}
    </div>
  )
}
