import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
  effectivePrice,
  formatPrice,
  useStore,
} from '../store/StoreContext'
import { useProducts } from '../store/ProductsContext'

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, changeQuantity, removeFromCart, subtotal, cartCount } =
    useStore()
  const { products } = useProducts()
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCartOpen(false)
    }
    if (cartOpen) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [cartOpen, setCartOpen])

  const shipping = subtotal === 0 || subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT
  const total = subtotal + shipping

  const goCheckout = () => {
    setCartOpen(false)
    navigate('/checkout')
  }

  return (
    <>
      <div
        className={`cart-overlay ${cartOpen ? 'open' : ''}`}
        onClick={() => setCartOpen(false)}
      />
      <aside
        className={`cart-panel ${cartOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="Shopping cart"
        aria-hidden={!cartOpen}
      >
        <div className="cart-panel-header">
          <h3>Your Cart ({cartCount})</h3>
          <button className="cart-close" onClick={() => setCartOpen(false)} aria-label="Close cart">
            ✕
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛍️</div>
            <p>Your cart is empty</p>
            <Link to="/shop" className="btn" onClick={() => setCartOpen(false)}>
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((line) => {
                const product = products.find((p) => p.id === line.productId)
                if (!product) return null
                return (
                  <div className="cart-item" key={`${line.productId}-${line.color}-${line.size}`}>
                    <img className="cart-item-img" src={product.image} alt={product.name} />
                    <div className="cart-item-main">
                      <div className="cart-item-top">
                        <span className="cart-item-name">{product.name}</span>
                        <button
                          className="cart-item-x"
                          onClick={() => removeFromCart(line.productId)}
                          aria-label={`Remove ${product.name}`}
                        >
                          ✕
                        </button>
                      </div>
                      {(line.color || line.size) && (
                        <span className="cart-item-variant">
                          {[line.color, line.size].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      <span className="cart-item-unit">
                        {formatPrice(effectivePrice(product))} each
                        {product.sale && <span className="cart-item-was">{formatPrice(product.price)}</span>}
                      </span>
                      <div className="cart-item-bottom">
                        <div className="qty-stepper">
                          <button type="button" onClick={() => changeQuantity(line.productId, -1)} aria-label="Decrease quantity">−</button>
                          <span>{line.quantity}</span>
                          <button type="button" onClick={() => changeQuantity(line.productId, 1)} aria-label="Increase quantity">+</button>
                        </div>
                        <span className="cart-item-linetotal">{formatPrice(effectivePrice(product) * line.quantity)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="cart-footer">
              <div className="cart-total-row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="cart-total-row">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
              </div>
              <div className="cart-total-row grand">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button className="btn btn-full" onClick={goCheckout}>
                Proceed to Checkout
              </button>
              <Link
                to="/cart"
                className="cart-view-link"
                onClick={() => setCartOpen(false)}
              >
                View full cart
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
