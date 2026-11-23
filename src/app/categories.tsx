import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppIcon } from '@/components/ui/app-icon';
import { getDb } from '@/db/db';
import {
  archiveCategory,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/db/repositories/categories.repository';
import { countByCategory } from '@/db/repositories/transactions.repository';
import { useDataStore } from '@/store/use-data-store';
import { COLOR_PALETTE, ICON_OPTIONS, type IconName } from '@/constants/icons';
import type { Category, CategoryType } from '@/db/types';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, surfaceCard, type ThemeColors } from '@/theme/theme';

export default function CategoriesScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const bump = useDataStore((state) => state.bump);

  const [type, setType] = useState<CategoryType>('expense');
  const [active, setActive] = useState<Category[]>([]);
  const [archived, setArchived] = useState<Category[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>('dots-horizontal');
  const [color, setColor] = useState<string>(colors.primary);

  const version = useDataStore((state) => state.version);

  const reload = useCallback(async () => {
    const all = await listCategories(type, true);
    setActive(all.filter((c) => c.is_archived === 0));
    setArchived(all.filter((c) => c.is_archived === 1));
  }, [type]);

  useEffect(() => {
    void reload();
  }, [reload, type, version]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const openEditor = (category: Category | null) => {
    setEditing(category);
    setName(category?.name ?? '');
    setIcon((category?.icon as IconName) ?? 'dots-horizontal');
    setColor(category?.color ?? COLOR_PALETTE[0]);
    setEditorOpen(true);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nama kosong', 'Isi nama kategori dulu ya.');
      return;
    }
    try {
      if (editing) {
        await updateCategory(editing.id, { name: trimmed, icon, color });
      } else {
        await createCategory({ type, name: trimmed, icon, color });
      }
      bump();
      setEditorOpen(false);
      await reload();
    } catch (error) {
      Alert.alert('Gagal menyimpan', error instanceof Error ? error.message : 'Coba lagi ya.');
    }
  };

  const archive = (category: Category) => {
    Alert.alert(
      `Arsipkan "${category.name}"?`,
      'Kategori hilang dari daftar pilihan, tapi transaksi lamanya tetap aman.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Arsipkan',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await archiveCategory(category.id);
              bump();
              await reload();
            })();
          },
        },
      ],
    );
  };

  const activate = (category: Category) => {
    void (async () => {
      // arsip dibalik: langsung set is_archived = 0
      await restoreCategory(category.id);
      bump();
      await reload();
    })();
  };

  const remove = (category: Category) => {
    Alert.alert(`Hapus "${category.name}"?`, 'Kategori belum dipakai transaksi mana pun.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteCategory(category.id);
            } catch (error) {
              Alert.alert(
                'Tidak bisa dihapus',
                error instanceof Error ? error.message : 'Coba lagi ya.',
              );
            }
            bump();
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
          title: 'Kelola Kategori',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      <View style={styles.typeSwitch}>
        {(['expense', 'income'] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.typeButton, type === value && styles.typeActive]}
            onPress={() => setType(value)}
          >
            <Text style={[styles.typeText, type === value && styles.typeTextActive]}>
              {value === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {active.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            onEdit={() => openEditor(category)}
            onAction={() => remove(category)}
          />
        ))}
        {active.length === 0 ? (
          <Text style={styles.empty}>Belum ada kategori aktif.</Text>
        ) : null}

        <Pressable style={styles.addButton} onPress={() => openEditor(null)}>
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={styles.addText}>Tambah Kategori</Text>
        </Pressable>

        {archived.length > 0 ? (
          <>
            <Text style={styles.archivedTitle}>Diarsipkan</Text>
            {archived.map((category) => (
              <View key={category.id} style={styles.archivedRow}>
                <View style={[styles.iconCircle, styles.iconCircleMuted]}>
                  <AppIcon name={category.icon} color={colors.textMuted} size={20} />
                </View>
                <Text style={[styles.rowName, styles.rowNameMuted]}>{category.name}</Text>
                <Pressable onPress={() => activate(category)} hitSlop={8}>
                  <Text style={styles.activateText}>Aktifkan</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={editorOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditorOpen(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setEditorOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
            <Text style={styles.modalTitle}>
              {editing ? 'Ubah Kategori' : 'Kategori Baru'}
            </Text>
            <Pressable onPress={() => void save()} hitSlop={8}>
              <Text style={styles.modalSave}>Simpan</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Nama kategori"
              placeholderTextColor={colors.textMuted}
              maxLength={30}
            />

            <Text style={styles.modalLabel}>Ikon</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.iconOption,
                    icon === option && styles.iconOptionSelected,
                  ]}
                  onPress={() => setIcon(option)}
                >
                  <AppIcon
                    name={option}
                    color={icon === option ? colors.surface : colors.text}
                    size={22}
                  />
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Warna</Text>
            <View style={styles.colorRow}>
              {COLOR_PALETTE.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.colorOption,
                    { backgroundColor: option },
                    color === option && styles.colorOptionSelected,
                  ]}
                  onPress={() => setColor(option)}
                >
                  {color === option ? (
                    <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
                  ) : null}
                </Pressable>
              ))}
            </View>

            {editing ? (
              <Pressable style={styles.archiveButton} onPress={() => {
                setEditorOpen(false);
                archive(editing);
              }}>
                <Text style={styles.archiveText}>Arsipkan kategori ini</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function CategoryRow({
  category,
  onEdit,
  onAction,
}: {
  category: Category;
  onEdit: () => void;
  onAction: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [used, setUsed] = useState(false);
  useEffect(() => {
    void countByCategory(category.id).then((n) => setUsed(n > 0));
  }, [category.id]);

  return (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { backgroundColor: `${category.color}1A` }]}>
        <AppIcon name={category.icon} color={category.color} size={20} />
      </View>
      <Text style={styles.rowName}>{category.name}</Text>
      <Pressable onPress={onAction} hitSlop={8}>
        <Text style={[styles.rowAction, used && styles.rowActionMuted]}>
          {used ? 'Arsip' : 'Hapus'}
        </Text>
      </Pressable>
      <Pressable onPress={onEdit} hitSlop={8}>
        <Ionicons name="pencil" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

/** Aktifkan kembali kategori yang diarsipkan. */
async function restoreCategory(id: number): Promise<void> {
  await getDb().runAsync('UPDATE categories SET is_archived = 0 WHERE id = ?;', [id]);
}

const CIRCLE = 44;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  typeSwitch: {
    flexDirection: 'row',
    margin: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  typeButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.button - 2 },
  typeActive: { backgroundColor: colors.primary },
  typeText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  typeTextActive: { color: colors.onPrimary },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    ...surfaceCard(colors),
  },
  iconCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleMuted: { backgroundColor: colors.background },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  rowNameMuted: { color: colors.textMuted },
  rowAction: { color: colors.expense, fontSize: 13, fontWeight: '700', marginRight: spacing.md },
  rowActionMuted: { color: colors.warning },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
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
  archivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    opacity: 0.7,
    ...surfaceCard(colors),
  },
  activateText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
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
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  archiveButton: { alignItems: 'center', paddingVertical: spacing.md },
  archiveText: { color: colors.warning, fontSize: 14, fontWeight: '700' },
});
