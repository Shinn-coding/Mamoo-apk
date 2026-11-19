/**
 * Repository target tabungan (tabel `goals` + `goal_entries`).
 * Setoran TIDAK memindahkan uang — hanya mengunci saldo dompet terpilih.
 */
import type { Goal, GoalEntry, GoalStatus } from '../types';
import { getDb } from '../db';

export type NewGoal = {
  name: string;
  icon: string;
  color: string;
  target_amount: number;
  deadline?: string | null;
};

export type GoalWithSaved = Goal & {
  /** setoran − penarikan */
  saved: number;
};

function assertAmount(amount: number, message: string): number {
  const rounded = Math.round(amount);
  if (!Number.isFinite(rounded) || rounded <= 0) throw new Error(message);
  return rounded;
}

/** Semua target + terkumpul. */
export async function listGoals(includeInactive = false): Promise<GoalWithSaved[]> {
  const db = getDb();
  const where = includeInactive ? '' : "WHERE g.status = 'active'";
  const rows = await db.getAllAsync<Goal & { saved: number }>(
    `SELECT g.*, COALESCE((
       SELECT SUM(CASE WHEN e.type = 'deposit' THEN e.amount ELSE -e.amount END)
       FROM goal_entries e WHERE e.goal_id = g.id
     ), 0) AS saved
     FROM goals g ${where}
     ORDER BY CASE WHEN g.status = 'active' THEN 0 ELSE 1 END, g.id ASC;`,
  );
  return rows;
}

export async function getGoalWithSaved(id: number): Promise<GoalWithSaved | null> {
  const db = getDb();
  const row = await db.getFirstAsync<Goal & { saved: number }>(
    `SELECT g.*, COALESCE((
       SELECT SUM(CASE WHEN e.type = 'deposit' THEN e.amount ELSE -e.amount END)
       FROM goal_entries e WHERE e.goal_id = g.id
     ), 0) AS saved
     FROM goals g WHERE g.id = ?;`,
    [id],
  );
  return row ?? null;
}

export async function createGoal(input: NewGoal): Promise<number> {
  const target = assertAmount(input.target_amount, 'Nominal target harus lebih dari Rp 0.');
  const name = input.name.trim();
  if (!name) throw new Error('Nama target tidak boleh kosong.');
  const db = getDb();
  const result = await db.runAsync(
    'INSERT INTO goals (name, icon, color, target_amount, deadline, status) VALUES (?, ?, ?, ?, ?, ?);',
    [name, input.icon, input.color, target, input.deadline ?? null, 'active'],
  );
  return result.lastInsertRowId;
}

export async function updateGoal(
  id: number,
  patch: Partial<Pick<Goal, 'name' | 'icon' | 'color' | 'target_amount' | 'deadline'>>,
): Promise<void> {
  const db = getDb();
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) throw new Error('Nama target tidak boleh kosong.');
    sets.push('name = ?');
    params.push(name);
  }
  if (patch.icon !== undefined) {
    sets.push('icon = ?');
    params.push(patch.icon);
  }
  if (patch.color !== undefined) {
    sets.push('color = ?');
    params.push(patch.color);
  }
  if (patch.target_amount !== undefined) {
    sets.push('target_amount = ?');
    params.push(assertAmount(patch.target_amount, 'Nominal target harus lebih dari Rp 0.'));
  }
  if (patch.deadline !== undefined) {
    sets.push('deadline = ?');
    params.push(patch.deadline);
  }
  if (!sets.length) return;
  params.push(id);
  await db.runAsync(`UPDATE goals SET ${sets.join(', ')} WHERE id = ?;`, params);
}

/** Tandai selesai / batalkan → melepas dana yang terkunci (status bukan active). */
export async function setGoalStatus(id: number, status: GoalStatus): Promise<void> {
  const db = getDb();
  await db.runAsync('UPDATE goals SET status = ? WHERE id = ?;', [status, id]);
}

export async function deleteGoal(id: number): Promise<void> {
  const db = getDb();
  // goal_entries ikut terhapus via ON DELETE CASCADE
  await db.runAsync('DELETE FROM goals WHERE id = ?;', [id]);
}

/** Dana terkunci per dompet oleh target yang masih aktif. */
export async function lockedByWallet(): Promise<Record<number, number>> {
  const db = getDb();
  const rows = await db.getAllAsync<{ wallet_id: number; locked: number }>(
    `SELECT e.wallet_id, COALESCE(SUM(CASE WHEN e.type = 'deposit' THEN e.amount ELSE -e.amount END), 0) AS locked
     FROM goal_entries e JOIN goals g ON g.id = e.goal_id
     WHERE g.status = 'active'
     GROUP BY e.wallet_id;`,
  );
  return Object.fromEntries(rows.map((row) => [row.wallet_id, row.locked]));
}

/** Total dana terkunci semua target aktif. */
export async function lockedTotal(): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ locked: number }>(
    `SELECT COALESCE(SUM(CASE WHEN e.type = 'deposit' THEN e.amount ELSE -e.amount END), 0) AS locked
     FROM goal_entries e JOIN goals g ON g.id = e.goal_id
     WHERE g.status = 'active';`,
  );
  return row?.locked ?? 0;
}

export type GoalEntryInput = {
  goal_id: number;
  wallet_id: number;
  type: 'deposit' | 'withdraw';
  amount: number;
  date: string;
  note?: string | null;
};

/** Setor / tarik dengan aturan: setoran ≤ saldo bebas dompet; tarik ≤ dana target. */
export async function addGoalEntry(input: GoalEntryInput): Promise<number> {
  const amount = assertAmount(
    input.amount,
    input.type === 'deposit' ? 'Nominal setoran harus lebih dari Rp 0.' : 'Nominal penarikan harus lebih dari Rp 0.',
  );
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Tanggal tidak valid.');
  const db = getDb();
  const goal = await getGoalWithSaved(input.goal_id);
  if (!goal) throw new Error('Target tidak ditemukan.');
  if (goal.status !== 'active') throw new Error('Target sudah tidak aktif.');

  if (input.type === 'deposit') {
    const balances = await db.getAllAsync<{ balance: number }>(
      `SELECT COALESCE(SUM(CASE WHEN type = 'expense' THEN -amount ELSE amount END), 0) AS balance
       FROM transactions WHERE wallet_id = ?;`,
      [input.wallet_id],
    );
    const lockedRows = await db.getAllAsync<{ locked: number }>(
      `SELECT COALESCE(SUM(CASE WHEN e.type = 'deposit' THEN e.amount ELSE -e.amount END), 0) AS locked
       FROM goal_entries e JOIN goals g ON g.id = e.goal_id
       WHERE g.status = 'active' AND e.wallet_id = ?;`,
      [input.wallet_id],
    );
    const free = (balances[0]?.balance ?? 0) - (lockedRows[0]?.locked ?? 0);
    if (amount > free) {
      throw new Error('Setoran melebihi saldo bebas dompet ini. Kurangi nominal atau tarik dulu dari target lain.');
    }
  } else {
    if (amount > goal.saved) {
      throw new Error('Penarikan tidak boleh melebihi dana yang terkumpul di target ini.');
    }
  }

  const result = await db.runAsync(
    'INSERT INTO goal_entries (goal_id, wallet_id, type, amount, date, note) VALUES (?, ?, ?, ?, ?, ?);',
    [input.goal_id, input.wallet_id, input.type, amount, input.date, input.note?.trim() ? input.note.trim() : null],
  );
  return result.lastInsertRowId;
}

/** Riwayat setoran/tarik satu target, terbaru dulu. */
export async function listGoalEntries(goalId: number): Promise<GoalEntry[]> {
  const db = getDb();
  return db.getAllAsync<GoalEntry>(
    'SELECT * FROM goal_entries WHERE goal_id = ? ORDER BY date DESC, id DESC;',
    [goalId],
  );
}
