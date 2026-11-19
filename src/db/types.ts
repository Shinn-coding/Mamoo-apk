/** Tipe data yang dipakai UI & repositories. Tidak ada SQL di sini. */

export type TransactionType = 'expense' | 'income' | 'initial';

export type Wallet = {
  id: number;
  name: string;
  icon: string;
  color: string;
  is_default: 0 | 1;
  is_archived: 0 | 1;
};

export type CategoryType = 'expense' | 'income';

export type Category = {
  id: number;
  type: CategoryType;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  is_archived: 0 | 1;
};

export type Transaction = {
  id: number;
  type: TransactionType;
  amount: number;
  category_id: number | null;
  wallet_id: number;
  /** tanggal lokal "YYYY-MM-DD" */
  date: string;
  note: string | null;
  created_at: string;
};

export type Budget = {
  id: number;
  category_id: number;
  /** "YYYY-MM" dari bulan tempat siklus dimulai */
  cycle_key: string;
  amount: number;
};

export type GoalStatus = 'active' | 'completed' | 'cancelled';

export type Goal = {
  id: number;
  name: string;
  icon: string;
  color: string;
  target_amount: number;
  deadline: string | null;
  status: GoalStatus;
};

export type GoalEntryType = 'deposit' | 'withdraw';

export type GoalEntry = {
  id: number;
  goal_id: number;
  wallet_id: number;
  type: GoalEntryType;
  amount: number;
  date: string;
  note: string | null;
};
