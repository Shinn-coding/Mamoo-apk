import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppIcon } from '@/components/ui/app-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { DonutChart } from '@/components/report/donut-chart';
import { GlassSceneTarget } from '@/components/ui/glass-scene';
import { PageHeader } from '@/components/ui/page-header';
import { useTabBarClearance } from '@/components/ui/glass-tab-bar';
import {
  categoryTotals,
  dailyTotals,
  summarizeRange,
  type CategoryTotal,
  type DailyTotal,
} from '@/db/repositories/transactions.repository';
import { useAppStore } from '@/store/use-app-store';
import {
  addDays,
  formatDateRange,
  formatMonthLabel,
  getCycleRange,
  todayLocal,
  type CycleRange,
} from '@/utils/date';
import { formatRupiah, percent } from '@/utils/format';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, surfaceCard, type ThemeColors } from '@/theme/theme';

const BAR_MAX_HEIGHT = 110;

export default function ReportsScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const cycleStartDay = useAppStore((state) => state.settings.budgetCycleStartDay);
  const clearance = useTabBarClearance();

  const [cycleStart, setCycleStart] = useState(() => getCycleRange(todayLocal(), cycleStartDay).start);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [byCategory, setByCategory] = useState<CategoryTotal[]>([]);
  const [byDay, setByDay] = useState<DailyTotal[]>([]);

  const cycle: CycleRange = useMemo(
    () => getCycleRange(cycleStart, cycleStartDay),
    [cycleStart, cycleStartDay],
  );

  useEffect(() => {
    void (async () => {
      const [summaryValue, categoryList, dayList] = await Promise.all([
        summarizeRange(cycle.start, cycle.end),
        categoryTotals(cycle.start, cycle.end),
        dailyTotals(cycle.start, cycle.end),
      ]);
      setSummary(summaryValue);
      setByCategory(categoryList);
      setByDay(dayList);
    })();
  }, [cycle.start, cycle.end]);

  const days = useMemo(() => {
    const list: Array<{ date: string; label: string; income: number; expense: number }> = [];
    const dayMap = new Map(byDay.map((day) => [day.date, day]));
    for (let index = 0; index < cycle.daysTotal; index += 1) {
      const date = addDays(cycle.start, index);
      const day = dayMap.get(date);
      list.push({
        date,
        label: String(Number(date.slice(8))),
        income: day?.income ?? 0,
        expense: day?.expense ?? 0,
      });
    }
    return list;
  }, [byDay, cycle.start, cycle.daysTotal]);

  const maxDaily = Math.max(1, ...byDay.map((day) => Math.max(day.income, day.expense)));
  const donutSegments = useMemo(
    () => byCategory.map((item) => ({ value: item.total, color: item.color })),
    [byCategory],
  );
  const net = summary.income - summary.expense;

  if (summary.income === 0 && summary.expense === 0) {
    return (
      <GlassSceneTarget name="reports" style={styles.container}>
        <PageHeader title="Laporan" />
        <CycleNav cycle={cycle} onPrev={() => setCycleStart((current) => addDays(current, -cycle.daysTotal))} onNext={() => setCycleStart((current) => addDays(current, cycle.daysTotal))} />
        <EmptyState
          icon="stats-chart-outline"
          title="Belum ada data"
          message="Catat transaksi dulu, laporan muncul otomatis di sini."
        />
      </GlassSceneTarget>
    );
  }

  return (
    <GlassSceneTarget name="reports" style={styles.container}>
      <PageHeader title="Laporan" subtitle={formatDateRange(cycle.start, cycle.end)} />
      <CycleNav cycle={cycle} onPrev={() => setCycleStart((current) => addDays(current, -cycle.daysTotal))} onNext={() => setCycleStart((current) => addDays(current, cycle.daysTotal))} />

      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: clearance }]}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryLabel, { color: colors.primary }]}>Pemasukan</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{formatRupiah(summary.income)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryLabel, { color: colors.expense }]}>Pengeluaran</Text>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>{formatRupiah(summary.expense)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Selisih</Text>
            <Text style={[styles.summaryValue, { color: net >= 0 ? colors.text : colors.expense }]}>
              {formatRupiah(net)}
            </Text>
          </View>
        </View>

        <Text style={styles.section}>Pengeluaran per Kategori</Text>
        {byCategory.length === 0 ? (
          <Text style={styles.emptySmall}>Belum ada pengeluaran di siklus ini.</Text>
        ) : (
          <View style={styles.card}>
            <View style={styles.donutWrap}>
              <DonutChart segments={donutSegments} />
              <View style={styles.donutCenter}>
                <Text style={styles.donutTotal}>{formatRupiah(summary.expense)}</Text>
                <Text style={styles.donutCaption}>keluar</Text>
              </View>
            </View>
            <View style={styles.legend}>
              {byCategory.map((item, index) => {
                const share = percent(item.total, summary.expense);
                return (
                  <View key={`${item.category_id ?? 'none'}-${index}`} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]}>
                      <AppIcon name={item.icon} color={colors.onPrimary} size={12} />
                    </View>
                    <Text style={styles.legendName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.legendValue}>{formatRupiah(item.total)}</Text>
                    <Text style={styles.legendShare}>{Math.round(share)}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <Text style={styles.section}>Per Hari</Text>
        <View style={styles.card}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.barChart}>
              {days.map((day) => (
                <View key={day.date} style={styles.barColumn}>
                  <View style={styles.bars}>
                    <View
                      style={[
                        styles.bar,
                        { height: (day.income / maxDaily) * BAR_MAX_HEIGHT, backgroundColor: colors.primary },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        { height: (day.expense / maxDaily) * BAR_MAX_HEIGHT, backgroundColor: colors.expense },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{day.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={styles.legendInline}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendInlineText}>masuk</Text>
            <View style={[styles.dot, { backgroundColor: colors.expense }]} />
            <Text style={styles.legendInlineText}>keluar</Text>
          </View>
        </View>

        <Text style={styles.section}>Kategori Terbesar</Text>
        <View style={styles.card}>
          {byCategory.length === 0 ? (
            <Text style={styles.emptySmall}>Belum ada data.</Text>
          ) : (
            <View style={styles.rankList}>
              {byCategory.slice(0, 5).map((item, index) => {
                const share = percent(item.total, byCategory[0].total);
                return (
                  <View key={`${item.category_id ?? 'none'}-${index}`} style={styles.rankRow}>
                    <Text style={styles.rankNumber}>{index + 1}</Text>
                    <AppIcon name={item.icon} color={item.color} size={18} />
                    <View style={styles.rankMain}>
                      <Text style={styles.rankName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.rankTrack}>
                        <View style={[styles.rankFill, { width: `${share}%`, backgroundColor: item.color }]} />
                      </View>
                    </View>
                    <Text style={styles.rankValue}>{formatRupiah(item.total)}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </GlassSceneTarget>
  );
}

function CycleNav({
  cycle,
  onPrev,
  onNext,
}: {
  cycle: CycleRange;
  onPrev: () => void;
  onNext: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.monthNav}>
      <Pressable onPress={onPrev} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>
      <View style={styles.monthLabel}>
        <Text style={styles.monthText}>{formatMonthLabel(cycle.start)}</Text>
        <Text style={styles.monthSub}>{formatDateRange(cycle.start, cycle.end)}</Text>
      </View>
      <Pressable onPress={onNext} hitSlop={8}>
        <Ionicons name="chevron-forward" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  monthLabel: { alignItems: 'center', minWidth: 160 },
  monthText: { fontSize: 16, fontWeight: '800', color: colors.text },
  monthSub: { fontSize: 11, color: colors.textMuted },
  list: { padding: spacing.lg, gap: spacing.sm, paddingTop: spacing.xs },
  summaryCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  summaryCell: { flex: 1, gap: 2 },
  summaryLabel: { fontSize: 11, fontWeight: '700' },
  summaryValue: { fontSize: 14, fontWeight: '800' },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  card: {
    padding: spacing.md,
    gap: spacing.md,
    ...surfaceCard(colors),
  },
  donutWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  donutCenter: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutTotal: { fontSize: 15, fontWeight: '800', color: colors.text },
  donutCaption: { fontSize: 11, color: colors.textMuted },
  legend: { gap: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  legendValue: { fontSize: 13, color: colors.text, fontWeight: '700' },
  legendShare: { fontSize: 12, color: colors.textMuted, width: 36, textAlign: 'right' },
  legendInline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendInlineText: { fontSize: 11, color: colors.textMuted, marginRight: spacing.sm },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: BAR_MAX_HEIGHT + 18 },
  barColumn: { alignItems: 'center', gap: 2, width: 22 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: BAR_MAX_HEIGHT },
  bar: { width: 8, borderRadius: 3 },
  barLabel: { fontSize: 8, color: colors.textMuted },
  rankList: { gap: spacing.md },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rankNumber: { fontSize: 13, fontWeight: '800', color: colors.textMuted, width: 16 },
  rankMain: { flex: 1, gap: 3 },
  rankName: { fontSize: 13, fontWeight: '600', color: colors.text },
  rankTrack: { height: 5, borderRadius: 3, backgroundColor: colors.background, overflow: 'hidden' },
  rankFill: { height: 5, borderRadius: 3 },
  rankValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  emptySmall: { color: colors.textMuted, fontSize: 13 },
});
