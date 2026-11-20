/**
 * Design tokens "Mamoo" — semua warna, spacing, dan radius WAJIB dari sini.
 * Warna dibagi menjadi palette terang/gelap; komponen mengambil palette
 * lewat `useTheme()` dari theme-provider.
 */

export type ThemeMode = 'system' | 'light' | 'dark';

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  onPrimary: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  expense: string;
  border: string;
  dangerSoft: string;
  warning: string;
};

export const lightColors: ThemeColors = {
  primary: '#00AB6B',
  primaryDark: '#008F59',
  primaryLight: '#E6F7F0',
  onPrimary: '#FFFFFF',
  background: '#F6F8F7',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textMuted: '#6B7280',
  expense: '#E5484D',
  border: '#E5EAE7',
  dangerSoft: '#FDECEC',
  warning: '#F5A623',
};

export const darkColors: ThemeColors = {
  primary: '#2DD4A0',
  primaryDark: '#10B981',
  primaryLight: '#0E2A21',
  onPrimary: '#FFFFFF',
  background: '#0A0F0D',
  surface: '#121A16',
  text: '#F3F7F5',
  textMuted: '#94A3A0',
  expense: '#FF7A7A',
  border: '#25352D',
  dangerSoft: '#331A1A',
  warning: '#FBBF24',
};


export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { card: 16, button: 12, pill: 999, hero: 24 } as const;

export const shadow = {
  card: {
    shadowColor: '#0A2A1C',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#0A2A1C',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;
