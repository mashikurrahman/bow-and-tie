import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { orders as orderApi, type Order } from '../services/db'
import { formatPrice, useStore } from '../store/StoreContext'

export default function OrdersPage() {
  const { user } = useAuth()
  const { reorder } = useStore()
  const [list, setList] = useState<Order[] | null>(null)

  useEffect(() => {
    if (user) orderApi.listMine().then(setList).catch(() => setList([]))
  }, [user])

  if (!user) return null

  if (list === null) return <div className="page empty-state"><p>Loading your orders…</p></div>

  if (list.length === 0) {
    return (
      <div className="page empty-state">
        <div className="cart-empty-icon">📦</div>
        <h1>No orders yet</h1>
        <p>When you place an order it will appear here.</p>
        <Link to="/shop" className="btn">Start Shopping</Link>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head"><h1>My Orders</h1><p>{list.length} order{list.length !== 1 ? 's' : ''}</p></div>
      <div className="order-list">
        {list.map((o) => (
          <div className="order-row" key={o.id}>
            <Link to={`/orders/${o.id}`} className="order-row-link">
              <div className="order-row-imgs">
                {o.items.slice(0, 3).map((it, i) => <img key={i} src={it.image} alt={it.name} />)}
              </div>
              <div className="order-row-main">
                <strong>#{o.id}</strong>
                <span className="muted">{new Date(o.createdAt).toLocaleDateString()} · {o.items.length} item{o.items.length !== 1 ? 's' : ''}</span>
              </div>
              <span className={`status-pill status-${o.status.toLowerCase()}`}>{o.status}</span>
              <strong className="order-row-total">{formatPrice(o.total)}</strong>
            </Link>
            <button type="button" className="btn btn-sm btn-outline order-reorder" onClick={() => reorder(o.items)}>
              ↻ Buy again
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
