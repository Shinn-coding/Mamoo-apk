import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AppLock } from '@/components/ui/app-lock';
import { BubbleSplash } from '@/components/ui/bubble-splash';
import { useAppStore } from '@/store/use-app-store';
import { colors, spacing } from '@/theme/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready, initError, init } = useAppStore();
  const appLockEnabled = useAppStore((state) => state.settings.appLockEnabled);
  const [unlocked, setUnlocked] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (ready || initError) {
      void SplashScreen.hideAsync();
    }
  }, [ready, initError]);

  // Splash animasi Mamoo: tampil sampai animasinya selesai (atau diketuk).
  if (!splashDone && !initError) {
    return <BubbleSplash onDone={() => setSplashDone(true)} />;
  }

  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Aplikasi tidak bisa dibuka</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
        <Text style={styles.errorMessage}>
          Coba tutup dan buka lagi aplikasinya. Data lokal tidak akan hilang.
        </Text>
      </View>
    );
  }

  if (ready && appLockEnabled && !unlocked) {
    return <AppLock onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="transaction/new"
        options={{ presentation: 'modal', title: 'Tambah Transaksi' }}
      />
      <Stack.Screen name="pin-setup" options={{ presentation: 'modal', title: 'Kunci Aplikasi' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  errorTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  errorMessage: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
