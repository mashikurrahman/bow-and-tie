import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { admin, type ProductInput } from '../../services/admin'
import { categories } from '../../data'

const empty: ProductInput = {
  name: '', category: 'Bows', price: 0, originalPrice: 0, costPrice: 0, stock: 0,
  badge: '', description: '', fabric: '', delivery: '', colors: [], sizes: [],
  gallery: [], image: '', inStock: true, featured: false, variants: [],
}

export default function AdminProductForm() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const [form, setForm] = useState<ProductInput>(empty)
  const [images, setImages] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!id) return
    admin.listProducts().then((r) => {
      const p = r.products.find((x) => x.id === id)
      if (p) {
        setForm({
          id: p.id, name: p.name, category: p.category, price: p.price, originalPrice: p.originalPrice,
          costPrice: p.costPrice ?? 0, stock: p.stock, badge: p.badge, description: p.description,
          fabric: p.fabric, delivery: p.delivery, colors: p.colors, sizes: p.sizes,
          gallery: p.gallery, image: p.image, inStock: p.inStock, featured: p.featured,
          variants: (p.variants ?? []).map((v) => ({
            label: v.label, color: v.color, size: v.size, price: v.price, stock: v.stock, image: v.image,
          })),
        })
        setImages(p.gallery.length ? p.gallery : [p.image].filter(Boolean))
      }
    })
  }, [id])

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const num = (k: keyof ProductInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, Number(e.target.value) as never)

  // Variant rows (optional). Each variant is its own SKU with its own price/stock.
  type V = NonNullable<ProductInput['variants']>[number]
  const variants = form.variants ?? []
  const addVariant = () =>
    setForm((f) => ({ ...f, variants: [...(f.variants ?? []), { label: '', color: '', size: '', price: f.price || 0, stock: 0 }] }))
  const updateVariant = (i: number, patch: Partial<V>) =>
    setForm((f) => ({ ...f, variants: (f.variants ?? []).map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }))
  const removeVariant = (i: number) =>
    setForm((f) => ({ ...f, variants: (f.variants ?? []).filter((_, idx) => idx !== i) }))

  const upload = async (slot: number, file: File) => {
    setUploadingSlot(slot)
    setError('')
    try {
      const url = await admin.uploadImage(file)
      setImages((prev) => {
        const next = [...prev]
        next[slot] = url
        return next.filter(Boolean)
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingSlot(null)
    }
  }

  const removeImage = (slot: number) => setImages((prev) => prev.filter((_, i) => i !== slot))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const payload: ProductInput = {
      ...form,
      gallery: images,
      image: images[0] ?? form.image,
      originalPrice: form.originalPrice || form.price,
      colors: typeof form.colors === 'string' ? (form.colors as string).split(',').map((s) => s.trim()).filter(Boolean) : form.colors,
      sizes: typeof form.sizes === 'string' ? (form.sizes as string).split(',').map((s) => s.trim()).filter(Boolean) : form.sizes,
    }
    try {
      if (editing) await admin.updateProduct(id!, payload)
      else await admin.createProduct(payload)
      navigate('/admin/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setBusy(false)
    }
  }

  const slots = [0, 1, 2, 3]

  return (
    <div>
      <div className="admin-page-head">
        <h1>{editing ? 'Edit Product' : 'Add Product'}</h1>
        <div className="admin-crumb">Dashboard › Products <b>› {editing ? 'Edit' : 'Add Product'}</b></div>
      </div>

      <form onSubmit={submit} className="admin-form-grid">
        <div className="admin-card">
          <h3 style={{ marginBottom: 16 }}>Product Information</h3>
          {error && <div className="a-error">{error}</div>}

          <div className="a-field">
            <label>Product Name *</label>
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Satin Cloud Bow" />
          </div>

          <div className="a-field-row">
            <div className="a-field">
              <label>Category *</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                {categories.filter((c) => c !== 'All').map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="a-field">
              <label>Badge</label>
              <input value={form.badge} onChange={(e) => set('badge', e.target.value)} placeholder="Best Seller / New…" />
            </div>
          </div>

          <div className="a-field-row">
            <div className="a-field"><label>Price (৳) *</label><input required type="number" min="0" value={form.price} onChange={num('price')} /></div>
            <div className="a-field"><label>Compare-at Price (৳)</label><input type="number" min="0" value={form.originalPrice} onChange={num('originalPrice')} /></div>
          </div>

          <div className="a-field-row">
            <div className="a-field"><label>Cost Price (৳) — for profit</label><input type="number" min="0" value={form.costPrice} onChange={num('costPrice')} /></div>
            <div className="a-field"><label>Stock Quantity</label><input type="number" min="0" value={form.stock} onChange={num('stock')} /></div>
          </div>

          <div className="a-field-row">
            <div className="a-field"><label>Colors (comma separated)</label><input value={Array.isArray(form.colors) ? form.colors.join(', ') : form.colors} onChange={(e) => set('colors', e.target.value as never)} placeholder="Pink, Ivory" /></div>
            <div className="a-field"><label>Sizes (comma separated)</label><input value={Array.isArray(form.sizes) ? form.sizes.join(', ') : form.sizes} onChange={(e) => set('sizes', e.target.value as never)} placeholder="Small, Medium" /></div>
          </div>

          <div className="a-field">
            <label>Variants (optional) — each is its own SKU</label>
            <p className="a-hint">Add rows for colour/size options with their own price &amp; stock. When variants exist, the product’s own price shows as “from” the cheapest and stock is the total across variants.</p>
            {variants.length > 0 && (
              <div className="variant-editor">
                <div className="variant-row variant-head">
                  <span>Label</span><span>Colour</span><span>Size</span><span>Price ৳</span><span>Stock</span><span></span>
                </div>
                {variants.map((v, i) => (
                  <div className="variant-row" key={i}>
                    <input value={v.label} onChange={(e) => updateVariant(i, { label: e.target.value })} placeholder="Blush / S" />
                    <input value={v.color ?? ''} onChange={(e) => updateVariant(i, { color: e.target.value })} placeholder="Blush" />
                    <input value={v.size ?? ''} onChange={(e) => updateVariant(i, { size: e.target.value })} placeholder="S" />
                    <input type="number" min="0" value={v.price} onChange={(e) => updateVariant(i, { price: Number(e.target.value) })} />
                    <input type="number" min="0" value={v.stock} onChange={(e) => updateVariant(i, { stock: Number(e.target.value) })} />
                    <button type="button" className="variant-del" onClick={() => removeVariant(i)} aria-label="Remove variant">✕</button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="a-btn ghost" style={{ marginTop: 8 }} onClick={addVariant}>+ Add variant</button>
          </div>

          <div className="a-field"><label>Fabric</label><input value={form.fabric} onChange={(e) => set('fabric', e.target.value)} /></div>
          <div className="a-field"><label>Description</label><textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>

          <div className="a-field-row">
            <label className="a-check"><input type="checkbox" checked={form.inStock} onChange={(e) => set('inStock', e.target.checked)} /> In stock</label>
            <label className="a-check"><input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured on homepage</label>
          </div>

          <button className="a-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Update Product' : 'Save Product'}</button>
        </div>

        <div className="admin-card">
          <h3 style={{ marginBottom: 6 }}>Product Images</h3>
          <p className="a-hint" style={{ marginBottom: 14 }}>PNG, JPG, SVG or WEBP · max 4MB. First image is the main photo.</p>
          <div className="uploader">
            {slots.map((slot) => (
              <div
                key={slot}
                className="upload-slot"
                onClick={() => !images[slot] && fileRefs.current[slot]?.click()}
              >
                {images[slot] ? (
                  <>
                    <img src={images[slot]} alt={`Product ${slot + 1}`} />
                    <button type="button" className="remove-img" onClick={(e) => { e.stopPropagation(); removeImage(slot) }}>✕</button>
                  </>
                ) : uploadingSlot === slot ? (
                  <span>Uploading…</span>
                ) : (
                  <span>＋<br />Photo {slot + 1}</span>
                )}
                <input
                  ref={(el) => { fileRefs.current[slot] = el }}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => e.target.files?.[0] && upload(slot, e.target.files[0])}
                />
              </div>
            ))}
          </div>
          <div className="a-field" style={{ marginTop: 16 }}>
            <label>Or image path/URL</label>
            <input
              value={images[0] ?? ''}
              onChange={(e) => setImages(e.target.value ? [e.target.value, ...images.slice(1)] : images.slice(1))}
              placeholder="/satin-cloud-bow.png"
            />
          </div>
        </div>
      </form>
    </div>
  )
}
