import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { reviews as reviewApi, type Review } from '../services/db'
import { useAuth } from '../store/AuthContext'
import { useStore } from '../store/StoreContext'

type InitialReview = {
  name: string
  rating: number
  title?: string
  date: string
  text: string
  images?: string[]
  verified?: boolean
}

export default function ReviewsSection({
  productId,
  initial,
}: {
  productId: string
  initial: InitialReview[]
}) {
  const { isAuthed } = useAuth()
  const { notify } = useStore()
  const [list, setList] = useState<Review[]>(() =>
    initial.map((r) => ({ ...r, title: r.title ?? '', images: r.images ?? [], verified: r.verified ?? false })),
  )
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [hover, setHover] = useState(0)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onPickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - images.length)
    if (!files.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(files.map((f) => reviewApi.uploadImage(f)))
      setImages((prev) => [...prev, ...urls].slice(0, 4))
    } catch {
      setError('Photo upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // Refresh from the server so newly-written reviews (with verified flags) show.
  useEffect(() => {
    reviewApi.list(productId).then(setList).catch(() => {})
  }, [productId])

  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const updated = await reviewApi.add(productId, { rating, title, text, images })
      setList(updated)
      setShowForm(false)
      setTitle('')
      setText('')
      setRating(5)
      setImages([])
      notify('Thanks for your review! 🎀')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit review')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="reviews">
      <div className="section-header">
        <h2 className="section-title">Customer Reviews</h2>
        {isAuthed ? (
          <button className="btn btn-sm btn-outline" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '✍ Write a review'}
          </button>
        ) : (
          <Link to="/login" className="btn btn-sm btn-outline">Sign in to review</Link>
        )}
      </div>

      {list.length > 0 && (
        <div className="reviews-summary">
          <span className="reviews-avg">{avg.toFixed(1)}</span>
          <span className="arrival-stars">{'★'.repeat(Math.round(avg))}</span>
          <span className="reviews-count">Based on {list.length} review{list.length === 1 ? '' : 's'}</span>
        </div>
      )}

      {showForm && (
        <form className="review-form" onSubmit={submit}>
          <div className="review-stars-input" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                className={`star ${(hover || rating) >= n ? 'on' : ''}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
          <input
            className="review-input"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <textarea
            className="review-input"
            placeholder="Share your thoughts about this product…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            required
          />
          <div className="review-photos-input">
            {images.map((url, i) => (
              <div className="review-photo-thumb" key={i}>
                <img src={url} alt="" />
                <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))} aria-label="Remove photo">×</button>
              </div>
            ))}
            {images.length < 4 && (
              <label className="review-photo-add">
                {uploading ? '…' : '＋ Photo'}
                <input type="file" accept="image/*" multiple hidden onChange={onPickImages} />
              </label>
            )}
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button className="btn btn-sm" type="submit" disabled={busy || uploading}>
            {busy ? 'Submitting…' : 'Submit review'}
          </button>
        </form>
      )}

      <div className="review-list">
        {list.length === 0 && <p className="muted">No reviews yet — be the first to share your thoughts!</p>}
        {list.map((r, i) => (
          <div className="review-card" key={i}>
            <div className="review-head">
              <strong>{r.name}</strong>
              <span className="arrival-stars">{'★'.repeat(r.rating)}</span>
            </div>
            <div className="review-sub">
              <span className="review-date">{r.date}</span>
              {r.verified && <span className="review-verified">✓ Verified Purchase</span>}
            </div>
            {r.title && <p className="review-title">{r.title}</p>}
            <p>{r.text}</p>
            {r.images && r.images.length > 0 && (
              <div className="review-photos">
                {r.images.map((url, j) => (
                  <a href={url} target="_blank" rel="noreferrer" key={j}><img src={url} alt="Review photo" loading="lazy" /></a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
