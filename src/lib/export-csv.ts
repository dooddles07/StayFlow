export function exportToCsv(
  filename: string,
  rows: Record<string, string | number>[],
) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  // Prefix values starting with =+-@ so spreadsheet apps don't treat them as formulas (CSV injection).
  const escape = (value: string | number) => {
    const str = String(value)
    const safe = /^[=+\-@]/.test(str) ? `'${str}` : str
    return `"${safe.replace(/"/g, '""')}"`
  }
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? '')).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
