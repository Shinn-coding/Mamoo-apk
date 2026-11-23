import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTabBarClearance } from '@/components/ui/glass-tab-bar';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { spacing, shadow, type ThemeColors } from '@/theme/theme';

/** Tombol tambah hijau — mengarah ke form transaksi. */
export function Fab() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const clearance = useTabBarClearance();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tambah transaksi"
      onPress={() => router.push('/transaction/new')}
      style={({ pressed }) => [
        styles.button,
        shadow.floating,
        { bottom: clearance + spacing.md },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="add" size={30} color={colors.onPrimary} />
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      position: 'absolute',
      right: spacing.lg,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.85 },
  });
