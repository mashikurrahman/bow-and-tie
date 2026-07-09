import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { admin, type ImportPreview, type ImportResult } from '../../services/admin'

const TEMPLATE_HEADERS = [
  'name', 'category', 'price', 'originalPrice', 'costPrice', 'stock',
  'description', 'image', 'badge', 'fabric', 'delivery', 'colors', 'sizes', 'gallery', 'featured',
]
const TEMPLATE_EXAMPLES = [
  ['Satin Cloud Bow', 'Bows', '450', '600', '200', '20', 'Soft handmade satin bow', 'https://example.com/bow.jpg', 'Best Seller', 'Satin', '2-3 days', 'Pink|White', 'S|M', '', 'yes'],
  ['Rose Garden Clip', 'Clips', '320', '400', '150', '15', 'Floral hair clip', 'https://example.com/clip.jpg', '', 'Cotton', '2-3 days', 'Red', '', '', 'no'],
]

const csvCell = (c: string) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)

function downloadTemplate() {
  const rows = [TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLES]
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'bowtie-product-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const fmt = (n: number) => `৳${n.toLocaleString('en-BD')}`

export default function AdminImport() {
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setPreview(null); setResult(null); setError(''); setFileName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFile = async (file: File) => {
    reset()
    setBusy(true)
    setFileName(file.name)
    try {
      const data = await admin.importProducts(file)
      setPreview(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the file.')
      setFileName('')
    } finally {
      setBusy(false)
    }
  }

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const doImport = async () => {
    if (!preview) return
    const validRows = preview.rows.filter((r) => r.valid).map((r) => r.data)
    if (!validRows.length) return
    setCommitting(true); setError('')
    try {
      const res = await admin.commitImport(validRows)
      setResult(res)
      setPreview(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setCommitting(false)
    }
  }

  const s = preview?.summary

  return (
    <div>
      <div className="admin-page-head">
        <h1>Bulk Import</h1>
        <div className="admin-crumb">Add or update many products at once from a CSV, Excel, or PDF file</div>
      </div>

      {/* How-to + template */}
      <div className="admin-card import-howto">
        <div className="admin-card-head"><h3>How it works</h3></div>
        <ol className="import-steps">
          <li><b>Download the template</b> and fill one row per product in Excel or Google Sheets.</li>
          <li><b>Upload</b> the file (.csv, .xlsx, or .pdf). We’ll show a preview — nothing is saved yet.</li>
          <li><b>Review &amp; confirm.</b> Valid rows are imported; rows with errors are skipped.</li>
        </ol>
        <div className="import-howto-actions">
          <button className="a-btn" onClick={downloadTemplate}>⬇ Download CSV template</button>
          <span className="import-hint">
            Required: <b>name</b>, <b>category</b>, <b>price</b>. Products matched by name are <b>updated</b>;
            new names are <b>created</b>. New categories are added automatically.
          </span>
        </div>
        <div className="import-note">
          <b>PDF tip:</b> works best when the PDF contains a clean table with a header row
          (Name, Category, Price…). For large catalogs, CSV/Excel is the most reliable.
        </div>
      </div>

      {/* Upload zone */}
      {!result && (
        <div
          className={`import-drop ${dragOver ? 'over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls,.pdf"
            onChange={onInput}
            hidden
          />
          <div className="import-drop-icon">📦</div>
          <div className="import-drop-title">
            {busy ? 'Reading file…' : fileName || 'Click to choose a file or drag it here'}
          </div>
          <div className="import-drop-sub">CSV, Excel (.xlsx) or PDF · up to 10MB</div>
        </div>
      )}

      {error && <div className="a-error" style={{ marginTop: 14 }}>{error}</div>}

      {/* Result summary */}
      {result && (
        <div className="admin-card import-result">
          <div className="admin-card-head"><h3>Import complete ✅</h3></div>
          <div className="import-chips">
            <span className="import-chip create">{result.created} created</span>
            <span className="import-chip update">{result.updated} updated</span>
            {result.failed.length > 0 && <span className="import-chip skip">{result.failed.length} failed</span>}
          </div>
          {result.failed.length > 0 && (
            <ul className="import-failed">
              {result.failed.map((f, i) => <li key={i}><b>{f.name}</b> — {f.error}</li>)}
            </ul>
          )}
          <div className="import-howto-actions" style={{ marginTop: 14 }}>
            <button className="a-btn" onClick={reset}>Import another file</button>
            <Link to="/admin/products" className="a-btn ghost">View products →</Link>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && s && (
        <div className="admin-card" style={{ marginTop: 18 }}>
          <div className="admin-card-head">
            <h3>Preview — {fileName}</h3>
          </div>
          <div className="import-chips">
            <span className="import-chip create">{s.toCreate} to create</span>
            <span className="import-chip update">{s.toUpdate} to update</span>
            {s.invalid > 0 && <span className="import-chip skip">{s.invalid} will be skipped</span>}
            <span className="import-chip total">{s.total} rows read</span>
          </div>

          <div className="admin-table-wrap" style={{ marginTop: 12 }}>
            <table className="admin-table import-table">
              <thead>
                <tr>
                  <th>#</th><th>Status</th><th>Product</th><th>Category</th>
                  <th>Price</th><th>Stock</th><th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row} className={r.valid ? '' : 'row-invalid'}>
                    <td>{r.row}</td>
                    <td>
                      {r.action === 'create' && <span className="import-badge create">New</span>}
                      {r.action === 'update' && <span className="import-badge update">Update</span>}
                      {r.action === 'skip' && <span className="import-badge skip">Skip</span>}
                    </td>
                    <td className="cell-strong">
                      {String(r.data.name || '—')}
                      {r.valid && <div className="pid">{r.id}</div>}
                    </td>
                    <td>{String(r.data.category || '—')}</td>
                    <td>{typeof r.data.price === 'number' && r.data.price > 0 ? fmt(r.data.price) : '—'}</td>
                    <td>{r.data.stock != null ? String(r.data.stock) : '—'}</td>
                    <td className="import-issues">
                      {r.errors.length ? r.errors.join('; ') : <span className="import-ok">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="import-howto-actions" style={{ marginTop: 16 }}>
            <button className="a-btn" onClick={doImport} disabled={committing || s.valid === 0}>
              {committing ? 'Importing…' : `Import ${s.valid} product${s.valid === 1 ? '' : 's'}`}
            </button>
            <button className="a-btn ghost" onClick={reset} disabled={committing}>Cancel</button>
            {s.invalid > 0 && (
              <span className="import-hint">{s.invalid} row{s.invalid === 1 ? '' : 's'} with errors will be skipped.</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
