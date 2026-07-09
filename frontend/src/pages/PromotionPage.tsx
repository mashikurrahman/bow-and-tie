import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { promotions as promoApi, type Promotion } from '../services/promotions'
import type { Product } from '../data'
import ProductCard from '../components/ProductCard'
import { usePageMeta } from '../hooks/usePageMeta'

export default function PromotionPage() {
  const { id } = useParams()
  const [promo, setPromo] = useState<Promotion | null | undefined>(undefined)
  const [products, setProducts] = useState<Product[]>([])

  usePageMeta({
    title: promo?.title ?? 'Sale',
    description: promo?.description || 'Limited-time offers on handcrafted hair accessories at Bow & Tie.',
  })

  useEffect(() => {
    if (!id) return
    promoApi
      .get(id)
      .then((r) => {
        setPromo(r.promotion)
        setProducts(r.products)
      })
      .catch(() => setPromo(null))
  }, [id])

  if (promo === undefined) return <div className="page empty-state"><p>Loading…</p></div>
  if (!promo) {
    return (
      <div className="page empty-state">
        <h1>Promotion not found</h1>
        <Link to="/shop" className="btn">Go to Shop</Link>
      </div>
    )
  }

  const onSale = promo.scope === 'all' ? products : products.filter((p) => p.sale)

  return (
    <div className="page">
      <div className="promo-hero" style={{ background: promo.bgColor }}>
        <span className="promo-hero-badge">{promo.percent}% OFF</span>
        <h1>{promo.title}</h1>
        {promo.description && <p>{promo.description}</p>}
        {promo.endsAt && <p className="promo-hero-ends">Offer ends {new Date(promo.endsAt).toLocaleDateString()}</p>}
        {!promo.live && <p className="promo-hero-ends">This promotion is not currently active.</p>}
      </div>

      <div className="section-header" style={{ marginTop: 30 }}>
        <h2 className="section-title">{onSale.length} item{onSale.length !== 1 ? 's' : ''} on sale</h2>
      </div>

      {onSale.length === 0 ? (
        <div className="empty-state"><p>No products in this promotion yet.</p><Link to="/shop" className="btn">Browse Shop</Link></div>
      ) : (
        <div className="arrivals-grid">
          {onSale.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
