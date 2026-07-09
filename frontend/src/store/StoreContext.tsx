import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { promoCodes, type Product } from '../data'
import { useProducts } from './ProductsContext'
import { useAuth } from './AuthContext'
import { cartTracking } from '../services/db'

export type CartLine = {
  productId: string
  quantity: number
  color?: string
  size?: string
}

type Toast = { id: number; message: string }

type StoreValue = {
  cart: CartLine[]
  wishlist: string[]
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  addToCart: (product: Product, opts?: { color?: string; size?: string; quantity?: number }) => void
  changeQuantity: (productId: string, delta: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  toggleWishlist: (productId: string) => void
  isWished: (productId: string) => boolean
  wishlistPriceWhenAdded: (productId: string) => number | undefined
  reorder: (items: { productId: string | null; quantity: number; color?: string; size?: string }[]) => void
  cartCount: number
  subtotal: number
  toasts: Toast[]
  notify: (message: string) => void
  applyPromo: (code: string) => number | null
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
        return p ? { name: p.name, quantity: l.quantity, price: effectivePrice(p), image: p.image } : null
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
      setCart((current) => {
        const existing = current.find(
          (line) =>
            line.productId === product.id &&
            line.color === opts?.color &&
            line.size === opts?.size,
        )
        if (existing) {
          return current.map((line) =>
            line === existing ? { ...line, quantity: line.quantity + quantity } : line,
          )
        }
        return [...current, { productId: product.id, quantity, color: opts?.color, size: opts?.size }]
      })
      notify(`${product.name} added to cart`)
    },
    [notify],
  )

  const changeQuantity: StoreValue['changeQuantity'] = useCallback((productId, delta) => {
    setCart((current) =>
      current
        .map((line) =>
          line.productId === productId ? { ...line, quantity: line.quantity + delta } : line,
        )
        .filter((line) => line.quantity > 0),
    )
  }, [])

  const removeFromCart: StoreValue['removeFromCart'] = useCallback((productId) => {
    setCart((current) => current.filter((line) => line.productId !== productId))
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
          const existing = next.find(
            (l) => l.productId === it.productId && l.color === it.color && l.size === it.size,
          )
          if (existing) existing.quantity += it.quantity
          else next.push({ productId: it.productId as string, quantity: it.quantity, color: it.color, size: it.size })
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

  const applyPromo = useCallback((code: string) => {
    const rate = promoCodes[code.trim().toUpperCase()]
    return rate ?? null
  }, [])

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0)
  const subtotal = cart.reduce((sum, line) => {
    const product = products.find((p) => p.id === line.productId)
    return sum + (product ? effectivePrice(product) * line.quantity : 0)
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

export const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(value)
