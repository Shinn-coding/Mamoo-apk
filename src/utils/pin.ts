/**
 * Kunci aplikasi (fase 5): hash PIN disimpan di expo-secure-store,
 * BUKAN di SQLite dan tidak pernah ikut backup. Modul native di-import
 * saat dipakai agar aman di web.
 */
// KEY & pepper JANGAN DIUBAH: hash PIN yang sudah tersimpan akan gagal diverifikasi.
const PIN_HASH_KEY = 'tabungin.pin_hash';

/** SHA-256 dari PIN + pepper tetap. */
async function hashPin(pin: string): Promise<string> {
  const Crypto = await import('expo-crypto');
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `tabungin:${pin}`);
}

async function readHash(): Promise<string | null> {
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(PIN_HASH_KEY);
}

/** Simpan hash PIN baru (mengganti yang lama). */
export async function savePinHash(pin: string): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(PIN_HASH_KEY, await hashPin(pin));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await readHash();
  if (!stored) return false;
  return stored === (await hashPin(pin));
}

export async function clearPinHash(): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
}
