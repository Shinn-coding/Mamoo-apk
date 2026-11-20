import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, type ThemeColors } from '@/theme/theme';

export const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'hapus'] as const;
export type PinKey = (typeof PIN_KEYS)[number];

export function PinDots({
  length,
  filled,
}: {
  length: number;
  filled: number;
}) {
  const styles = useThemedStyles(createDotsStyles);
  return (
    <View
      style={styles.dots}
      accessibilityLabel={`${filled} dari ${length} digit terisi`}
    >
      {Array.from({ length }, (_, index) => (
        <View
          key={index}
          style={[styles.dot, index < filled && styles.dotFilled]}
        />
      ))}
    </View>
  );
}

export function PinKeypad({
  onKey,
  disabled = false,
}: {
  onKey: (key: PinKey) => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(createKeypadStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.keypad}>
      {PIN_KEYS.map((key) => (
        <Pressable
          key={key || 'kosong'}
          style={({ pressed }) => [
            styles.key,
            !key && styles.keyGhost,
            pressed && styles.keyPressed,
            disabled && styles.keyDisabled,
          ]}
          onPress={() => onKey(key)}
          disabled={!key || disabled}
          accessibilityRole="button"
          accessibilityLabel={key === 'hapus' ? 'Hapus' : key || undefined}
        >
          {key === 'hapus' ? (
            <Ionicons name="backspace-outline" size={26} color={colors.text} />
          ) : (
            <Text style={styles.keyText}>{key}</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const createDotsStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    dotFilled: { backgroundColor: colors.primary },
  });

const createKeypadStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    keypad: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      width: '100%',
      maxWidth: 300,
      marginTop: spacing.sm,
    },
    key: {
      width: 78,
      height: 60,
      margin: 5,
      borderRadius: radius.card,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyGhost: { backgroundColor: 'transparent' },
    keyPressed: { opacity: 0.6 },
    keyDisabled: { opacity: 0.35 },
    keyText: { fontSize: 26, fontWeight: '700', color: colors.text },
  });
