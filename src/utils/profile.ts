/**
 * Foto profil lokal: pilih → validasi 10 MB → perkecil → simpan di dokumen app.
 * Tidak ada upload dan tidak ada base64 di SQLite — hanya nama file di settings.
 */
import type { ImagePickerOptions } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import {
  PROFILE_AVATAR_DIR,
  PROFILE_AVATAR_SIZE,
  PROFILE_NAME_MAX,
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_PHOTO_MAX_MB,
} from '@/constants/profile';
import {
  getSettings,
  setProfileAvatarVersion,
} from '@/db/repositories/settings.repository';

export type ProfilePhotoSource = 'library' | 'camera';

/** Rapikan nama: spasi ganda jadi satu + potong ke batas karakter. */
export function sanitizeProfileName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, PROFILE_NAME_MAX);
}

/** URI foto profil dari versi yang tersimpan; null kalau belum ada. */
export function profileAvatarUri(version: string): string | null {
  const base = FileSystem.documentDirectory;
  if (!base || !/^\d+$/.test(version)) return null;
  return `${base}${PROFILE_AVATAR_DIR}avatar-${version}.jpg`;
}

function avatarDir(): string {
  const base = FileSystem.documentDirectory;
  if (!base) throw new Error('Penyimpanan lokal tidak tersedia di perangkat ini.');
  return `${base}${PROFILE_AVATAR_DIR}`;
}

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',');
}

async function validatePhotoSize(uri: string, fileSize?: number): Promise<void> {
  let size = fileSize && fileSize > 0 ? fileSize : null;
  if (size === null) {
    // Sebagian provider Android tidak memberi fileSize; cek file cache-nya.
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && !info.isDirectory) size = info.size;
    } catch {
      // Tidak bisa dibaca (mis. content://) — biarkan kompresi tetap jalan.
    }
  }
  if (size !== null && size > PROFILE_PHOTO_MAX_BYTES) {
    throw new Error(
      `Foto terlalu besar (${formatMb(size)} MB). Pilih foto maksimal ${PROFILE_PHOTO_MAX_MB} MB ya.`,
    );
  }
}

/**
 * Ambil foto dari galeri/kamera, validasi ukuran input, lalu simpan versi
 * 512px JPEG (±100–200 KB). Mengembalikan versi baru, atau null kalau batal.
 */
export async function pickProfilePhoto(source: ProfilePhotoSource): Promise<string | null> {
  const ImagePicker = await import('expo-image-picker');
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      source === 'camera'
        ? 'Izin kamera ditolak. Buka izin kamera di pengaturan HP untuk memotret foto profil.'
        : 'Izin galeri ditolak. Buka izin foto di pengaturan HP untuk memilih foto profil.',
    );
  }

  const options: ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error('Foto tidak bisa dibaca. Coba pilih foto lain.');

  await validatePhotoSize(asset.uri, asset.fileSize);

  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  const image = await ImageManipulator.manipulate(asset.uri)
    .resize({ width: PROFILE_AVATAR_SIZE })
    .renderAsync();
  const optimized = await image.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });

  const dir = avatarDir();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const version = String(Date.now());
  await FileSystem.copyAsync({ from: optimized.uri, to: `${dir}avatar-${version}.jpg` });

  const previous = (await getSettings()).profileAvatarVersion;
  await setProfileAvatarVersion(version);

  // Foto lama tidak ditumpuk — cukup satu avatar aktif di storage.
  if (previous && previous !== version) {
    const oldUri = profileAvatarUri(previous);
    if (oldUri) {
      await FileSystem.deleteAsync(oldUri, { idempotent: true }).catch(() => undefined);
    }
  }

  return version;
}

/** Hapus foto aktif + catatannya. */
export async function removeProfilePhoto(): Promise<void> {
  const { profileAvatarVersion } = await getSettings();
  await setProfileAvatarVersion('');
  const uri = profileAvatarUri(profileAvatarVersion);
  if (uri) {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
  }
}

/** Dipakai reset semua data: bersihkan folder avatar, jangan tinggalkan file yatim. */
export async function deleteProfilePhotoFiles(): Promise<void> {
  const base = FileSystem.documentDirectory;
  if (!base) return;
  await FileSystem.deleteAsync(`${base}${PROFILE_AVATAR_DIR}`, { idempotent: true }).catch(
    () => undefined,
  );
}
