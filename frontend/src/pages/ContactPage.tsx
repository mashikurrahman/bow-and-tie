import { useState } from 'react'
import { whatsappNumber } from '../data'
import { useStore } from '../store/StoreContext'

export default function ContactPage() {
  const { notify } = useStore()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const list = JSON.parse(localStorage.getItem('bc_messages') || '[]')
    list.push({ ...form, date: new Date().toISOString() })
    localStorage.setItem('bc_messages', JSON.stringify(list))
    setSent(true)
    notify('Message sent — we will reply soon!')
    setForm({ name: '', email: '', message: '' })
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Get in Touch</h1>
        <p>Questions, custom orders, or wholesale — we'd love to hear from you.</p>
      </div>

      <div className="contact-grid">
        <div className="contact-info">
          <div className="contact-block">
            <span className="trust-icon">📍</span>
            <div><strong>Location</strong><p>Dhaka, Bangladesh</p></div>
          </div>
          <div className="contact-block">
            <span className="trust-icon">💬</span>
            <div><strong>WhatsApp</strong>
              <p><a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">Chat with us</a></p>
            </div>
          </div>
          <div className="contact-block">
            <span className="trust-icon">📷</span>
            <div><strong>Social</strong><p>Facebook & Instagram: @BowClips</p></div>
          </div>
          <div className="contact-block">
            <span className="trust-icon">🕑</span>
            <div><strong>Hours</strong><p>Sat–Thu, 10am – 8pm</p></div>
          </div>
        </div>

        <form className="contact-form" onSubmit={submit}>
          {sent && <p className="newsletter-success">Thanks! Your message has been received. 💌</p>}
          <div className="field">
            <label>Name *</label>
            <input required value={form.name} onChange={set('name')} />
          </div>
          <div className="field">
            <label>Email *</label>
            <input required type="email" value={form.email} onChange={set('email')} />
          </div>
          <div className="field">
            <label>Message *</label>
            <textarea required rows={5} value={form.message} onChange={set('message')} />
          </div>
          <button type="submit" className="btn btn-full">Send Message</button>
        </form>
      </div>
    </div>
  )
}
