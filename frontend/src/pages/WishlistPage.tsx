import { Link } from 'react-router-dom'
import { effectivePrice, formatPrice, useStore } from '../store/StoreContext'
import { useProducts } from '../store/ProductsContext'
import ProductCard from '../components/ProductCard'
import { usePageMeta } from '../hooks/usePageMeta'

export default function WishlistPage() {
  usePageMeta({ title: 'My Wishlist', noindex: true })
  const { wishlist, wishlistPriceWhenAdded } = useStore()
  const { products } = useProducts()
  const items = products.filter((p) => wishlist.includes(p.id))

  const priceDrop = (id: string) => {
    const was = wishlistPriceWhenAdded(id)
    const product = products.find((p) => p.id === id)
    if (was == null || !product) return null
    const now = effectivePrice(product)
    return now < was ? was - now : null
  }

  const droppedCount = items.filter((p) => priceDrop(p.id)).length

  return (
    <div className="page">
      <div className="page-head">
        <h1>Your Wishlist</h1>
        <p>{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
      </div>

      {droppedCount > 0 && (
        <div className="wishlist-drop-banner">
          🎉 Good news! <b>{droppedCount}</b> item{droppedCount !== 1 ? 's' : ''} on your wishlist
          {droppedCount !== 1 ? ' have' : ' has'} dropped in price.
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="cart-empty-icon">♡</div>
          <p>Your wishlist is empty. Tap the heart on any product to save it.</p>
          <Link to="/shop" className="btn">Browse Products</Link>
        </div>
      ) : (
        <div className="arrivals-grid">
          {items.map((p) => {
            const drop = priceDrop(p.id)
            return (
              <div className="wishlist-cell" key={p.id}>
                {drop && <span className="price-drop-tag">↓ {formatPrice(drop)} price drop</span>}
                <ProductCard product={p} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
