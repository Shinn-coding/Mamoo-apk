import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AmountInput } from '@/components/ui/amount-input';
import { AppIcon } from '@/components/ui/app-icon';
import { BudgetCard } from '@/components/budget/budget-card';
import {
  deleteBudget,
  listBudgetsWithProgress,
  listUnbudgetedCategories,
  setBudget,
} from '@/db/repositories/budgets.repository';
import { useAppStore } from '@/store/use-app-store';
import { useDataStore } from '@/store/use-data-store';
import {
  addMonths,
  cycleKey,
  formatDateRange,
  formatMonthLabel,
  getCycleRange,
  todayLocal,
  type CycleRange,
} from '@/utils/date';
import { parseAmountInput } from '@/utils/format';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, type ThemeColors } from '@/theme/theme';
import type { BudgetProgress } from '@/db/repositories/budgets.repository';

type EditorMode =
  | { kind: 'new' }
  | { kind: 'edit'; budget: BudgetProgress }
  | null;

export default function BudgetsScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const bump = useDataStore((state) => state.bump);
  const cycleStartDay = useAppStore((state) => state.settings.budgetCycleStartDay);

  const [cycleStart, setCycleStart] = useState(() => getCycleRange(todayLocal(), cycleStartDay).start);
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [editor, setEditor] = useState<EditorMode>(null);
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);
  const [newOptions, setNewOptions] = useState<
    Array<{ id: number; name: string; icon: string; color: string }>
  >([]);
  const [amountText, setAmountText] = useState('');

  const cycle: CycleRange = useMemo(
    () => getCycleRange(cycleStart, cycleStartDay),
    [cycleStart, cycleStartDay],
  );
  const key = useMemo(() => cycleKey(cycle.start, cycleStartDay), [cycle.start, cycleStartDay]);

  const reload = useCallback(async () => {
    const rows = await listBudgetsWithProgress(key, cycle.start, cycle.end, cycle.daysLeft);
    setBudgets(rows);
  }, [key, cycle.start, cycle.end, cycle.daysLeft]);

  const version = useDataStore((state) => state.version);
  useEffect(() => {
    void reload();
  }, [reload, version]);

  const openNew = () => {
    setAmountText('');
    setNewCategoryId(null);
    void listUnbudgetedCategories(key).then((options) => {
      setNewOptions(options);
      setEditor({ kind: 'new' });
    });
  };

  const openEdit = (budget: BudgetProgress) => {
    setAmountText(budget.amount.toLocaleString('id-ID'));
    setEditor({ kind: 'edit', budget });
  };

  const save = async () => {
    const amount = parseAmountInput(amountText);
    try {
      if (editor?.kind === 'edit') {
        await setBudget(editor.budget.category_id, key, amount);
      } else {
        if (!newCategoryId) {
          Alert.alert('Kategori belum dipilih', 'Pilih kategori dulu ya.');
          return;
        }
        await setBudget(newCategoryId, key, amount);
      }
      bump();
      setEditor(null);
      await reload();
    } catch (error) {
      Alert.alert('Gagal menyimpan', error instanceof Error ? error.message : 'Coba lagi ya.');
    }
  };

  const remove = () => {
    if (editor?.kind !== 'edit') return;
    const budget = editor.budget;
    Alert.alert('Hapus anggaran?', `Batas anggaran "${budget.category_name}" dihapus untuk siklus ini.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteBudget(budget.id);
            bump();
            setEditor(null);
            await reload();
          })();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Anggaran',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      <View style={styles.monthNav}>
        <Pressable onPress={() => setCycleStart((current) => addMonths(current, -1))} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.monthLabel}>
          <Text style={styles.monthText}>{formatMonthLabel(cycle.start)}</Text>
          <Text style={styles.monthSub}>
            {formatDateRange(cycle.start, cycle.end)} · mulai tanggal {cycleStartDay}
          </Text>
        </View>
        <Pressable onPress={() => setCycleStart((current) => addMonths(current, 1))} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {budgets.map((budget) => (
          <BudgetCard key={budget.id} budget={budget} onPress={() => openEdit(budget)} />
        ))}
        {budgets.length === 0 ? (
          <Text style={styles.empty}>
            Belum ada anggaran di siklus ini. Atur batas belanja per kategori supaya lebih terkontrol.
          </Text>
        ) : null}
        <Pressable style={styles.addButton} onPress={() => openNew()}>
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={styles.addText}>Tambah Anggaran</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={editor !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditor(null)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setEditor(null)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
            <Text style={styles.modalTitle}>
              {editor?.kind === 'edit' ? 'Ubah Anggaran' : 'Anggaran Baru'}
            </Text>
            <Pressable onPress={() => void save()} hitSlop={8}>
              <Text style={styles.modalSave}>Simpan</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {editor?.kind === 'edit' ? (
              <View style={styles.editCategory}>
                <AppIcon name={editor.budget.category_icon} color={editor.budget.category_color} size={20} />
                <Text style={styles.editCategoryName}>{editor.budget.category_name}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalLabel}>Kategori (yang belum punya anggaran)</Text>
                {newOptions.length === 0 ? (
                  <Text style={styles.emptySmall}>Semua kategori sudah punya anggaran.</Text>
                ) : (
                  <View style={styles.optionGrid}>
                    {newOptions.map((option) => (
                      <Pressable
                        key={option.id}
                        style={[styles.option, newCategoryId === option.id && styles.optionSelected]}
                        onPress={() => setNewCategoryId(option.id)}
                      >
                        <AppIcon name={option.icon} color={option.color} size={18} />
                        <Text style={styles.optionText} numberOfLines={1}>
                          {option.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}

            <Text style={styles.modalLabel}>Batas per siklus</Text>
            <AmountInput value={amountText} onChangeText={setAmountText} />

            {editor?.kind === 'edit' ? (
              <Pressable style={styles.deleteButton} onPress={remove}>
                <Text style={styles.deleteText}>Hapus Anggaran Ini</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
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
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  emptySmall: { color: colors.textMuted, fontSize: 13 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  addText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  modalSave: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  modalContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  optionTextSelected: { color: colors.onPrimary },
  editCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    padding: spacing.md,
  },
  editCategoryName: { fontSize: 15, fontWeight: '700', color: colors.text },
  deleteButton: { alignItems: 'center', paddingVertical: spacing.md },
  deleteText: { color: colors.expense, fontSize: 14, fontWeight: '700' },
});
