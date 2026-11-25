import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

/** Nama glyph MaterialCommunityIcons yang tersedia di @expo/vector-icons. */
export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Palet warna tetap untuk picker (kategori, dompet, target). */
export const COLOR_PALETTE = [
  '#00AB6B', // hijau
  '#12B5A5', // teal
  '#06B6D4', // cyan
  '#2F6FED', // biru
  '#5B5BD6', // indigo
  '#8B5CF6', // ungu
  '#EC4899', // pink
  '#E5484D', // merah
  '#F97316', // oranye
  '#F59E0B', // amber
  '#84CC16', // lime
  '#8B5E3C', // coklat
  '#64748B', // abu
  '#6B7280', // abu netral
] as const;

/** Daftar ±40 ikon untuk picker kategori/dompet/target. */
export const ICON_OPTIONS: IconName[] = [
  // makan & minum
  'food', 'coffee', 'cart-outline', 'shopping',
  // transportasi
  'bus', 'car', 'motorbike', 'bike', 'train', 'fuel', 'airplane',
  // rumah & tagihan
  'home', 'lightbulb', 'wifi', 'water', 'phone', 'cellphone', 'receipt',
  // hiburan
  'gamepad-variant', 'movie-open', 'music', 'dumbbell', 'beach', 'palm-tree',
  // kesehatan
  'heart-pulse', 'pill', 'stethoscope', 'doctor',
  // pendidikan
  'school', 'book-open-variant', 'pencil',
  // keuangan & umum
  'wallet', 'credit-card', 'cash', 'cash-plus', 'hand-coin', 'wallet-plus',
  'piggy-bank', 'briefcase', 'gift', 'tshirt-v', 'tools', 'baby-carriage',
  'paw', 'flower', 'bag-suitcase', 'dots-horizontal',
];
