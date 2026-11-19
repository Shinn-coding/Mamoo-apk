import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { listWallets } from '@/db/repositories/wallets.repository';
import { useDataVersion } from '@/store/use-data-store';
import { colors, radius, spacing } from '@/theme/theme';
import type { Wallet } from '@/db/types';

/** Pilihan dompet berbentuk chip. */
export function WalletChips({
  selectedId,
  onSelect,
}: {
  selectedId: number | null;
  onSelect: (wallet: Wallet) => void;
}) {
  const version = useDataVersion();
  const [wallets, setWallets] = useState<Wallet[]>([]);

  useEffect(() => {
    void listWallets().then(setWallets);
  }, [version]);

  return (
    <View style={styles.row}>
      {wallets.map((wallet) => {
        const selected = wallet.id === selectedId;
        return (
          <Pressable
            key={wallet.id}
            onPress={() => onSelect(wallet)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <AppIcon name={wallet.icon} color={selected ? colors.surface : wallet.color} size={16} />
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {wallet.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
  chipText: { fontSize: 13, color: colors.text },
  chipTextSelected: { color: colors.surface, fontWeight: '700' },
});
