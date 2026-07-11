import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { whatsappNumber } from '../data'
import {
  SHIPPING_ZONES,
  type ShippingZone,
  formatPrice,
  lineKey,
  lineUnitPrice,
  shippingFor,
  useStore,
} from '../store/StoreContext'
import { useProducts } from '../store/ProductsContext'
import { useAuth } from '../store/AuthContext'
import { orders as orderApi, type OrderItem } from '../services/db'
import { usePageMeta } from '../hooks/usePageMeta'

type Payment = 'cod' | 'bkash' | 'nagad'

export default function CheckoutPage() {
  usePageMeta({ title: 'Checkout', noindex: true })
  const { cart, subtotal, clearCart, applyPromo, notify } = useStore()
  const { products } = useProducts()
  const { user } = useAuth()
  const navigate = useNavigate()

  const firstAddr = user?.addresses[0]
  const [form, setForm] = useState({
    name: firstAddr?.name ?? user?.name ?? '',
    email: user?.email ?? '',
    phone: firstAddr?.phone ?? user?.phone ?? '',
    address: firstAddr?.address ?? '',
    city: firstAddr?.city ?? 'Dhaka',
    notes: '',
  })
  const [payment, setPayment] = useState<Payment>('cod')
  const [zone, setZone] = useState<ShippingZone>(
    (firstAddr?.city ?? 'Dhaka').trim().toLowerCase() === 'dhaka' ? 'inside' : 'outside',
  )
  const [txnId, setTxnId] = useState('')
  const [promo, setPromo] = useState('')
  const [discountRate, setDiscountRate] = useState(0)
  const [appliedCode, setAppliedCode] = useState('')
  const [busy, setBusy] = useState(false)

  const shipping = shippingFor(zone, subtotal)
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
      const v = p.variants?.find((x) => x.id === l.variantId)
      return {
        productId: l.productId,
        variantId: l.variantId,
        name: p.name,
        image: v?.image ?? p.image,
        price: lineUnitPrice(p, l),
        quantity: l.quantity,
        color: v?.color ?? l.color,
        size: v?.size ?? l.size,
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
          variantId: l.variantId,
          quantity: l.quantity,
          color: l.color,
          size: l.size,
        })),
        customer: {
          name: form.name,
          email: form.email || undefined,
          phone: form.phone,
          address: form.address,
          city: form.city,
        },
        deliveryZone: zone,
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
          <div className="field">
            <label>Email {user ? '' : '(for order confirmation)'}</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" />
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

          <h3>Delivery Area</h3>
          <div className="pay-methods">
            {(Object.keys(SHIPPING_ZONES) as ShippingZone[]).map((z) => (
              <label key={z} className={`pay-option ${zone === z ? 'active' : ''}`}>
                <input type="radio" name="zone" checked={zone === z} onChange={() => setZone(z)} />
                <span className="zone-opt">
                  <span>{SHIPPING_ZONES[z].label}</span>
                  <small>{shippingFor(z, subtotal) === 0 ? 'Free delivery' : formatPrice(SHIPPING_ZONES[z].fee)} · {SHIPPING_ZONES[z].eta}</small>
                </span>
              </label>
            ))}
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
              const v = p.variants?.find((x) => x.id === l.variantId)
              return (
                <div className="checkout-item" key={lineKey(l)}>
                  <img src={v?.image ?? p.image} alt={p.name} />
                  <div>
                    <span className="cart-item-name">{p.name}</span>
                    <span className="cart-item-variant">{v ? `${v.label} · ` : ''}Qty {l.quantity}</span>
                  </div>
                  <span>{formatPrice(lineUnitPrice(p, l) * l.quantity)}</span>
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
          <div className="cart-total-row"><span>Shipping · {SHIPPING_ZONES[zone].eta}</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
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
