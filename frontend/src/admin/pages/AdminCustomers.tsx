import { useEffect, useState } from 'react'
import { admin, type Customer } from '../../services/admin'
import { formatPrice } from '../../store/StoreContext'

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    admin.listCustomers().then((r) => setCustomers(r.customers)).finally(() => setLoading(false))
  }, [])

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <div>
      <div className="admin-page-head">
        <h1>Customers</h1>
        <div className="admin-crumb">Dashboard <b>› Customers</b> · {customers.length} total</div>
      </div>

      <div className="admin-card">
        <div className="admin-toolbar">
          <input className="admin-input grow" placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Total Spent</th><th>Address</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="cell-product">
                      <span className="admin-avatar sm">{c.name[0]}</span>
                      <div className="cell-strong">{c.name}</div>
                    </div>
                  </td>
                  <td>{c.email}<div className="pid">{c.phone || '—'}</div></td>
                  <td>{c.orderCount}</td>
                  <td className="cell-strong">{formatPrice(c.totalSpent)}</td>
                  <td className="admin-muted">{c.address || '—'}</td>
                  <td className="admin-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="admin-empty">Loading…</p>}
          {!loading && filtered.length === 0 && <p className="admin-empty">No customers found.</p>}
        </div>
      </div>
    </div>
  )
}
