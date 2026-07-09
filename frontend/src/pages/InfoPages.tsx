import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'

function InfoLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="page narrow">
      <div className="page-head"><h1>{title}</h1></div>
      <div className="prose">{children}</div>
    </div>
  )
}

export function ShippingPage() {
  usePageMeta({ title: 'Shipping Information', description: 'Delivery areas, times and charges for Bow & Tie orders across Bangladesh. Free delivery over ৳2,500.' })
  return (
    <InfoLayout title="Shipping Information">
      <h3>Delivery Areas & Time</h3>
      <p>We deliver across Bangladesh via trusted courier partners. Inside Dhaka orders arrive in 2–4 business days; outside Dhaka in 3–6 business days.</p>
      <h3>Charges</h3>
      <p>A flat delivery charge of ৳120 applies. Orders above ৳2,500 qualify for <strong>free delivery</strong>.</p>
      <h3>Order Tracking</h3>
      <p>Once your order ships, we share the courier tracking details over WhatsApp or phone.</p>
      <h3>Custom Orders</h3>
      <p>Handmade and custom pieces may need 1–3 extra days for crafting before dispatch.</p>
    </InfoLayout>
  )
}

export function ReturnsPage() {
  usePageMeta({ title: 'Returns & Exchanges', description: 'Bow & Tie’s returns and exchanges policy — 7-day peace of mind on eligible items.' })
  return (
    <InfoLayout title="Returns & Exchanges">
      <h3>7-Day Peace of Mind</h3>
      <p>If something isn't right, contact us within 3 days of delivery. Unused items in original condition can be returned or exchanged.</p>
      <h3>Non-Returnable Items</h3>
      <p>Custom-made and personalized items (like name bows) are non-returnable unless they arrive damaged or defective.</p>
      <h3>How to Request</h3>
      <p>Message us on WhatsApp with your order number and a photo. We'll arrange a replacement or refund promptly.</p>
    </InfoLayout>
  )
}

export function PrivacyPage() {
  usePageMeta({ title: 'Privacy Policy', description: 'How Bow & Tie collects, uses and protects your information.' })
  return (
    <InfoLayout title="Privacy Policy">
      <p>Your privacy matters to us. This is a summary of how we handle your information.</p>
      <h3>What We Collect</h3>
      <p>Only what's needed to fulfill your order — name, phone, delivery address, and payment reference.</p>
      <h3>How We Use It</h3>
      <p>To process, deliver, and support your orders. We never sell your data to third parties.</p>
      <h3>Storage</h3>
      <p>This demo stores cart and order data locally in your browser. In production, order data is kept securely and shared only with delivery partners as required.</p>
    </InfoLayout>
  )
}

export function NotFoundPage() {
  usePageMeta({ title: '404 — Page Not Found', noindex: true })
  return (
    <div className="page empty-state">
      <div className="cart-empty-icon">🎀</div>
      <h1>404 — Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn">Back to Home</Link>
    </div>
  )
}
