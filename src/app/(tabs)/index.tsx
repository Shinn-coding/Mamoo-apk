import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { useRouter } from 'expo-router';

import { AppIcon } from '@/components/ui/app-icon';
import { BudgetCard } from '@/components/budget/budget-card';
import { Card, MutedText, SectionTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { GlassSceneTarget } from '@/components/ui/glass-scene';
import { PageHeader } from '@/components/ui/page-header';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { useTabBarClearance } from '@/components/ui/glass-tab-bar';
import { listCategories } from '@/db/repositories/categories.repository';
import { listBudgetsWithProgress, type BudgetProgress } from '@/db/repositories/budgets.repository';
import { lockedTotal } from '@/db/repositories/goals.repository';
import {
  listTransactions,
  summarizeRange,
  totalBalance,
} from '@/db/repositories/transactions.repository';
import { useAppStore } from '@/store/use-app-store';
import { useDataVersion } from '@/store/use-data-store';
import { cycleKey, formatDateRange, formatDayLabel, getCycleRange, todayLocal } from '@/utils/date';
import { formatRupiah, formatRupiahSigned } from '@/utils/format';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, shadow, spacing, type ThemeColors } from '@/theme/theme';
import type { Category, Transaction } from '@/db/types';

function HeroShell({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  if (Platform.OS === 'ios') {
    return (
      <GlassView style={styles.hero} glassEffectStyle="regular" tintColor={colors.primary}>
        {children}
      </GlassView>
    );
  }
  return <View style={styles.hero}>{children}</View>;
}

export default function HomeScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const clearance = useTabBarClearance();
  const ready = useAppStore((state) => state.ready);
  const cycleStartDay = useAppStore((state) => state.settings.budgetCycleStartDay);
  const profileName = useAppStore((state) => state.settings.profileName);
  const version = useDataVersion();

  const cycle = useMemo(
    () => getCycleRange(todayLocal(), cycleStartDay),
    [cycleStartDay],
  );

  const [balance, setBalance] = useState(0);
  const [locked, setLocked] = useState(0);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);

  useEffect(() => {
    if (!ready) return;
    void (async () => {
      const [balanceValue, lockedValue, summaryValue, recentValue, categoryList, budgetList] = await Promise.all([
        totalBalance(),
        lockedTotal(),
        summarizeRange(cycle.start, cycle.end),
        listTransactions({ limit: 5 }),
        listCategories(),
        listBudgetsWithProgress(cycleKey(cycle.start, cycleStartDay), cycle.start, cycle.end, cycle.daysLeft),
      ]);
      setBalance(balanceValue - lockedValue);
      setLocked(lockedValue);
      setSummary(summaryValue);
      setRecent(recentValue);
      setCategories(categoryList);
      setBudgets(budgetList);
    })();
  }, [ready, cycle.start, cycle.end, cycle.daysLeft, cycleStartDay, version]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  return (
    <GlassSceneTarget name="index" style={styles.container}>
      <PageHeader
        title="Beranda"
        subtitle={profileName ? `Halo, ${profileName}` : 'Ketuk avatar untuk atur profil'}
        action={
          <Pressable
            onPress={() => router.push('/profile' as never)}
            accessibilityRole="button"
            accessibilityLabel={profileName ? `Buka profil ${profileName}` : 'Atur profil'}
            hitSlop={8}
          >
            <ProfileAvatar size={40} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: clearance }}>
        <View style={styles.heroWrap}>
        <HeroShell>
          <View style={[styles.heroSheen, styles.heroSheenTop]} pointerEvents="none" />
          <View style={[styles.heroSheen, styles.heroSheenBottom]} pointerEvents="none" />
          <Text style={styles.heroLabel}>Saldo Bebas</Text>
          <Text style={[styles.heroAmount, balance < 0 && styles.heroAmountNegative]}>
            {formatRupiah(balance)}
          </Text>
          <Text style={styles.heroCycle}>
            {locked > 0 ? `terkunci di tabungan ${formatRupiah(locked)} · ` : ''}
            {formatRupiah(summary.income - summary.expense)} periode ini · sisa {cycle.daysLeft} hari
          </Text>
          {balance < 0 ? (
            <Text style={styles.heroWarning}>
              Saldo bebas minus — ada pengeluaran yang melebihi uangmu.
            </Text>
          ) : null}
        </HeroShell>
      </View>

      <View style={styles.body}>
        <SectionTitle>Periode Ini</SectionTitle>
        <Card>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <View style={[styles.summaryDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.summaryLabel}>Pemasukan</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                {formatRupiah(summary.income)}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <View style={[styles.summaryDot, { backgroundColor: colors.expense }]} />
              <Text style={styles.summaryLabel}>Pengeluaran</Text>
              <Text style={[styles.summaryValue, { color: colors.expense }]}>
                {formatRupiah(summary.expense)}
              </Text>
            </View>
          </View>
          <MutedText>
            Siklus mulai tanggal {cycleStartDay} · {formatDateRange(cycle.start, cycle.end)}
          </MutedText>
        </Card>

        <View style={styles.sectionHeader}>
          <SectionTitle>Anggaran</SectionTitle>
          <Pressable onPress={() => router.push('/budgets')}>
            <Text style={styles.seeAll}>Atur</Text>
          </Pressable>
        </View>
        {budgets.length === 0 ? (
          <MutedText>
            Belum ada anggaran. Atur batas belanja per kategori lewat menu "Atur".
          </MutedText>
        ) : (
          <View style={styles.budgetList}>
            {budgets.slice(0, 3).map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onPress={() => router.push('/budgets')}
              />
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <SectionTitle>Transaksi Terakhir</SectionTitle>
          <Pressable onPress={() => router.push('/(tabs)/transactions')}>
            <Text style={styles.seeAll}>Lihat semua</Text>
          </Pressable>
        </View>
        <Card>
          {recent.length === 0 ? (
            <EmptyState
              icon="swap-horizontal-outline"
              title="Belum ada transaksi"
              message="Ketuk tombol + di kanan bawah untuk mencatat pengeluaran pertamamu."
            />
          ) : (
            <View style={styles.recentList}>
              {recent.map((transaction) => {
                const category = transaction.category_id
                  ? categoryById.get(transaction.category_id)
                  : undefined;
                const isExpense = transaction.type === 'expense';
                const isIncome = transaction.type === 'income';
                return (
                  <Pressable
                    key={transaction.id}
                    style={styles.recentRow}
                    onPress={() => router.push(`/transaction/new?id=${transaction.id}`)}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: `${category?.color ?? colors.textMuted}14` },
                      ]}
                    >
                      <AppIcon
                        name={category?.icon ?? 'dots-horizontal'}
                        color={category?.color ?? colors.textMuted}
                        size={18}
                      />
                    </View>
                    <View style={styles.recentMain}>
                      <Text style={styles.recentTitle} numberOfLines={1}>
                        {transaction.note || category?.name || 'Transaksi'}
                      </Text>
                      <Text style={styles.recentSub}>{formatDayLabel(transaction.date)}</Text>
                    </View>
                    <Text
                      style={[
                        styles.recentAmount,
                        {
                          color: isExpense
                            ? colors.expense
                            : isIncome
                              ? colors.primary
                              : colors.text,
                        },
                      ]}
                    >
                      {formatRupiahSigned(isExpense ? -transaction.amount : transaction.amount)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>
      </View>
      </ScrollView>

      <Fab />
    </GlassSceneTarget>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heroWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.hero,
    aspectRatio: 16 / 9,
    padding: spacing.xl,
    justifyContent: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
    ...shadow.card,
  },
  heroSheen: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  heroSheenTop: {
    width: 220,
    height: 220,
    top: -110,
    right: -60,
  },
  heroSheenBottom: {
    width: 140,
    height: 140,
    bottom: -80,
    left: -40,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  heroLabel: { color: colors.primaryLight, fontSize: 13, fontWeight: '600' },
  heroAmount: { color: colors.onPrimary, fontSize: 36, fontWeight: '800' },
  heroAmountNegative: { color: colors.expense },
  heroCycle: { color: colors.primaryLight, fontSize: 12 },
  heroWarning: { color: colors.onPrimary, fontSize: 12, fontWeight: '700' },
  body: { gap: spacing.md, padding: spacing.lg },
  summaryRow: { flexDirection: 'row', gap: spacing.lg },
  summaryCell: { flex: 1, gap: 2 },
  summaryDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  summaryLabel: { fontSize: 12, color: colors.textMuted },
  summaryValue: { fontSize: 17, fontWeight: '800' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  seeAll: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  budgetList: { gap: spacing.sm },
  recentList: { gap: spacing.md },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentMain: { flex: 1, gap: 1 },
  recentTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  recentSub: { fontSize: 11, color: colors.textMuted },
  recentAmount: { fontSize: 14, fontWeight: '700' },
});
