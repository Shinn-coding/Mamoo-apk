import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemedStyles } from '@/theme/theme-provider';
import { shadow, spacing, surfaceCard, type ThemeColors } from '@/theme/theme';

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.card, shadow.card, style]}>{children}</View>
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.section}>{children}</Text>;
}

export function MutedText({ children }: PropsWithChildren) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.muted}>{children}</Text>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.sm,
    ...surfaceCard(colors),
  },
  section: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
