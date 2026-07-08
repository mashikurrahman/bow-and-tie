import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { admin, type Stats } from '../../services/admin'
import { formatPrice } from '../../store/StoreContext'
import StatusPill from '../components/StatusPill'

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    admin.stats().then(setStats).catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="admin-empty">Failed to load: {error}</div>
  if (!stats) return <div className="admin-empty">Loading dashboard…</div>

  const kpis = [
    { label: 'Total Revenue', value: formatPrice(stats.revenue), accent: true, sub: `${stats.orderCount} orders` },
    { label: 'Net Profit', value: formatPrice(stats.profit), trend: 'up', sub: `after COGS & discounts` },
    { label: 'Total Customers', value: stats.customerCount.toLocaleString(), trend: 'up', sub: 'registered' },
    { label: 'Avg Order Value', value: formatPrice(stats.avgOrderValue), sub: `${stats.productCount} products` },
  ]

  return (
    <div>
      <div className="admin-page-head">
        <h1>Dashboard</h1>
        <div className="admin-crumb">Overview of your store performance</div>
      </div>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div className={`kpi ${k.accent ? 'accent' : ''}`} key={k.label}>
            <div className="kpi-label">{k.label} <span>↗</span></div>
            <div className="kpi-value">{k.value}</div>
            {k.trend ? (
              <span className={`kpi-trend ${k.trend}`}>{k.trend === 'up' ? '▲' : '▼'} {k.sub}</span>
            ) : (
              <span className="kpi-sub">{k.sub}</span>
            )}
          </div>
        ))}
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <div className="admin-card-head">
            <h3>Sales this year</h3>
            <div className="mini-legend">
              <span><i className="dot" style={{ background: '#c9527a' }} /> Revenue</span>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.salesByMonth} margin={{ left: -10, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9527a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#c9527a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8a90a2' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8a90a2' }} axisLine={false} tickLine={false} width={50}
                  tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)} />
                <Tooltip formatter={(v) => formatPrice(Number(v))} />
                <Area type="monotone" dataKey="revenue" stroke="#c9527a" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-head"><h3>Low Stock Alerts</h3></div>
          {stats.lowStock.length === 0 ? (
            <p className="admin-muted">All products well stocked. ✅</p>
          ) : (
            stats.lowStock.map((p) => (
              <div className="low-stock-row" key={p.id}>
                <span>{p.name}</span>
                <StatusPill status="Processing" label={`${p.stock} left`} />
              </div>
            ))
          )}
          <div style={{ marginTop: 16 }}>
            <div className="low-stock-row"><span className="admin-muted">Cost of goods sold</span><strong>{formatPrice(stats.cogs)}</strong></div>
            <div className="low-stock-row"><span className="admin-muted">Discounts given</span><strong>{formatPrice(stats.discounts)}</strong></div>
            <div className="low-stock-row"><span className="admin-muted">Cancelled orders</span><strong>{stats.cancelledCount}</strong></div>
          </div>
        </div>
      </div>

      <div className="admin-grid-2b">
        <div className="admin-card">
          <div className="admin-card-head">
            <h3>Popular Products</h3>
            <Link to="/admin/products" className="admin-link">Show all</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Product</th><th>Price</th><th>Sold</th><th>Stock</th></tr></thead>
              <tbody>
                {stats.popular.map((row) => (
                  <tr key={row.product.id}>
                    <td>
                      <div className="cell-product">
                        <img src={row.product.image} alt={row.product.name} />
                        <div><div className="cell-strong">{row.product.name}</div><div className="pid">{row.product.category}</div></div>
                      </div>
                    </td>
                    <td>{formatPrice(row.product.price)}</td>
                    <td>{row.sold}</td>
                    <td>{row.product.inStock ? row.product.stock : <StatusPill status="Cancelled" label="Sold out" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <h3>Recent Orders</h3>
            <Link to="/admin/orders" className="admin-link">Show all</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="cell-strong">#{o.id}</td>
                    <td>{o.customer.name}</td>
                    <td>{formatPrice(o.total)}</td>
                    <td><StatusPill status={o.status} /></td>
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
