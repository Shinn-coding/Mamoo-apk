/**
 * Judul halaman untuk layar tab.
 *
 * Header bawaan expo-router Tabs dimatikan supaya kelima tab punya hierarki
 * yang sama: judul besar di kiri atas + satu slot aksi di kanan.
 * Padding atas memakai safe-area karena aplikasi memakai edge-to-edge.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '@/theme/theme-provider';
import { spacing, type ThemeColors } from '@/theme/theme';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: colors.background,
    },
    textWrap: { flex: 1, gap: 1 },
    title: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    subtitle: { fontSize: 12, color: colors.textMuted },
    action: { alignItems: 'flex-end' },
  });
