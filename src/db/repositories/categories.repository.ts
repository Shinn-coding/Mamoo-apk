/** Repository tabel `categories`. Data transaksi lama tidak boleh hilang. */
import type { CategoryType } from '../../constants/categories';
import type { IconName } from '../../constants/icons';
import type { Category } from '../types';
import { getDb } from '../db';

export async function listCategories(type?: CategoryType, includeArchived = false): Promise<Category[]> {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }
  if (!includeArchived) conditions.push('is_archived = 0');
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await db.getAllAsync<Category>(
    `SELECT * FROM categories ${where} ORDER BY sort_order ASC, id ASC;`,
    params,
  );
  return rows;
}

export type NewCategory = {
  type: CategoryType;
  name: string;
  icon: IconName;
  color: string;
};

export async function createCategory(input: NewCategory): Promise<number> {
  const db = getDb();
  const max = await db.getFirstAsync<{ n: number }>('SELECT COALESCE(MAX(sort_order), -1) AS n FROM categories;');
  const result = await db.runAsync(
    'INSERT INTO categories (type, name, icon, color, sort_order, is_archived) VALUES (?, ?, ?, ?, ?, 0);',
    [input.type, input.name.trim(), input.icon, input.color, (max?.n ?? -1) + 1],
  );
  return result.lastInsertRowId;
}

export async function updateCategory(
  id: number,
  patch: Partial<Pick<Category, 'name' | 'icon' | 'color'>>,
): Promise<void> {
  const db = getDb();
  const sets: string[] = [];
  const params: (string | number)[] = [];
  for (const field of ['name', 'icon', 'color'] as const) {
    const value = patch[field];
    if (value !== undefined) {
      sets.push(`${field} = ?`);
      params.push(field === 'name' ? String(value).trim() : value);
    }
  }
  if (!sets.length) return;
  params.push(id);
  await db.runAsync(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?;`, params);
}

export async function reorderCategories(orderedIds: number[]): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await db.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?;', [index, orderedIds[index]]);
    }
  });
}

/** Arsipkan = data lama tetap aman, kategori hilang dari picker. */
export async function archiveCategory(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('UPDATE categories SET is_archived = 1 WHERE id = ?;', [id]);
}

export async function deleteCategory(id: number): Promise<void> {
  const db = getDb();
  const used = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?;',
    [id],
  );
  if ((used?.n ?? 0) > 0) {
    throw new Error('Kategori sudah punya transaksi. Arsipkan kategori ini, atau pindahkan transaksinya ke "Lainnya".');
  }
  const budget = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM budgets WHERE category_id = ?;', [id]);
  if ((budget?.n ?? 0) > 0) {
    await db.runAsync('DELETE FROM budgets WHERE category_id = ?;', [id]);
  }
  await db.runAsync('DELETE FROM categories WHERE id = ?;', [id]);
}
