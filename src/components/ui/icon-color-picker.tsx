import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppIcon } from '@/components/ui/app-icon';
import { COLOR_PALETTE, ICON_OPTIONS, type IconName } from '@/constants/icons';
import { colors, radius, spacing } from '@/theme/theme';

/** Picker ikon (grid) + warna (palet tetap) — dipakai editor kategori/dompet/target. */
export function IconColorPicker({
  icon,
  color,
  onIcon,
  onColor,
}: {
  icon: IconName;
  color: string;
  onIcon: (icon: IconName) => void;
  onColor: (color: string) => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Ikon</Text>
      <View style={styles.iconGrid}>
        {ICON_OPTIONS.map((option) => (
          <Pressable
            key={option}
            style={[styles.iconOption, icon === option && styles.iconOptionSelected]}
            onPress={() => onIcon(option)}
          >
            <AppIcon name={option} color={icon === option ? colors.surface : colors.text} size={22} />
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Warna</Text>
      <View style={styles.colorRow}>
        {COLOR_PALETTE.map((option) => (
          <Pressable
            key={option}
            style={[
              styles.colorOption,
              { backgroundColor: option },
              color === option && styles.colorOptionSelected,
            ]}
            onPress={() => onColor(option)}
          >
            {color === option ? (
              <Ionicons name="checkmark" size={18} color={colors.surface} />
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});
