/**
 * Koneksi database lokal (expo-sqlite). Komponen UI tidak boleh menyentuh
 * SQL langsung — semua query lewat src/db/repositories/.
 *
 * Sejak 1.2.0 database dienkripsi dengan SQLCipher. Kunci acak 32 byte
 * disimpan di expo-secure-store (dilindungi Android Keystore) dan tidak
 * pernah ikut backup. Database lama (plaintext) dimigrasikan otomatis
 * ke format terenkripsi saat pertama kali dibuka.
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
// KEY JANGAN DIUBAH: kunci yang sudah dipakai tidak akan cocok dengan database.
const DB_KEY_SECRET = 'tabungin.db_key';

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

/** Ambil kunci enkripsi dari SecureStore, atau buat baru kalau belum ada. */
async function getOrCreateDbKeyHex(): Promise<string> {
  const SecureStore = await import('expo-secure-store');
  const stored = await SecureStore.getItemAsync(DB_KEY_SECRET);
  if (stored && /^[0-9a-f]{64}$/i.test(stored)) return stored.toLowerCase();

  const Crypto = await import('expo-crypto');
  const bytes = Crypto.getRandomBytes(32);
  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  await SecureStore.setItemAsync(DB_KEY_SECRET, hex);
  return hex;
}

/**
 * Pasang kunci pada koneksi lalu uji dengan membaca skema.
 * False = file database bukan database terenkripsi dengan kunci ini
 * (mis. database lama yang masih plaintext).
 */
async function applyKey(conn: SQLiteDatabase, keyHex: string): Promise<boolean> {
  await conn.execAsync(`PRAGMA key = "x'${keyHex}'";`);
  try {
    await conn.getFirstAsync('SELECT count(*) AS total FROM sqlite_master;');
    return true;
  } catch {
    return false;
  }
}

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

/**
 * Migrasi database plaintext (versi <= 1.1.2) menjadi terenkripsi.
 * Salinan asli disimpan sebagai `tabungin.db.plain.bak`; kalau gagal,
 * file asli dikembalikan supaya data pengguna tidak hilang.
 */
async function encryptExistingDatabase(
  SQLite: typeof import('expo-sqlite'),
  dbPath: string,
  keyHex: string,
): Promise<void> {
  const FS = await import('expo-file-system/legacy');
  const plainUri = toFileUri(dbPath);
  const encPath = `${dbPath}.enc`;
  const encUri = toFileUri(encPath);
  const backupPath = `${dbPath}.plain.bak`;
  const backupUri = toFileUri(backupPath);

  const info = await FS.getInfoAsync(plainUri);
  if (!info.exists) return;

  await FS.deleteAsync(encUri, { idempotent: true });

  const plain = await SQLite.openDatabaseAsync(DB_NAME, { useNewConnection: true });
  try {
    await plain.execAsync(`ATTACH DATABASE '${encPath}' AS encrypted KEY "x'${keyHex}'";`);
    await plain.execAsync("SELECT sqlcipher_export('encrypted');");
    await plain.execAsync('DETACH DATABASE encrypted;');
  } finally {
    await plain.closeAsync();
  }

  // WAL/SHM lama tidak boleh terbawa ke file terenkripsi.
  await FS.deleteAsync(toFileUri(`${dbPath}-wal`), { idempotent: true });
  await FS.deleteAsync(toFileUri(`${dbPath}-shm`), { idempotent: true });

  await FS.deleteAsync(backupUri, { idempotent: true });
  await FS.moveAsync({ from: plainUri, to: backupUri });
  try {
    await FS.moveAsync({ from: encUri, to: plainUri });
  } catch (error) {
    await FS.moveAsync({ from: backupUri, to: plainUri });
    throw error;
  }
}

async function openAndPrepare(): Promise<SQLiteDatabase> {
  const SQLite = await loadSQLiteModule();

  // Web (SQLite WASM) tidak mendukung SQLCipher — tetap pakai mode lama.
  if (Platform.OS === 'web') {
    const conn = await SQLite.openDatabaseAsync(DB_NAME, { useNewConnection: true });
    await conn.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(conn);
    await seedIfEmpty(conn);
    connection = conn;
    return conn;
  }

  const keyHex = await getOrCreateDbKeyHex();

  let conn = await SQLite.openDatabaseAsync(DB_NAME, { useNewConnection: true });
  if (!(await applyKey(conn, keyHex))) {
    const dbPath = conn.databasePath;
    await conn.closeAsync();
    await encryptExistingDatabase(SQLite, dbPath, keyHex);

    conn = await SQLite.openDatabaseAsync(DB_NAME, { useNewConnection: true });
    if (!(await applyKey(conn, keyHex))) {
      await conn.closeAsync();
      throw new DatabaseError(
        'Database tidak bisa dibuka. Kunci enkripsi di perangkat ini tidak cocok dengan file database.',
      );
    }
  }

  await conn.execAsync('PRAGMA foreign_keys = ON;');

  // Pengaman: pastikan build benar-benar memakai SQLCipher. Kalau flag Gradle
  // gagal diterapkan, database akan diam-diam plaintext — beri peringatan jelas.
  const cipher = await conn
    .getFirstAsync<{ cipher_version?: string }>('PRAGMA cipher_version;')
    .catch(() => null);
  if (!cipher?.cipher_version) {
    console.warn(
      '[mamoo] SQLCipher tidak aktif pada build ini — database TIDAK terenkripsi. ' +
        'Pastikan plugin ./plugins/with-sqlcipher ikut saat prebuild.',
    );
  }

  // Database sudah bisa dibuka dengan kunci → salinan plaintext sisa migrasi
  // tidak boleh dibiarkan di penyimpanan.
  await removePlaintextBackup(conn.databasePath);

  await runMigrations(conn);
  await seedIfEmpty(conn);
  connection = conn;
  return conn;
}

/** Hapus `tabungin.db.plain.bak` (salinan plaintext saat migrasi). Aman dipanggil kapan saja. */
async function removePlaintextBackup(dbPath: string): Promise<void> {
  try {
    const FS = await import('expo-file-system/legacy');
    await FS.deleteAsync(toFileUri(`${dbPath}.plain.bak`), { idempotent: true });
  } catch {
    // Gagal hapus bukan alasan menggagalkan startup.
  }
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