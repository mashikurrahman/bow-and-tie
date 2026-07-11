import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatPrice, useStore } from '../store/StoreContext'
import { useProducts } from '../store/ProductsContext'
import { useAuth } from '../store/AuthContext'
import { stockAlerts } from '../services/db'
import { recordView } from '../store/recentlyViewed'
import { usePageMeta } from '../hooks/usePageMeta'
import ProductCard from '../components/ProductCard'
import ReviewsSection from '../components/ReviewsSection'
import QASection from '../components/QASection'
import ShareButtons from '../components/ShareButtons'
import RecentlyViewed from '../components/RecentlyViewed'

export default function ProductDetailPage() {
  const { id } = useParams()
  const { getProduct, getRelated } = useProducts()
  const product = id ? getProduct(id) : undefined
  const { addToCart, setCartOpen, toggleWishlist, isWished, notify } = useStore()
  const { user } = useAuth()
  const [color, setColor] = useState<string>()
  const [size, setSize] = useState<string>()
  const [variantId, setVariantId] = useState<string>()
  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [sizeGuide, setSizeGuide] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState(user?.email ?? '')
  const [notified, setNotified] = useState(false)
  const [notifyBusy, setNotifyBusy] = useState(false)

  const seo = useMemo(() => {
    if (!product) return { noindex: true }
    const price = product.sale ? product.sale.price : product.price
    return {
      title: product.name,
      description: product.description,
      image: product.image,
      type: 'product' as const,
      canonicalPath: `/product/${product.id}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: [product.image],
        description: product.description,
        category: product.category,
        brand: { '@type': 'Brand', name: 'Bow & Tie' },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'BDT',
          price,
          availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
        ...(product.reviews
          ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviews } }
          : {}),
      },
    }
  }, [product])
  usePageMeta(seo)

  // Record this view for the "Recently Viewed" row.
  useEffect(() => {
    if (product) recordView(product.id)
    setActiveImg(0)
    setZoom(false)
    // Default to the first in-stock variant (or the first, if all sold out).
    setVariantId(product?.variants?.find((v) => v.inStock)?.id ?? product?.variants?.[0]?.id)
  }, [product])

  if (!product) {
    return (
      <div className="page empty-state">
        <h1>Product not found</h1>
        <Link to="/shop" className="btn">Back to Shop</Link>
      </div>
    )
  }

  const variants = product.variants ?? []
  const hasVariants = variants.length > 0
  const selectedVariant = variants.find((v) => v.id === variantId)
  const available = hasVariants ? !!selectedVariant?.inStock : product.inStock

  const shownPrice = hasVariants
    ? selectedVariant?.price ?? product.price
    : product.sale ? product.sale.price : product.price
  const wasPrice = hasVariants ? product.originalPrice : product.sale ? product.price : product.originalPrice
  const discount = wasPrice > shownPrice ? Math.round(((wasPrice - shownPrice) / wasPrice) * 100) : 0
  const related = getRelated(product)
  const wished = isWished(product.id)
  const mainImg = selectedVariant?.image ?? product.gallery?.[activeImg] ?? product.image

  const handleAdd = (openCart: boolean) => {
    if (hasVariants) {
      if (!selectedVariant || !selectedVariant.inStock) {
        notify('Please choose an available option')
        return
      }
      addToCart(product, {
        variantId: selectedVariant.id,
        color: selectedVariant.color,
        size: selectedVariant.size,
        quantity: qty,
      })
    } else {
      addToCart(product, {
        color: color ?? product.colors[0],
        size: size ?? product.sizes[0],
        quantity: qty,
      })
    }
    if (openCart) setCartOpen(true)
  }

  const submitNotify = async (e: React.FormEvent) => {
    e.preventDefault()
    setNotifyBusy(true)
    try {
      await stockAlerts.notifyMe(product.id, notifyEmail)
      setNotified(true)
    } finally {
      setNotifyBusy(false)
    }
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
          <div className="gallery-main zoomable" onClick={() => setZoom(true)} title="Click to zoom">
            <img src={mainImg} alt={product.name} className="product-main-img" />
            {product.badge && <span className="arrival-badge detail-badge">{product.badge}</span>}
            <span className="zoom-hint">🔍 Click to zoom</span>
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
            {wasPrice > shownPrice && <span className="product-og-price">{formatPrice(wasPrice)}</span>}
            {discount > 0 && <span className="product-discount">-{discount}%</span>}
          </div>
          {product.sale && <div className="product-sale-note">🎉 {product.sale.title} — {product.sale.percent}% off applied</div>}
          <p className="product-desc">{product.description}</p>

          <div className="product-meta">
            <div><span>Fabric</span><strong>{product.fabric}</strong></div>
            <div><span>Delivery</span><strong>{product.delivery}</strong></div>
            <div><span>Availability</span><strong className={available ? 'in' : 'out'}>{available ? 'In Stock' : 'Sold Out'}</strong></div>
          </div>

          {hasVariants ? (
            <div className="product-option">
              <label>Options</label>
              <div className="option-chips">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`chip ${variantId === v.id ? 'active' : ''}`}
                    onClick={() => setVariantId(v.id)}
                    disabled={!v.inStock}
                  >
                    {v.label} · {formatPrice(v.price)}{!v.inStock ? ' — sold out' : ''}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
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
                <div className="option-label-row">
                  <label>Size</label>
                  <button type="button" className="size-guide-link" onClick={() => setSizeGuide(true)}>📏 Size &amp; wear guide</button>
                </div>
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
            </>
          )}

          {available ? (
            <>
              <div className="product-actions">
                <div className="cart-qty qty-lg">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                  <span>{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
                </div>
                <button className="btn btn-full" onClick={() => handleAdd(false)}>Add to Cart</button>
              </div>
              <div className="product-actions">
                <button className="btn btn-outline btn-full" onClick={() => handleAdd(true)}>Buy Now</button>
                <button className="btn btn-outline wish-btn" onClick={() => toggleWishlist(product.id)}>
                  {wished ? '♥ Wishlisted' : '♡ Wishlist'}
                </button>
              </div>
            </>
          ) : (
            <div className="notify-box">
              {notified ? (
                <p className="notify-done">✓ Great! We’ll email you when <b>{product.name}</b> is back in stock.</p>
              ) : (
                <form className="notify-form" onSubmit={submitNotify}>
                  <p className="notify-lead">This item is sold out — get an email the moment it’s restocked.</p>
                  <div className="notify-row">
                    <input
                      type="email"
                      required
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="you@email.com"
                    />
                    <button className="btn" type="submit" disabled={notifyBusy}>
                      {notifyBusy ? '…' : 'Notify me'}
                    </button>
                  </div>
                  <button type="button" className="btn btn-outline wish-btn full-wish" onClick={() => toggleWishlist(product.id)}>
                    {wished ? '♥ Wishlisted' : '♡ Add to Wishlist'}
                  </button>
                </form>
              )}
            </div>
          )}

          <ShareButtons title={product.name} />
        </div>
      </div>

      <ReviewsSection productId={product.id} initial={product.reviewList ?? []} />

      <QASection productId={product.id} />

      {/* RELATED */}
      <section className="section">
        <div className="section-header"><h2 className="section-title">You May Also Like</h2></div>
        <div className="arrivals-grid">
          {related.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <RecentlyViewed excludeId={product.id} />

      {/* Zoom lightbox */}
      {zoom && (
        <div className="zoom-overlay" onClick={() => setZoom(false)}>
          <button className="zoom-close" onClick={() => setZoom(false)} aria-label="Close">×</button>
          <img src={mainImg} alt={product.name} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Size & wear guide */}
      {sizeGuide && (
        <div className="modal-overlay" onClick={() => setSizeGuide(false)}>
          <div className="size-guide-modal" onClick={(e) => e.stopPropagation()}>
            <button className="zoom-close dark" onClick={() => setSizeGuide(false)} aria-label="Close">×</button>
            <h3>Size &amp; How to Wear 🎀</h3>
            <table className="size-table">
              <thead><tr><th>Size</th><th>Bow width</th><th>Best for</th></tr></thead>
              <tbody>
                <tr><td>S</td><td>7–9 cm</td><td>Babies &amp; toddlers, side clips</td></tr>
                <tr><td>M</td><td>10–12 cm</td><td>Kids &amp; everyday styling</td></tr>
                <tr><td>L</td><td>13–15 cm</td><td>Teens &amp; adults, statement looks</td></tr>
              </tbody>
            </table>
            <ul className="wear-tips">
              <li>Clip onto dry, brushed hair for the best hold.</li>
              <li>For half-up styles, position just above the crown.</li>
              <li>Store flat to keep the bow’s shape crisp.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
