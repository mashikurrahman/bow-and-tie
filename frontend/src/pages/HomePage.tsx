import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { testimonials, trustPoints } from '../data'
import { settings as settingsApi } from '../services/db'
import { formatPrice, useStore } from '../store/StoreContext'
import { useProducts } from '../store/ProductsContext'
import ProductCard from '../components/ProductCard'
import BundleShowcase from '../components/BundleShowcase'
import Newsletter from '../components/Newsletter'
import PromoSlider from '../components/PromoSlider'
import PromoPopup from '../components/PromoPopup'

const collections = [
  { name: 'Satin Bows', img: '/satin-cloud-bow.png', bg: '#F8E8EE', category: 'Bows' },
  { name: 'Velvet Sets', img: '/velvet-heart-set.png', bg: '#E8DFF0', category: 'Sets' },
  { name: 'Floral Clips', img: '/rose-garden-clip.png', bg: '#F8ECE4', category: 'Clips' },
  { name: 'Silk Ribbons', img: '/silk-ribbon-bow.png', bg: '#EAE0D5', category: 'Silk' },
  { name: 'Mini Clips', img: '/everyday-mini-clips.png', bg: '#E0EEF8', category: 'Clips' },
  { name: 'Gift Boxes', img: '/hero-boutique.png', bg: '#F0E8D0', category: 'Sets' },
]

export default function HomePage() {
  usePageMeta({ description: 'Shop handcrafted boutique hair bows, clips, silk pieces and custom accessories — made with love in Dhaka, Bangladesh.', canonicalPath: '/' })
  const { addToCart } = useStore()
  const { products } = useProducts()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hero, setHero] = useState({ heroTitle: '', heroSubtitle: '', heroCtaLabel: '', heroCtaLink: '' })

  useEffect(() => {
    settingsApi.get().then((s) => setHero({
      heroTitle: s.heroTitle ?? '', heroSubtitle: s.heroSubtitle ?? '',
      heroCtaLabel: s.heroCtaLabel ?? '', heroCtaLink: s.heroCtaLink ?? '',
    })).catch(() => {})
  }, [])

  // Best sellers = most-reviewed items (prioritising flagged ones), capped so
  // the carousel fills the row instead of leaving a gap.
  const bestSellers = [...products]
    .sort((a, b) => {
      const flag = (p: typeof a) => (p.featured || p.badge === 'Best Seller' || p.badge === 'Popular' ? 1 : 0)
      return flag(b) - flag(a) || b.reviews - a.reviews
    })
    .slice(0, 6)
  // Newest first — sort by creation time (falls back to existing order for the
  // bundled data, which has no createdAt).
  const newArrivals = [...products]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 8)

  const scrollBestsellers = (direction: number) => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    const atStart = el.scrollLeft <= 1
    const atEnd = el.scrollLeft >= maxScroll - 1
    // Loop around: past the end wraps to the start, before the start wraps to the end.
    if (direction > 0 && atEnd) {
      el.scrollTo({ left: 0, behavior: 'smooth' })
    } else if (direction < 0 && atStart) {
      el.scrollTo({ left: maxScroll, behavior: 'smooth' })
    } else {
      el.scrollBy({ left: direction * 300, behavior: 'smooth' })
    }
  }

  return (
    <>
      <PromoPopup />
      <PromoSlider />
      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-content">
          <span className="hero-badge-pill">✨ Free delivery over ৳2500</span>
          <h1>
            {hero.heroTitle ? (
              hero.heroTitle
            ) : (
              <>Shop by your <span className="highlight">favourite style</span> &amp; instantly brighten up your look.</>
            )}
          </h1>
          {hero.heroSubtitle && <p className="hero-sub">{hero.heroSubtitle}</p>}
          <Link to={hero.heroCtaLink || '/shop'} className="btn btn-lg">
            {hero.heroCtaLabel || 'Shop Now'} →
          </Link>
        </div>
        <div className="hero-images">
          <img className="hero-main-img" src="/hero-boutique.png" alt="Featured boutique accessories" />
          <div className="hero-float-card hero-float-1"><img src="/satin-cloud-bow.png" alt="Satin Bow" /></div>
          <div className="hero-float-card hero-float-2"><img src="/rose-garden-clip.png" alt="Rose Clip" /></div>
          <div className="hero-float-card hero-float-3"><img src="/silk-ribbon-bow.png" alt="Silk Bow" /></div>
          <div className="hero-float-card hero-float-4"><img src="/everyday-mini-clips.png" alt="Mini Clips" /></div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="trust-strip">
        {trustPoints.map((t) => (
          <div className="trust-item" key={t.title}>
            <span className="trust-icon">{t.icon}</span>
            <div>
              <strong>{t.title}</strong>
              <p>{t.text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* BUNDLES */}
      <BundleShowcase />

      {/* BEST SELLERS */}
      <section className="section" id="bestsellers">
        <div className="section-header">
          <h2 className="section-title">Our Best Sellers</h2>
          <div className="section-nav">
            <button className="section-nav-btn" onClick={() => scrollBestsellers(-1)} aria-label="Scroll left">←</button>
            <button className="section-nav-btn" onClick={() => scrollBestsellers(1)} aria-label="Scroll right">→</button>
          </div>
        </div>
        <div className="bestseller-scroll" ref={scrollRef}>
          {bestSellers.map((product) => (
            <div className="bestseller-card" key={product.id}>
              <Link to={`/product/${product.id}`}>
                <img className="bestseller-img" src={product.image} alt={product.name} loading="lazy" />
              </Link>
              <div className="bestseller-info">
                <Link to={`/product/${product.id}`} className="bestseller-name">{product.name}</Link>
                <div className="bestseller-price">
                  {formatPrice(product.price)}
                  <span className="bestseller-og-price">{formatPrice(product.originalPrice)}</span>
                </div>
                <button className="btn btn-full btn-sm" onClick={() => addToCart(product)} disabled={!product.inStock}>
                  {product.inStock ? 'Add to Cart' : 'Sold Out'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* COLLECTION GRID */}
      <section className="section collection-section" id="collection">
        <div className="section-header">
          <h2 className="section-title">Our Collection</h2>
          <Link to="/shop" className="section-link">View all →</Link>
        </div>
        <div className="collection-grid">
          {collections.map((col) => (
            <Link
              to={`/shop?category=${col.category}`}
              className="collection-card"
              key={col.name}
              style={{ background: col.bg }}
            >
              <img src={col.img} alt={col.name} loading="lazy" />
              <div className="collection-card-overlay">
                <span>{col.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURE SPLIT */}
      <section className="feature-split">
        <div className="feature-text">
          <h2>Our accessories are versatile, durable and super trendy</h2>
          <p>
            Every piece is handcrafted using premium fabrics — satin, velvet, silk and organza —
            designed for school, parties, gifting and everyday styling. Safe for kids, loved by moms.
          </p>
          <Link to="/shop" className="btn" style={{ alignSelf: 'flex-start' }}>Shop Now →</Link>
        </div>
        <div className="feature-img-grid">
          <img src="/satin-cloud-bow.png" alt="Satin bow" loading="lazy" />
          <img src="/velvet-heart-set.png" alt="Velvet set" loading="lazy" />
          <img src="/rose-garden-clip.png" alt="Rose clip" loading="lazy" />
          <img src="/silk-ribbon-bow.png" alt="Silk ribbon" loading="lazy" />
        </div>
      </section>

      {/* BRAND STORY */}
      <section className="brand-story">
        <div className="brand-story-img">
          <img src="/hero-boutique.png" alt="Our workshop" loading="lazy" />
        </div>
        <div className="brand-story-text">
          <h2>We want you to wear real handmade accessories &amp; feel yourself</h2>
          <p>"{testimonials[0].text}" — <strong>{testimonials[0].name}</strong></p>
          <p>
            From custom name bows for birthdays to matching sets for siblings, we make each piece
            personal. Our goal is to bring joy, color and confidence with every accessory.
          </p>
          <Link to="/about" className="btn" style={{ alignSelf: 'flex-start' }}>Our Story →</Link>
        </div>
      </section>

      {/* SALE BANNER */}
      <div className="sale-wrap">
        <div className="sale-banner">
          <div className="sale-col"><img src="/velvet-heart-set.png" alt="Sale products" loading="lazy" /></div>
          <div className="sale-col sale-col-accent">
            <h2>Grab Your Discount On Eid Sale</h2>
            <span className="sale-badge">Up to 25% Off · code EID25</span>
            <Link to="/shop" className="btn" style={{ background: '#fff', color: '#1a1a1a' }}>Shop Now →</Link>
          </div>
          <div className="sale-col"><img src="/satin-cloud-bow.png" alt="Sale products" loading="lazy" /></div>
        </div>
      </div>

      {/* NEW ARRIVALS */}
      <section className="section" id="arrivals">
        <div className="section-header">
          <h2 className="section-title">New Arrivals</h2>
          <Link to="/shop" className="section-link">View all →</Link>
        </div>
        <div className="arrivals-grid">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section testimonial-section">
        <div className="section-header center">
          <h2 className="section-title">What Our Customers Say</h2>
        </div>
        <div className="testimonial-grid">
          {testimonials.map((t) => (
            <div className="testimonial-card" key={t.name}>
              <div className="testimonial-stars">★★★★★</div>
              <p>"{t.text}"</p>
              <strong>— {t.name}</strong>
            </div>
          ))}
        </div>
      </section>

      <Newsletter />
    </>
  )
}
