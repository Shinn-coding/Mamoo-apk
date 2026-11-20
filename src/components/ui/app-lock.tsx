/**
 * Layar kunci Mamoo.
 * - Prompt biometrik baru boleh muncul setelah intro selesai (`active`).
 * - Biometrik diverifikasi OS; aplikasi hanya menyimpan preferensi.
 * - PIN 4–6 digit, jumlah bubble mengikuti panjang PIN yang disimpan.
 * - Maks. 3 percobaan biometrik, lalu wajib PIN.
 * - Maks. 5 PIN salah, lalu cooldown 30 detik (bukan hapus data).
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { resetAllData } from '@/db/repositories/backup.repository';
import {
  clearPinHash,
  getPinLength,
  getPinLockState,
  MAX_BIOMETRIC_ATTEMPTS,
  recordPinFailure,
  resetPinFailures,
  verifyPin,
  type PinLockState,
} from '@/utils/pin';
import { authenticateBiometric, getBiometricAvailability } from '@/utils/biometric';
import { useAppStore } from '@/store/use-app-store';
import { useDataStore } from '@/store/use-data-store';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, type ThemeColors } from '@/theme/theme';
import { PinDots, PinKeypad, type PinKey } from './pin-pad';

export function AppLock({
  onUnlock,
  active,
}: {
  onUnlock: () => void;
  active: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const biometricEnabled = useAppStore((state) => state.settings.biometricEnabled);
  const refreshSettings = useAppStore((state) => state.refreshSettings);
  const [pinLength, setPinLength] = useState<number | null>(null);
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricAttempts, setBiometricAttempts] = useState(0);
  const [lockState, setLockState] = useState<PinLockState>({
    failures: 0,
    lockedUntil: 0,
    remainingMs: 0,
  });
  const autoPrompted = useRef(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [length, state] = await Promise.all([getPinLength(), getPinLockState()]);
      if (!mounted) return;
      setPinLength(length ?? 6);
      setLockState(state);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (lockState.remainingMs <= 0) return;
    const timer = setInterval(() => {
      const remainingMs = Math.max(0, lockState.lockedUntil - Date.now());
      if (remainingMs <= 0) {
        void resetPinFailures();
        setLockState({ failures: 0, lockedUntil: 0, remainingMs: 0 });
      } else {
        setLockState((current) => ({ ...current, remainingMs }));
      }
    }, 500);
    return () => clearInterval(timer);
  }, [lockState.lockedUntil, lockState.remainingMs]);

  const openWithBiometric = () => {
    if (biometricBusy || biometricAttempts >= MAX_BIOMETRIC_ATTEMPTS) return;
    setBiometricBusy(true);
    setError(null);
    void (async () => {
      try {
        const availability = await getBiometricAvailability();
        if (!availability.available) {
          setError(
            availability.hasHardware
              ? 'Biometrik belum didaftarkan di HP ini.'
              : 'HP ini belum mendukung biometrik.',
          );
          return;
        }
        const result = await authenticateBiometric();
        if (result.success) {
          await resetPinFailures();
          onUnlock();
          return;
        }
        if (!result.cancelled) {
          const next = Math.min(
            biometricAttempts + 1,
            MAX_BIOMETRIC_ATTEMPTS,
          );
          setBiometricAttempts(next);
          setError(
            next >= MAX_BIOMETRIC_ATTEMPTS
              ? 'Batas biometrik tercapai. Gunakan PIN.'
              : `Biometrik gagal. Sisa ${MAX_BIOMETRIC_ATTEMPTS - next} percobaan.`,
          );
          Vibration.vibrate(60);
        }
      } catch {
        setError('Biometrik gagal dibuka.');
      } finally {
        setBiometricBusy(false);
      }
    })();
  };

  // Prompt otomatis hanya setelah intro selesai. User tetap bisa memilih PIN.
  useEffect(() => {
    if (!active) {
      autoPrompted.current = false;
      return;
    }
    if (
      !biometricEnabled ||
      autoPrompted.current ||
      biometricAttempts >= MAX_BIOMETRIC_ATTEMPTS ||
      lockState.remainingMs > 0
    ) {
      return;
    }
    autoPrompted.current = true;
    const timer = setTimeout(openWithBiometric, 260);
    return () => clearTimeout(timer);
    // Sengaja hanya bereaksi saat intro selesai / setting berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, biometricEnabled]);

  const verify = (pin: string) => {
    if (busy || lockState.remainingMs > 0) return;
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        if (await verifyPin(pin)) {
          await resetPinFailures();
          onUnlock();
          return;
        }
        const nextState = await recordPinFailure();
        setLockState(nextState);
        setDigits('');
        Vibration.vibrate(80);
        setError(
          nextState.remainingMs > 0
            ? `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(nextState.remainingMs / 1000)} detik.`
            : 'PIN salah. Coba lagi.',
        );
      } catch {
        setError('PIN gagal diverifikasi.');
      } finally {
        setBusy(false);
      }
    })();
  };

  const pressKey = (key: PinKey) => {
    if (busy || lockState.remainingMs > 0 || pinLength === null) return;
    if (key === 'hapus') {
      setDigits((current) => current.slice(0, -1));
      setError(null);
      return;
    }
    if (key === '') return;
    if (digits.length >= pinLength) return;
    const next = digits + key;
    setDigits(next);
    setError(null);
    if (next.length === pinLength) verify(next);
  };

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
                      await resetPinFailures();
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

  const locked = lockState.remainingMs > 0;
  const canUseBiometric =
    biometricEnabled && biometricAttempts < MAX_BIOMETRIC_ATTEMPTS;

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={40} color={colors.primary} />
      <Text style={styles.title}>Mamoo terkunci</Text>
      <Text style={styles.subtitle}>
        {locked
          ? `Coba lagi dalam ${Math.ceil(lockState.remainingMs / 1000)} detik`
          : 'Masukkan PIN atau gunakan biometrik'}
      </Text>

      {pinLength !== null ? (
        <>
          <PinDots length={pinLength} filled={digits.length} />
          <Text style={styles.error}>{error ?? ' '}</Text>
          <PinKeypad onKey={pressKey} disabled={busy || locked} />
        </>
      ) : (
        <Text style={styles.error}>PIN belum diatur di perangkat ini.</Text>
      )}

      {canUseBiometric ? (
        <Pressable
          style={({ pressed }) => [styles.bioButton, pressed && styles.pressed]}
          onPress={openWithBiometric}
          disabled={biometricBusy}
          accessibilityRole="button"
          accessibilityLabel="Buka dengan biometrik"
        >
          <Ionicons name="finger-print-outline" size={22} color={colors.primary} />
          <Text style={styles.bioText}>
            {biometricBusy
              ? 'Menunggu biometrik…'
              : `Buka dengan sidik jari / wajah (${MAX_BIOMETRIC_ATTEMPTS - biometricAttempts}x)`}
          </Text>
        </Pressable>
      ) : biometricEnabled ? (
        <Text style={styles.bioLimit}>Batas biometrik tercapai. Gunakan PIN.</Text>
      ) : null}

      <Pressable style={styles.forgot} onPress={forgotPin}>
        <Text style={styles.forgotText}>Lupa PIN?</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.sm,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      marginTop: spacing.sm,
    },
    subtitle: { fontSize: 13, color: colors.textMuted },
    error: {
      fontSize: 13,
      color: colors.expense,
      minHeight: 18,
      textAlign: 'center',
    },
    bioButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.primaryLight,
    },
    bioText: { fontSize: 14, fontWeight: '600', color: colors.primary },
    bioLimit: {
      marginTop: spacing.md,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
    pressed: { opacity: 0.65 },
    forgot: { marginTop: spacing.md, padding: spacing.sm },
    forgotText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  });
