import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { categories } from '../data'
import { useProducts } from '../store/ProductsContext'
import ProductCard from '../components/ProductCard'

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'rating'

export default function ShopPage() {
  const { products } = useProducts()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const category = params.get('category') ?? 'All'
  const [sort, setSort] = useState<Sort>('featured')

  const setCategory = (cat: string) => {
    const next = new URLSearchParams(params)
    if (cat === 'All') next.delete('category')
    else next.set('category', cat)
    setParams(next)
  }

  const setQuery = (q: string) => {
    const next = new URLSearchParams(params)
    if (q) next.set('q', q)
    else next.delete('q')
    setParams(next)
  }

  const filtered = useMemo(() => {
    let list = products.slice()
    if (category !== 'All') list = list.filter((p) => p.category === category)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      )
    }
    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        list.sort((a, b) => b.rating - a.rating)
        break
      default:
        list.sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false))
    }
    return list
  }, [products, category, query, sort])

  return (
    <div className="page">
      <div className="page-head">
        <h1>Shop All Accessories</h1>
        <p>{filtered.length} product{filtered.length !== 1 ? 's' : ''} found</p>
      </div>

      <div className="shop-toolbar">
        <input
          className="shop-search"
          type="search"
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="shop-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Top Rated</option>
        </select>
      </div>

      <div className="shop-chips">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`chip ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="cart-empty-icon">🔍</div>
          <p>No products match your search.</p>
          <button className="btn" onClick={() => { setQuery(''); setCategory('All') }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="arrivals-grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
