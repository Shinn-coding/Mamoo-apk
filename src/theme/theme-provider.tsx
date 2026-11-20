import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import {
  darkColors,
  lightColors,
  type ThemeColors,
  type ThemeMode,
} from './theme';

type ThemeContextValue = {
  mode: ThemeMode;
  scheme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  mode,
  children,
}: {
  mode: ThemeMode;
  children: ReactNode;
}) {
  const systemScheme = useColorScheme();
  const scheme: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const colors = scheme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    try {
      Appearance.setColorScheme(mode === 'system' ? 'auto' : scheme);
    } catch {
      // Web / platform lama mungkin tidak mendukung override scheme.
    }
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {
      // Tidak fatal: root View tetap memakai background yang sama.
    });
  }, [colors.background, mode, scheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, isDark: scheme === 'dark', colors }),
    [colors, mode, scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme harus dipakai di dalam ThemeProvider.');
  }
  return value;
}

/** Buat StyleSheet yang mengikuti palette aktif. */
export function useThemedStyles<T>(
  factory: (colors: ThemeColors) => T,
): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
