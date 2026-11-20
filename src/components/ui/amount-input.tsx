import { StyleSheet, TextInput, View, Text } from 'react-native';

import { formatAmountInput } from '@/utils/format';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, type ThemeColors } from '@/theme/theme';

/**
 * Input nominal Rupiah: keypad angka, tampil "1.250.000".
 * Parent menyimpan teks terformat; angka asli = parseAmountInput(text).
 */
export function AmountInput({
  value,
  onChangeText,
  invalid = false,
}: {
  value: string;
  onChangeText: (formatted: string) => void;
  invalid?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, invalid && styles.invalid]}>
      <Text style={styles.prefix}>Rp</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => onChangeText(formatAmountInput(text))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        maxLength={15}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  invalid: { borderColor: colors.expense },
  prefix: { fontSize: 22, fontWeight: '700', color: colors.textMuted },
  input: { flex: 1, fontSize: 26, fontWeight: '800', color: colors.text },
});
