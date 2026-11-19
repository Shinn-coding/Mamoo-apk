/** Repository tabel `budgets` — batas per kategori, siklus custom 1–28. */
import type { Budget } from '../types';
import { getDb } from '../db';

export type BudgetProgress = {
  id: number;
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  /** jatah anggaran */
  amount: number;
  /** terpakai (pengeluaran kategori itu dalam rentang siklus) */
  spent: number;
  /** amount - spent */
  sisa: number;
  /** sisa anggaran ÷ sisa hari siklus (termasuk hari ini, min 1); ≤ 0 → Rp 0 */
  dailySafe: number;
};

/** Semua anggaran satu siklus + progres pengeluarannya. */
export async function listBudgetsWithProgress(
  cycleKey: string,
  from: string,
  to: string,
  daysLeft: number,
): Promise<BudgetProgress[]> {
  const db = getDb();
  const rows = await db.getAllAsync<
    Budget & {
      category_name: string;
      category_icon: string;
      category_color: string;
      spent: number;
    }
  >(
    `SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
      COALESCE((
        SELECT SUM(t.amount) FROM transactions t
        WHERE t.category_id = b.category_id AND t.type = 'expense' AND t.date >= ? AND t.date <= ?
      ), 0) AS spent
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     WHERE b.cycle_key = ?
     ORDER BY c.sort_order ASC, c.id ASC;`,
    [from, to, cycleKey],
  );
  const left = Math.max(1, Math.floor(daysLeft));
  return rows.map((row) => {
    const sisa = row.amount - row.spent;
    return {
      id: row.id,
      category_id: row.category_id,
      category_name: row.category_name,
      category_icon: row.category_icon,
      category_color: row.category_color,
      amount: row.amount,
      spent: row.spent,
      sisa,
      dailySafe: sisa <= 0 ? 0 : Math.floor(sisa / left),
    };
  });
}

/** Kategori pengeluaran yang belum punya anggaran di siklus ini. */
export async function listUnbudgetedCategories(cycleKey: string): Promise<
  Array<{ id: number; name: string; icon: string; color: string }>
> {
  const db = getDb();
  return db.getAllAsync<{ id: number; name: string; icon: string; color: string }>(
    `SELECT c.id, c.name, c.icon, c.color FROM categories c
     WHERE c.type = 'expense' AND c.is_archived = 0
       AND c.id NOT IN (SELECT category_id FROM budgets WHERE cycle_key = ?)
     ORDER BY c.sort_order ASC;`,
    [cycleKey],
  );
}

/** Simpan (insert atau update) anggaran satu kategori untuk satu siklus. */
export async function setBudget(
  categoryId: number,
  cycleKey: string,
  amount: number,
): Promise<void> {
  const rounded = Math.round(amount);
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new Error('Nominal anggaran harus lebih dari Rp 0.');
  }
  const db = getDb();
  await db.runAsync(
    `INSERT INTO budgets (category_id, cycle_key, amount) VALUES (?, ?, ?)
     ON CONFLICT(category_id, cycle_key) DO UPDATE SET amount = excluded.amount;`,
    [categoryId, cycleKey, rounded],
  );
}

export async function deleteBudget(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM budgets WHERE id = ?;', [id]);
}
