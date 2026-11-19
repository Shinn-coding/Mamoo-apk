/** State global aplikasi (Zustand) — data ringan, bukan pengganti SQLite. */
import { create } from 'zustand';

import { initDatabase } from '../db/db';
import {
  getSettings,
  setBudgetCycleStartDay,
  setAppLockEnabled,
  setAppBiometricEnabled,
  setProfileName,
  type AppSettings,
} from '../db/repositories/settings.repository';
import { PROFILE_NAME_MAX } from '../constants/profile';
import { clampCycleStartDay } from '../utils/date';

type AppState = {
  /** true setelah DB siap + seed selesai */
  ready: boolean;
  /** pesan error setup yang bisa ditampilkan UI */
  initError: string | null;
  settings: AppSettings;
  init: () => Promise<void>;
  changeCycleStartDay: (day: number) => Promise<void>;
  changeAppLock: (enabled: boolean) => Promise<void>;
  changeAppBiometric: (enabled: boolean) => Promise<void>;
  changeProfileName: (name: string) => Promise<void>;
  /** muat ulang settings dari DB (setelah restore/reset) */
  refreshSettings: () => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  initError: null,
  settings: {
    budgetCycleStartDay: 1,
    appLockEnabled: false,
    biometricEnabled: false,
    profileName: '',
    profileAvatarVersion: '',
  },

  init: async () => {
    if (get().ready) return;
    try {
      await initDatabase();
      const settings = await getSettings();
      set({ ready: true, initError: null, settings });
    } catch (error) {
      set({
        ready: false,
        initError: error instanceof Error ? error.message : 'Gagal menyiapkan database.',
      });
    }
  },

  changeCycleStartDay: async (day) => {
    const clamped = clampCycleStartDay(day);
    await setBudgetCycleStartDay(clamped);
    set({ settings: { ...get().settings, budgetCycleStartDay: clamped } });
  },

  changeAppLock: async (enabled) => {
    await setAppLockEnabled(enabled);
    set({ settings: { ...get().settings, appLockEnabled: enabled } });
  },

  changeAppBiometric: async (enabled) => {
    await setAppBiometricEnabled(enabled);
    set({ settings: { ...get().settings, biometricEnabled: enabled } });
  },

  changeProfileName: async (name) => {
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, PROFILE_NAME_MAX);
    await setProfileName(clean);
    set({ settings: { ...get().settings, profileName: clean } });
  },

  refreshSettings: async () => {
    const settings = await getSettings();
    set({ settings });
  },
}));
