import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { formatRupiah } from '@/utils/format';
import { percent } from '@/utils/format';
import type { BudgetProgress } from '@/db/repositories/budgets.repository';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { spacing, surfaceCard, type ThemeColors } from '@/theme/theme';

function barColor(progress: number, colors: ThemeColors): string {
  if (progress >= 100) return colors.expense;
  if (progress >= 80) return colors.warning;
  return colors.primary;
}

/** Kartu anggaran satu kategori: bar progres + jatah aman harian. */
export function BudgetCard({
  budget,
  onPress,
}: {
  budget: BudgetProgress;
  onPress?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const progress = percent(budget.spent, budget.amount);
  const color = barColor(progress, colors);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: `${budget.category_color}1A` }]}>
          <AppIcon name={budget.category_icon} color={budget.category_color} size={20} />
        </View>
        <View style={styles.titles}>
          <Text style={styles.name}>{budget.category_name}</Text>
          <Text style={styles.sub}>
            {formatRupiah(budget.spent)} dari {formatRupiah(budget.amount)}
          </Text>
        </View>
        <Text style={[styles.percent, { color }]}>{Math.round(progress)}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.footer}>
        {budget.sisa <= 0
          ? 'Jatah terpakai habis'
          : `Sisa ${formatRupiah(budget.sisa)} · jatah aman ${formatRupiah(budget.dailySafe)}/hari`}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    ...surfaceCard(colors),
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, gap: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted },
  percent: { fontSize: 14, fontWeight: '800' },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: 4 },
  footer: { fontSize: 12, color: colors.textMuted },
});
