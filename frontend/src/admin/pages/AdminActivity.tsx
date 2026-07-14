import { useEffect, useState } from 'react'
import { admin, type AuditEntry } from '../../services/admin'

export default function AdminActivity() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    admin.listAuditLogs().then((r) => setLogs(r.logs)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="admin-page-head">
        <h1>Activity Log</h1>
        <div className="admin-crumb">Dashboard <b>› Activity</b> · recent admin actions</div>
      </div>
      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>When</th><th>Who</th><th>Action</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="admin-muted">{new Date(l.at).toLocaleString()}</td>
                  <td className="cell-strong">{l.user}</td>
                  <td><code>{l.action}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="admin-empty">Loading…</p>}
          {!loading && logs.length === 0 && <p className="admin-empty">No activity yet.</p>}
        </div>
      </div>
    </div>
  )
}