import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { type Product } from '../data'
import { coupons } from '../services/db'
import { useProducts } from './ProductsContext'
import { useAuth } from './AuthContext'
import { cartTracking } from '../services/db'

export type CartLine = {
  productId: string
  variantId?: string
  quantity: number
  color?: string
  size?: string
}

// Stable identity for a cart line: same product + variant + options = one line.
export const lineKey = (l: { productId: string; variantId?: string; color?: string; size?: string }) =>
  `${l.productId}|${l.variantId ?? ''}|${l.color ?? ''}|${l.size ?? ''}`

type Toast = { id: number; message: string }

type StoreValue = {
  cart: CartLine[]
  wishlist: string[]
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  addToCart: (product: Product, opts?: { variantId?: string; color?: string; size?: string; quantity?: number }) => void
  changeQuantity: (key: string, delta: number) => void
  removeFromCart: (key: string) => void
  clearCart: () => void
  toggleWishlist: (productId: string) => void
  isWished: (productId: string) => boolean
  wishlistPriceWhenAdded: (productId: string) => number | undefined
  reorder: (items: { productId: string | null; variantId?: string; quantity: number; color?: string; size?: string }[]) => void
  cartCount: number
  subtotal: number
  toasts: Toast[]
  notify: (message: string) => void
  applyPromo: (code: string) => Promise<number | null>
}

const StoreContext = createContext<StoreValue | null>(null)

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { products } = useProducts()
  const { user } = useAuth()
  // Cart & wishlist are stored per account so one user's items never leak into
  // another's on the same browser (e.g. admin seeing a customer's wishlist).
  const scope = user?.id ?? 'guest'
  const cartKey = `bc_cart:${scope}`
  const wishKey = `bc_wishlist:${scope}`
  const wishPriceKey = `bc_wishprice:${scope}`

  const [activeScope, setActiveScope] = useState(scope)
  const [cart, setCart] = useState<CartLine[]>(() => load(`bc_cart:${scope}`, []))
  const [wishlist, setWishlist] = useState<string[]>(() => load(`bc_wishlist:${scope}`, []))
  // Price of each item at the moment it was wishlisted — used for price-drop alerts.
  const [wishPrices, setWishPrices] = useState<Record<string, number>>(() =>
    load(`bc_wishprice:${scope}`, {}),
  )
  const [cartOpen, setCartOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  // When the logged-in account changes, swap to that account's data (sync, so
  // we never persist one account's items under another's key).
  if (scope !== activeScope) {
    setActiveScope(scope)
    setCart(load(cartKey, []))
    setWishlist(load(wishKey, []))
    setWishPrices(load(wishPriceKey, {}))
  }

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cart))
  }, [cart, cartKey])

  useEffect(() => {
    localStorage.setItem(wishKey, JSON.stringify(wishlist))
  }, [wishlist, wishKey])

  useEffect(() => {
    localStorage.setItem(wishPriceKey, JSON.stringify(wishPrices))
  }, [wishPrices, wishPriceKey])

  // Abandoned-cart tracking: for signed-in shoppers, report the cart (debounced)
  // so a reminder email can go out if they leave without checking out.
  useEffect(() => {
    if (!user?.email) return
    const items = cart
      .map((l) => {
        const p = products.find((x) => x.id === l.productId)
        return p ? { name: p.name, quantity: l.quantity, price: lineUnitPrice(p, l), image: p.image } : null
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
    const timer = setTimeout(() => {
      cartTracking.track({ email: user.email, items, total: subtotal })
    }, 2500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, user?.email])

  const notify = useCallback((message: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  const addToCart: StoreValue['addToCart'] = useCallback(
    (product, opts) => {
      const quantity = opts?.quantity ?? 1
      const incoming = { productId: product.id, variantId: opts?.variantId, color: opts?.color, size: opts?.size }
      const max = maxCartQty(product, opts?.variantId)
      if (max <= 0) {
        notify(`${product.name} is sold out`)
        return
      }
      let capped = false
      setCart((current) => {
        const existing = current.find((line) => lineKey(line) === lineKey(incoming))
        if (existing) {
          const next = Math.min(existing.quantity + quantity, max)
          capped = next < existing.quantity + quantity
          return current.map((line) => (line === existing ? { ...line, quantity: next } : line))
        }
        capped = quantity > max
        return [...current, { ...incoming, quantity: Math.min(quantity, max) }]
      })
      notify(capped ? `Only ${max} in stock — quantity adjusted` : `${product.name} added to cart`)
    },
    [notify],
  )

  const changeQuantity: StoreValue['changeQuantity'] = useCallback(
    (key, delta) => {
      setCart((current) =>
        current
          .map((line) => {
            if (lineKey(line) !== key) return line
            const product = products.find((p) => p.id === line.productId)
            const max = product ? maxCartQty(product, line.variantId) : Infinity
            if (delta > 0 && line.quantity + delta > max) {
              notify(`Only ${max} in stock`)
              return { ...line, quantity: max }
            }
            return { ...line, quantity: line.quantity + delta }
          })
          .filter((line) => line.quantity > 0),
      )
    },
    [products, notify],
  )

  const removeFromCart: StoreValue['removeFromCart'] = useCallback((key) => {
    setCart((current) => current.filter((line) => lineKey(line) !== key))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  // Add every line from a past order back into the cart (Buy Again).
  const reorder: StoreValue['reorder'] = useCallback(
    (items) => {
      const valid = items.filter((i) => i.productId)
      if (!valid.length) return
      setCart((current) => {
        const next = current.map((l) => ({ ...l }))
        for (const it of valid) {
          const line = { productId: it.productId as string, variantId: it.variantId, color: it.color, size: it.size }
          const existing = next.find((l) => lineKey(l) === lineKey(line))
          if (existing) existing.quantity += it.quantity
          else next.push({ ...line, quantity: it.quantity })
        }
        return next
      })
      notify('Added to cart 🛒')
      setCartOpen(true)
    },
    [notify],
  )

  const toggleWishlist: StoreValue['toggleWishlist'] = useCallback(
    (productId) => {
      setWishlist((current) => {
        if (current.includes(productId)) {
          notify('Removed from wishlist')
          setWishPrices((prev) => {
            const next = { ...prev }
            delete next[productId]
            return next
          })
          return current.filter((id) => id !== productId)
        }
        notify('Added to wishlist ♡')
        const product = products.find((p) => p.id === productId)
        if (product) setWishPrices((prev) => ({ ...prev, [productId]: effectivePrice(product) }))
        return [...current, productId]
      })
    },
    [notify, products],
  )

  const isWished = useCallback((productId: string) => wishlist.includes(productId), [wishlist])

  const wishlistPriceWhenAdded = useCallback(
    (productId: string) => wishPrices[productId],
    [wishPrices],
  )

  const applyPromo = useCallback(async (code: string) => {
    const res = await coupons.validate(code)
    return res ? res.rate : null
  }, [])

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0)
  const subtotal = cart.reduce((sum, line) => {
    const product = products.find((p) => p.id === line.productId)
    return sum + (product ? lineUnitPrice(product, line) * line.quantity : 0)
  }, 0)

  const value = useMemo<StoreValue>(
    () => ({
      cart,
      wishlist,
      cartOpen,
      setCartOpen,
      addToCart,
      changeQuantity,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isWished,
      wishlistPriceWhenAdded,
      reorder,
      cartCount,
      subtotal,
      toasts,
      notify,
      applyPromo,
    }),
    [
      cart,
      wishlist,
      cartOpen,
      addToCart,
      changeQuantity,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isWished,
      wishlistPriceWhenAdded,
      reorder,
      cartCount,
      subtotal,
      toasts,
      notify,
      applyPromo,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export const FREE_SHIPPING_THRESHOLD = 2500
export const SHIPPING_ZONES = {
  inside: { label: 'Inside Dhaka', fee: 60, eta: '1–2 days' },
  outside: { label: 'Outside Dhaka', fee: 120, eta: '3–5 days' },
} as const
export type ShippingZone = keyof typeof SHIPPING_ZONES
export const SHIPPING_FLAT = SHIPPING_ZONES.outside.fee
export const shippingFor = (zone: ShippingZone, subtotal: number) =>
  subtotal === 0 || subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_ZONES[zone].fee

/** Price a customer actually pays — the promo sale price if one applies. */
export const effectivePrice = (p: Product) => p.sale?.price ?? p.price

/** Most units of a product/variant that may be added to the cart. Untracked
 * stock (no stock figure, e.g. custom items) is unlimited. */
export const maxCartQty = (p: Product, variantId?: string): number => {
  if (variantId) {
    const v = p.variants?.find((x) => x.id === variantId)
    if (v) return v.stock > 0 ? v.stock : 0
  }
  if (!p.inStock) return 0
  return p.stock && p.stock > 0 ? p.stock : Infinity
}

/** Unit price for a cart line — the chosen variant's price, else the product's. */
export const lineUnitPrice = (p: Product, line: { variantId?: string }) => {
  if (line.variantId) {
    const v = p.variants?.find((x) => x.id === line.variantId)
    if (v) return v.price
  }
  return effectivePrice(p)
}

export const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(value)
