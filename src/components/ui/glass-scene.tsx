/**
 * Pembungkus konten layar tab.
 * Dulu dipakai untuk mendaftarkan target blur mesin dimezis (expo-blur) —
 * mesin itu sudah dihapus karena snapshot-nya bisa menggambar ulang isi
 * layar di atas tab bar. Komponen ini tinggal View biasa; prop `name`
 * dipertahankan supaya layar tab tidak perlu diubah.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

export function GlassSceneTarget({
  name: _name,
  style,
  children,
}: {
  name: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return <View style={style}>{children}</View>;
}
