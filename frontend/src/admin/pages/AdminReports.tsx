import { useEffect, useState } from 'react'
import { admin, type Report } from '../../services/admin'

const fmt = (n: number) => `৳${n.toLocaleString('en-US')}`
const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10)

const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function AdminReports() {
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(today())
  const [data, setData] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    admin.report(from, to).then(setData).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const preset = (d: number) => { setFrom(daysAgo(d)); setTo(today()) }

  const exportCsv = () => {
    if (!data) return
    const rows = [
      ['Product', 'Category', 'Units sold', 'Revenue (BDT)', 'Profit (BDT)'],
      ...data.byProduct.map((r) => [r.name, r.category, r.qty, r.revenue, r.profit]),
    ]
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bowtie-sales-report_${from}_to_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const s = data?.summary

  return (
    <div>
      <div className="admin-page-head">
        <h1>Reports</h1>
        <div className="admin-crumb">Sales &amp; profit analytics by product and category</div>
      </div>

      <div className="admin-card">
        <div className="report-controls">
          <div className="report-dates">
            <label>From <input className="admin-input" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
            <label>To <input className="admin-input" type="date" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} /></label>
            <button className="a-btn" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Apply'}</button>
          </div>
          <div className="report-presets">
            <button className="a-btn ghost sm" onClick={() => { preset(7); }}>7d</button>
            <button className="a-btn ghost sm" onClick={() => { preset(30); }}>30d</button>
            <button className="a-btn ghost sm" onClick={() => { preset(90); }}>90d</button>
            <button className="a-btn ghost sm" onClick={() => { preset(365); }}>1y</button>
            <button className="a-btn ghost sm" onClick={exportCsv} disabled={!data}>⬇ Export CSV</button>
          </div>
        </div>
      </div>

      {s && (
        <div className="kpi-grid" style={{ marginTop: 18 }}>
          <div className="admin-card kpi"><div className="kpi-label">Product Sales</div><div className="kpi-value">{fmt(s.productSales)}</div><div className="kpi-sub">{s.unitsSold} units · {s.orderCount} orders</div></div>
          <div className="admin-card kpi"><div className="kpi-label">Gross Profit</div><div className="kpi-value">{fmt(s.grossProfit)}</div><div className="kpi-sub">{s.margin}% margin</div></div>
          <div className="admin-card kpi"><div className="kpi-label">Cost of Goods</div><div className="kpi-value">{fmt(s.cogs)}</div><div className="kpi-sub">buying cost</div></div>
          <div className="admin-card kpi"><div className="kpi-label">Avg Order Value</div><div className="kpi-value">{fmt(s.avgOrderValue)}</div><div className="kpi-sub">{fmt(s.discounts)} discounts</div></div>
        </div>
      )}

      <div className="admin-grid-2b" style={{ marginTop: 18 }}>
        <div className="admin-card">
          <div className="admin-card-head"><h3>Top Products</h3></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Product</th><th>Units</th><th>Revenue</th><th>Profit</th></tr></thead>
              <tbody>
                {data?.byProduct.slice(0, 20).map((r) => (
                  <tr key={r.id}>
                    <td className="cell-strong">{r.name}<div className="pid">{r.category}</div></td>
                    <td>{r.qty}</td>
                    <td>{fmt(r.revenue)}</td>
                    <td>{fmt(r.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && data.byProduct.length === 0 && <p className="admin-empty">No sales in this period.</p>}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-head"><h3>By Category</h3></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Category</th><th>Units</th><th>Revenue</th><th>Profit</th></tr></thead>
              <tbody>
                {data?.byCategory.map((c) => (
                  <tr key={c.category}>
                    <td className="cell-strong">{c.category}</td>
                    <td>{c.qty}</td>
                    <td>{fmt(c.revenue)}</td>
                    <td>{fmt(c.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
