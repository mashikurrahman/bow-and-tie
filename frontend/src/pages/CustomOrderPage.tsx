import { useState } from 'react'
import { whatsappNumber } from '../data'
import { formatPrice, useStore } from '../store/StoreContext'

export default function CustomOrderPage() {
  const { notify } = useStore()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    type: 'Name Bow',
    colors: '',
    nameText: '',
    occasion: '',
    quantity: '1',
    details: '',
  })
  const [sent, setSent] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const message = `Custom Order Request 🎀\nType: ${form.type}\nName text: ${form.nameText || '-'}\nColors: ${form.colors || '-'}\nOccasion: ${form.occasion || '-'}\nQuantity: ${form.quantity}\nDetails: ${form.details || '-'}\n\nCustomer: ${form.name} (${form.phone})`

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const list = JSON.parse(localStorage.getItem('bc_custom_orders') || '[]')
    list.push({ ...form, date: new Date().toISOString() })
    localStorage.setItem('bc_custom_orders', JSON.stringify(list))
    setSent(true)
    notify('Custom request received! 🎀')
  }

  const sendWhatsApp = () => {
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="page narrow">
      <div className="page-head">
        <h1>Custom Order</h1>
        <p>Personalized name bows, matching sets, and special colors for any occasion. Custom pieces start around {formatPrice(650)}.</p>
      </div>

      <ol className="steps">
        <li><span>1</span> Share your idea below</li>
        <li><span>2</span> We send a digital preview</li>
        <li><span>3</span> You approve & we craft it</li>
      </ol>

      {sent ? (
        <div className="confirm-card">
          <div className="confirm-icon">🎉</div>
          <h3>Request received!</h3>
          <p>We'll reach out shortly to confirm your design. Want a faster reply?</p>
          <button className="btn btn-full wa-btn" onClick={sendWhatsApp}>💬 Send on WhatsApp</button>
        </div>
      ) : (
        <form className="checkout-form card" onSubmit={submit}>
          <div className="field-row">
            <div className="field"><label>Your Name *</label><input required value={form.name} onChange={set('name')} /></div>
            <div className="field"><label>Phone *</label><input required value={form.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" /></div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Type *</label>
              <select value={form.type} onChange={set('type')}>
                <option>Name Bow</option>
                <option>Matching Set (Siblings/Twins)</option>
                <option>Event / Party Set</option>
                <option>Gift Box</option>
                <option>Other</option>
              </select>
            </div>
            <div className="field"><label>Quantity</label><input type="number" min="1" value={form.quantity} onChange={set('quantity')} /></div>
          </div>
          <div className="field"><label>Name / Text on Bow</label><input value={form.nameText} onChange={set('nameText')} placeholder="e.g. Ayesha" /></div>
          <div className="field"><label>Preferred Colors</label><input value={form.colors} onChange={set('colors')} placeholder="e.g. pink & gold" /></div>
          <div className="field"><label>Occasion</label><input value={form.occasion} onChange={set('occasion')} placeholder="Birthday, Eid, wedding…" /></div>
          <div className="field"><label>Extra Details</label><textarea rows={3} value={form.details} onChange={set('details')} /></div>
          <div className="product-actions">
            <button type="submit" className="btn btn-full">Submit Request</button>
            <button type="button" className="btn btn-outline wa-btn" onClick={sendWhatsApp}>💬 WhatsApp</button>
          </div>
        </form>
      )}
    </div>
  )
}
