/**
 * Util tanggal — satu sumber kebenaran.
 * Tanggal disimpan lokal "YYYY-MM-DD" (dilarang toISOString untuk tanggal).
 */

export type LocalDate = string; // "YYYY-MM-DD"

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDate(date: Date = new Date()): LocalDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayLocal(): LocalDate {
  return toLocalDate(new Date());
}

export function parseLocalDate(value: LocalDate): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidLocalDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseLocalDate(value).getTime());
}

export function addDays(value: LocalDate, days: number): LocalDate {
  const d = parseLocalDate(value);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

export function addMonths(value: LocalDate, months: number): LocalDate {
  const d = parseLocalDate(value);
  d.setMonth(d.getMonth() + months);
  return toLocalDate(d);
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round(
    (parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / 86_400_000,
  );
}

/** "Maret 2026" untuk judul. */
export function formatMonthLabel(value: LocalDate): string {
  const d = parseLocalDate(value);
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/** "17 Nov" untuk daftar. */
export function formatDateShort(value: LocalDate): string {
  return parseLocalDate(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/** "Hari ini", "Kemarin", atau "Sen, 17 Nov". */
export function formatDayLabel(value: LocalDate): string {
  const today = todayLocal();
  if (value === today) return 'Hari ini';
  if (value === addDays(today, -1)) return 'Kemarin';
  const d = parseLocalDate(value);
  const weekday = d.toLocaleDateString('id-ID', { weekday: 'short' });
  return `${weekday}, ${formatDateShort(value)}`;
}

/**
 * Siklus anggaran. Tanggal mulai dibatasi 1–28 agar aman di bulan pendek.
 * cycleKey = "YYYY-MM" dari BULAN tempat siklus dimulai.
 */
export function clampCycleStartDay(day: number): number {
  return Math.min(28, Math.max(1, Math.floor(day || 1)));
}

export function cycleKey(date: LocalDate, startDay: number): string {
  const d = parseLocalDate(date);
  const start = clampCycleStartDay(startDay);
  if (d.getDate() < start) d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export type CycleRange = {
  start: LocalDate;
  end: LocalDate;
  /** total hari dalam siklus */
  daysTotal: number;
  /** sisa hari termasuk hari ini, minimal 1 */
  daysLeft: number;
};

/** Rentang siklus yang memuat `date`, untuk Beranda/Anggaran/Laporan. */
export function getCycleRange(date: LocalDate, startDay: number): CycleRange {
  const start = clampCycleStartDay(startDay);
  const d = parseLocalDate(date);
  if (d.getDate() < start) d.setMonth(d.getMonth() - 1);
  d.setDate(start);
  const cycleStartDate = toLocalDate(d);
  // siklus berakhir sehari sebelum start bulan berikutnya
  const end = addDays(addMonths(cycleStartDate, 1), -1);
  const total = daysBetween(cycleStartDate, end) + 1;
  const today = todayLocal();
  const left = Math.max(1, daysBetween(today, end) + 1);
  return { start: cycleStartDate, end, daysTotal: total, daysLeft: today > end ? total : left };
}
