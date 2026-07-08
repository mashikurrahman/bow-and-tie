import { useEffect, useState } from 'react'
import { promotions, type Promotion } from '../services/promotions'

// Simple module-level cache so the slider and popup share a single request.
let cache: Promotion[] | null = null

export function useActivePromotions() {
  const [list, setList] = useState<Promotion[]>(cache ?? [])
  const [loaded, setLoaded] = useState(cache !== null)

  useEffect(() => {
    if (cache !== null) return
    promotions
      .active()
      .then((r) => {
        cache = r.promotions
        setList(r.promotions)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  return { promotions: list, loaded }
}

export function clearPromotionsCache() {
  cache = null
}
