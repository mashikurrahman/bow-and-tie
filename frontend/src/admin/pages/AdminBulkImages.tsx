import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { admin, type AdminProduct, type BulkImageResult } from '../../services/admin'

// Match a filename (minus extension) to a product id/slug, mirroring the server.
function matchFile(name: string, ids: Set<string>): { id: string; kind: 'primary' | 'gallery' } | null {
  const base = name.replace(/\.[^.]+$/, '').trim().toLowerCase()
  if (ids.has(base)) return { id: base, kind: 'primary' }
  const m = base.match(/^(.*)-(\d+)$/)
  if (m && ids.has(m[1])) return { id: m[1], kind: 'gallery' }
  return null
}

export default function AdminBulkImages() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<BulkImageResult | null>(null)

  useEffect(() => {
    admin.listProducts().then((r) => setProducts(r.products)).catch(() => {})
  }, [])

  const ids = useMemo(() => new Set(products.map((p) => p.id.toLowerCase())), [products])
  const nameById = useMemo(() => new Map(products.map((p) => [p.id.toLowerCase(), p.name])), [products])

  const preview = useMemo(
    () => files.map((f) => ({ file: f, match: matchFile(f.name, ids) })),
    [files, ids],
  )
  const matchedCount = preview.filter((p) => p.match).length

  const upload = async () => {
    if (!files.length) return
    setBusy(true)
    setResult(null)
    try {
      const r = await admin.bulkUploadImages(files)
      setResult(r)
      setFiles([])
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Bulk Product Images</h1>
        <div className="admin-crumb"><Link to="/admin/products" className="admin-link">Products</Link> <b>› Bulk Images</b></div>
      </div>

      <div className="admin-card">
        <div className="bulk-img-help">
          <p><b>How it works:</b> name each photo after the product's slug, then drop them all here.</p>
          <ul>
            <li>Main image → <code>satin-cloud-bow.jpg</code> (the slug/ID from your import sheet)</li>
            <li>Extra gallery images → <code>satin-cloud-bow-2.jpg</code>, <code>satin-cloud-bow-3.jpg</code></li>
            <li>Accepted: .jpg .png .webp .gif · up to 5MB each, 100 at a time</li>
          </ul>
        </div>

        <label className="bulk-img-drop">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setResult(null) }}
            style={{ display: 'none' }}
          />
          <span>📁 Choose images…</span>
        </label>

        {files.length > 0 && (
          <>
            <p className="admin-muted" style={{ margin: '12px 0' }}>
              {files.length} file(s) selected · <b>{matchedCount}</b> match a product · {files.length - matchedCount} won't match
            </p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>File</th><th>Matches</th><th>As</th></tr></thead>
                <tbody>
                  {preview.map(({ file, match }) => (
                    <tr key={file.name}>
                      <td className="cell-strong">{file.name}</td>
                      <td>{match ? (nameById.get(match.id) ?? match.id) : <span className="bulk-nomatch">✗ no product</span>}</td>
                      <td className="admin-muted">{match ? (match.kind === 'primary' ? 'Main image' : 'Gallery') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="a-btn" onClick={upload} disabled={busy || matchedCount === 0} style={{ marginTop: 14 }}>
              {busy ? 'Uploading…' : `Upload ${matchedCount} matched image(s)`}
            </button>
          </>
        )}

        {result && (
          <div className="a-success" style={{ marginTop: 16 }}>
            ✅ Updated {result.updated} product(s) with {result.matched.length} image(s).
            {result.unmatched.length > 0 && (
              <div style={{ marginTop: 6, color: '#8a6d3b' }}>
                Skipped {result.unmatched.length} file(s) with no matching product: {result.unmatched.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}