import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, shadow } from '@/theme/theme';

/** Tombol tambah hijau — mengarah ke form transaksi (isi datanya fase 2). */
export function Fab() {
  const router = useRouter();
  return (
    <View style={[styles.button, shadow.card]}>
      <Ionicons
        name="add"
        size={30}
        color={colors.surface}
        onPress={() => router.push('/transaction/new')}
        style={styles.icon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
