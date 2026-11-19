import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { exportBackup, restoreBackup, resetAllData } from '@/db/repositories/backup.repository';
import { listTransactionsForExport } from '@/db/repositories/transactions.repository';
import { clearPinHash } from '@/utils/pin';
import { shareTextFile, readPickedJsonFile } from '@/utils/export';
import { buildCsv } from '@/utils/csv';
import { validateBackupPayload, BACKUP_FILE_PREFIX, type BackupPayload } from '@/utils/backup';
import { useAppStore } from '@/store/use-app-store';
import { useDataStore } from '@/store/use-data-store';
import { GlassSceneTarget } from '@/components/ui/glass-scene';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { colors, radius, spacing } from '@/theme/theme';

type NavRow = { icon: keyof typeof Ionicons.glyphMap; label: string; route: string };
type ActionRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
};

const NAV_ROWS: NavRow[] = [
  { icon: 'speedometer-outline', label: 'Anggaran', route: '/budgets' },
  { icon: 'wallet-outline', label: 'Kelola Dompet', route: '/wallets' },
  { icon: 'color-palette-outline', label: 'Kelola Kategori', route: '/categories' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const cycleStartDay = useAppStore((state) => state.settings.budgetCycleStartDay);
  const appLockEnabled = useAppStore((state) => state.settings.appLockEnabled);
  const biometricEnabled = useAppStore((state) => state.settings.biometricEnabled);
  const profileName = useAppStore((state) => state.settings.profileName);
  const changeCycleStartDay = useAppStore((state) => state.changeCycleStartDay);
  const changeAppBiometric = useAppStore((state) => state.changeAppBiometric);
  const refreshSettings = useAppStore((state) => state.refreshSettings);
  const bumpData = useDataStore((state) => state.bump);
  const [dayText, setDayText] = useState(String(cycleStartDay));
  const [dayError, setDayError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const applyDay = () => {
    const day = Number(dayText.replace(/\D/g, ''));
    if (!Number.isFinite(day) || day < 1 || day > 28) {
      setDayError(true);
      setDayText(String(cycleStartDay));
      return;
    }
    setDayError(false);
    void changeCycleStartDay(day);
  };

  const run = (id: string, task: () => Promise<void>) => {
    if (busy) return;
    setBusy(id);
    void (async () => {
      try {
        await task();
      } catch (err) {
        Alert.alert('Gagal', err instanceof Error ? err.message : 'Terjadi kesalahan.');
      } finally {
        setBusy(null);
      }
    })();
  };

  const backupJson = () =>
    run('backup', async () => {
      const payload = await exportBackup();
      const stamp = payload.exported_at.slice(0, 10);
      await shareTextFile(`${BACKUP_FILE_PREFIX}-${stamp}.json`, JSON.stringify(payload, null, 2), 'json');
    });

  const restoreJson = () =>
    run('restore', async () => {
      const raw = await readPickedJsonFile();
      if (raw === null) return; // pengguna batal pilih file
      const payload: BackupPayload = validateBackupPayload(raw);
      return new Promise<void>((resolve, reject) => {
        Alert.alert(
          'Pulihkan backup?',
          `Semua data saat ini akan DIGANTI dengan isi backup (${payload.transactions.length} transaksi, ${payload.wallets.length} dompet). Kunci aplikasi dan profil di HP ini tidak berubah.`,
          [
            {
              text: 'Batal',
              style: 'cancel',
              onPress: () => resolve(),
            },
            {
              text: 'Pulihkan',
              style: 'destructive',
              onPress: () => {
                void (async () => {
                  try {
                    await restoreBackup(payload);
                    await refreshSettings();
                    bumpData();
                    Alert.alert('Berhasil', 'Data berhasil dipulihkan dari backup.');
                  } catch (err) {
                    reject(err instanceof Error ? err : new Error('Restore gagal.'));
                    return;
                  }
                  resolve();
                })();
              },
            },
          ],
        );
      });
    });

  const exportCsv = () =>
    run('csv', async () => {
      const rows = await listTransactionsForExport();
      const labels: Record<string, string> = {
        expense: 'Pengeluaran',
        income: 'Pemasukan',
        initial: 'Saldo Awal',
      };
      const csv = buildCsv(
        ['Tanggal', 'Tipe', 'Kategori', 'Dompet', 'Nominal', 'Catatan'],
        rows.map((row) => [
          row.date,
          labels[row.type] ?? row.type,
          row.category_name ?? '-',
          row.wallet_name,
          row.amount,
          row.note ?? '',
        ]),
      );
      await shareTextFile('mamoo-transaksi.csv', csv, 'csv');
    });

  const disableLock = () => {
    Alert.alert('Matikan kunci aplikasi?', 'PIN yang tersimpan juga dihapus.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Matikan',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await clearPinHash();
            await changeAppBiometric(false);
            await useAppStore.getState().changeAppLock(false);
          })();
        },
      },
    ]);
  };

  const resetAll = () => {
    Alert.alert(
      'Reset semua data?',
      'Semua transaksi, dompet, kategori, anggaran, tabungan, dan profil (nama & foto) akan DIHAPUS. Sebaiknya backup dulu di menu "Backup Data (JSON)".',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Lanjut',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Yakin hapus semua data?', 'Tindakan ini tidak bisa dibatalkan.', [
              { text: 'Batal', style: 'cancel' },
              {
                text: 'Hapus semua',
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    await resetAllData();
                    await refreshSettings();
                    bumpData();
                    Alert.alert('Berhasil', 'Semua data telah direset ke awal.');
                  })();
                },
              },
            ]);
          },
        },
      ],
    );
  };

  const BACKUP_ROWS: ActionRow[] = [
    { icon: 'cloud-download-outline', label: 'Backup Data (JSON)', hint: 'Semua data dibagikan sebagai file .json', onPress: backupJson },
    { icon: 'document-text-outline', label: 'Pulihkan dari Backup', hint: 'Pilih file .json hasil backup', onPress: restoreJson },
    { icon: 'grid-outline', label: 'Ekspor Transaksi (CSV)', hint: 'Buka di Excel / Google Sheets', onPress: exportCsv },
  ];

  return (
    <GlassSceneTarget name="settings" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Profil</Text>
        <Pressable
          style={styles.profileCard}
          onPress={() => router.push('/profile' as never)}
          accessibilityRole="button"
          accessibilityLabel="Atur profil"
        >
          <ProfileAvatar size={52} />
          <View style={styles.navTextWrap}>
            <Text style={styles.profileName} numberOfLines={1}>
              {profileName || 'Atur Profil'}
            </Text>
            <Text style={styles.navHint}>
              {profileName
                ? 'Nama & foto sebagai penanda HP ini'
                : 'Tambah nama dan foto sebagai penanda HP ini'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <Text style={styles.section}>Anggaran</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tanggal mulai siklus</Text>
          <Text style={styles.hint}>
            Uang bulananmu masuk tanggal 25? Atur 25 supaya anggaran dan laporan mengikuti siklus itu
            (1–28). Berlaku juga untuk laporan.
          </Text>
          <View style={styles.dayRow}>
            <TextInput
              style={[styles.dayInput, dayError && styles.dayInputError]}
              value={dayText}
              onChangeText={(text) => setDayText(text.replace(/\D/g, ''))}
              onEndEditing={applyDay}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.dayHint}>tanggal tiap bulan</Text>
          </View>
        </View>

        <Text style={styles.section}>Kelola Data</Text>
        <View style={styles.card}>
          {NAV_ROWS.map((row) => (
            <Pressable
              key={row.route}
              style={styles.navRow}
              onPress={() => router.push(row.route as never)}
            >
              <Ionicons name={row.icon} size={20} color={colors.primary} />
              <Text style={styles.navLabel}>{row.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Backup & Ekspor</Text>
        <View style={styles.card}>
          {BACKUP_ROWS.map((row) => (
            <Pressable key={row.label} style={styles.navRow} onPress={row.onPress} disabled={busy !== null}>
              <Ionicons name={row.icon} size={20} color={colors.primary} />
              <View style={styles.navTextWrap}>
                <Text style={styles.navLabel}>{row.label}</Text>
                <Text style={styles.navHint}>{busy === null ? row.hint : 'Memproses…'}</Text>
              </View>
              <Ionicons name="share-outline" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Keamanan</Text>
        <View style={styles.card}>
          <Pressable style={styles.navRow} onPress={() => (appLockEnabled ? disableLock() : router.push('/pin-setup' as never))}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
            <View style={styles.navTextWrap}>
              <Text style={styles.navLabel}>Kunci Aplikasi (PIN)</Text>
              <Text style={styles.navHint}>{appLockEnabled ? 'Aktif — ketuk untuk mematikan' : 'Minta PIN setiap buka aplikasi'}</Text>
            </View>
            <Ionicons name={appLockEnabled ? 'checkmark-circle' : 'chevron-forward'} size={18} color={appLockEnabled ? colors.primary : colors.textMuted} />
          </Pressable>
          {appLockEnabled ? (
            <View style={styles.navRow}>
              <Ionicons name="finger-print-outline" size={20} color={colors.primary} />
              <View style={styles.navTextWrap}>
                <Text style={styles.navLabel}>Buka dengan biometrik</Text>
                <Text style={styles.navHint}>Sidik jari / wajah di layar kunci</Text>
              </View>
              <Switch value={biometricEnabled} onValueChange={(value) => void changeAppBiometric(value)} />
            </View>
          ) : null}
        </View>

        <Text style={styles.section}>Zona Bahaya</Text>
        <View style={styles.card}>
          <Pressable style={styles.navRow} onPress={resetAll}>
            <Ionicons name="trash-outline" size={20} color={colors.expense} />
            <View style={styles.navTextWrap}>
              <Text style={[styles.navLabel, { color: colors.expense }]}>Reset Semua Data</Text>
              <Text style={styles.navHint}>Hapus seluruh isi aplikasi, kembali ke awal</Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.section}>Tentang</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>
            Mamoo menyimpan semua data di HP ini (SQLite lokal) — tanpa server, tanpa akun, tanpa
            internet. Backup file JSON secara rutin supaya data aman kalau ganti HP.
          </Text>
        </View>
      </ScrollView>
    </GlassSceneTarget>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl * 4 },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  profileName: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dayInput: {
    width: 80,
    backgroundColor: colors.background,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  dayInputError: { borderColor: colors.expense },
  dayHint: { fontSize: 13, color: colors.textMuted },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  navTextWrap: { flex: 1, gap: 1 },
  navLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  navHint: { fontSize: 12, color: colors.textMuted },
});
