/** Repository tabel `transactions` — semua SQL di sini. */
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Transaction, TransactionType } from '../types';
import { getDb } from '../db';
import { toLocalDate } from '../../utils/date';

export type TransactionInput = {
  id?: number;
  type: TransactionType;
  amount: number;
  category_id: number | null;
  wallet_id: number;
  date: string;
  note?: string | null;
};

type NormalizedTransaction = Omit<TransactionInput, 'id' | 'note'> & { note: string | null };

function normalize(input: TransactionInput): NormalizedTransaction {
  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Nominal harus lebih dari Rp 0.');
  }
  if (input.type !== 'initial' && !input.category_id) {
    throw new Error('Pilih kategori dulu.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error('Tanggal tidak valid.');
  }
  const note = input.note?.trim() ? input.note.trim() : null;
  return {
    type: input.type,
    amount,
    category_id: input.category_id ?? null,
    wallet_id: input.wallet_id,
    date: input.date,
    note,
  };
}

export async function createTransaction(db: SQLiteDatabase, input: TransactionInput): Promise<number> {
  const data = normalize(input);
  const result = await db.runAsync(
    'INSERT INTO transactions (type, amount, category_id, wallet_id, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
    [data.type, data.amount, data.category_id, data.wallet_id, data.date, data.note, new Date().toISOString()],
  );
  return result.lastInsertRowId;
}

export async function updateTransaction(db: SQLiteDatabase, input: TransactionInput): Promise<void> {
  if (!input.id) throw new Error('ID transaksi tidak ada.');
  const data = normalize(input);
  await db.runAsync(
    'UPDATE transactions SET type = ?, amount = ?, category_id = ?, wallet_id = ?, date = ?, note = ? WHERE id = ?;',
    [data.type, data.amount, data.category_id, data.wallet_id, data.date, data.note, input.id],
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ?;', [id]);
}

export async function getTransaction(id: number): Promise<Transaction | null> {
  const db = getDb();
  const row = await db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?;', [id]);
  return row ?? null;
}

export type TransactionFilter = {
  from?: string;
  to?: string;
  type?: TransactionType;
  categoryId?: number;
  search?: string;
  limit?: number;
};

/** Baris untuk ekspor CSV: transaksi + nama kategori & dompetnya. */
export type TransactionExportRow = {
  date: string;
  type: TransactionType;
  amount: number;
  note: string | null;
  category_name: string | null;
  wallet_name: string;
};

export async function listTransactionsForExport(): Promise<TransactionExportRow[]> {
  const db = getDb();
  return db.getAllAsync<TransactionExportRow>(
    `SELECT t.date, t.type, t.amount, t.note, c.name AS category_name, w.name AS wallet_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     JOIN wallets w ON w.id = t.wallet_id
     ORDER BY t.date ASC, t.id ASC;`,
  );
}

export async function listTransactions(filter: TransactionFilter = {}): Promise<Transaction[]> {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (filter.from) {
    conditions.push('date >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push('date <= ?');
    params.push(filter.to);
  }
  if (filter.type) {
    conditions.push('type = ?');
    params.push(filter.type);
  }
  if (filter.categoryId) {
    conditions.push('category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.search) {
    conditions.push('LOWER(COALESCE(note, "")) LIKE ?');
    params.push(`%${filter.search.toLowerCase()}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = filter.limit ? `LIMIT ${Math.floor(filter.limit)}` : '';
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions ${where} ORDER BY date DESC, id DESC ${limitClause};`,
    params,
  );
}

export type PeriodSummary = { income: number; expense: number };

/** Pemasukan/pengeluaran untuk satu rentang. Tipe `initial` TIDAK dihitung. */
export async function summarizeRange(from: string, to: string): Promise<PeriodSummary> {
  const db = getDb();
  const row = await db.getFirstAsync<PeriodSummary>(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
     FROM transactions WHERE date >= ? AND date <= ?;`,
    [from, to],
  );
  return { income: row?.income ?? 0, expense: row?.expense ?? 0 };
}

/** Saldo per dompet = initial + income − expense. Tidak menyimpan angka terpisah. */
export async function walletBalances(): Promise<Record<number, number>> {
  const db = getDb();
  const rows = await db.getAllAsync<{ wallet_id: number; balance: number }>(
    `SELECT wallet_id,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN -amount ELSE amount END), 0) AS balance
     FROM transactions GROUP BY wallet_id;`,
  );
  return Object.fromEntries(rows.map((row) => [row.wallet_id, row.balance]));
}

export async function totalBalance(): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ balance: number }>(
    `SELECT COALESCE(SUM(CASE WHEN type = 'expense' THEN -amount ELSE amount END), 0) AS balance FROM transactions;`,
  );
  return row?.balance ?? 0;
}

/** Kategori yang sudah terpakai (untuk aturan arsip/hapus di fase kategori). */export async function countByCategory(categoryId: number): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?;', [
    categoryId,
  ]);
  return row?.n ?? 0;
}

/** Nominal pertama hari ini (dipakai form sebagai saran). */
export function suggestDate(): string {
  return toLocalDate(new Date());
}

export type CategoryTotal = {
  category_id: number | null;
  name: string;
  icon: string;
  color: string;
  total: number;
};

/** Total pengeluaran per kategori dalam rentang (untuk donut & ranking). */
export async function categoryTotals(from: string, to: string): Promise<CategoryTotal[]> {
  const db = getDb();
  const rows = await db.getAllAsync<CategoryTotal>(
    `SELECT t.category_id,
      COALESCE(c.name, 'Tanpa Kategori') AS name,
      COALESCE(c.icon, 'dots-horizontal') AS icon,
      COALESCE(c.color, '#64748B') AS color,
      SUM(t.amount) AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ?
     GROUP BY t.category_id, c.name, c.icon, c.color
     ORDER BY total DESC;`,
    [from, to],
  );
  return rows;
}

export type DailyTotal = { date: string; income: number; expense: number };

/** Pemasukan vs pengeluaran per hari dalam rentang (untuk bar chart). */
export async function dailyTotals(from: string, to: string): Promise<DailyTotal[]> {
  const db = getDb();
  const rows = await db.getAllAsync<DailyTotal>(
    `SELECT date,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
     FROM transactions
     WHERE type IN ('income', 'expense') AND date >= ? AND date <= ?
     GROUP BY date
     ORDER BY date ASC;`,
    [from, to],
  );
  return rows;
}
