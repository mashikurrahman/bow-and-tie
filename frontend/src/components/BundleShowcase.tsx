import { useEffect, useState } from 'react'
import { bundles as bundlesApi, type Bundle } from '../services/db'
import { formatPrice, useStore } from '../store/StoreContext'
import { useProducts } from '../store/ProductsContext'

// "Complete the look" — curated product sets the shop configures in the admin.
export default function BundleShowcase() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const { addToCart, setCartOpen } = useStore()
  const { products } = useProducts()

  useEffect(() => {
    bundlesApi.list().then(setBundles).catch(() => {})
  }, [])

  if (bundles.length === 0) return null

  const addSet = (bundle: Bundle) => {
    let added = 0
    for (const bp of bundle.products) {
      const full = products.find((p) => p.id === bp.id)
      if (full && full.inStock) { addToCart(full); added++ }
    }
    if (added) setCartOpen(true)
  }

  return (
    <section className="section bundles-section">
      <div className="section-header">
        <h2 className="section-title">Complete the Look</h2>
        <p className="section-sub">Curated sets, ready in one tap</p>
      </div>
      <div className="bundles-grid">
        {bundles.map((b) => {
          const total = b.products.reduce((s, p) => s + p.price, 0)
          return (
            <div className="bundle-card" key={b.id}>
              {b.image && <img className="bundle-cover" src={b.image} alt={b.title} loading="lazy" />}
              <div className="bundle-body">
                <h3>{b.title}</h3>
                {b.description && <p className="bundle-desc">{b.description}</p>}
                <div className="bundle-thumbs">
                  {b.products.map((p) => (
                    <img key={p.id} src={p.image} alt={p.name} title={p.name} loading="lazy" />
                  ))}
                </div>
                <div className="bundle-foot">
                  <span className="bundle-total">{formatPrice(total)} <small>for {b.products.length} pieces</small></span>
                  <button className="btn btn-sm" onClick={() => addSet(b)}>Add set to cart</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}