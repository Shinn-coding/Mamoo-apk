import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { IconName } from '@/constants/icons';

/** Render ikon kategori/dompet yang tersimpan sebagai string di DB. */
export function AppIcon({ name, color, size = 24 }: { name: string; color: string; size?: number }) {
  return <MaterialCommunityIcons name={name as IconName} color={color} size={size} />;
}
