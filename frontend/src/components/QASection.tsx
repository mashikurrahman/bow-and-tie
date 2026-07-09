import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { questions as qaApi, type Question } from '../services/db'
import { useAuth } from '../store/AuthContext'
import { useStore } from '../store/StoreContext'

export default function QASection({ productId }: { productId: string }) {
  const { isAuthed } = useAuth()
  const { notify } = useStore()
  const [list, setList] = useState<Question[]>([])
  const [showForm, setShowForm] = useState(false)
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    qaApi.list(productId).then(setList).catch(() => {})
  }, [productId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await qaApi.ask(productId, question)
      setQuestion('')
      setShowForm(false)
      notify("Question sent — we'll answer soon! 🎀")
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not send question')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="reviews qa-section">
      <div className="section-header">
        <h2 className="section-title">Questions &amp; Answers</h2>
        {isAuthed ? (
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '❓ Ask a question'}
          </button>
        ) : (
          <Link to="/login" className="btn btn-sm btn-outline">Sign in to ask</Link>
        )}
      </div>

      {showForm && (
        <form className="review-form" onSubmit={submit}>
          <textarea
            className="review-input"
            placeholder="What would you like to know about this product?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            required
            minLength={3}
          />
          <button className="btn btn-sm" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send question'}</button>
        </form>
      )}

      <div className="qa-list">
        {list.length === 0 && <p className="muted">No questions yet — ask the first one!</p>}
        {list.map((q) => (
          <div className="qa-item" key={q.id}>
            <p className="qa-q"><span>Q</span> {q.question}</p>
            {q.answer ? (
              <p className="qa-a"><span>A</span> {q.answer}</p>
            ) : (
              <p className="qa-pending">Awaiting an answer…</p>
            )}
            <span className="review-date">{q.date}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
