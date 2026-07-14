import { useEffect, useState } from 'react'
import { admin, type Expense } from '../../services/admin'
import { formatPrice } from '../../store/StoreContext'

const CATEGORIES = ['Materials', 'Rent', 'Salary', 'Marketing', 'Delivery', 'Packaging', 'Utilities', 'Other']

export default function AdminExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [total, setTotal] = useState(0)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: 'Materials', amount: '', note: '' })
  const [busy, setBusy] = useState(false)

  const load = () => admin.listExpenses().then((r) => { setExpenses(r.expenses); setTotal(r.total) }).catch(() => {})
  useEffect(() => { load() }, [])

  const add = async () => {
    const amount = Number(form.amount)
    if (!amount || amount < 0) return
    setBusy(true)
    try {
      await admin.addExpense({ date: form.date, category: form.category, amount, note: form.note })
      setForm((f) => ({ ...f, amount: '', note: '' }))
      load()
    } finally { setBusy(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    await admin.deleteExpense(id)
    load()
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Expenses</h1>
        <div className="admin-crumb">Dashboard <b>› Expenses</b> · {formatPrice(total)} total</div>
      </div>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Add expense</h3>
        <div className="expense-form">
          <input type="date" className="admin-input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          <select className="admin-input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="admin-input" type="number" min="0" placeholder="Amount ৳" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          <input className="admin-input grow" placeholder="Note (optional)" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          <button className="a-btn" onClick={add} disabled={busy || !form.amount}>Add</button>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="admin-muted">{e.date}</td>
                  <td className="cell-strong">{e.category}</td>
                  <td>{formatPrice(e.amount)}</td>
                  <td className="admin-muted">{e.note || '—'}</td>
                  <td><button className="a-btn ghost sm" onClick={() => remove(e.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && <p className="admin-empty">No expenses recorded yet.</p>}
        </div>
      </div>
    </div>
  )
}