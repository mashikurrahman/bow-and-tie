import { useEffect } from 'react'

const SITE_NAME = 'Bow & Tie'
const BASE_TITLE = 'Bow & Tie | Handcrafted Boutique Elegance'
const BASE_DESC =
  'Elegant, handcrafted boutique bows, clips, silk pieces, and custom-made hair accessories from Dhaka, Bangladesh.'
const BASE_IMAGE = '/hero-boutique.png'

export type PageMeta = {
  title?: string
  description?: string
  /** Image for social previews — absolute URL or a site-relative path. */
  image?: string
  /** Path used for canonical + og:url (defaults to the current pathname). */
  canonicalPath?: string
  type?: 'website' | 'product' | 'article'
  /** Keep this page out of search results (private/account pages). */
  noindex?: boolean
  /** Structured data (schema.org) injected as JSON-LD for rich results. */
  jsonLd?: Record<string, unknown>
}

const abs = (url: string) =>
  /^https?:\/\//.test(url) ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`

// Find or create a <meta>/<link> tag and set its attributes.
function upsert(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector(selector) as HTMLElement | null
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}
const metaName = (name: string, content: string) =>
  upsert(`meta[name="${name}"]`, () => Object.assign(document.createElement('meta'), { name }), 'content', content)
const metaProp = (property: string, content: string) =>
  upsert(`meta[property="${property}"]`, () => {
    const m = document.createElement('meta')
    m.setAttribute('property', property)
    return m
  }, 'content', content)

const JSONLD_ID = 'page-jsonld'

/**
 * Per-page SEO for the SPA: sets the document title, meta description, canonical
 * URL, Open Graph + Twitter tags, robots (index/noindex), and optional JSON-LD.
 * Restores the site defaults on unmount.
 *
 * Note: social scrapers (Facebook/WhatsApp) don't execute JS, so these tags are
 * for browsers and JS-rendering crawlers (Google). Perfect social previews need
 * SSR/prerendering.
 */
export function usePageMeta(meta: PageMeta): void {
  const { title, description, image, canonicalPath, type = 'website', noindex = false, jsonLd } = meta

  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : BASE_TITLE
    const desc = description ?? BASE_DESC
    const img = abs(image ?? BASE_IMAGE)
    const url = `${window.location.origin}${canonicalPath ?? window.location.pathname}`

    document.title = fullTitle
    metaName('description', desc)
    metaName('robots', noindex ? 'noindex, nofollow' : 'index, follow')

    // Canonical link
    upsert('link[rel="canonical"]', () => {
      const l = document.createElement('link')
      l.setAttribute('rel', 'canonical')
      return l
    }, 'href', url)

    // Open Graph
    metaProp('og:title', title ?? BASE_TITLE)
    metaProp('og:description', desc)
    metaProp('og:image', img)
    metaProp('og:url', url)
    metaProp('og:type', type)
    metaProp('og:site_name', SITE_NAME)
    // Twitter
    metaName('twitter:card', 'summary_large_image')
    metaName('twitter:title', title ?? BASE_TITLE)
    metaName('twitter:description', desc)
    metaName('twitter:image', img)

    // JSON-LD structured data
    document.getElementById(JSONLD_ID)?.remove()
    if (jsonLd) {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.id = JSONLD_ID
      s.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(s)
    }

    return () => {
      document.title = BASE_TITLE
      metaName('description', BASE_DESC)
      metaName('robots', 'index, follow')
      document.getElementById(JSONLD_ID)?.remove()
    }
  }, [title, description, image, canonicalPath, type, noindex, jsonLd])
}
