import { Link } from 'react-router-dom'
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
  effectivePrice,
  formatPrice,
  useStore,
} from '../store/StoreContext'
import { useProducts } from '../store/ProductsContext'
import { usePageMeta } from '../hooks/usePageMeta'

export default function CartPage() {
  usePageMeta({ title: 'Your Cart', noindex: true })
  const { cart, changeQuantity, removeFromCart, subtotal } = useStore()
  const { products } = useProducts()
  const shipping = subtotal === 0 || subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT
  const total = subtotal + shipping

  if (cart.length === 0) {
    return (
      <div className="page empty-state">
        <div className="cart-empty-icon">🛍️</div>
        <h1>Your cart is empty</h1>
        <p>Looks like you haven't added anything yet.</p>
        <Link to="/shop" className="btn">Start Shopping</Link>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head"><h1>Your Cart</h1></div>
      <div className="cart-page-grid">
        <div className="cart-lines">
          {cart.map((line) => {
            const product = products.find((p) => p.id === line.productId)
            if (!product) return null
            return (
              <div className="cart-line" key={`${line.productId}-${line.color}-${line.size}`}>
                <img src={product.image} alt={product.name} />
                <div className="cart-line-info">
                  <Link to={`/product/${product.id}`} className="cart-item-name">{product.name}</Link>
                  {(line.color || line.size) && (
                    <span className="cart-item-variant">{[line.color, line.size].filter(Boolean).join(' · ')}</span>
                  )}
                  <span className="cart-item-price">{formatPrice(effectivePrice(product))}{product.sale && <span className="arrival-og-price" style={{ marginLeft: 8 }}>{formatPrice(product.price)}</span>}</span>
                </div>
                <div className="cart-qty">
                  <button onClick={() => changeQuantity(line.productId, -1)} aria-label="Decrease">−</button>
                  <span>{line.quantity}</span>
                  <button onClick={() => changeQuantity(line.productId, 1)} aria-label="Increase">+</button>
                </div>
                <div className="cart-line-total">{formatPrice(effectivePrice(product) * line.quantity)}</div>
                <button className="cart-remove" onClick={() => removeFromCart(line.productId)} aria-label="Remove">✕</button>
              </div>
            )
          })}
        </div>

        <aside className="cart-summary">
          <h3>Order Summary</h3>
          <div className="cart-total-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div className="cart-total-row"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
          {shipping > 0 && (
            <p className="ship-hint">Add {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for free delivery.</p>
          )}
          <div className="cart-total-row grand"><span>Total</span><span>{formatPrice(total)}</span></div>
          <Link to="/checkout" className="btn btn-full">Proceed to Checkout</Link>
          <Link to="/shop" className="cart-view-link">Continue shopping</Link>
        </aside>
      </div>
    </div>
  )
}
