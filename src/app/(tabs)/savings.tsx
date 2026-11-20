import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AmountInput } from '@/components/ui/amount-input';
import { AppIcon } from '@/components/ui/app-icon';
import { IconColorPicker } from '@/components/ui/icon-color-picker';
import { DateField } from '@/components/transaction/date-field';
import { GlassSceneTarget } from '@/components/ui/glass-scene';
import { ProgressRing } from '@/components/goal/progress-ring';
import {
  createGoal,
  listGoals,
  updateGoal,
  lockedTotal,
  type GoalWithSaved,
} from '@/db/repositories/goals.repository';
import { useDataStore } from '@/store/use-data-store';
import { formatRupiah, parseAmountInput, percent } from '@/utils/format';
import { todayLocal, type LocalDate } from '@/utils/date';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, type ThemeColors } from '@/theme/theme';
import type { IconName } from '@/constants/icons';

export default function SavingsScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const bump = useDataStore((state) => state.bump);
  const version = useDataStore((state) => state.version);

  const [goals, setGoals] = useState<GoalWithSaved[]>([]);
  const [doneGoals, setDoneGoals] = useState<GoalWithSaved[]>([]);
  const [locked, setLocked] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<GoalWithSaved | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>('piggy-bank');
  const [color, setColor] = useState<string>(colors.primary);
  const [targetText, setTargetText] = useState('');
  const [useDeadline, setUseDeadline] = useState(false);
  const [deadline, setDeadline] = useState<LocalDate>(todayLocal());

  const reload = useCallback(async () => {
    const [all, lockedValue] = await Promise.all([listGoals(true), lockedTotal()]);
    setGoals(all.filter((goal) => goal.status === 'active'));
    setDoneGoals(all.filter((goal) => goal.status !== 'active'));
    setLocked(lockedValue);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, version]);

  const openEditor = (goal: GoalWithSaved | null) => {
    setEditing(goal);
    setName(goal?.name ?? '');
    setIcon((goal?.icon as IconName) ?? 'piggy-bank');
    setColor(goal?.color ?? colors.primary);
    setTargetText(goal ? goal.target_amount.toLocaleString('id-ID') : '');
    setUseDeadline(Boolean(goal?.deadline));
    if (goal?.deadline) setDeadline(goal.deadline);
    setEditorOpen(true);
  };

  const save = async () => {
    const target = parseAmountInput(targetText);
    if (!name.trim()) {
      Alert.alert('Nama kosong', 'Isi nama target dulu ya.');
      return;
    }
    if (target <= 0) {
      Alert.alert('Nominal kosong', 'Isi target nominal lebih dari Rp 0.');
      return;
    }
    try {
      const payload = {
        name,
        icon,
        color,
        target_amount: target,
        deadline: useDeadline ? deadline : null,
      };
      if (editing) {
        await updateGoal(editing.id, payload);
      } else {
        await createGoal(payload);
      }
      bump();
      setEditorOpen(false);
      await reload();
    } catch (error) {
      Alert.alert('Gagal menyimpan', error instanceof Error ? error.message : 'Coba lagi ya.');
    }
  };

  return (
    <GlassSceneTarget name="savings" style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Terkunci di Tabungan</Text>
          <Text style={styles.summaryValue}>{formatRupiah(locked)}</Text>
          <Text style={styles.summaryHint}>
            Dana ini tidak dihitung di Saldo Bebas. Setoran tidak memindahkan uang, hanya menguncinya.
          </Text>
        </View>

        {goals.map((goal) => {
          const progress = percent(goal.saved, goal.target_amount);
          return (
            <Pressable
              key={goal.id}
              style={styles.card}
              onPress={() => router.push(`/goal/${goal.id}`)}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${goal.color}1A` }]}>
                <AppIcon name={goal.icon} color={goal.color} size={22} />
              </View>
              <View style={styles.cardMain}>
                <Text style={styles.cardName}>{goal.name}</Text>
                <Text style={styles.cardSub}>
                  {formatRupiah(goal.saved)} / {formatRupiah(goal.target_amount)}
                </Text>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${progress}%`, backgroundColor: goal.color },
                    ]}
                  />
                </View>
                <Text style={styles.cardHint}>
                  {goal.deadline ? `tenggat ${goal.deadline} · ` : ''}
                  sisa {formatRupiah(Math.max(0, goal.target_amount - goal.saved))}
                </Text>
              </View>
              <ProgressRing size={52} progress={progress} color={goal.color} />
              <Pressable
                hitSlop={8}
                onPress={() => openEditor(goal)}
              >
                <Ionicons name="pencil" size={16} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          );
        })}

        {goals.length === 0 ? (
          <Text style={styles.empty}>
            Belum ada target. Buat target pertamamu, misal "Dana Darurat" atau "Liburan".
          </Text>
        ) : null}

        <Pressable style={styles.addButton} onPress={() => openEditor(null)}>
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={styles.addText}>Target Baru</Text>
        </Pressable>

        {doneGoals.length > 0 ? (
          <>
            <Text style={styles.archivedTitle}>Selesai / Dibatalkan</Text>
            {doneGoals.map((goal) => (
              <Pressable
                key={goal.id}
                style={[styles.card, styles.cardMuted]}
                onPress={() => router.push(`/goal/${goal.id}`)}
              >
                <View style={[styles.iconCircle, styles.iconCircleMuted]}>
                  <AppIcon name={goal.icon} color={colors.textMuted} size={22} />
                </View>
                <View style={styles.cardMain}>
                  <Text style={[styles.cardName, styles.cardNameMuted]}>{goal.name}</Text>
                  <Text style={styles.cardSub}>
                    {goal.status === 'completed' ? 'Tercapai · ' : 'Dibatalkan · '}
                    {formatRupiah(goal.saved)}
                  </Text>
                </View>
                <Ionicons name="flag-outline" size={18} color={colors.textMuted} />
              </Pressable>
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
            <Text style={styles.modalTitle}>{editing ? 'Ubah Target' : 'Target Baru'}</Text>
            <Pressable onPress={() => void save()} hitSlop={8}>
              <Text style={styles.modalSave}>Simpan</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Nama target (mis. Dana Darurat)"
              placeholderTextColor={colors.textMuted}
              maxLength={40}
            />

            <Text style={styles.modalLabel}>Nominal Target</Text>
            <AmountInput value={targetText} onChangeText={setTargetText} />

            <View style={styles.deadlineRow}>
              <Text style={styles.modalLabel}>Pakai tenggat</Text>
              <Switch
                value={useDeadline}
                onValueChange={setUseDeadline}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            {useDeadline ? <DateField value={deadline} onChange={setDeadline} /> : null}

            <IconColorPicker
              icon={icon}
              color={color}
              onIcon={setIcon}
              onColor={setColor}
            />
          </ScrollView>
        </View>
      </Modal>
    </GlassSceneTarget>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl * 4 },
  summary: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  summaryLabel: { color: colors.primaryLight, fontSize: 12, fontWeight: '700' },
  summaryValue: { color: colors.onPrimary, fontSize: 26, fontWeight: '800' },
  summaryHint: { color: colors.primaryLight, fontSize: 11 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  cardMuted: { opacity: 0.7 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleMuted: { backgroundColor: colors.background },
  cardMain: { flex: 1, gap: spacing.xs },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardNameMuted: { color: colors.textMuted },
  cardSub: { fontSize: 12, color: colors.textMuted },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.background, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  cardHint: { fontSize: 11, color: colors.textMuted },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
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
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
