import { useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EmptyState } from '@/components/ui/empty-state';
import { AppIcon } from '@/components/ui/app-icon';
import { Fab } from '@/components/ui/fab';
import { GlassSceneTarget } from '@/components/ui/glass-scene';
import { listCategories } from '@/db/repositories/categories.repository';
import { listWallets } from '@/db/repositories/wallets.repository';
import { listTransactions, type TransactionFilter } from '@/db/repositories/transactions.repository';
import { useAppStore } from '@/store/use-app-store';
import { useDataVersion } from '@/store/use-data-store';
import {
  addMonths,
  formatDayLabel,
  formatMonthLabel,
  getCycleRange,
  todayLocal,
} from '@/utils/date';
import { formatRupiahSigned } from '@/utils/format';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, type ThemeColors } from '@/theme/theme';
import type { Category, Transaction, TransactionType, Wallet } from '@/db/types';

type TypeFilter = 'all' | 'expense' | 'income';

type Section = { title: string; data: Transaction[] };

export default function TransactionsScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const version = useDataVersion();
  const cycleStartDay = useAppStore((state) => state.settings.budgetCycleStartDay);

  const [cycleStart, setCycleStart] = useState(() => getCycleRange(todayLocal(), cycleStartDay).start);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const cycle = useMemo(
    () => getCycleRange(cycleStart, cycleStartDay),
    [cycleStart, cycleStartDay],
  );

  useEffect(() => {
    void listCategories().then(setCategories);
    void listWallets(true).then(setWallets);
  }, [version]);

  useEffect(() => {
    const filter: TransactionFilter = {
      from: cycle.start,
      to: cycle.end,
      type: typeFilter === 'all' ? undefined : (typeFilter as TransactionType),
      search: search.trim() ? search.trim() : undefined,
    };
    void listTransactions(filter).then(setTransactions);
  }, [cycle.start, cycle.end, typeFilter, search, version]);

  const sections = useMemo<Section[]>(() => {
    const map = new Map<string, Transaction[]>();
    for (const transaction of transactions) {
      const bucket = map.get(transaction.date) ?? [];
      bucket.push(transaction);
      map.set(transaction.date, bucket);
    }
    return [...map.entries()].map(([date, items]) => ({ title: formatDayLabel(date), data: items }));
  }, [transactions]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const walletById = useMemo(() => new Map(wallets.map((wallet) => [wallet.id, wallet])), [wallets]);

  return (
    <GlassSceneTarget name="transactions" style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.monthNav}>
          <Pressable
            onPress={() => setCycleStart((current) => addMonths(current, -1))}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.monthLabel}>
            <Text style={styles.monthText}>{formatMonthLabel(cycle.start)}</Text>
            <Text style={styles.monthSub}>
              {cycle.start} – {cycle.end}
            </Text>
          </View>
          <Pressable
            onPress={() => setCycleStart((current) => addMonths(current, 1))}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>

        <Pressable style={styles.manageButton} onPress={() => router.push('/categories')}>
          <Ionicons name="options-outline" size={16} color={colors.primary} />
          <Text style={styles.manageText}>Kelola</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {(
          [
            { key: 'all', label: 'Semua' },
            { key: 'expense', label: 'Keluar' },
            { key: 'income', label: 'Masuk' },
          ] as const
        ).map((option) => (
          <Pressable
            key={option.key}
            style={[styles.chip, typeFilter === option.key && styles.chipActive]}
            onPress={() => setTypeFilter(option.key)}
          >
            <Text style={[styles.chipText, typeFilter === option.key && styles.chipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Cari catatan…"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="swap-horizontal-outline"
            title="Belum ada transaksi"
            message="Ketuk tombol + untuk mencatat pengeluaran atau pemasukan pertamamu."
          />
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const category = item.category_id ? categoryById.get(item.category_id) : undefined;
          const wallet = walletById.get(item.wallet_id);
          const isExpense = item.type === 'expense';
          const incomeType = item.type === 'income';
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/transaction/new?id=${item.id}`)}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.background }]}>
                <AppIcon name={category?.icon ?? 'dots-horizontal'} color={category?.color ?? colors.textMuted} size={20} />
              </View>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.note || category?.name || (item.type === 'initial' ? 'Saldo awal' : 'Transaksi')}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {[category?.name, wallet?.name].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text
                style={[
                  styles.rowAmount,
                  { color: isExpense ? colors.expense : incomeType ? colors.primary : colors.text },
                ]}
              >
                {formatRupiahSigned(isExpense ? -item.amount : item.amount)}
              </Text>
            </Pressable>
          );
        }}
      />

      <Fab />
    </GlassSceneTarget>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  monthLabel: { alignItems: 'center', minWidth: 120 },
  monthText: { fontSize: 16, fontWeight: '800', color: colors.text },
  monthSub: { fontSize: 11, color: colors.textMuted },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  manageText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted },
  chipTextActive: { color: colors.onPrimary, fontWeight: '700' },
  search: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: 13,
    color: colors.text,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 4 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textMuted },
  rowAmount: { fontSize: 15, fontWeight: '700' },
});
