import { useEffect, useState } from 'react'
import { admin, type EmailTemplate } from '../../services/admin'

export default function AdminCampaigns() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [subscribers, setSubscribers] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', subject: '', body: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    admin.listEmailTemplates().then((r) => {
      setTemplates(r.templates)
      setSubscribers(r.subscribers)
    }).catch(() => {})
  useEffect(() => { load() }, [])

  const reset = () => { setEditingId(null); setForm({ name: '', subject: '', body: '' }) }

  const edit = (t: EmailTemplate) => { setEditingId(t.id); setForm({ name: t.name, subject: t.subject, body: t.body }) }

  const saveTemplate = async () => {
    if (!form.name.trim() || !form.subject.trim()) return setMsg('Name and subject are required.')
    setBusy(true)
    try {
      if (editingId) await admin.updateEmailTemplate(editingId, form)
      else await admin.createEmailTemplate(form)
      setMsg('Template saved.')
      reset()
      load()
    } finally { setBusy(false); setTimeout(() => setMsg(''), 2500) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this template?')) return
    await admin.deleteEmailTemplate(id)
    if (editingId === id) reset()
    load()
  }

  const send = async () => {
    if (!form.subject.trim() || !form.body.trim()) return setMsg('Subject and message are required to send.')
    if (!confirm(`Send this email to all ${subscribers} subscriber(s)?`)) return
    setBusy(true)
    try {
      const r = await admin.sendCampaign(form.subject, form.body)
      setMsg(`Sent to ${r.sent} subscriber(s). 📣`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Send failed')
    } finally { setBusy(false); setTimeout(() => setMsg(''), 4000) }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Email Campaigns</h1>
        <div className="admin-crumb">Dashboard <b>› Campaigns</b> · {subscribers} subscriber(s)</div>
      </div>

      {msg && <div className="a-success" style={{ marginBottom: 12 }}>{msg}</div>}

      <div className="campaign-grid">
        <div className="admin-card">
          <h3 style={{ marginBottom: 6 }}>{editingId ? 'Edit template' : 'Compose'}</h3>
          <p className="admin-muted" style={{ fontSize: '0.82rem', marginBottom: 14 }}>
            Write once; save as a reusable template or send now to all subscribers. Blank lines become paragraphs.
          </p>
          <div className="a-field"><label>Template name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. New Arrivals" />
          </div>
          <div className="a-field"><label>Email subject</label>
            <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Fresh bows just landed 🎀" />
          </div>
          <div className="a-field"><label>Message</label>
            <textarea rows={9} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder={'Hi lovely,\n\nWe just added a new collection...'} />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="a-btn" onClick={saveTemplate} disabled={busy}>{editingId ? 'Update template' : 'Save template'}</button>
            <button className="a-btn accent" onClick={send} disabled={busy}>📣 Send to {subscribers} now</button>
            {editingId && <button className="a-btn ghost" onClick={reset}>New</button>}
          </div>
        </div>

        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>Saved templates</h3>
          {templates.length === 0 && <p className="admin-empty">No templates yet.</p>}
          {templates.map((t) => (
            <div key={t.id} className="campaign-tpl">
              <div>
                <strong>{t.name}</strong>
                <div className="admin-muted" style={{ fontSize: '0.8rem' }}>{t.subject}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="a-btn ghost sm" onClick={() => edit(t)}>Edit</button>
                <button className="a-btn ghost sm" onClick={() => remove(t.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}