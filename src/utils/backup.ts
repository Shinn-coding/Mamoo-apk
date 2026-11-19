/** Tipe & validasi file backup JSON (fase 5). Tidak ada SQL di sini. */
import type {
  Budget,
  Category,
  Goal,
  GoalEntry,
  Transaction,
  Wallet,
} from '../db/types';

export const BACKUP_FORMAT = 1;

export type BackupPayload = {
  app: 'mamoo';
  format: typeof BACKUP_FORMAT;
  /** versi skema SQLite (PRAGMA user_version) saat backup dibuat */
  schema_version: number;
  /** timestamp ISO 8601 — hanya created_at/metadata yang boleh ISO */
  exported_at: string;
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  goal_entries: GoalEntry[];
  /** tanpa kunci aplikasi: flag lock & biometrik tidak ikut backup */
  settings: { budget_cycle_start_day: number };
};

export const BACKUP_FILE_PREFIX = 'mamoo-backup';

/** Validasi ketat isi file backup; lempar Error berbahasa Indonesia kalau salah. */
export function validateBackupPayload(value: unknown): BackupPayload {
  if (typeof value !== 'object' || value === null) {
    throw new Error('File backup tidak valid (bukan objek JSON).');
  }
  const obj = value as Record<string, unknown>;
  if (obj.app !== 'mamoo' && obj.app !== 'tabungin') {
    throw new Error('File ini bukan backup Mamoo.');
  }
  if (obj.format !== BACKUP_FORMAT) {
    throw new Error('Versi format backup tidak didukung. Update aplikasinya atau pakai backup versi terbaru.');
  }
  if (typeof obj.exported_at !== 'string') {
    throw new Error('File backup tidak valid (tanggal ekspor hilang).');
  }
  const wallets = asArray(obj.wallets, 'dompet').map(asWallet);
  const categories = asArray(obj.categories, 'kategori').map(asCategory);
  const transactions = asArray(obj.transactions, 'transaksi').map(asTransaction);
  const budgets = asArray(obj.budgets, 'anggaran').map(asBudget);
  const goals = asArray(obj.goals, 'tabungan').map(asGoal);
  const goalEntries = asArray(obj.goal_entries, 'riwayat tabungan').map(asGoalEntry);
  const cycleDay = readCycleDay(obj.settings);

  return {
    app: 'mamoo',
    format: BACKUP_FORMAT,
    schema_version: typeof obj.schema_version === 'number' ? obj.schema_version : 0,
    exported_at: obj.exported_at,
    wallets,
    categories,
    transactions,
    budgets,
    goals,
    goal_entries: goalEntries,
    settings: { budget_cycle_start_day: cycleDay },
  };
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Data ${label} di backup tidak valid.`);
  }
  return value;
}

function readCycleDay(value: unknown): number {
  const day = (value as { budget_cycle_start_day?: unknown } | undefined)?.budget_cycle_start_day;
  const num = typeof day === 'number' ? day : 1;
  return Math.min(Math.max(Math.round(num), 1), 28);
}

function asId(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`ID ${label} di backup tidak valid.`);
  }
  return value;
}

function asText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Kolom ${label} di backup tidak valid.`);
  }
  return value;
}

function asOptionalText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asFlag(value: unknown): 0 | 1 {
  return value === 1 ? 1 : 0;
}

function asLocalDate(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Tanggal ${label} di backup tidak valid.`);
  }
  return value;
}

function asAmount(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Nominal ${label} di backup tidak valid.`);
  }
  return Math.round(value);
}

function asWallet(row: unknown): Wallet {
  const r = asRow(row, 'dompet');
  return {
    id: asId(r.id, 'dompet'),
    name: asText(r.name, 'nama dompet'),
    icon: typeof r.icon === 'string' ? r.icon : 'wallet',
    color: typeof r.color === 'string' ? r.color : '#00AB6B',
    is_default: asFlag(r.is_default),
    is_archived: asFlag(r.is_archived),
  };
}

function asCategory(row: unknown): Category {
  const r = asRow(row, 'kategori');
  const type = r.type;
  if (type !== 'expense' && type !== 'income') {
    throw new Error('Tipe kategori di backup tidak valid.');
  }
  return {
    id: asId(r.id, 'kategori'),
    type,
    name: asText(r.name, 'nama kategori'),
    icon: typeof r.icon === 'string' ? r.icon : 'dots-horizontal',
    color: typeof r.color === 'string' ? r.color : '#64748B',
    sort_order: typeof r.sort_order === 'number' ? r.sort_order : 0,
    is_archived: asFlag(r.is_archived),
  };
}

function asTransaction(row: unknown): Transaction {
  const r = asRow(row, 'transaksi');
  const type = r.type;
  if (type !== 'expense' && type !== 'income' && type !== 'initial') {
    throw new Error('Tipe transaksi di backup tidak valid.');
  }
  return {
    id: asId(r.id, 'transaksi'),
    type,
    amount: asAmount(r.amount, 'transaksi'),
    category_id: typeof r.category_id === 'number' ? r.category_id : null,
    wallet_id: asId(r.wallet_id, 'dompet transaksi'),
    date: asLocalDate(r.date, 'transaksi'),
    note: asOptionalText(r.note),
    created_at: typeof r.created_at === 'string' ? r.created_at : '',
  };
}

function asBudget(row: unknown): Budget {
  const r = asRow(row, 'anggaran');
  if (typeof r.cycle_key !== 'string' || !/^\d{4}-\d{2}$/.test(r.cycle_key)) {
    throw new Error('Siklus anggaran di backup tidak valid.');
  }
  return {
    id: asId(r.id, 'anggaran'),
    category_id: asId(r.category_id, 'kategori anggaran'),
    cycle_key: r.cycle_key,
    amount: asAmount(r.amount, 'anggaran'),
  };
}

function asGoal(row: unknown): Goal {
  const r = asRow(row, 'tabungan');
  const status = r.status;
  if (status !== 'active' && status !== 'completed' && status !== 'cancelled') {
    throw new Error('Status tabungan di backup tidak valid.');
  }
  return {
    id: asId(r.id, 'tabungan'),
    name: asText(r.name, 'nama tabungan'),
    icon: typeof r.icon === 'string' ? r.icon : 'piggy-bank',
    color: typeof r.color === 'string' ? r.color : '#00AB6B',
    target_amount: asAmount(r.target_amount, 'target tabungan'),
    deadline: r.deadline == null ? null : asLocalDate(r.deadline, 'tenggat tabungan'),
    status,
  };
}

function asGoalEntry(row: unknown): GoalEntry {
  const r = asRow(row, 'riwayat tabungan');
  const type = r.type;
  if (type !== 'deposit' && type !== 'withdraw') {
    throw new Error('Tipe setoran di backup tidak valid.');
  }
  return {
    id: asId(r.id, 'riwayat tabungan'),
    goal_id: asId(r.goal_id, 'tabungan'),
    wallet_id: asId(r.wallet_id, 'dompet'),
    type,
    amount: asAmount(r.amount, 'setoran'),
    date: asLocalDate(r.date, 'setoran'),
    note: asOptionalText(r.note),
  };
}

function asRow(row: unknown, label: string): Record<string, unknown> {
  if (typeof row !== 'object' || row === null) {
    throw new Error(`Data ${label} di backup tidak valid.`);
  }
  return row as Record<string, unknown>;
}
