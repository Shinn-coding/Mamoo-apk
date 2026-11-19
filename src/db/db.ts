/**
 * Koneksi database lokal (expo-sqlite). Komponen UI tidak boleh menyentuh
 * SQL langsung — semua query lewat src/db/repositories/.
 *
 * Modul expo-sqlite di-import SAAT DIPAKAI (bukan di atas file) supaya
 * kalau app dibuka di browser, app tetap jalan dan menampilkan pesan ramah
 * alih-alih crash saat memuat modul native.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { MIGRATIONS } from './migrations';
import { seedIfEmpty } from './seed';

// NAMA FILE JANGAN DIUBAH: menyimpan data yang sudah ada di HP pengguna.
const DB_NAME = 'tabungin.db';

let connection: SQLiteDatabase | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

export class DatabaseError extends Error {}

/** Ambil modul expo-sqlite saat dibutuhkan. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
async function loadSQLiteModule() {
  return import('expo-sqlite');
}

export function getDb(): SQLiteDatabase {
  if (!connection) {
    throw new DatabaseError('Database belum siap. Panggil initDatabase() saat aplikasi dibuka.');
  }
  return connection;
}

/** Dipanggil sekali di root layout. Idempotent. */
export function initDatabase(): Promise<SQLiteDatabase> {
  if (!initPromise) {
    initPromise = openAndPrepare().catch((error) => {
      initPromise = null;
      connection = null;
      if (error instanceof DatabaseError) throw error;
      if (Platform.OS === 'web') {
        throw new DatabaseError(
          'Mamoo hanya jalan di aplikasi mobile. Buka lewat Expo Go di HP (exp://…:8081), bukan lewat browser.',
        );
      }
      throw new DatabaseError(
        `Gagal menyiapkan database lokal: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }
  return initPromise;
}

async function openAndPrepare(): Promise<SQLiteDatabase> {
  const SQLite = await loadSQLiteModule();
  const conn = await SQLite.openDatabaseAsync(DB_NAME, { useNewConnection: true });
  await conn.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(conn);
  await seedIfEmpty(conn);
  connection = conn;
  return conn;
}

async function runMigrations(conn: SQLiteDatabase): Promise<void> {
  const row = await conn.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let version = row?.user_version ?? 0;

  while (version < MIGRATIONS.length) {
    const script = MIGRATIONS[version];
    await conn.withTransactionAsync(async () => {
      await conn.execAsync(script);
    });
    version += 1;
    await conn.execAsync(`PRAGMA user_version = ${version};`);
  }
}

/** Untuk backup/restore (fase 5): menjalankan beberapa perintah dalam 1 transaksi. */
export async function runInTransaction<T>(work: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  const db = getDb();
  let result: T;
  await db.withTransactionAsync(async () => {
    result = await work(db);
  });
  return result!;
}
