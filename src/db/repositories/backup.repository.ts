/**
 * Repository backup/restore/reset seluruh data (fase 5).
 * Restore & reset berjalan dalam 1 transaksi SQL supaya data tidak
 * tertinggal setengah kalau terjadi error di tengah jalan.
 */
import { getDb, runInTransaction } from '../db';
import { seedIfEmpty } from '../seed';
import { deleteProfilePhotoFiles } from '../../utils/profile';
import type { BackupPayload } from '../../utils/backup';

const TABLES = [
  'goal_entries',
  'budgets',
  'transactions',
  'goals',
  'categories',
  'wallets',
  'settings',
] as const;

type SettingRow = { key: string; value: string };

/** Versi skema SQLite saat ini (PRAGMA user_version). */
async function getSchemaVersion(): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  return row?.user_version ?? 0;
}

/** Ambil seluruh data untuk file backup. Kunci aplikasi & profil TIDAK ikut. */
export async function exportBackup(): Promise<BackupPayload> {
  const db = getDb();
  const [wallets, categories, transactions, budgets, goals, goalEntries, settingsRows, schemaVersion] =
    await Promise.all([
      db.getAllAsync<BackupPayload['wallets'][number]>('SELECT * FROM wallets ORDER BY id;'),
      db.getAllAsync<BackupPayload['categories'][number]>('SELECT * FROM categories ORDER BY id;'),
      db.getAllAsync<BackupPayload['transactions'][number]>('SELECT * FROM transactions ORDER BY id;'),
      db.getAllAsync<BackupPayload['budgets'][number]>('SELECT * FROM budgets ORDER BY id;'),
      db.getAllAsync<BackupPayload['goals'][number]>('SELECT * FROM goals ORDER BY id;'),
      db.getAllAsync<BackupPayload['goal_entries'][number]>('SELECT * FROM goal_entries ORDER BY id;'),
      db.getAllAsync<SettingRow>('SELECT key, value FROM settings;'),
      getSchemaVersion(),
    ]);

  const cycleDay = Number(
    settingsRows.find((row) => row.key === 'budget_cycle_start_day')?.value ?? '1',
  );
  return {
    app: 'mamoo',
    format: 1,
    schema_version: schemaVersion,
    exported_at: new Date().toISOString(),
    wallets,
    categories,
    transactions,
    budgets,
    goals,
    goal_entries: goalEntries,
    settings: {
      budget_cycle_start_day: Math.min(Math.max(Math.round(cycleDay), 1), 28),
    },
  };
}

/** Kosongkan semua tabel lalu isi ulang dari backup (id asli dipertahankan). */
export async function restoreBackup(payload: BackupPayload): Promise<void> {
  await runInTransaction(async (db) => {
    // Kunci aplikasi & profil tetap milik perangkat ini — tidak ditimpa backup.
    const lockRow = await db.getFirstAsync<SettingRow>(
      "SELECT key, value FROM settings WHERE key = 'app_lock_enabled';",
    );
    const biometricRow = await db.getFirstAsync<SettingRow>(
      "SELECT key, value FROM settings WHERE key = 'app_biometric_enabled';",
    );
    // Profil adalah identitas perangkat ini (seperti PIN), bukan isi backup.
    const profileNameRow = await db.getFirstAsync<SettingRow>(
      "SELECT key, value FROM settings WHERE key = 'profile_name';",
    );
    const profileAvatarRow = await db.getFirstAsync<SettingRow>(
      "SELECT key, value FROM settings WHERE key = 'profile_avatar_version';",
    );
    const themeModeRow = await db.getFirstAsync<SettingRow>(
      "SELECT key, value FROM settings WHERE key = 'theme_mode';",
    );

    for (const table of TABLES) {
      await db.runAsync(`DELETE FROM ${table};`);
    }

    for (const row of payload.wallets) {
      await db.runAsync(
        'INSERT INTO wallets (id, name, icon, color, is_default, is_archived) VALUES (?, ?, ?, ?, ?, ?);',
        [row.id, row.name, row.icon, row.color, row.is_default, row.is_archived],
      );
    }
    for (const row of payload.categories) {
      await db.runAsync(
        'INSERT INTO categories (id, type, name, icon, color, sort_order, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [row.id, row.type, row.name, row.icon, row.color, row.sort_order, row.is_archived],
      );
    }
    for (const row of payload.goals) {
      await db.runAsync(
        'INSERT INTO goals (id, name, icon, color, target_amount, deadline, status) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [row.id, row.name, row.icon, row.color, row.target_amount, row.deadline, row.status],
      );
    }
    for (const row of payload.transactions) {
      await db.runAsync(
        'INSERT INTO transactions (id, type, amount, category_id, wallet_id, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
        [row.id, row.type, row.amount, row.category_id, row.wallet_id, row.date, row.note, row.created_at],
      );
    }
    for (const row of payload.budgets) {
      await db.runAsync(
        'INSERT INTO budgets (id, category_id, cycle_key, amount) VALUES (?, ?, ?, ?);',
        [row.id, row.category_id, row.cycle_key, row.amount],
      );
    }
    for (const row of payload.goal_entries) {
      await db.runAsync(
        'INSERT INTO goal_entries (id, goal_id, wallet_id, type, amount, date, note) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [row.id, row.goal_id, row.wallet_id, row.type, row.amount, row.date, row.note],
      );
    }
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES ('budget_cycle_start_day', ?);",
      [String(payload.settings.budget_cycle_start_day)],
    );
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES ('app_lock_enabled', ?);",
      [lockRow?.value ?? '0'],
    );
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES ('app_biometric_enabled', ?);",
      [biometricRow?.value ?? '0'],
    );
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES ('theme_mode', ?);",
      [themeModeRow?.value ?? 'system'],
    );
    if (profileNameRow) {
      await db.runAsync(
        "INSERT INTO settings (key, value) VALUES ('profile_name', ?);",
        [profileNameRow.value],
      );
    }
    if (profileAvatarRow) {
      await db.runAsync(
        "INSERT INTO settings (key, value) VALUES ('profile_avatar_version', ?);",
        [profileAvatarRow.value],
      );
    }

    // Sinkronkan counter AUTOINCREMENT dengan id hasil restore.
    for (const table of ['wallets', 'categories', 'transactions', 'budgets', 'goals', 'goal_entries']) {
      await db.runAsync(
        `UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM ${table}) WHERE name = ?;`,
        [table],
      );
    }
  });
}

/** Hapus semua data, kembalikan pengaturan awal, lalu seed dompet & kategori default. */
export async function resetAllData(): Promise<void> {
  await runInTransaction(async (db) => {
    for (const table of TABLES) {
      await db.runAsync(`DELETE FROM ${table};`);
    }
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('budget_cycle_start_day', '1');");
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('app_lock_enabled', '0');");
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('app_biometric_enabled', '0');");
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('theme_mode', 'system');");
  });
  await deleteProfilePhotoFiles();
  await seedIfEmpty(getDb());
}
