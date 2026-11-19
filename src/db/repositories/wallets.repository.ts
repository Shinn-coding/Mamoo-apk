/** Repository tabel `wallets`. */
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Wallet } from '../types';
import { getDb } from '../db';
import { todayLocal } from '../../utils/date';

export async function listWallets(includeArchived = false): Promise<Wallet[]> {
  const db = getDb();
  const rows = await db.getAllAsync<Wallet>(
    `SELECT * FROM wallets ${includeArchived ? '' : 'WHERE is_archived = 0'} ORDER BY is_default DESC, name ASC;`,
  );
  return rows;
}

export async function getDefaultWallet(): Promise<Wallet | null> {
  const db = getDb();
  const row = await db.getFirstAsync<Wallet>('SELECT * FROM wallets WHERE is_default = 1 AND is_archived = 0 LIMIT 1;');
  return row ?? null;
}

export type NewWallet = {
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean;
};

function normalizeWalletName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Nama dompet tidak boleh kosong.');
  return trimmed;
}

/** Bikin dompet; kalau jadi default, dompet lain otomatis dilepas dari default. */
export async function createWallet(db: SQLiteDatabase, input: NewWallet): Promise<number> {
  const name = normalizeWalletName(input.name);
  const isDefault = input.isDefault ?? false;
  if (isDefault) {
    await db.runAsync('UPDATE wallets SET is_default = 0 WHERE is_default = 1;');
  }
  const result = await db.runAsync(
    'INSERT INTO wallets (name, icon, color, is_default, is_archived) VALUES (?, ?, ?, ?, 0);',
    [name, input.icon, input.color, isDefault ? 1 : 0],
  );
  return result.lastInsertRowId;
}

export async function updateWallet(
  id: number,
  patch: Partial<Pick<Wallet, 'name' | 'icon' | 'color'>>,
): Promise<void> {
  const db = getDb();
  const sets: string[] = [];
  const params: (string | number)[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    params.push(normalizeWalletName(patch.name));
  }
  if (patch.icon !== undefined) {
    sets.push('icon = ?');
    params.push(patch.icon);
  }
  if (patch.color !== undefined) {
    sets.push('color = ?');
    params.push(patch.color);
  }
  if (!sets.length) return;
  params.push(id);
  await db.runAsync(`UPDATE wallets SET ${sets.join(', ')} WHERE id = ?;`, params);
}

export type NewWalletWithBalance = NewWallet & {
  /** saldo awal > 0 → dibuat sebagai transaksi tipe `initial` (tidak dihitung statistik) */
  initialAmount?: number;
};

/** Bikin dompet + saldo awal dalam SATU transaksi SQL. */
export async function createWalletWithBalance(input: NewWalletWithBalance): Promise<number> {
  const db = getDb();
  const name = normalizeWalletName(input.name);
  const initialAmount = Math.round(input.initialAmount ?? 0);
  let walletId = 0;
  await db.withTransactionAsync(async () => {
    walletId = await createWallet(db, { ...input, name });
    if (initialAmount > 0) {
      await db.runAsync(
        'INSERT INTO transactions (type, amount, category_id, wallet_id, date, note, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?);',
        ['initial', initialAmount, walletId, todayLocal(), 'Saldo awal', new Date().toISOString()],
      );
    }
  });
  return walletId;
}

/** Dompet default tidak boleh diarsipkan sebelum ada dompet default lain. */
export async function archiveWallet(id: number): Promise<void> {
  const db = getDb();
  const wallet = await db.getFirstAsync<Wallet>('SELECT * FROM wallets WHERE id = ?;', [id]);
  if (!wallet) throw new Error('Dompet tidak ditemukan.');
  if (wallet.is_default === 1) {
    const other = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM wallets WHERE is_default = 0 AND is_archived = 0;',
    );
    if ((other?.n ?? 0) === 0) {
      throw new Error('Tetapkan dompet lain sebagai default sebelum mengarsipkan dompet ini.');
    }
  }
  await db.runAsync('UPDATE wallets SET is_archived = 1, is_default = 0 WHERE id = ?;', [id]);
}

export async function setDefaultWallet(id: number): Promise<void> {
  const db = getDb();
  const target = await db.getFirstAsync<Wallet>('SELECT * FROM wallets WHERE id = ? AND is_archived = 0;', [id]);
  if (!target) throw new Error('Dompet tidak ditemukan atau sudah diarsipkan.');
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE wallets SET is_default = 0 WHERE is_default = 1;');
    await db.runAsync('UPDATE wallets SET is_default = 1 WHERE id = ?;', [id]);
  });
}

/** Aktifkan kembali dompet yang diarsipkan. */
export async function restoreWallet(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('UPDATE wallets SET is_archived = 0 WHERE id = ?;', [id]);
}
