import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import CartDrawer from './CartDrawer'
import Toasts from './Toasts'
import { whatsappNumber } from '../data'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function Layout() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <Toasts />
      <a
        className="whatsapp-fab"
        href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi Bow & Tie! I have a question 🎀')}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
      >
        <span className="whatsapp-fab-icon">💬</span>
        <span className="whatsapp-fab-label">Chat with us</span>
      </a>
    </>
  )
}
