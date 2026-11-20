/** Modal aktifkan / ubah kunci PIN: masukkan PIN baru 4–6 digit, lalu ulangi. */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { savePinHash, MAX_PIN_LENGTH, MIN_PIN_LENGTH } from '@/utils/pin';
import { useAppStore } from '@/store/use-app-store';
import { useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, type ThemeColors } from '@/theme/theme';
import { PinDots, PinKeypad, type PinKey } from '@/components/ui/pin-pad';

export default function PinSetupScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const changeAppLock = useAppStore((state) => state.changeAppLock);
  const [step, setStep] = useState<'first' | 'confirm'>('first');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dotCount = step === 'first' ? Math.max(MIN_PIN_LENGTH, pin.length) : firstPin.length;

  const pressKey = (key: PinKey) => {
    if (busy) return;
    if (key === 'hapus') {
      setPin((current) => current.slice(0, -1));
      setError(null);
      return;
    }
    if (key === '') return;
    const maxLength = step === 'first' ? MAX_PIN_LENGTH : firstPin.length;
    if (pin.length >= maxLength) return;
    setPin((current) => current + key);
    setError(null);
  };

  const submit = () => {
    if (busy) return;
    if (step === 'first') {
      if (pin.length < MIN_PIN_LENGTH) {
        setError(`PIN minimal ${MIN_PIN_LENGTH} digit.`);
        return;
      }
      setFirstPin(pin);
      setPin('');
      setError(null);
      setStep('confirm');
      return;
    }
    if (pin !== firstPin) {
      setError('PIN tidak sama. Ulangi dari awal.');
      setStep('first');
      setFirstPin('');
      setPin('');
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        await savePinHash(pin);
        await changeAppLock(true);
        Alert.alert('Kunci aktif', 'Aplikasi akan meminta PIN setiap kali dibuka.');
        router.back();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menyimpan PIN.');
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>{step === 'first' ? 'Buat PIN baru' : 'Ulangi PIN'}</Text>
        <Text style={styles.hint}>
          {step === 'first'
            ? `${MIN_PIN_LENGTH}–${MAX_PIN_LENGTH} angka. Jangan pakai tanggal lahir yang mudah ditebak.`
            : 'Ketik ulang PIN yang sama untuk konfirmasi.'}
        </Text>
      </View>

      <PinDots length={dotCount} filled={pin.length} />
      <Text style={styles.error}>{error ?? ' '}</Text>
      <PinKeypad onKey={pressKey} disabled={busy} />

      <Pressable
        style={({ pressed }) => [
          styles.primary,
          (pin.length < (step === 'first' ? MIN_PIN_LENGTH : firstPin.length) || busy) &&
            styles.primaryDisabled,
          pressed && styles.pressed,
        ]}
        onPress={submit}
        disabled={busy || pin.length < (step === 'first' ? MIN_PIN_LENGTH : firstPin.length)}
      >
        <Text style={styles.primaryText}>
          {busy ? 'Menyimpan…' : step === 'first' ? 'Lanjut' : 'Aktifkan Kunci'}
        </Text>
      </Pressable>

      {step === 'confirm' ? (
        <Pressable
          onPress={() => {
            setStep('first');
            setPin('');
            setFirstPin('');
            setError(null);
          }}
          disabled={busy}
        >
          <Text style={styles.back}>‹ Kembali</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.xl,
      gap: spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    hero: { width: '100%', gap: spacing.xs },
    title: { fontSize: 22, fontWeight: '800', color: colors.text },
    hint: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
    error: {
      fontSize: 13,
      color: colors.expense,
      minHeight: 18,
      textAlign: 'center',
    },
    primary: {
      marginTop: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: radius.button,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      minWidth: 220,
    },
    primaryDisabled: { opacity: 0.4 },
    primaryText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    pressed: { opacity: 0.75 },
    back: { fontSize: 14, color: colors.textMuted },
  });
