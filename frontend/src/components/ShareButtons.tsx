import { useState } from 'react'

// Share the current product to WhatsApp / Facebook, or copy the link.
export default function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? window.location.href : ''
  const text = `Check out "${title}" at Bow & Tie 🎀`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div className="share-row">
      <span className="share-label">Share</span>
      <a
        className="share-btn wa"
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on WhatsApp"
      >
        WhatsApp
      </a>
      <a
        className="share-btn fb"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on Facebook"
      >
        Facebook
      </a>
      <button className="share-btn copy" onClick={copy} type="button">
        {copied ? '✓ Copied' : 'Copy link'}
      </button>
    </div>
  )
}
