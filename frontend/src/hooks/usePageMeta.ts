import { useEffect } from 'react'

const BASE_TITLE = 'Bow & Tie | Handcrafted Boutique Elegance'

// Sets the document title (and optional meta description) for a page, then
// restores the site default on unmount — lightweight per-page SEO for the SPA.
export function usePageMeta(title?: string, description?: string): void {
  useEffect(() => {
    if (title) document.title = `${title} · Bow & Tie`
    let restoreDesc: string | null = null
    const tag = document.querySelector('meta[name="description"]')
    if (description && tag) {
      restoreDesc = tag.getAttribute('content')
      tag.setAttribute('content', description)
    }
    return () => {
      document.title = BASE_TITLE
      if (restoreDesc && tag) tag.setAttribute('content', restoreDesc)
    }
  }, [title, description])
}
