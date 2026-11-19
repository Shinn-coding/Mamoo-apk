/** Util uang — satu sumber kebenaran untuk format Rupiah. */

export function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

/** Angka negatif (pengeluaran) tetap bertanda: "-Rp 5.000". */
export function formatRupiahSigned(amount: number): string {
  return amount < 0 ? `-${formatRupiah(Math.abs(amount))}` : formatRupiah(amount);
}

/** Dari digit mentah ("1250000") ke teks terformat ("1.250.000") untuk input. */
export function formatAmountInput(digits: string): string {
  const onlyDigits = digits.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!onlyDigits) return '';
  return Number(onlyDigits).toLocaleString('id-ID');
}

/** Kembali dari teks input ke angka bulat. */
export function parseAmountInput(text: string): number {
  const digits = text.replace(/\D/g, '');
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

/** Persentase aman untuk progress (0–100, tidak Infinity/NaN). */
export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (part / total) * 100));
}
