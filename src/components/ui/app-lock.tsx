/**
 * Layar kunci PIN (fase 5). Ditampilkan di atas semua layar saat kunci aktif.
 * Punya tombol "Lupa PIN" yang mereset aplikasi (hapus data + hash PIN),
 * karena tidak ada server/email pemulihan.
 */
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { resetAllData } from '@/db/repositories/backup.repository';
import { clearPinHash, verifyPin } from '@/utils/pin';
import { useAppStore } from '@/store/use-app-store';
import { useDataStore } from '@/store/use-data-store';
import { colors, radius, spacing } from '@/theme/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'hapus'] as const;
const MAX_PIN_LENGTH = 6;

export function AppLock({ onUnlock }: { onUnlock: () => void }) {
  const biometricEnabled = useAppStore((state) => state.settings.biometricEnabled);
  const refreshSettings = useAppStore((state) => state.refreshSettings);
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tryUnlock = async (pin: string): Promise<boolean> => {
    setBusy(true);
    try {
      if (await verifyPin(pin)) {
        onUnlock();
        return true;
      }
      return false;
    } finally {
      setBusy(false);
    }
  };

  const pressKey = (key: (typeof KEYS)[number]) => {
    if (busy) return;
    if (key === 'hapus') {
      setDigits((current) => current.slice(0, -1));
      setError(null);
      return;
    }
    if (key === '') return;
    void (async () => {
      const next = (error ? '' : digits) + key;
      if (next.length > MAX_PIN_LENGTH) return;
      const ok = await tryUnlock(next);
      if (ok) return;
      if (next.length >= MAX_PIN_LENGTH) {
        Vibration.vibrate(80);
        setError('PIN salah. Coba lagi.');
        setDigits('');
      } else {
        setDigits(next);
      }
    })();
  };

  const openWithBiometric = () => {
    void (async () => {
      try {
        const LocalAuth = await import('expo-local-authentication');
        const [hasHardware, isEnrolled] = await Promise.all([
          LocalAuth.hasHardwareAsync(),
          LocalAuth.isEnrolledAsync(),
        ]);
        if (!hasHardware || !isEnrolled) {
          setError('Biometrik tidak tersedia di HP ini.');
          return;
        }
        const result = await LocalAuth.authenticateAsync();
        if (result.success) onUnlock();
        else setError('Verifikasi biometrik gagal.');
      } catch {
        setError('Biometrik gagal dibuka.');
      }
    })();
  };

  useEffect(() => {
    if (biometricEnabled) openWithBiometric();
    // hanya di mount pertama
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forgotPin = () => {
    Alert.alert(
      'Lupa PIN?',
      'Karena Mamoo tidak punya server, satu-satunya jalan adalah reset aplikasi: SEMUA data akan dihapus, termasuk PIN dan profil (nama & foto). Kalau masih ada backup, data bisa dipulihkan setelah masuk aplikasi.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Lanjut reset',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Yakin hapus semua data?', 'Tindakan ini tidak bisa dibatalkan.', [
              { text: 'Batal', style: 'cancel' },
              {
                text: 'Hapus semua',
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    try {
                      await resetAllData();
                      await clearPinHash();
                      await refreshSettings();
                      useDataStore.getState().bump();
                      onUnlock();
                    } catch (err) {
                      Alert.alert('Gagal reset', err instanceof Error ? err.message : 'Coba lagi.');
                    }
                  })();
                },
              },
            ]);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={40} color={colors.primary} />
      <Text style={styles.title}>Mamoo terkunci</Text>
      <Text style={styles.subtitle}>Masukkan PIN untuk masuk</Text>
      <View style={styles.dots}>
        {Array.from({ length: MAX_PIN_LENGTH }, (_, i) => (
          <View key={i} style={[styles.dot, i < digits.length && styles.dotFilled]} />
        ))}
      </View>
      <Text style={styles.error}>{error ?? ' '}</Text>
      <View style={styles.keypad}>
        {KEYS.map((key) => (
          <Pressable
            key={key || 'kosong'}
            style={({ pressed }) => [styles.key, !key && styles.keyGhost, pressed && styles.keyPressed]}
            onPress={() => pressKey(key)}
            disabled={!key}
            accessibilityLabel={key === 'hapus' ? 'Hapus' : key || undefined}
          >
            {key === 'hapus' ? (
              <Ionicons name="backspace-outline" size={26} color={colors.text} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
      {biometricEnabled ? (
        <Pressable style={styles.bioButton} onPress={openWithBiometric}>
          <Ionicons name="finger-print-outline" size={22} color={colors.primary} />
          <Text style={styles.bioText}>Buka dengan sidik jari / wajah</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.forgot} onPress={forgotPin}>
        <Text style={styles.forgotText}>Lupa PIN?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  subtitle: { fontSize: 13, color: colors.textMuted },
  dots: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dotFilled: { backgroundColor: colors.primary },
  error: { fontSize: 13, color: colors.expense, minHeight: 18 },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 300,
    marginTop: spacing.sm,
  },
  key: {
    width: 88,
    height: 64,
    margin: spacing.xs,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGhost: { backgroundColor: 'transparent' },
  keyPressed: { opacity: 0.6 },
  keyText: { fontSize: 26, fontWeight: '700', color: colors.text },
  bioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  bioText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  forgot: { marginTop: spacing.md, padding: spacing.sm },
  forgotText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
});
