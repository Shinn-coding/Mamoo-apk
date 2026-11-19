/**
 * Design tokens "Mamoo" — semua warna, spacing, dan radius WAJIB dari sini.
 * Dilarang hardcode warna/spacing di komponen.
 */

export const colors = {
  primary: '#00AB6B',
  primaryDark: '#008F59',
  primaryLight: '#E6F7F0',
  background: '#F6F8F7',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textMuted: '#6B7280',
  expense: '#E5484D',
  border: '#E5EAE7',
  dangerSoft: '#FDECEC',
  warning: '#F5A623',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { card: 16, button: 12, pill: 999, hero: 24 } as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '800' as const, color: colors.text },
  section: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  amount: { fontSize: 34, fontWeight: '800' as const, color: colors.surface },
} as const;

export const shadow = {
  card: {
    shadowColor: '#0A2A1C',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;
