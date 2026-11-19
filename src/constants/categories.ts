/** Seed kategori default. Pengguna bisa mengubahnya setelah aplikasi jalan. */
import type { IconName } from './icons';

export type CategoryType = 'expense' | 'income';

export type CategorySeed = {
  type: CategoryType;
  name: string;
  icon: IconName;
  color: string;
};

export const DEFAULT_EXPENSE_CATEGORIES: CategorySeed[] = [
  { type: 'expense', name: 'Makan', icon: 'food', color: '#F97316' },
  { type: 'expense', name: 'Transportasi', icon: 'bus', color: '#2F6FED' },
  { type: 'expense', name: 'Belanja', icon: 'shopping', color: '#EC4899' },
  { type: 'expense', name: 'Hiburan', icon: 'gamepad-variant', color: '#8B5CF6' },
  { type: 'expense', name: 'Tagihan', icon: 'receipt', color: '#6B7280' },
  { type: 'expense', name: 'Kesehatan', icon: 'heart-pulse', color: '#E5484D' },
  { type: 'expense', name: 'Pendidikan', icon: 'school', color: '#06B6D4' },
  { type: 'expense', name: 'Pergi/Liburan', icon: 'airplane', color: '#12B5A5' },
  { type: 'expense', name: 'Lainnya', icon: 'dots-horizontal', color: '#64748B' },
];

export const DEFAULT_INCOME_CATEGORIES: CategorySeed[] = [
  { type: 'income', name: 'Gaji', icon: 'briefcase', color: '#00AB6B' },
  { type: 'income', name: 'Uang Saku', icon: 'hand-coin', color: '#F59E0B' },
  { type: 'income', name: 'Bonus', icon: 'gift', color: '#8B5CF6' },
  { type: 'income', name: 'Lainnya', icon: 'dots-horizontal', color: '#64748B' },
];

export const DEFAULT_CATEGORIES: CategorySeed[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

/** Dompet default: Tunai (default), Bank, E-Wallet. */
export const DEFAULT_WALLETS = [
  { name: 'Tunai', icon: 'cash', color: '#00AB6B', is_default: 1 },
  { name: 'Bank', icon: 'credit-card', color: '#2F6FED', is_default: 0 },
  { name: 'E-Wallet', icon: 'wallet', color: '#8B5CF6', is_default: 0 },
] as const;
