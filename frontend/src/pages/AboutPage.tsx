import { Link } from 'react-router-dom'
import { trustPoints } from '../data'

export default function AboutPage() {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Our Story</h1>
        <p>Handcrafted boutique hair accessories, made with love in Dhaka.</p>
      </div>

      <section className="about-split">
        <img src="/hero-boutique.png" alt="Our workshop" />
        <div>
          <h2>Where it started</h2>
          <p>
            Bow Clips & Hair Accessories began as a small home studio with one goal — to make hair
            accessories that feel special, look adorable, and are safe for little ones. What started
            as a passion project for family and friends grew into a boutique loved across Bangladesh.
          </p>
          <p>
            Every bow, clip and silk piece is cut, sewn and finished by hand. We choose premium
            fabrics, kid-safe clips, and thoughtful packaging so each order feels like a gift.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-header center"><h2 className="section-title">Why Shop With Us</h2></div>
        <div className="trust-strip in-page">
          {trustPoints.map((t) => (
            <div className="trust-item" key={t.title}>
              <span className="trust-icon">{t.icon}</span>
              <div><strong>{t.title}</strong><p>{t.text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2>Ready to find your favourite bow?</h2>
        <Link to="/shop" className="btn btn-lg">Shop the Collection →</Link>
      </section>
    </div>
  )
}
