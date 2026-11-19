/** Modal aktifkan kunci PIN: masukkan PIN baru 4–6 digit, lalu ulangi. */
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { savePinHash } from '@/utils/pin';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, spacing } from '@/theme/theme';

export default function PinSetupScreen() {
  const router = useRouter();
  const changeAppLock = useAppStore((state) => state.changeAppLock);
  const [step, setStep] = useState<'first' | 'confirm'>('first');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sanitized = pin.replace(/\D/g, '').slice(0, 6);

  const submit = () => {
    if (busy) return;
    if (step === 'first') {
      if (sanitized.length < 4) {
        setError('PIN minimal 4 digit.');
        return;
      }
      setFirstPin(sanitized);
      setPin('');
      setError(null);
      setStep('confirm');
      return;
    }
    if (sanitized !== firstPin) {
      setError('PIN tidak sama. Ulangi dari awal.');
      setStep('first');
      setFirstPin('');
      setPin('');
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        await savePinHash(sanitized);
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
      <Text style={styles.title}>{step === 'first' ? 'Buat PIN baru' : 'Ulangi PIN'}</Text>
      <Text style={styles.hint}>
        {step === 'first'
          ? '4–6 angka. Jangan pakai tanggal lahir yang mudah ditebak.'
          : 'Ketik ulang PIN yang sama untuk konfirmasi.'}
      </Text>
      <TextInput
        style={styles.input}
        value={sanitized}
        onChangeText={(text) => {
          setPin(text.replace(/\D/g, '').slice(0, 6));
          setError(null);
        }}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        autoFocus
        onSubmitEditing={submit}
      />
      <Text style={styles.error}>{error ?? ' '}</Text>
      <Text style={styles.save} onPress={submit}>
        {step === 'first' ? 'Lanjut' : 'Aktifkan Kunci'}
      </Text>
      {step === 'confirm' ? (
        <Text style={styles.back} onPress={() => { setStep('first'); setPin(''); setError(null); }}>
          ‹ Kembali
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 8,
    color: colors.text,
    textAlign: 'center',
  },
  error: { fontSize: 13, color: colors.expense, minHeight: 18 },
  save: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    paddingVertical: spacing.sm,
  },
  back: { fontSize: 14, color: colors.textMuted },
});
