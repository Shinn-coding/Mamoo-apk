import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AmountInput } from '@/components/ui/amount-input';
import { AppIcon } from '@/components/ui/app-icon';
import { IconColorPicker } from '@/components/ui/icon-color-picker';
import {
  archiveWallet,
  createWalletWithBalance,
  listWallets,
  restoreWallet,
  setDefaultWallet,
  updateWallet,
} from '@/db/repositories/wallets.repository';
import { walletBalances } from '@/db/repositories/transactions.repository';
import { useDataStore } from '@/store/use-data-store';
import { formatRupiah } from '@/utils/format';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, surfaceCard, type ThemeColors } from '@/theme/theme';
import type { IconName } from '@/constants/icons';
import type { Wallet } from '@/db/types';

type EditorState = {
  editing: Wallet | null;
  name: string;
  icon: IconName;
  color: string;
  initialAmountText: string;
};

export default function WalletsScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const bump = useDataStore((state) => state.bump);

  const [active, setActive] = useState<Wallet[]>([]);
  const [archived, setArchived] = useState<Wallet[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [editor, setEditor] = useState<EditorState | null>(null);

  const reload = useCallback(async () => {
    const all = await listWallets(true);
    setActive(all.filter((wallet) => wallet.is_archived === 0));
    setArchived(all.filter((wallet) => wallet.is_archived === 1));
    setBalances(await walletBalances());
  }, []);

  const version = useDataStore((state) => state.version);
  useEffect(() => {
    void reload();
  }, [reload, version]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const openEditor = (wallet: Wallet | null) => {
    setEditor({
      editing: wallet,
      name: wallet?.name ?? '',
      icon: (wallet?.icon as IconName) ?? 'wallet',
      color: wallet?.color ?? colors.primary,
      initialAmountText: '',
    });
  };

  const save = async () => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) {
      Alert.alert('Nama kosong', 'Isi nama dompet dulu ya.');
      return;
    }
    try {
      if (editor.editing) {
        await updateWallet(editor.editing.id, { name, icon: editor.icon, color: editor.color });
      } else {
        await createWalletWithBalance({
          name,
          icon: editor.icon,
          color: editor.color,
          initialAmount: parseAmount(editor.initialAmountText),
        });
      }
      bump();
      setEditor(null);
      await reload();
    } catch (error) {
      Alert.alert('Gagal menyimpan', error instanceof Error ? error.message : 'Coba lagi ya.');
    }
  };

  const archive = (wallet: Wallet) => {
    Alert.alert(
      `Arsipkan "${wallet.name}"?`,
      'Dompet hilang dari pilihan, tapi saldo dan transaksinya tetap aman.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Arsipkan',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await archiveWallet(wallet.id);
              } catch (error) {
                Alert.alert(
                  'Tidak bisa diarsipkan',
                  error instanceof Error ? error.message : 'Coba lagi ya.',
                );
              }
              bump();
              await reload();
            })();
          },
        },
      ],
    );
  };

  const makeDefault = (wallet: Wallet) => {
    void (async () => {
      try {
        await setDefaultWallet(wallet.id);
        bump();
        await reload();
      } catch (error) {
        Alert.alert('Gagal', error instanceof Error ? error.message : 'Coba lagi ya.');
      }
    })();
  };

  const restore = (wallet: Wallet) => {
    void (async () => {
      await restoreWallet(wallet.id);
      bump();
      await reload();
    })();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Kelola Dompet',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      <ScrollView contentContainerStyle={styles.list}>
        {active.map((wallet) => (
          <View key={wallet.id} style={styles.row}>
            <View style={[styles.iconCircle, { backgroundColor: `${wallet.color}1A` }]}>
              <AppIcon name={wallet.icon} color={wallet.color} size={20} />
            </View>
            <View style={styles.rowMain}>
              <View style={styles.nameRow}>
                <Text style={styles.rowName}>{wallet.name}</Text>
                {wallet.is_default === 1 ? (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>default</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.rowBalance}>{formatRupiah(balances[wallet.id] ?? 0)}</Text>
            </View>
            <Pressable onPress={() => openEditor(wallet)} hitSlop={8}>
              <Ionicons name="pencil" size={18} color={colors.textMuted} />
            </Pressable>
            {wallet.is_default === 1 ? (
              <View style={{ width: 22 }} />
            ) : (
              <>
                <Pressable onPress={() => makeDefault(wallet)} hitSlop={8}>
                  <Ionicons name="star-outline" size={18} color={colors.warning} />
                </Pressable>
                <Pressable onPress={() => archive(wallet)} hitSlop={8}>
                  <Ionicons name="archive-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </>
            )}
          </View>
        ))}

        <Pressable style={styles.addButton} onPress={() => openEditor(null)}>
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={styles.addText}>Tambah Dompet</Text>
        </Pressable>

        {archived.length > 0 ? (
          <>
            <Text style={styles.archivedTitle}>Diarsipkan</Text>
            {archived.map((wallet) => (
              <View key={wallet.id} style={[styles.row, styles.rowMuted]}>
                <View style={[styles.iconCircle, styles.iconCircleMuted]}>
                  <AppIcon name={wallet.icon} color={colors.textMuted} size={20} />
                </View>
                <View style={styles.rowMain}>
                  <Text style={[styles.rowName, styles.rowNameMuted]}>{wallet.name}</Text>
                  <Text style={styles.rowBalance}>{formatRupiah(balances[wallet.id] ?? 0)}</Text>
                </View>
                <Pressable onPress={() => restore(wallet)} hitSlop={8}>
                  <Text style={styles.activateText}>Aktifkan</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.hint}>
          Saldo dompet dihitung langsung dari transaksi: saldo awal + pemasukan − pengeluaran.
        </Text>
      </ScrollView>

      <Modal
        visible={editor !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditor(null)}
      >
        {editor ? (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setEditor(null)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
              <Text style={styles.modalTitle}>
                {editor.editing ? 'Ubah Dompet' : 'Dompet Baru'}
              </Text>
              <Pressable onPress={() => void save()} hitSlop={8}>
                <Text style={styles.modalSave}>Simpan</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <TextInput
                style={styles.nameInput}
                value={editor.name}
                onChangeText={(name) => setEditor({ ...editor, name })}
                placeholder="Nama dompet (mis. Tunai)"
                placeholderTextColor={colors.textMuted}
                maxLength={30}
              />

              {editor.editing ? null : (
                <>
                  <Text style={styles.modalLabel}>Saldo Awal</Text>
                  <AmountInput
                    value={editor.initialAmountText}
                    onChangeText={(initialAmountText) => setEditor({ ...editor, initialAmountText })}
                  />
                  <Text style={styles.hintSmall}>
                    Dicatat sebagai saldo awal — tidak dihitung sebagai pemasukan bulanan.
                  </Text>
                </>
              )}

              <IconColorPicker
                icon={editor.icon}
                color={editor.color}
                onIcon={(icon) => setEditor({ ...editor, icon })}
                onColor={(color) => setEditor({ ...editor, color })}
              />
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function parseAmount(text: string): number {
  return Number(text.replace(/\D/g, '')) || 0;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    ...surfaceCard(colors),
  },
  rowMuted: { opacity: 0.7 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleMuted: { backgroundColor: colors.background },
  rowMain: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowName: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowNameMuted: { color: colors.textMuted },
  defaultBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  defaultBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  rowBalance: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
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
  archivedTitle: {
    marginTop: spacing.lg,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  activateText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: spacing.lg },
  hintSmall: { color: colors.textMuted, fontSize: 12 },
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
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
});
