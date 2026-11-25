import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AmountInput } from '@/components/ui/amount-input';
import { AppIcon } from '@/components/ui/app-icon';
import { DateField } from '@/components/transaction/date-field';
import { WalletChips } from '@/components/transaction/wallet-chips';
import { ProgressRing } from '@/components/goal/progress-ring';
import { getDefaultWallet, listWallets } from '@/db/repositories/wallets.repository';
import {
  addGoalEntry,
  getGoalWithSaved,
  listGoalEntries,
  lockedByWallet,
  setGoalStatus,
  type GoalWithSaved,
} from '@/db/repositories/goals.repository';
import { walletBalances } from '@/db/repositories/transactions.repository';
import { useDataStore } from '@/store/use-data-store';
import {
  daysBetween,
  formatDateLong,
  formatDayLabel,
  todayLocal,
  type LocalDate,
} from '@/utils/date';
import { formatRupiah, parseAmountInput, percent } from '@/utils/format';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, type ThemeColors } from '@/theme/theme';
import type { GoalEntry, Wallet } from '@/db/types';

export default function GoalDetailScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const goalId = Number(params.id);
  const bump = useDataStore((state) => state.bump);
  const version = useDataStore((state) => state.version);

  const [goal, setGoal] = useState<GoalWithSaved | null>(null);
  const [entries, setEntries] = useState<GoalEntry[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [freeByWallet, setFreeByWallet] = useState<Record<number, number>>({});
  const [action, setAction] = useState<'deposit' | 'withdraw' | null>(null);
  const [amountText, setAmountText] = useState('');
  const [walletId, setWalletId] = useState<number | null>(null);
  const [date, setDate] = useState<LocalDate>(todayLocal());

  const freeSelected = walletId != null ? freeByWallet[walletId] ?? 0 : 0;
  const amount = parseAmountInput(amountText);
  const overFree = action === 'deposit' && amount > 0 && amount > freeSelected;

  const reload = useCallback(async () => {
    const [goalValue, entryList, walletList, balances, locked] = await Promise.all([
      getGoalWithSaved(goalId),
      listGoalEntries(goalId),
      listWallets(),
      walletBalances(),
      lockedByWallet(),
    ]);
    setGoal(goalValue);
    setEntries(entryList);
    setWallets(walletList);
    setFreeByWallet(
      Object.fromEntries(
        walletList.map((wallet) => [wallet.id, (balances[wallet.id] ?? 0) - (locked[wallet.id] ?? 0)]),
      ),
    );
  }, [goalId]);

  useEffect(() => {
    void reload();
  }, [reload, version]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  useEffect(() => {
    void getDefaultWallet().then((wallet) => {
      if (wallet) setWalletId(wallet.id);
    });
  }, []);

  const openAction = (type: 'deposit' | 'withdraw') => {
    setAmountText('');
    setDate(todayLocal());
    setAction(type);
  };

  const submitAction = async () => {
    if (!action || !goal) return;
    if (!walletId) {
      Alert.alert('Dompet belum dipilih', 'Pilih dompet dulu ya.');
      return;
    }
    if (action === 'deposit' && amount > freeSelected) {
      Alert.alert(
        'Saldo tidak cukup',
        `Saldo tersedia di dompet ini ${formatRupiah(Math.max(0, freeSelected))}. Kurangi nominal atau pilih dompet lain.`,
      );
      return;
    }
    try {
      await addGoalEntry({
        goal_id: goal.id,
        wallet_id: walletId,
        type: action,
        amount,
        date,
      });
      bump();
      setAction(null);
      await reload();
    } catch (error) {
      Alert.alert('Gagal', error instanceof Error ? error.message : 'Coba lagi ya.');
    }
  };

  const complete = () => {
    if (!goal) return;
    Alert.alert(
      'Tandai tercapai?',
      'Target ditandai selesai dan dananya dilepas kembali ke Saldo Bebas.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tandai',
          onPress: () => {
            void (async () => {
              await setGoalStatus(goal.id, 'completed');
              bump();
              await reload();
            })();
          },
        },
      ],
    );
  };

  const cancel = () => {
    if (!goal) return;
    Alert.alert(
      'Batalkan target?',
      'Target dibatalkan dan dananya dilepas kembali ke Saldo Bebas. Riwayatnya tetap tersimpan.',
      [
        { text: 'Lanjutkan target', style: 'cancel' },
        {
          text: 'Batalkan',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await setGoalStatus(goal.id, 'cancelled');
              bump();
              await reload();
            })();
          },
        },
      ],
    );
  };

  if (!goal) {
    return <View style={styles.container} />;
  }

  const progress = percent(goal.saved, goal.target_amount);
  const sisa = Math.max(0, goal.target_amount - goal.saved);
  const walletNameById = new Map(wallets.map((wallet) => [wallet.id, wallet.name]));
  let estimate: string | null = null;
  if (goal.deadline && goal.status === 'active' && sisa > 0) {
    const monthsLeft = Math.max(1, Math.ceil(daysBetween(todayLocal(), goal.deadline) / 30));
    estimate = `${formatRupiah(Math.ceil(sisa / monthsLeft))}/bulan sampai ${formatDateLong(goal.deadline)}`;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: goal.name,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.heroCard}>
          <ProgressRing size={110} progress={progress} color={goal.color} />
          <View style={styles.heroMain}>
            <Text style={styles.saved}>{formatRupiah(goal.saved)}</Text>
            <Text style={styles.target}>dari {formatRupiah(goal.target_amount)}</Text>
            <Text style={styles.remaining}>
              {goal.status === 'active'
                ? sisa === 0
                  ? 'Target tercapai! 🎉'
                  : `sisa ${formatRupiah(sisa)}`
                : goal.status === 'completed'
                  ? 'Tercapai · dana dilepas'
                  : 'Dibatalkan · dana dilepas'}
            </Text>
            {estimate ? <Text style={styles.estimate}>{estimate}</Text> : null}
          </View>
        </View>

        {goal.status === 'active' ? (
          <>
            <View style={styles.actionRow}>
              <Pressable style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={() => openAction('deposit')}>
                <Ionicons name="add" size={18} color={colors.onPrimary} />
                <Text style={styles.actionText}>Setor</Text>
              </Pressable>
              <Pressable style={[styles.actionButton, styles.withdrawButton]} onPress={() => openAction('withdraw')}>
                <Ionicons name="remove" size={18} color={colors.expense} />
                <Text style={[styles.actionText, { color: colors.expense }]}>Tarik</Text>
              </Pressable>
            </View>

            {sisa === 0 ? (
              <Pressable style={styles.completeButton} onPress={complete}>
                <Text style={styles.completeText}>Tandai Tercapai</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.cancelButton} onPress={cancel}>
              <Text style={styles.cancelText}>Batalkan Target</Text>
            </Pressable>
          </>
        ) : null}

        <Text style={styles.section}>Riwayat</Text>
        {entries.length === 0 ? (
          <Text style={styles.empty}>Belum ada setoran.</Text>
        ) : (
          <View style={styles.entryList}>
            {entries.map((entry) => {
              const isDeposit = entry.type === 'deposit';
              return (
                <View key={entry.id} style={styles.entryRow}>
                  <Ionicons
                    name={isDeposit ? 'add-circle-outline' : 'remove-circle-outline'}
                    size={20}
                    color={isDeposit ? colors.primary : colors.expense}
                  />
                  <View style={styles.entryMain}>
                    <Text style={styles.entryTitle}>
                      {entry.note || (isDeposit ? 'Setoran' : 'Penarikan')}
                    </Text>
                    <Text style={styles.entrySub}>
                      {formatDayLabel(entry.date)} · {walletNameById.get(entry.wallet_id) ?? 'Dompet'}
                    </Text>
                  </View>
                  <Text
                    style={[styles.entryAmount, { color: isDeposit ? colors.primary : colors.expense }]}
                  >
                    {isDeposit ? '+' : '−'}
                    {formatRupiah(entry.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={action !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAction(null)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setAction(null)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
            <Text style={styles.modalTitle}>{action === 'deposit' ? 'Setor ke Target' : 'Tarik dari Target'}</Text>
            <Pressable onPress={() => void submitAction()} hitSlop={8}>
              <Text style={styles.modalSave}>Simpan</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalLabel}>Nominal</Text>
            <AmountInput value={amountText} onChangeText={setAmountText} invalid={overFree} />

            <View style={styles.balanceBar}>
              <View style={styles.balanceMain}>
                <Text style={styles.modalLabel}>
                  {action === 'deposit' ? 'Saldo tersedia' : 'Dana terkumpul'}
                </Text>
                <Text style={[styles.balanceValue, overFree && { color: colors.expense }]}>
                  {formatRupiah(Math.max(0, action === 'deposit' ? freeSelected : goal.saved))}
                </Text>
              </View>
              {action === 'deposit' && freeSelected > 0 ? (
                <Pressable
                  style={styles.fillButton}
                  onPress={() => setAmountText(freeSelected.toLocaleString('id-ID'))}
                  hitSlop={6}
                >
                  <Text style={styles.fillText}>Isi semua</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.modalLabel}>Dompet</Text>
            <WalletChips
              selectedId={walletId}
              onSelect={(wallet) => setWalletId(wallet.id)}
              balances={action === 'deposit' ? freeByWallet : undefined}
            />

            <DateField value={date} onChange={setDate} />

            <Text style={styles.modalHint}>
              {action === 'deposit'
                ? 'Setoran mengunci saldo dompet yang dipilih; uang tidak benar-benar pindah.'
                : 'Penarikan melepas sebagian saldo yang terkunci di target ini.'}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  heroMain: { flex: 1, gap: 2 },
  saved: { fontSize: 26, fontWeight: '800', color: colors.text },
  target: { fontSize: 13, color: colors.textMuted },
  remaining: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  estimate: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
  },
  withdrawButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
  completeButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
  },
  completeText: { color: colors.primary, fontWeight: '800' },
  cancelButton: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { color: colors.expense, fontSize: 14, fontWeight: '700' },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  empty: { color: colors.textMuted, fontSize: 13 },
  entryList: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  entryMain: { flex: 1, gap: 1 },
  entryTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  entrySub: { fontSize: 11, color: colors.textMuted },
  entryAmount: { fontSize: 14, fontWeight: '700' },
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
  balanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: -spacing.sm,
  },
  balanceMain: { gap: 2 },
  balanceValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  fillButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  fillText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  modalHint: { fontSize: 12, color: colors.textMuted },
});
