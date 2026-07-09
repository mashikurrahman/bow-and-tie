// Tracks the products a shopper has recently viewed (stored in the browser).
const KEY = 'bc_recently_viewed'
const MAX = 8

export function recordView(id: string): void {
  try {
    const list = getRecentlyViewed().filter((x) => x !== id)
    list.unshift(id)
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* ignore storage errors */
  }
}

export function getRecentlyViewed(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
