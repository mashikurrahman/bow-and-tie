import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { products as bundled, type Product } from '../data'
import { api } from '../services/api'

type ProductsValue = {
  products: Product[]
  loading: boolean
  getProduct: (id: string) => Product | undefined
  getRelated: (product: Product, limit?: number) => Product[]
  refresh: () => void
}

const ProductsContext = createContext<ProductsValue | null>(null)

export function ProductsProvider({ children }: { children: ReactNode }) {
  // Seed with bundled data so the UI renders instantly, then refresh from the API.
  const [products, setProducts] = useState<Product[]>(bundled)
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    api
      .get<{ products: Product[] }>('/products')
      .then((r) => {
        if (r.products?.length) setProducts(r.products)
      })
      .catch(() => {
        /* keep bundled fallback if the API is unreachable */
      })
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [])

  const value = useMemo<ProductsValue>(
    () => ({
      products,
      loading,
      getProduct: (id) => products.find((p) => p.id === id),
      getRelated: (product, limit = 4) =>
        products
          .filter((p) => p.id !== product.id && p.category === product.category)
          .concat(products.filter((p) => p.id !== product.id && p.category !== product.category))
          .slice(0, limit),
      refresh,
    }),
    [products, loading],
  )

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider')
  return ctx
}
