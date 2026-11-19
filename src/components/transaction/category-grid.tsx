import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { listCategories } from '@/db/repositories/categories.repository';
import { useDataVersion } from '@/store/use-data-store';
import { colors, radius, spacing } from '@/theme/theme';
import type { Category, CategoryType } from '@/db/types';

/** Grid kategori aktif untuk dipilih di form transaksi. */
export function CategoryGrid({
  type,
  selectedId,
  onSelect,
}: {
  type: CategoryType;
  selectedId: number | null;
  onSelect: (category: Category) => void;
}) {
  const version = useDataVersion();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    void listCategories(type).then(setCategories);
  }, [type, version]);

  return (
    <View style={styles.grid}>
      {categories.map((category) => {
        const selected = category.id === selectedId;
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category)}
            style={styles.item}
          >
            <View style={[styles.circle, selected && styles.circleSelected]}>
              <AppIcon
                name={category.icon}
                color={selected ? colors.surface : category.color}
                size={22}
              />
            </View>
            <Text
              style={[
                styles.label,
                selected && styles.labelSelected,
              ]}
            >
              {category.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const CIRCLE = 52;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  item: {
    width: 68,
    alignItems: 'center',
    gap: spacing.xs,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  circleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
});
