import { Link } from 'react-router-dom'
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
  formatPrice,
  lineKey,
  lineUnitPrice,
  useStore,
} from '../store/StoreContext'
import { useProducts } from '../store/ProductsContext'
import ProductCard from '../components/ProductCard'
import { usePageMeta } from '../hooks/usePageMeta'

export default function CartPage() {
  usePageMeta({ title: 'Your Cart', noindex: true })
  const { cart, changeQuantity, removeFromCart, subtotal } = useStore()
  const { products } = useProducts()
  const shipping = subtotal === 0 || subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT
  const total = subtotal + shipping

  // "You may also like" — products not already in the cart, from the same
  // categories first, so shoppers can add a matching piece before checkout.
  const inCart = new Set(cart.map((l) => l.productId))
  const cartCategories = new Set(
    cart.map((l) => products.find((p) => p.id === l.productId)?.category).filter(Boolean),
  )
  const crossSell = products
    .filter((p) => !inCart.has(p.id) && p.inStock)
    .sort((a, b) => Number(cartCategories.has(b.category)) - Number(cartCategories.has(a.category)))
    .slice(0, 4)

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
            const key = lineKey(line)
            const variant = product.variants?.find((v) => v.id === line.variantId)
            const variantLabel = variant?.label ?? [line.color, line.size].filter(Boolean).join(' · ')
            const unit = lineUnitPrice(product, line)
            return (
              <div className="cart-line" key={key}>
                <img src={variant?.image ?? product.image} alt={product.name} />
                <div className="cart-line-info">
                  <Link to={`/product/${product.id}`} className="cart-item-name">{product.name}</Link>
                  {variantLabel && <span className="cart-item-variant">{variantLabel}</span>}
                  <span className="cart-item-price">{formatPrice(unit)}{product.sale && <span className="arrival-og-price" style={{ marginLeft: 8 }}>{formatPrice(product.price)}</span>}</span>
                </div>
                <div className="cart-qty">
                  <button onClick={() => changeQuantity(key, -1)} aria-label="Decrease">−</button>
                  <span>{line.quantity}</span>
                  <button onClick={() => changeQuantity(key, 1)} aria-label="Increase">+</button>
                </div>
                <div className="cart-line-total">{formatPrice(unit * line.quantity)}</div>
                <button className="cart-remove" onClick={() => removeFromCart(key)} aria-label="Remove">✕</button>
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

      {crossSell.length > 0 && (
        <section className="section">
          <div className="section-header"><h2 className="section-title">You May Also Like</h2></div>
          <div className="arrivals-grid">
            {crossSell.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
