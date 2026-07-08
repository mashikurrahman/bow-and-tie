import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useActivePromotions } from '../store/useActivePromotions'

export default function PromoSlider() {
  const { promotions } = useActivePromotions()
  const slides = promotions.filter((p) => p.showSlider)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000)
    return () => clearInterval(t)
  }, [slides.length])

  if (slides.length === 0) return null
  const active = slides[index % slides.length]

  return (
    <div className="promo-slider" style={{ background: active.bgColor }}>
      <div className="promo-slide">
        <span className="promo-slide-badge">{active.percent}% OFF</span>
        <div className="promo-slide-text">
          <strong>{active.title}</strong>
          {active.description && <span>{active.description}</span>}
        </div>
        <Link to={`/promotions/${active.id}`} className="promo-slide-cta">
          {active.ctaLabel} →
        </Link>
      </div>
      {slides.length > 1 && (
        <div className="promo-dots">
          {slides.map((s, i) => (
            <button
              key={s.id}
              className={i === index ? 'active' : ''}
              onClick={() => setIndex(i)}
              aria-label={`Show promotion ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
