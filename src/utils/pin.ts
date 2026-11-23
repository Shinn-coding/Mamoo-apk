/**
 * Kunci aplikasi: hash PIN disimpan di expo-secure-store,
 * BUKAN di SQLite dan tidak pernah ikut backup. Panjang PIN juga disimpan
 * di SecureStore supaya layar kunci bisa menampilkan jumlah bubble yang tepat.
 *
 * Format hash (v2 — PBKDF2-HMAC-SHA256):
 *   pbkdf2-sha256$<iterasi>$<saltHex>$<hashHex>
 *
 * Hash lama (v1 — SHA-256 + pepper statis) tetap bisa diverifikasi, lalu
 * otomatis ditingkatkan ke v2 saat PIN berhasil dimasukkan.
 */
// KEY & pepper JANGAN DIUBAH: hash PIN yang sudah tersimpan akan gagal diverifikasi.
const PIN_HASH_KEY = 'tabungin.pin_hash';
const PIN_LENGTH_KEY = 'tabungin.pin_length';
const PIN_FAIL_KEY = 'tabungin.pin_fail_count';
const PIN_LOCKED_UNTIL_KEY = 'tabungin.pin_locked_until';

export const MIN_PIN_LENGTH = 4;
export const MAX_PIN_LENGTH = 6;
export const MAX_PIN_FAILURES = 5;
export const PIN_COOLDOWN_MS = 30_000;
export const MAX_BIOMETRIC_ATTEMPTS = 3;

/** Parameter KDF v2. */
const KDF_NAME = 'pbkdf2-sha256';
const KDF_ITERATIONS = 120_000;
const KDF_KEYLEN = 32;
const KDF_SALT_BYTES = 16;

/** Perbandingan waktu-konstan untuk string berformat hex. */
function timingSafeEqualText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Turunkan hash PBKDF2 lewat native (OpenSSL).
 * Mengembalikan null kalau modul native tidak tersedia (mis. Expo Go),
 * supaya aplikasi tidak crash dan bisa memakai jalur lama.
 */
async function derivePbkdf2(
  pin: string,
  saltHex: string,
  iterations: number,
): Promise<string | null> {
  try {
    const { pbkdf2Sync } = await import('react-native-quick-crypto');
    return pbkdf2Sync(pin, saltHex, iterations, KDF_KEYLEN, 'sha256').toString('hex');
  } catch {
    return null;
  }
}

/** Hash lama (v1): SHA-256 dari PIN + pepper tetap. */
async function legacyHash(pin: string): Promise<string> {
  const Crypto = await import('expo-crypto');
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `tabungin:${pin}`);
}

/** Salt acak 16 byte sebagai hex. */
async function randomSaltHex(): Promise<string> {
  try {
    const { randomBytes } = await import('react-native-quick-crypto');
    return randomBytes(KDF_SALT_BYTES).toString('hex');
  } catch {
    // Expo Go / tanpa modul native: pakai generator bawaan Expo.
    const Crypto = await import('expo-crypto');
    return Array.from(Crypto.getRandomBytes(KDF_SALT_BYTES))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}

type ParsedHash = { iterations: number; saltHex: string; hashHex: string };

function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== KDF_NAME) return null;
  const iterations = Number(parts[1]);
  const saltHex = parts[2];
  const hashHex = parts[3];
  if (!Number.isInteger(iterations) || iterations < 10_000) return null;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return null;
  return { iterations, saltHex, hashHex };
}

/** Hash PIN baru. Fallback ke v1 hanya kalau native PBKDF2 tidak tersedia. */
async function hashPin(pin: string): Promise<string> {
  const saltHex = await randomSaltHex();
  const derived = await derivePbkdf2(pin, saltHex, KDF_ITERATIONS);
  if (!derived) return legacyHash(pin);
  return `${KDF_NAME}$${KDF_ITERATIONS}$${saltHex}$${derived}`;
}

async function readHash(): Promise<string | null> {
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(PIN_HASH_KEY);
}

/** Simpan hash PIN baru sekaligus panjangnya (mengganti yang lama). */
export async function savePinHash(pin: string): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await Promise.all([
    SecureStore.setItemAsync(PIN_HASH_KEY, await hashPin(pin)),
    SecureStore.setItemAsync(PIN_LENGTH_KEY, String(pin.length)),
    SecureStore.deleteItemAsync(PIN_FAIL_KEY),
    SecureStore.deleteItemAsync(PIN_LOCKED_UNTIL_KEY),
  ]);
}

export async function clearPinHash(): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await Promise.all([
    SecureStore.deleteItemAsync(PIN_HASH_KEY),
    SecureStore.deleteItemAsync(PIN_LENGTH_KEY),
    SecureStore.deleteItemAsync(PIN_FAIL_KEY),
    SecureStore.deleteItemAsync(PIN_LOCKED_UNTIL_KEY),
  ]);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await readHash();
  if (!stored) return false;

  const parsed = parseHash(stored);
  if (parsed) {
    const derived = await derivePbkdf2(pin, parsed.saltHex, parsed.iterations);
    if (!derived) return false;
    return timingSafeEqualText(derived, parsed.hashHex);
  }

  // Hash v1: verifikasi dengan cara lama, lalu tingkatkan ke v2.
  const legacy = await legacyHash(pin);
  if (!timingSafeEqualText(legacy, stored)) return false;
  const upgraded = await hashPin(pin);
  if (parseHash(upgraded)) {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(PIN_HASH_KEY, upgraded);
  }
  return true;
}

/**
 * Panjang PIN yang dipakai layar kunci. Untuk hash lama yang belum punya
 * metadata panjang, pakai 6 digit (versi lama memang selalu meminta 6 digit).
 */
export async function getPinLength(): Promise<number | null> {
  const SecureStore = await import('expo-secure-store');
  const [storedLength, hash] = await Promise.all([
    SecureStore.getItemAsync(PIN_LENGTH_KEY),
    readHash(),
  ]);
  if (!hash) return null;
  const length = Number(storedLength);
  if (Number.isInteger(length) && length >= MIN_PIN_LENGTH && length <= MAX_PIN_LENGTH) {
    return length;
  }
  return MAX_PIN_LENGTH;
}

export type PinLockState = {
  failures: number;
  lockedUntil: number;
  remainingMs: number;
};

function stateFrom(failures: number, lockedUntil: number): PinLockState {
  const remainingMs = Math.max(0, lockedUntil - Date.now());
  return {
    failures: remainingMs > 0 ? failures : 0,
    lockedUntil: remainingMs > 0 ? lockedUntil : 0,
    remainingMs,
  };
}

export async function getPinLockState(): Promise<PinLockState> {
  const SecureStore = await import('expo-secure-store');
  const [failValue, untilValue] = await Promise.all([
    SecureStore.getItemAsync(PIN_FAIL_KEY),
    SecureStore.getItemAsync(PIN_LOCKED_UNTIL_KEY),
  ]);
  const failures = Number(failValue ?? '0');
  const lockedUntil = Number(untilValue ?? '0');
  const state = stateFrom(Number.isFinite(failures) ? failures : 0, Number.isFinite(lockedUntil) ? lockedUntil : 0);
  if (state.remainingMs === 0 && (failures > 0 || lockedUntil > 0)) {
    await resetPinFailures();
  }
  return state;
}

/** Catat PIN salah. Setelah 5x, kunci input selama 30 detik. */
export async function recordPinFailure(): Promise<PinLockState> {
  const SecureStore = await import('expo-secure-store');
  const current = await getPinLockState();
  const failures = current.failures + 1;
  const lockedUntil = failures >= MAX_PIN_FAILURES ? Date.now() + PIN_COOLDOWN_MS : 0;
  await Promise.all([
    SecureStore.setItemAsync(PIN_FAIL_KEY, String(failures)),
    SecureStore.setItemAsync(PIN_LOCKED_UNTIL_KEY, String(lockedUntil)),
  ]);
  return stateFrom(failures, lockedUntil);
}

export async function resetPinFailures(): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await Promise.all([
    SecureStore.deleteItemAsync(PIN_FAIL_KEY),
    SecureStore.deleteItemAsync(PIN_LOCKED_UNTIL_KEY),
  ]);
}
