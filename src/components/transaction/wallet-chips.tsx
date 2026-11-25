import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { listWallets } from '@/db/repositories/wallets.repository';
import { useDataVersion } from '@/store/use-data-store';
import { formatRupiah } from '@/utils/format';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, type ThemeColors } from '@/theme/theme';
import type { Wallet } from '@/db/types';

/** Pilihan dompet berbentuk chip. */
export function WalletChips({
  selectedId,
  onSelect,
  balances,
}: {
  selectedId: number | null;
  onSelect: (wallet: Wallet) => void;
  /** Saldo yang bisa dipakai per dompet; kalau diisi, tampil di tiap chip. */
  balances?: Record<number, number>;
}) {
  const version = useDataVersion();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [wallets, setWallets] = useState<Wallet[]>([]);

  useEffect(() => {
    void listWallets().then(setWallets);
  }, [version]);

  return (
    <View style={styles.row}>
      {wallets.map((wallet) => {
        const selected = wallet.id === selectedId;
        const balance = balances?.[wallet.id];
        return (
          <Pressable
            key={wallet.id}
            onPress={() => onSelect(wallet)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <AppIcon name={wallet.icon} color={selected ? colors.surface : wallet.color} size={16} />
            <View style={styles.chipBody}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {wallet.name}
              </Text>
              {balance !== undefined ? (
                <Text style={[styles.chipBalance, selected && styles.chipBalanceSelected]}>
                  {formatRupiah(Math.max(0, balance))}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipBody: { gap: 0 },
  chipText: { fontSize: 13, color: colors.text },
  chipTextSelected: { color: colors.onPrimary, fontWeight: '700' },
  chipBalance: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  chipBalanceSelected: { color: colors.onPrimary, opacity: 0.85 },
});
