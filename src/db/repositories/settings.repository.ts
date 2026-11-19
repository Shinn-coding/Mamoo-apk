/** Repository tabel `settings` (konfigurasi lokal, bukan PIN). */
import { getDb } from '../db';
import { PROFILE_NAME_MAX } from '../../constants/profile';
import { clampCycleStartDay } from '../../utils/date';

export type AppSettings = {
  /** tanggal mulai siklus anggaran: 1–28 */
  budgetCycleStartDay: number;
  appLockEnabled: boolean;
  biometricEnabled: boolean;
  /** nama pemilik HP — bagian dari identitas perangkat, bukan akun */
  profileName: string;
  /** versi/nama file foto profil; kosong = belum ada foto */
  profileAvatarVersion: string;
};

export async function getSettings(): Promise<AppSettings> {
  const db = getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings;');
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    budgetCycleStartDay: clampCycleStartDay(Number(map.get('budget_cycle_start_day') ?? '1')),
    appLockEnabled: (map.get('app_lock_enabled') ?? '0') === '1',
    biometricEnabled: (map.get('app_biometric_enabled') ?? '0') === '1',
    profileName: (map.get('profile_name') ?? '').slice(0, PROFILE_NAME_MAX),
    profileAvatarVersion: map.get('profile_avatar_version') ?? '',
  };
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
    [key, value],
  );
}

export async function setBudgetCycleStartDay(day: number): Promise<void> {
  await setSetting('budget_cycle_start_day', String(clampCycleStartDay(day)));
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await setSetting('app_lock_enabled', enabled ? '1' : '0');
}

export async function setAppBiometricEnabled(enabled: boolean): Promise<void> {
  await setSetting('app_biometric_enabled', enabled ? '1' : '0');
}

export async function setProfileName(name: string): Promise<void> {
  await setSetting('profile_name', name.slice(0, PROFILE_NAME_MAX));
}

export async function setProfileAvatarVersion(version: string): Promise<void> {
  await setSetting('profile_avatar_version', version);
}
