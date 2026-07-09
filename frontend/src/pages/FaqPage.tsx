import { useState } from 'react'
import { Link } from 'react-router-dom'
import { faqs } from '../data'
import { usePageMeta } from '../hooks/usePageMeta'

export default function FaqPage() {
  usePageMeta({ title: 'FAQ', description: 'Answers to common questions about orders, shipping, returns and custom hair accessories at Bow & Tie.' })
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="page narrow">
      <div className="page-head">
        <h1>Frequently Asked Questions</h1>
        <p>Everything you need to know about ordering, delivery, and custom pieces.</p>
      </div>

      <div className="faq-list">
        {faqs.map((f, i) => (
          <div className={`faq-item ${open === i ? 'open' : ''}`} key={i}>
            <button className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              {f.question}
              <span className="faq-toggle">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <div className="faq-a">{f.answer}</div>}
          </div>
        ))}
      </div>

      <div className="cta-band">
        <h2>Still have a question?</h2>
        <Link to="/contact" className="btn">Contact Us →</Link>
      </div>
    </div>
  )
}
