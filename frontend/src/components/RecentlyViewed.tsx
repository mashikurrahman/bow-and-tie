import { useProducts } from '../store/ProductsContext'
import { getRecentlyViewed } from '../store/recentlyViewed'
import ProductCard from './ProductCard'

// Shows the shopper's recently-viewed products (excluding the given id).
export default function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const { products } = useProducts()
  const ids = getRecentlyViewed().filter((id) => id !== excludeId)
  const items = ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 4)

  if (items.length === 0) return null

  return (
    <section className="section">
      <div className="section-header"><h2 className="section-title">Recently Viewed</h2></div>
      <div className="arrivals-grid">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  )
}
