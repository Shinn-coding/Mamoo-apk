/**
 * Migrasi skema. Tiap perubahan = satu langkah berurutan (index 0 = versi 1).
 * Nomor versi dibaca/ditulis lewat PRAGMA user_version.
 */
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'wallet',
    color TEXT NOT NULL DEFAULT '#00AB6B',
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'dots-horizontal',
    color TEXT NOT NULL DEFAULT '#64748B',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'initial')),
    amount INTEGER NOT NULL CHECK (amount >= 0),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    wallet_id INTEGER NOT NULL REFERENCES wallets(id),
    date TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    cycle_key TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    UNIQUE (category_id, cycle_key)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'piggy-bank',
    color TEXT NOT NULL DEFAULT '#00AB6B',
    target_amount INTEGER NOT NULL CHECK (target_amount >= 0),
    deadline TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'))
  );

  CREATE TABLE IF NOT EXISTS goal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    wallet_id INTEGER NOT NULL REFERENCES wallets(id),
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
    amount INTEGER NOT NULL CHECK (amount >= 0),
    date TEXT NOT NULL,
    note TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_goal_entries_goal ON goal_entries(goal_id);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('budget_cycle_start_day', '1');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('app_lock_enabled', '0');`,
];
