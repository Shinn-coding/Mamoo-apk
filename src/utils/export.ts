/**
 * Tulis file & berbagi (fase 5). Modul native di-import saat dipakai
 * (bukan di atas file) agar app tidak crash kalau dibuka di web.
 */
const MIME = { json: 'application/json', csv: 'text/csv' } as const;

/** Tulis teks ke file di folder cache lalu buka share sheet. */
export async function shareTextFile(
  fileName: string,
  content: string,
  mimeType: keyof typeof MIME,
): Promise<void> {
  const FS = await import('expo-file-system/legacy');
  const Sharing = await import('expo-sharing');
  const dir = FS.cacheDirectory ?? FS.documentDirectory;
  if (!dir) throw new Error('Penyimpanan sementara tidak tersedia di perangkat ini.');
  const fileUri = `${dir}${fileName}`;
  // BOM UTF-8 supaya Excel membaca CSV dengan benar.
  const payload = mimeType === 'csv' ? `\uFEFF${content}` : content;
  await FS.writeAsStringAsync(fileUri, payload, { encoding: FS.EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Fitur berbagi tidak tersedia di perangkat ini.');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: MIME[mimeType],
    dialogTitle: 'Bagikan file Mamoo',
  });
}

/** Minta file JSON dari pengguna; null kalau dibatalkan. Lempar Error kalau gagal dibaca. */
export async function readPickedJsonFile(): Promise<unknown> {
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error('File tidak bisa dibaca.');
  try {
    const FS = await import('expo-file-system/legacy');
    const text = await FS.readAsStringAsync(asset.uri, { encoding: FS.EncodingType.UTF8 });
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('File tidak bisa dibaca sebagai JSON. Pastikan memilih file backup Mamoo.');
  }
}
