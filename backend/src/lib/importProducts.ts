import * as XLSX from 'xlsx'
import { PDFParse } from 'pdf-parse'

// ---------------------------------------------------------------------------
// Bulk product import — turns an uploaded CSV / Excel / PDF file into a list
// of normalized product rows the admin routes can validate and save.
//
// Column headers are matched flexibly (case-insensitive, punctuation ignored)
// so admins don't have to name things exactly. See COLUMN_ALIASES below.
// ---------------------------------------------------------------------------

export type RawRow = Record<string, string>

// A row shaped for productSchema (arrays/numbers already coerced).
export interface MappedRow {
  id?: string
  name: string
  category: string
  price: number
  originalPrice: number
  costPrice: number
  stock: number
  badge: string
  description: string
  fabric: string
  delivery: string
  colors: string[]
  sizes: string[]
  gallery: string[]
  image: string
  featured: boolean
}

// Canonical field -> accepted header spellings (already normalized).
const COLUMN_ALIASES: Record<keyof MappedRow, string[]> = {
  id: ['id', 'slug', 'sku', 'handle', 'code'],
  name: ['name', 'productname', 'title', 'product', 'item', 'itemname'],
  category: ['category', 'cat', 'type', 'collection', 'group'],
  price: ['price', 'saleprice', 'sellingprice', 'sell', 'rate', 'sellprice', 'amount'],
  originalPrice: ['originalprice', 'mrp', 'regularprice', 'compareat', 'compareatprice', 'wasprice', 'oldprice', 'listprice'],
  costPrice: ['costprice', 'cost', 'buyingprice', 'buyprice', 'purchaseprice', 'costperitem'],
  stock: ['stock', 'quantity', 'qty', 'inventory', 'stockqty', 'available'],
  badge: ['badge', 'tag', 'label', 'flag'],
  description: ['description', 'desc', 'details', 'detail', 'about'],
  fabric: ['fabric', 'material', 'madeof'],
  delivery: ['delivery', 'deliverytime', 'shipping', 'shippingtime'],
  colors: ['colors', 'color', 'colours', 'colour'],
  sizes: ['sizes', 'size'],
  gallery: ['gallery', 'images', 'galleryimages', 'additionalimages', 'photos', 'morephotos'],
  image: ['image', 'imageurl', 'imagelink', 'photo', 'picture', 'img', 'mainimage', 'thumbnail'],
  featured: ['featured', 'feature', 'isfeatured', 'highlight'],
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// Build reverse lookup: normalized header -> canonical field.
const HEADER_TO_FIELD = new Map<string, keyof MappedRow>()
for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
  for (const alias of aliases) HEADER_TO_FIELD.set(alias, field as keyof MappedRow)
}

const toNumber = (v: string): number => {
  if (!v) return 0
  // Strip currency symbols, "tk", commas, spaces — keep digits/dot/minus.
  const cleaned = v.replace(/[^0-9.\-]/g, '')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? Math.round(n) : 0
}

const toBool = (v: string): boolean =>
  ['yes', 'y', 'true', '1', '✓', 'x', 'featured'].includes(v.trim().toLowerCase())

const toList = (v: string): string[] =>
  v
    ? v
        .split(/[|,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : []

/** Map a raw row (arbitrary headers) into a normalized product row. */
export function mapRow(raw: RawRow): MappedRow {
  const picked: Partial<Record<keyof MappedRow, string>> = {}
  for (const [header, value] of Object.entries(raw)) {
    const field = HEADER_TO_FIELD.get(norm(header))
    // First non-empty value for a field wins (handles duplicate-ish columns).
    if (field && picked[field] === undefined && String(value ?? '').trim() !== '') {
      picked[field] = String(value).trim()
    }
  }

  const price = toNumber(picked.price ?? '')
  const originalPrice = picked.originalPrice ? toNumber(picked.originalPrice) : price
  const image = picked.image ?? ''
  const gallery = toList(picked.gallery ?? '')

  return {
    id: picked.id?.trim() || undefined,
    name: picked.name ?? '',
    category: picked.category ?? '',
    price,
    originalPrice: originalPrice || price,
    costPrice: toNumber(picked.costPrice ?? ''),
    stock: toNumber(picked.stock ?? ''),
    badge: picked.badge ?? '',
    description: picked.description ?? '',
    fabric: picked.fabric ?? '',
    delivery: picked.delivery ?? '',
    colors: toList(picked.colors ?? ''),
    sizes: toList(picked.sizes ?? ''),
    gallery: gallery.length ? gallery : image ? [image] : [],
    image: image || gallery[0] || '',
    featured: picked.featured ? toBool(picked.featured) : false,
  }
}

// ---- File parsers ---------------------------------------------------------

/** CSV or Excel -> array of header-keyed rows (via SheetJS). */
function parseSpreadsheet(buffer: Buffer): RawRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer', raw: false })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  // defval keeps empty cells as '' so column positions stay aligned.
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '', raw: false })
}

// Turn a 2-D table (first row = headers) into header-keyed row objects.
function tableToRows(table: string[][]): RawRow[] {
  if (table.length < 2) return []
  const headers = table[0].map((h) => String(h ?? '').trim())
  return table.slice(1).map((cells) => {
    const row: RawRow = {}
    headers.forEach((h, i) => {
      if (h) row[h] = String(cells[i] ?? '').trim()
    })
    return row
  })
}

// Does this table look like a product table (has a recognizable header)?
function looksLikeProductTable(table: string[][]): boolean {
  if (!table.length) return false
  const headerFields = table[0].map((h) => HEADER_TO_FIELD.get(norm(String(h ?? ''))))
  return headerFields.includes('name') || headerFields.includes('price')
}

/** PDF -> rows. Uses real table extraction, falls back to delimited text. */
async function parsePdf(buffer: Buffer): Promise<RawRow[]> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    // 1) Try structured table extraction (best when the PDF has a real table).
    const tableResult = await parser.getTable()
    const tables = tableResult.mergedTables ?? []
    for (const table of tables) {
      if (looksLikeProductTable(table)) {
        const rows = tableToRows(table)
        if (rows.length) return rows
      }
    }

    // 2) Fallback: extract text and parse pipe/tab/multi-space delimited lines.
    const textResult = await parser.getText()
    return parseDelimitedText(textResult.text)
  } finally {
    await parser.destroy()
  }
}

/** Best-effort: split plain PDF text into rows using | tab or 2+ spaces. */
function parseDelimitedText(text: string): RawRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return []

  const splitLine = (line: string): string[] => {
    if (line.includes('|')) return line.split('|').map((c) => c.trim())
    if (line.includes('\t')) return line.split('\t').map((c) => c.trim())
    return line.split(/\s{2,}/).map((c) => c.trim())
  }

  // Find the header line (first line that maps to name or price).
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const fields = splitLine(lines[i]).map((c) => HEADER_TO_FIELD.get(norm(c)))
    if (fields.includes('name') || fields.includes('price')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const headers = splitLine(lines[headerIdx])
  const rows: RawRow[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitLine(lines[i])
    if (cells.length < 2) continue
    const row: RawRow = {}
    headers.forEach((h, j) => {
      if (h) row[h] = cells[j] ?? ''
    })
    rows.push(row)
  }
  return rows
}

export type ImportFileKind = 'csv' | 'excel' | 'pdf'

export function detectKind(filename: string): ImportFileKind | null {
  const ext = filename.toLowerCase().split('.').pop() ?? ''
  if (ext === 'csv' || ext === 'tsv') return 'csv'
  if (ext === 'xlsx' || ext === 'xls') return 'excel'
  if (ext === 'pdf') return 'pdf'
  return null
}

/** Entry point: read an uploaded file into normalized product rows. */
export async function extractRows(buffer: Buffer, filename: string): Promise<MappedRow[]> {
  const kind = detectKind(filename)
  if (!kind) throw new Error('Unsupported file type. Upload a .csv, .xlsx, or .pdf file.')
  const raw = kind === 'pdf' ? await parsePdf(buffer) : parseSpreadsheet(buffer)
  return raw.map(mapRow)
}
