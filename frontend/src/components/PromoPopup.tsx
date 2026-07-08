import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useActivePromotions } from '../store/useActivePromotions'

// Shows an announcement popup on the home page for the strongest active
// promotion. It appears on every home-page load/refresh (as requested) and can
// be dismissed for the current view.
export default function PromoPopup() {
  const { promotions } = useActivePromotions()
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)

  const popups = promotions.filter((p) => p.showPopup)
  const promo = popups.slice().sort((a, b) => b.percent - a.percent)[0]

  useEffect(() => {
    if (promo && !dismissed) {
      const t = setTimeout(() => setVisible(true), 700) // small delay after load
      return () => clearTimeout(t)
    }
  }, [promo, dismissed])

  if (!promo || dismissed) return null

  return (
    <div className={`promo-pop-overlay ${visible ? 'show' : ''}`} onClick={() => setDismissed(true)}>
      <div className="promo-pop" style={{ borderTopColor: promo.bgColor }} onClick={(e) => e.stopPropagation()}>
        <button className="promo-pop-close" onClick={() => setDismissed(true)} aria-label="Close">✕</button>
        <div className="promo-pop-badge" style={{ background: promo.bgColor }}>{promo.percent}% OFF</div>
        <h3>{promo.title}</h3>
        <p>{promo.description || 'Limited-time offer — shop now and save!'}</p>
        {promo.endsAt && (
          <p className="promo-pop-ends">Ends {new Date(promo.endsAt).toLocaleDateString()}</p>
        )}
        <Link to={`/promotions/${promo.id}`} className="btn btn-full" onClick={() => setDismissed(true)}>
          {promo.ctaLabel} →
        </Link>
        <button className="promo-pop-dismiss" onClick={() => setDismissed(true)}>No thanks</button>
      </div>
    </div>
  )
}
