import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, shadow, type ThemeColors } from '@/theme/theme';

/** Tombol tambah hijau — mengarah ke form transaksi (isi datanya fase 2). */
export function Fab() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={[styles.button, shadow.card]}>
      <Ionicons
        name="add"
        size={30}
        color={colors.onPrimary}
        onPress={() => router.push('/transaction/new')}
        style={styles.icon}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  button: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 132, // di atas tab bar glass yang melayang
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 60,
    height: 60,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
