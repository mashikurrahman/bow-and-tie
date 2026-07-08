import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatPrice, useStore } from '../store/StoreContext'
import { useProducts } from '../store/ProductsContext'
import ProductCard from '../components/ProductCard'

export default function ProductDetailPage() {
  const { id } = useParams()
  const { getProduct, getRelated } = useProducts()
  const product = id ? getProduct(id) : undefined
  const { addToCart, setCartOpen, toggleWishlist, isWished } = useStore()
  const [color, setColor] = useState<string>()
  const [size, setSize] = useState<string>()
  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)

  if (!product) {
    return (
      <div className="page empty-state">
        <h1>Product not found</h1>
        <Link to="/shop" className="btn">Back to Shop</Link>
      </div>
    )
  }

  const shownPrice = product.sale ? product.sale.price : product.price
  const wasPrice = product.sale ? product.price : product.originalPrice
  const discount = wasPrice > shownPrice ? Math.round(((wasPrice - shownPrice) / wasPrice) * 100) : 0
  const related = getRelated(product)
  const wished = isWished(product.id)

  const handleAdd = (openCart: boolean) => {
    addToCart(product, {
      color: color ?? product.colors[0],
      size: size ?? product.sizes[0],
      quantity: qty,
    })
    if (openCart) setCartOpen(true)
  }

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link to="/">Home</Link> / <Link to="/shop">Shop</Link> /{' '}
        <Link to={`/shop?category=${product.category}`}>{product.category}</Link> /{' '}
        <span>{product.name}</span>
      </div>

      <div className="product-detail">
        <div className="product-gallery">
          <div className="gallery-main">
            <img src={product.gallery?.[activeImg] ?? product.image} alt={product.name} className="product-main-img" />
            {product.badge && <span className="arrival-badge detail-badge">{product.badge}</span>}
          </div>
          {product.gallery && product.gallery.length > 1 && (
            <div className="gallery-thumbs">
              {product.gallery.map((img, i) => (
                <button
                  type="button"
                  key={i}
                  className={`gallery-thumb ${activeImg === i ? 'active' : ''}`}
                  onClick={() => setActiveImg(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  <img src={img} alt={`${product.name} ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-buy">
          <div className="product-category">{product.category}</div>
          <h1>{product.name}</h1>
          <div className="product-rating">
            <span className="arrival-stars">{'★'.repeat(Math.floor(product.rating))}</span>
            <span>{product.rating.toFixed(1)} · {product.reviews} reviews</span>
          </div>
          <div className="product-price-row">
            <span className="product-price">{formatPrice(shownPrice)}</span>
            <span className="product-og-price">{formatPrice(wasPrice)}</span>
            {discount > 0 && <span className="product-discount">-{discount}%</span>}
          </div>
          {product.sale && <div className="product-sale-note">🎉 {product.sale.title} — {product.sale.percent}% off applied</div>}
          <p className="product-desc">{product.description}</p>

          <div className="product-meta">
            <div><span>Fabric</span><strong>{product.fabric}</strong></div>
            <div><span>Delivery</span><strong>{product.delivery}</strong></div>
            <div><span>Availability</span><strong className={product.inStock ? 'in' : 'out'}>{product.inStock ? 'In Stock' : 'Sold Out'}</strong></div>
          </div>

          <div className="product-option">
            <label>Color</label>
            <div className="option-chips">
              {product.colors.map((c) => (
                <button
                  key={c}
                  className={`chip ${(color ?? product.colors[0]) === c ? 'active' : ''}`}
                  onClick={() => setColor(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="product-option">
            <label>Size</label>
            <div className="option-chips">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  className={`chip ${(size ?? product.sizes[0]) === s ? 'active' : ''}`}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="product-actions">
            <div className="cart-qty qty-lg">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
            </div>
            <button className="btn btn-full" disabled={!product.inStock} onClick={() => handleAdd(false)}>
              {product.inStock ? 'Add to Cart' : 'Sold Out'}
            </button>
          </div>
          <div className="product-actions">
            <button className="btn btn-outline btn-full" disabled={!product.inStock} onClick={() => handleAdd(true)}>
              Buy Now
            </button>
            <button className="btn btn-outline wish-btn" onClick={() => toggleWishlist(product.id)}>
              {wished ? '♥ Wishlisted' : '♡ Wishlist'}
            </button>
          </div>
        </div>
      </div>

      {/* REVIEWS */}
      <section className="reviews">
        <h2 className="section-title">Customer Reviews</h2>
        <div className="review-list">
          {product.reviewList?.map((r, i) => (
            <div className="review-card" key={i}>
              <div className="review-head">
                <strong>{r.name}</strong>
                <span className="arrival-stars">{'★'.repeat(r.rating)}</span>
              </div>
              <span className="review-date">{r.date}</span>
              <p>{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RELATED */}
      <section className="section">
        <div className="section-header"><h2 className="section-title">You May Also Like</h2></div>
        <div className="arrivals-grid">
          {related.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  )
}
