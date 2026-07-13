import type { Response } from 'express'

// Minimal, correct CSV builder. Values containing a comma, quote or newline are
// wrapped in quotes with internal quotes doubled. Prefixed with a UTF-8 BOM so
// Excel opens Bangla / special characters correctly.

export function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(','))
  return '﻿' + lines.join('\r\n') + '\r\n'
}

/** Send a CSV string as a downloadable file. */
export function sendCsv(res: Response, filename: string, csv: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csv)
}