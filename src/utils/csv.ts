/** Util CSV untuk ekspor transaksi: escape + netralisasi sel berbahaya (fase 5). */

/** Escape kutip/koma/baris baru, dan netralkan sel yang diawali = + - @ agar
 *  tidak dieksekusi sebagai formula saat dibuka di Excel/Google Sheets. */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\n\r;]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Susun isi CSV (tanpa BOM — BOM ditambahkan saat menulis file). */
export function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(','));
  }
  return lines.join('\r\n');
}
