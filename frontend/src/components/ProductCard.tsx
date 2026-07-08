import { Link, useNavigate } from 'react-router-dom'
import type { Product } from '../data'
import { formatPrice, useStore } from '../store/StoreContext'

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWished } = useStore()
  const navigate = useNavigate()
  const wished = isWished(product.id)

  return (
    <div className="arrival-card">
      <div className="arrival-img-wrapper">
        <Link to={`/product/${product.id}`}>
          <img className="arrival-img" src={product.image} alt={product.name} loading="lazy" />
        </Link>
        <button
          className={`arrival-heart ${wished ? 'active' : ''}`}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          onClick={() => toggleWishlist(product.id)}
        >
          {wished ? '♥' : '♡'}
        </button>
        {product.sale ? (
          <span className="arrival-sale-tag">-{product.sale.percent}%</span>
        ) : (
          product.badge && <span className="arrival-badge">{product.badge}</span>
        )}
        {!product.inStock && <span className="arrival-oos">Sold Out</span>}
      </div>
      <div className="arrival-info">
        <div className="arrival-category">{product.category}</div>
        <Link to={`/product/${product.id}`} className="arrival-name">
          {product.name}
        </Link>
        <div className="arrival-price-row">
          <span className="arrival-price">{formatPrice(product.sale ? product.sale.price : product.price)}</span>
          <span className="arrival-og-price">{formatPrice(product.sale ? product.price : product.originalPrice)}</span>
        </div>
        <div className="arrival-rating">
          <span className="arrival-stars">{'★'.repeat(Math.floor(product.rating))}</span>
          <span>({product.reviews})</span>
        </div>
        <button
          className="btn btn-full btn-sm"
          disabled={!product.inStock}
          onClick={() =>
            product.inStock ? addToCart(product) : navigate(`/product/${product.id}`)
          }
        >
          {product.inStock ? 'Add to Cart' : 'View Details'}
        </button>
      </div>
    </div>
  )
}
