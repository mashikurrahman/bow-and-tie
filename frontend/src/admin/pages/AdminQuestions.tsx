import { useEffect, useState } from 'react'
import { admin, type AdminQuestion } from '../../services/admin'

export default function AdminQuestions() {
  const [list, setList] = useState<AdminQuestion[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')

  const load = () => admin.listQuestions().then((r) => setList(r.questions))
  useEffect(() => { load() }, [])

  const answer = async (id: string) => {
    const text = (drafts[id] ?? '').trim()
    if (!text) return
    setBusy(id)
    try {
      await admin.answerQuestion(id, text)
      setDrafts((d) => { const n = { ...d }; delete n[id]; return n })
      await load()
    } finally {
      setBusy('')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this question?')) return
    await admin.deleteQuestion(id)
    load()
  }

  const pending = list.filter((q) => !q.answer)
  const answered = list.filter((q) => q.answer)

  const card = (q: AdminQuestion) => (
    <div className="admin-card qa-admin-card" key={q.id}>
      <div className="qa-admin-head">
        <span className="pid">{q.productName} · {q.name} · {new Date(q.createdAt).toLocaleDateString()}</span>
        <button className="icon-btn danger" onClick={() => remove(q.id)} title="Delete">🗑</button>
      </div>
      <p className="qa-q"><span>Q</span> {q.question}</p>
      {q.answer ? (
        <p className="qa-a"><span>A</span> {q.answer}</p>
      ) : (
        <div className="qa-answer-box">
          <textarea
            className="admin-input"
            placeholder="Write an answer…"
            value={drafts[q.id] ?? ''}
            onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
            rows={2}
          />
          <button className="a-btn sm" onClick={() => answer(q.id)} disabled={busy === q.id}>
            {busy === q.id ? 'Saving…' : 'Answer'}
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div className="admin-page-head">
        <h1>Questions &amp; Answers</h1>
        <div className="admin-crumb">Answer customer questions shown on product pages · {pending.length} awaiting</div>
      </div>

      {list.length === 0 && <div className="admin-card"><p className="admin-empty">No questions yet.</p></div>}

      {pending.length > 0 && <h3 className="qa-group-title">Awaiting answer ({pending.length})</h3>}
      <div className="qa-admin-list">{pending.map(card)}</div>

      {answered.length > 0 && <h3 className="qa-group-title">Answered ({answered.length})</h3>}
      <div className="qa-admin-list">{answered.map(card)}</div>
    </div>
  )
}
