import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { whatsappNumber } from '../data'
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
  effectivePrice,
  formatPrice,
  useStore,
} from '../store/StoreContext'
import { useProducts } from '../store/ProductsContext'
import { useAuth } from '../store/AuthContext'
import { orders as orderApi, type OrderItem } from '../services/db'

type Payment = 'cod' | 'bkash' | 'nagad'

export default function CheckoutPage() {
  const { cart, subtotal, clearCart, applyPromo, notify } = useStore()
  const { products } = useProducts()
  const { user } = useAuth()
  const navigate = useNavigate()

  const firstAddr = user?.addresses[0]
  const [form, setForm] = useState({
    name: firstAddr?.name ?? user?.name ?? '',
    phone: firstAddr?.phone ?? user?.phone ?? '',
    address: firstAddr?.address ?? '',
    city: firstAddr?.city ?? 'Dhaka',
    notes: '',
  })
  const [payment, setPayment] = useState<Payment>('cod')
  const [txnId, setTxnId] = useState('')
  const [promo, setPromo] = useState('')
  const [discountRate, setDiscountRate] = useState(0)
  const [appliedCode, setAppliedCode] = useState('')
  const [busy, setBusy] = useState(false)

  const shipping = subtotal === 0 || subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT
  const discount = Math.round(subtotal * discountRate)
  const total = subtotal - discount + shipping

  if (cart.length === 0) {
    return (
      <div className="page empty-state">
        <h1>Your cart is empty</h1>
        <Link to="/shop" className="btn">Go to Shop</Link>
      </div>
    )
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const applySavedAddress = (i: number) => {
    const a = user?.addresses[i]
    if (a) setForm((f) => ({ ...f, name: a.name, phone: a.phone, address: a.address, city: a.city }))
  }

  const checkPromo = () => {
    const rate = applyPromo(promo)
    if (rate) {
      setDiscountRate(rate)
      setAppliedCode(promo.trim().toUpperCase())
      notify(`Promo applied — ${Math.round(rate * 100)}% off`)
    } else {
      setDiscountRate(0)
      setAppliedCode('')
      notify('Invalid promo code')
    }
  }

  const buildItems = (): OrderItem[] =>
    cart.map((l) => {
      const p = products.find((x) => x.id === l.productId)!
      return {
        productId: l.productId,
        name: p.name,
        image: p.image,
        price: p.price,
        quantity: l.quantity,
        color: l.color,
        size: l.size,
      }
    })

  const buildSummary = () => {
    const lines = buildItems()
      .map((it) => `• ${it.name}${it.color || it.size ? ` (${[it.color, it.size].filter(Boolean).join('/')})` : ''} x${it.quantity} — ${formatPrice(it.price * it.quantity)}`)
      .join('\n')
    return `New Order 🎀\n${lines}\n\nSubtotal: ${formatPrice(subtotal)}${discount ? `\nDiscount: -${formatPrice(discount)}` : ''}\nShipping: ${shipping === 0 ? 'Free' : formatPrice(shipping)}\nTotal: ${formatPrice(total)}\n\nName: ${form.name}\nPhone: ${form.phone}\nAddress: ${form.address}, ${form.city}\nPayment: ${payment.toUpperCase()}${txnId ? `\nTxn ID: ${txnId}` : ''}${form.notes ? `\nNotes: ${form.notes}` : ''}`
  }

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      // The server recomputes prices, discount, shipping and totals — we only
      // send what the customer chose. Never trust client-side money.
      const order = await orderApi.create({
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          color: l.color,
          size: l.size,
        })),
        customer: { name: form.name, phone: form.phone, address: form.address, city: form.city },
        payment,
        txnId: txnId || undefined,
        notes: form.notes || undefined,
        promoCode: appliedCode || undefined,
      })
      localStorage.setItem('bc_last_order', order.id)
      clearCart()
      navigate('/order-confirmation')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not place order')
    } finally {
      setBusy(false)
    }
  }

  const orderWhatsApp = () => {
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildSummary())}`, '_blank')
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Checkout</h1>
        {!user && <p>Have an account? <Link to="/login" state={{ from: '/checkout' }}>Sign in</Link> for faster checkout — or continue as a guest below.</p>}
      </div>
      <form className="checkout-grid" onSubmit={placeOrder}>
        <div className="checkout-form">
          {user && user.addresses.length > 0 && (
            <div className="saved-addr-picker">
              <label>Use a saved address</label>
              <div className="option-chips">
                {user.addresses.map((a, i) => (
                  <button type="button" key={i} className="chip" onClick={() => applySavedAddress(i)}>
                    {a.label || a.city} · {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <h3>Delivery Details</h3>
          <div className="field">
            <label>Full Name *</label>
            <input required value={form.name} onChange={set('name')} placeholder="Your name" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Phone *</label>
              <input required type="tel" value={form.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" />
            </div>
            <div className="field">
              <label>City *</label>
              <input required value={form.city} onChange={set('city')} />
            </div>
          </div>
          <div className="field">
            <label>Full Address *</label>
            <textarea required value={form.address} onChange={set('address')} placeholder="House, road, area" rows={3} />
          </div>
          <div className="field">
            <label>Order Notes (optional)</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Any special instructions" />
          </div>

          <h3>Payment Method</h3>
          <div className="pay-methods">
            {(['cod', 'bkash', 'nagad'] as Payment[]).map((m) => (
              <label key={m} className={`pay-option ${payment === m ? 'active' : ''}`}>
                <input type="radio" name="pay" checked={payment === m} onChange={() => setPayment(m)} />
                {m === 'cod' ? 'Cash on Delivery' : m === 'bkash' ? 'bKash' : 'Nagad'}
              </label>
            ))}
          </div>
          {payment !== 'cod' && (
            <div className="pay-note">
              <p>Send <strong>{formatPrice(total)}</strong> to our {payment === 'bkash' ? 'bKash' : 'Nagad'} merchant number <strong>01XXXXXXXXX</strong>, then enter the Transaction ID below.</p>
              <div className="field">
                <label>Transaction ID *</label>
                <input required value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="e.g. 8N7X6C2K1P" />
              </div>
            </div>
          )}
        </div>

        <aside className="checkout-summary">
          <h3>Order Summary</h3>
          <div className="checkout-items">
            {cart.map((l) => {
              const p = products.find((x) => x.id === l.productId)
              if (!p) return null
              return (
                <div className="checkout-item" key={`${l.productId}-${l.color}-${l.size}`}>
                  <img src={p.image} alt={p.name} />
                  <div>
                    <span className="cart-item-name">{p.name}</span>
                    <span className="cart-item-variant">Qty {l.quantity}</span>
                  </div>
                  <span>{formatPrice(effectivePrice(p) * l.quantity)}</span>
                </div>
              )
            })}
          </div>

          <div className="promo-row">
            <input placeholder="Promo code (try EID25)" value={promo} onChange={(e) => setPromo(e.target.value)} />
            <button type="button" className="btn btn-sm" onClick={checkPromo}>Apply</button>
          </div>

          <div className="cart-total-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          {discount > 0 && <div className="cart-total-row discount"><span>Discount</span><span>-{formatPrice(discount)}</span></div>}
          <div className="cart-total-row"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
          <div className="cart-total-row grand"><span>Total</span><span>{formatPrice(total)}</span></div>

          <button type="submit" className="btn btn-full" disabled={busy}>{busy ? 'Placing order…' : 'Place Order'}</button>
          <button type="button" className="btn btn-outline btn-full wa-btn" onClick={orderWhatsApp}>
            💬 Order via WhatsApp
          </button>
        </aside>
      </form>
    </div>
  )
}
