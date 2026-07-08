import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { useProducts } from '../store/ProductsContext'
import ProductCard from '../components/ProductCard'

export default function WishlistPage() {
  const { wishlist } = useStore()
  const { products } = useProducts()
  const items = products.filter((p) => wishlist.includes(p.id))

  return (
    <div className="page">
      <div className="page-head">
        <h1>Your Wishlist</h1>
        <p>{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="cart-empty-icon">♡</div>
          <p>Your wishlist is empty. Tap the heart on any product to save it.</p>
          <Link to="/shop" className="btn">Browse Products</Link>
        </div>
      ) : (
        <div className="arrivals-grid">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
