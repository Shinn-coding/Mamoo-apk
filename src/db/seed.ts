/** Seed pertama kali: dompet default + kategori default. Idempotent. */
import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from '../constants/categories';

export async function seedIfEmpty(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    const walletCount = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM wallets;');
    if ((walletCount?.n ?? 0) === 0) {
      for (const wallet of DEFAULT_WALLETS) {
        await db.runAsync(
          'INSERT INTO wallets (name, icon, color, is_default, is_archived) VALUES (?, ?, ?, ?, 0);',
          [wallet.name, wallet.icon, wallet.color, wallet.is_default],
        );
      }
    }

    const categoryCount = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM categories;');
    if ((categoryCount?.n ?? 0) === 0) {
      for (let index = 0; index < DEFAULT_CATEGORIES.length; index += 1) {
        const category = DEFAULT_CATEGORIES[index];
        await db.runAsync(
          'INSERT INTO categories (type, name, icon, color, sort_order, is_archived) VALUES (?, ?, ?, ?, ?, 0);',
          [category.type, category.name, category.icon, category.color, index],
        );
      }
    }
  });
}
