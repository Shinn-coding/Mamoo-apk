import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AmountInput } from '@/components/ui/amount-input';
import { CategoryGrid } from '@/components/transaction/category-grid';
import { DateField } from '@/components/transaction/date-field';
import { WalletChips } from '@/components/transaction/wallet-chips';
import { getDefaultWallet } from '@/db/repositories/wallets.repository';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  updateTransaction,
  type TransactionInput,
} from '@/db/repositories/transactions.repository';
import { getDb } from '@/db/db';
import { useDataStore } from '@/store/use-data-store';
import { todayLocal, type LocalDate } from '@/utils/date';
import { parseAmountInput } from '@/utils/format';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, type ThemeColors } from '@/theme/theme';

type FormType = 'expense' | 'income';

export default function NewTransactionScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;

  const bump = useDataStore((state) => state.bump);

  const [loaded, setLoaded] = useState(editId === null);
  const [type, setType] = useState<FormType>('expense');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [walletId, setWalletId] = useState<number | null>(null);
  const [date, setDate] = useState<LocalDate>(todayLocal());
  const [note, setNote] = useState('');
  const [amountInvalid, setAmountInvalid] = useState(false);

  // mode edit: muat transaksi; mode tambah: pakai dompet default
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (editId !== null) {
        const transaction = await getTransaction(editId);
        if (!transaction) {
          Alert.alert('Tidak ditemukan', 'Transaksi ini sudah tidak ada.');
          router.back();
          return;
        }
        if (cancelled) return;
        setType(transaction.type === 'income' ? 'income' : 'expense');
        setAmountText(transaction.amount.toLocaleString('id-ID'));
        setCategoryId(transaction.category_id);
        setWalletId(transaction.wallet_id);
        setDate(transaction.date);
        setNote(transaction.note ?? '');
        setLoaded(true);
      } else {
        const wallet = await getDefaultWallet();
        if (!cancelled && wallet) setWalletId(wallet.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const save = async () => {
    const amount = parseAmountInput(amountText);
    if (amount <= 0) {
      setAmountInvalid(true);
      return;
    }
    if (!categoryId) {
      Alert.alert('Kategori belum dipilih', 'Pilih kategori dulu ya.');
      return;
    }
    const input: TransactionInput = {
      id: editId ?? undefined,
      type,
      amount,
      category_id: categoryId,
      wallet_id: walletId ?? 0,
      date,
      note,
    };
    try {
      if (editId !== null) {
        await updateTransaction(getDb(), input);
      } else {
        await createTransaction(getDb(), input);
      }
      bump();
      router.back();
    } catch (error) {
      Alert.alert(
        'Gagal menyimpan',
        error instanceof Error ? error.message : 'Coba lagi ya.',
      );
    }
  };

  const confirmDelete = () => {
    if (editId === null) return;
    Alert.alert('Hapus transaksi?', 'Data yang sudah dihapus tidak bisa dikembalikan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteTransaction(editId);
              bump();
              router.back();
            } catch (error) {
              Alert.alert(
                'Gagal menghapus',
                error instanceof Error ? error.message : 'Coba lagi ya.',
              );
            }
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
          title: editId !== null ? 'Ubah Transaksi' : 'Tambah Transaksi',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          ),
        }}
      />

      {loaded ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.typeSwitch}>
            <Pressable
              style={[styles.typeButton, type === 'expense' && styles.typeActiveExpense]}
              onPress={() => {
                setType('expense');
              }}
            >
              <Text
                style={[
                  styles.typeText,
                  type === 'expense' && styles.typeTextActive,
                ]}
              >
                Pengeluaran
              </Text>
            </Pressable>
            <Pressable
              style={[styles.typeButton, type === 'income' && styles.typeActiveIncome]}
              onPress={() => {
                setType('income');
                setCategoryId(null);
              }}
            >
              <Text
                style={[
                  styles.typeText,
                  type === 'income' && styles.typeTextActive,
                ]}
              >
                Pemasukan
              </Text>
            </Pressable>
          </View>

          <AmountInput
            value={amountText}
            onChangeText={(text) => {
              setAmountText(text);
              setAmountInvalid(false);
            }}
            invalid={amountInvalid}
          />
          {amountInvalid ? (
            <Text style={styles.errorText}>Isi nominal dulu, lebih dari Rp 0.</Text>
          ) : null}

          <Text style={styles.sectionLabel}>Kategori</Text>
          <CategoryGrid type={type} selectedId={categoryId} onSelect={(c) => setCategoryId(c.id)} />

          <Text style={styles.sectionLabel}>Dompet</Text>
          <WalletChips selectedId={walletId} onSelect={(w) => setWalletId(w.id)} />

          <DateField value={date} onChange={setDate} />

          <TextInput
            style={styles.note}
            value={note}
            onChangeText={setNote}
            placeholder="Catatan (opsional)"
            placeholderTextColor={colors.textMuted}
            maxLength={200}
            multiline
          />

          <Pressable style={styles.saveButton} onPress={() => void save()}>
            <Text style={styles.saveText}>{editId !== null ? 'Simpan Perubahan' : 'Simpan'}</Text>
          </Pressable>

          {editId !== null ? (
            <Pressable style={styles.deleteButton} onPress={confirmDelete}>
              <Text style={styles.deleteText}>Hapus Transaksi</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  typeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.button - 2,
  },
  typeActiveExpense: { backgroundColor: colors.expense },
  typeActiveIncome: { backgroundColor: colors.primary },
  typeText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  typeTextActive: { color: colors.onPrimary },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  errorText: { color: colors.expense, fontSize: 13, marginTop: -spacing.md },
  note: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    minHeight: 48,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  saveText: { color: colors.onPrimary, fontSize: 16, fontWeight: '800' },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  deleteText: { color: colors.expense, fontSize: 14, fontWeight: '700' },
});
