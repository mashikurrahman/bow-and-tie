import { Link } from 'react-router-dom'
import { storeName } from '../data'

const logoUrl = '/logo-2.png'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Link to="/" className="nav-logo">
            <img src={logoUrl} alt={storeName} />
            <span>BowClips</span>
          </Link>
          <p>
            Handcrafted boutique hair accessories made with love in Dhaka, Bangladesh. Every bow
            tells a story.
          </p>
        </div>
        <div className="footer-col">
          <h4>Shop</h4>
          <Link to="/shop?category=Bows">Bows</Link>
          <Link to="/shop?category=Clips">Clips</Link>
          <Link to="/shop?category=Silk">Silk</Link>
          <Link to="/shop?category=Sets">Sets</Link>
          <Link to="/custom-order">Custom</Link>
        </div>
        <div className="footer-col">
          <h4>Support</h4>
          <Link to="/contact">Contact Us</Link>
          <Link to="/track">Track Order</Link>
          <Link to="/shipping">Shipping Info</Link>
          <Link to="/returns">Returns</Link>
          <Link to="/faq">FAQ</Link>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <Link to="/about">About Us</Link>
          <Link to="/custom-order">Custom Orders</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
        <div className="footer-social">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">f</a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">📷</a>
          <a href="https://wa.me" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">💬</a>
        </div>
      </div>
    </footer>
  )
}
